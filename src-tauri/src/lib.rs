// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod chrome_automation;
mod download_watcher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            chrome_automation::discover_chrome_targets,
            chrome_automation::list_chrome_tabs,
            chrome_automation::activate_chrome_tab,
            chrome_automation::navigate_chrome_tab,
            chrome_automation::automate_suno_generate,
            download_watcher::snapshot_downloads_folder,
            download_watcher::watch_for_download,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
