use ring::digest::{Context, SHA256};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tokio::fs::{File, OpenOptions};
use tokio::io::{AsyncReadExt, AsyncSeekExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

const CHUNK_SIZE: usize = 4 * 1024 * 1024; // 4 MB
const MAGIC: [u8; 4] = *b"LCFT";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ProgressPayload {
    pub bytes_transferred: u64,
    pub speed_mbps: f64,
    pub current_file: String,
}

#[tauri::command]
pub async fn send_file(
    app: AppHandle,
    peer_addr: String,
    file_path: String,
) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file.bin")
        .to_string();

    let mut hasher = Context::new(&SHA256);
    let mut file = File::open(&path).await.map_err(|e| e.to_string())?;
    let file_size = file.metadata().await.map_err(|e| e.to_string())?.len();
    let mut buf = vec![0u8; CHUNK_SIZE];
    loop {
        let n = file.read(&mut buf).await.map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    let digest = hasher.finish();
    let mut expected = [0u8; 32];
    expected.copy_from_slice(digest.as_ref());

    let mut file = File::open(&path).await.map_err(|e| e.to_string())?;

    let mut stream = TcpStream::connect(&peer_addr)
        .await
        .map_err(|e| e.to_string())?;

    write_bytes(&mut stream, &MAGIC).await?;
    write_u32(&mut stream, file_name.len() as u32).await?;
    write_bytes(&mut stream, file_name.as_bytes()).await?;
    write_u64(&mut stream, file_size).await?;
    write_u32(&mut stream, CHUNK_SIZE as u32).await?;
    write_bytes(&mut stream, &expected).await?;

    let resume_offset = read_u64(&mut stream).await?;
    let mut offset = resume_offset.min(file_size);
    file.seek(std::io::SeekFrom::Start(offset))
        .await
        .map_err(|e| e.to_string())?;

    let start = Instant::now();
    let mut bytes_sent = offset;

    while bytes_sent < file_size {
        let n = file.read(&mut buf).await.map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }

        write_u64(&mut stream, bytes_sent).await?;
        write_u32(&mut stream, n as u32).await?;
        write_bytes(&mut stream, &buf[..n]).await?;
        stream.flush().await.map_err(|e| e.to_string())?;

        bytes_sent += n as u64;

        let elapsed = start.elapsed().as_secs_f64();
        let speed = if elapsed > 0.0 {
            (bytes_sent as f64 / 1_000_000.0) / elapsed
        } else {
            0.0
        };
        let payload = ProgressPayload {
            bytes_transferred: bytes_sent,
            speed_mbps: speed,
            current_file: file_name.clone(),
        };
        let _ = app.emit("transfer-progress", payload);
    }

    Ok(())
}
#[tauri::command]
pub async fn receive_file(
    app: AppHandle,
    bind_addr: String,
    output_path: String,
) -> Result<(), String> {
    let listener = TcpListener::bind(&bind_addr)
        .await
        .map_err(|e| e.to_string())?;
    let (mut stream, _) = listener.accept().await.map_err(|e| e.to_string())?;

    let mut magic = [0u8; 4];
    stream.read_exact(&mut magic).await.map_err(|e| e.to_string())?;
    if magic != MAGIC {
        return Err("invalid protocol magic".to_string());
    }
    let name_len = read_u32(&mut stream).await? as usize;
    let mut name_bytes = vec![0u8; name_len];
    stream
        .read_exact(&mut name_bytes)
        .await
        .map_err(|e| e.to_string())?;
    let file_name = String::from_utf8(name_bytes).map_err(|e| e.to_string())?;
    let file_size = read_u64(&mut stream).await?;
    let _chunk_size = read_u32(&mut stream).await?;
    let mut expected = [0u8; 32];
    stream
        .read_exact(&mut expected)
        .await
        .map_err(|e| e.to_string())?;

    let base = Path::new(&output_path);
    let final_path = if base.is_dir() {
        base.join(&file_name)
    } else {
        base.to_path_buf()
    };
    let journal_path = final_path.with_file_name(format!("{}.journal", file_name));

    let mut resume_offset = read_journal(&journal_path).await;
    if let Ok(meta) = tokio::fs::metadata(&final_path).await {
        resume_offset = resume_offset.min(meta.len());
    } else {
        resume_offset = 0;
    }

    let mut hasher = Context::new(&SHA256);
    if resume_offset > 0 {
        let mut f = File::open(&final_path)
            .await
            .map_err(|e| e.to_string())?;
        let mut remaining = resume_offset;
        let mut buf = vec![0u8; CHUNK_SIZE];
        while remaining > 0 {
            let to_read = remaining.min(CHUNK_SIZE as u64) as usize;
            let n = f.read(&mut buf[..to_read]).await.map_err(|e| e.to_string())?;
            if n == 0 {
                break;
            }
            hasher.update(&buf[..n]);
            remaining -= n as u64;
        }
    }

    write_u64(&mut stream, resume_offset).await?;

    let mut out = OpenOptions::new()
        .create(true)
        .write(true)
        .read(true)
        .open(&final_path)
        .await
        .map_err(|e| e.to_string())?;
    out.seek(std::io::SeekFrom::Start(resume_offset))
        .await
        .map_err(|e| e.to_string())?;

    let mut bytes_received = resume_offset;
    let start = Instant::now();

    while bytes_received < file_size {
        let offset = read_u64(&mut stream).await?;
        let len = read_u32(&mut stream).await? as usize;
        if len == 0 {
            break;
        }
        let mut chunk = vec![0u8; len];
        stream
            .read_exact(&mut chunk)
            .await
            .map_err(|e| e.to_string())?;

        out.seek(std::io::SeekFrom::Start(offset))
            .await
            .map_err(|e| e.to_string())?;
        out.write_all(&chunk).await.map_err(|e| e.to_string())?;
        out.flush().await.map_err(|e| e.to_string())?;

        bytes_received = offset + len as u64;
        hasher.update(&chunk);

        let _ = tokio::fs::write(&journal_path, bytes_received.to_le_bytes()).await;

        let elapsed = start.elapsed().as_secs_f64();
        let speed = if elapsed > 0.0 {
            (bytes_received as f64 / 1_000_000.0) / elapsed
        } else {
            0.0
        };
        let payload = ProgressPayload {
            bytes_transferred: bytes_received,
            speed_mbps: speed,
            current_file: file_name.clone(),
        };
        let _ = app.emit("transfer-progress", payload);
    }

    let actual = hasher.finish();
    if actual.as_ref() != expected {
        return Err("checksum mismatch".to_string());
    }

    let _ = tokio::fs::remove_file(&journal_path).await;
    Ok(())
}

