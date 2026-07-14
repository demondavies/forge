// Forge Download Engine — CDN-direct audio download to organized project folders.
//
// Service Boundary: this module knows where Forge stores files and how to
// fetch audio from a CDN URL. It does not know about Suno, CDP, or prompt
// delivery. The CDN URL and all project metadata arrive as parameters;
// nothing here decides where to route a generation request or which UUID
// belongs to which track.
//
// Folder structure:
//   Documents/Forge/Albums/{ProjectName}/{TrackTitle}/{uuid}.mp3
//   Documents/Forge/EPs/{ProjectName}/{TrackTitle}/{uuid}.mp3
//   Documents/Forge/Singles/{ProjectName}/{TrackTitle}/{uuid}.mp3
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::time::Duration;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug)]
pub struct ForgeDownloadResult {
    pub status: String, // "Completed" | "Error"
    pub detail: String,
    pub path: Option<String>,
    pub filename: Option<String>,
}

fn completed_download(filename: String, path: String) -> ForgeDownloadResult {
    ForgeDownloadResult {
        status: "Completed".to_string(),
        detail: format!("Saved {filename}"),
        path: Some(path),
        filename: Some(filename),
    }
}

fn download_error(detail: String) -> ForgeDownloadResult {
    ForgeDownloadResult {
        status: "Error".to_string(),
        detail,
        path: None,
        filename: None,
    }
}

fn type_folder(project_type: &str) -> &'static str {
    match project_type {
        "Album" => "Albums",
        "EP" => "EPs",
        _ => "Singles",
    }
}

// Replace characters that are not valid in Windows/macOS/Linux file or
// folder names so project names and track titles are always safe to use
// as path components.
fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

// "Download one Suno-generated audio file from its CDN URL and save it to
// the correct Forge folder" — resolves the Documents folder, builds the
// full path from project metadata, creates any missing directories, fetches
// the audio via a direct HTTP GET, and writes it to disk. Returns the
// absolute path on success so the TypeScript caller can import the file as
// a Candidate without knowing where it was stored.
#[tauri::command]
pub fn download_forge_track(
    app: tauri::AppHandle,
    uuid: String,
    project_type: String,
    project_name: String,
    track_title: String,
) -> ForgeDownloadResult {
    let Ok(documents) = app.path().document_dir() else {
        return download_error("Cannot locate the Documents folder.".to_string());
    };

    let folder = type_folder(&project_type);
    let dir = documents
        .join("Forge")
        .join(folder)
        .join(sanitize(&project_name))
        .join(sanitize(&track_title));

    if let Err(e) = std::fs::create_dir_all(&dir) {
        return download_error(format!("Could not create folder: {e}"));
    }

    let filename = format!("{uuid}.mp3");
    let file_path = dir.join(&filename);
    let cdn_url = format!("https://cdn1.suno.ai/{uuid}.mp3");

    let response = match ureq::get(&cdn_url)
        .timeout(Duration::from_secs(120))
        .call()
    {
        Ok(r) => r,
        Err(e) => return download_error(format!("CDN fetch failed: {e}")),
    };

    let mut bytes = Vec::new();
    if let Err(e) = response.into_reader().read_to_end(&mut bytes) {
        return download_error(format!("Failed to read CDN response: {e}"));
    }

    if bytes.is_empty() {
        return download_error("CDN returned an empty file.".to_string());
    }

    if let Err(e) = std::fs::write(&file_path, &bytes) {
        return download_error(format!("Failed to write file: {e}"));
    }

    completed_download(filename, file_path.to_string_lossy().to_string())
}
