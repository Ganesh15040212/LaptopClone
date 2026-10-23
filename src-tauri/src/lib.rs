mod discovery;
mod transfer;

#[cfg(target_os = "windows")]
mod installed_apps;

pub use discovery::PeerInfo;
pub use transfer::ProgressPayload;

#[cfg(target_os = "windows")]
pub use installed_apps::AppItem;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "windows")]
    let builder = tauri::Builder::default().invoke_handler(tauri::generate_handler![
        discovery::announce_presence,
        discovery::discover_laptops,
        installed_apps::scan_installed_apps,
        transfer::send_file,
        transfer::receive_file
    ]);

    #[cfg(not(target_os = "windows"))]
    let builder = tauri::Builder::default().invoke_handler(tauri::generate_handler![
        discovery::announce_presence,
        discovery::discover_laptops,
        transfer::send_file,
        transfer::receive_file
    ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