async fn read_journal(path: &Path) -> u64 {
    match tokio::fs::read(path).await {
        Ok(bytes) if bytes.len() >= 8 => {
            let mut arr = [0u8; 8];
            arr.copy_from_slice(&bytes[..8]);
            u64::from_le_bytes(arr)
        }
        _ => 0,
    }
}

async fn write_bytes(stream: &mut TcpStream, data: &[u8]) -> Result<(), String> {
    stream.write_all(data).await.map_err(|e| e.to_string())
}

async fn write_u32(stream: &mut TcpStream, v: u32) -> Result<(), String> {
    stream
        .write_all(&v.to_le_bytes())
        .await
        .map_err(|e| e.to_string())
}

async fn write_u64(stream: &mut TcpStream, v: u64) -> Result<(), String> {
    stream
        .write_all(&v.to_le_bytes())
        .await
        .map_err(|e| e.to_string())
}

async fn read_u32(stream: &mut TcpStream) -> Result<u32, String> {
    let mut buf = [0u8; 4];
    stream.read_exact(&mut buf).await.map_err(|e| e.to_string())?;
    Ok(u32::from_le_bytes(buf))
}

async fn read_u64(stream: &mut TcpStream) -> Result<u64, String> {
    let mut buf = [0u8; 8];
    stream.read_exact(&mut buf).await.map_err(|e| e.to_string())?;
    Ok(u64::from_le_bytes(buf))
}

