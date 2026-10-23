use if_addrs::get_if_addrs;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::error::Error;
use std::sync::mpsc::{self, Receiver};
use std::thread;
use std::time::{Duration, Instant};

/// mDNS service type advertised by LaptopClone peers.
pub const SERVICE_TYPE: &str = "_laptopclone._tcp.local.";

/// Default TCP port advertised when a caller only provides a device name.
pub const DEFAULT_PORT: u16 = 8080;

/// Serialisable description of a discovered peer.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PeerInfo {
    pub id: String,
    pub name: String,
    pub ip: String,
    pub port: u16,
}

/// Keeps the announcer daemon alive for the lifetime of the process.
static ANNOUNCER: std::sync::Mutex<Option<ServiceDaemon>> =
    std::sync::Mutex::new(None);

/// Advertise this device on the local network.
pub fn start_announcer(device_name: &str, port: u16) -> Result<(), Box<dyn Error>> {
    let daemon = ServiceDaemon::new()?;

    // Best-effort local IPv4 address; fall back to loopback if unavailable.
    let ip = get_if_addrs()
        .ok()
        .and_then(|interfaces| {
            interfaces.into_iter().find_map(|iface| match iface.addr() {
                if_addrs::IfAddr::V4(_) if !iface.is_loopback() => {
                    Some(iface.addr().ip().to_string())
                }
                _ => None,
            })
        })
        .unwrap_or_else(|| "127.0.0.1".to_string());

    let host_name = format!("{}.local.", sanitize_host(device_name));

    let service_info = ServiceInfo::new(
        SERVICE_TYPE,
        device_name,
        &host_name,
        &ip,
        port,
        None::<std::collections::HashMap<String, String>>,
    )?
    .enable_addr_auto();

    daemon.register(service_info)?;

    let mut guard = ANNOUNCER
        .lock()
        .map_err(|_| "announcer mutex poisoned".to_string())?;
    *guard = Some(daemon);

    Ok(())
}

/// Browse the local network for LaptopClone peers.
///
/// Returns a channel receiver that yields [`PeerInfo`] as peers are resolved.
pub fn start_listener() -> Result<Receiver<PeerInfo>, Box<dyn Error>> {
    let (tx, rx) = mpsc::channel::<PeerInfo>();

    thread::spawn(move || {
        let daemon = match ServiceDaemon::new() {
            Ok(d) => d,
            Err(_) => return,
        };
        let browser = match daemon.browse(SERVICE_TYPE) {
            Ok(b) => b,
            Err(_) => return,
        };

        while let Ok(event) = browser.recv() {
            if let ServiceEvent::ServiceResolved(resolved) = event {
                let peer = peer_from_resolved(&resolved);
                let _ = tx.send(peer);
            }
        }
        // Daemon is dropped here when the thread exits.
        drop(daemon);
    });

    Ok(rx)
}

fn peer_from_resolved(resolved: &mdns_sd::ResolvedService) -> PeerInfo {
    let id = resolved.fullname.clone();
    let name = resolved
        .fullname
        .strip_suffix(SERVICE_TYPE)
        .unwrap_or(&resolved.fullname)
        .trim_end_matches('.')
        .to_string();

    let ip = resolved
        .get_addresses_v4()
        .into_iter()
        .next()
        .map(|addr| addr.to_string())
        .or_else(|| {
            resolved
                .get_addresses()
                .iter()
                .next()
                .map(|addr| addr.to_string())
        })
        .unwrap_or_default();

    PeerInfo {
        id,
        name,
        ip,
        port: resolved.port,
    }
}

fn sanitize_host(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();
    if sanitized.is_empty() {
        "laptopclone".to_string()
    } else {
        sanitized
    }
}

// ---------------------------------------------------------------------------
// Tauri v2 commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub async fn announce_presence(name: String) -> Result<(), String> {
    start_announcer(&name, DEFAULT_PORT).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn discover_laptops() -> Result<Vec<PeerInfo>, String> {
    let rx = start_listener().map_err(|e| e.to_string())?;

    let peers = tokio::task::spawn_blocking(move || {
        let mut seen: HashSet<String> = HashSet::new();
        let mut peers: Vec<PeerInfo> = Vec::new();
        let deadline = Instant::now() + Duration::from_secs(3);

        loop {
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                break;
            }
            match rx.recv_timeout(remaining) {
                Ok(peer) => {
                    if seen.insert(peer.id.clone()) {
                        peers.push(peer);
                    }
                }
                Err(_) => break,
            }
        }

        peers
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(peers)
}
