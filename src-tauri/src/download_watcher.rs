// Download Watcher — provider-agnostic filesystem observer.
//
// This module watches files. It does not know about Suno, prompts, albums,
// or tracks. Its responsibility ends at "a completed audio file has appeared
// in the downloads folder." Association to a Generation Request happens
// through composition above (promptDeliveryEngine.ts / App.tsx).
//
// Service Boundary, applied literally: every function here only ever touches
// the local filesystem — it never opens a network connection, never reads a
// browser's state, and never makes any decision that depends on knowing who
// the file came from. Adding a second generation provider (MusicGPT, ACE,
// anything) would need zero changes here.
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};
use tauri::Manager;

const AUDIO_EXTENSIONS: &[&str] = &["mp3", "wav", "flac", "m4a", "ogg", "aac", "opus"];

// Browser partial-download suffixes — a file still ending with one of
// these hasn't finished writing yet. Chrome uses .crdownload; Firefox and
// others use .part. Matching by suffix means we don't need to know which
// browser the creator uses.
const PARTIAL_SUFFIXES: &[&str] = &[".crdownload", ".part", ".download", ".tmp"];

// The shape handed back across invoke() to the TypeScript side. "filename"
// is the one thing the watcher honestly knows: the name of the file it
// found, nothing about what generated it. "path" carries the full absolute
// path so the Candidate can retain a location for local playback.
#[derive(Serialize, Deserialize, Debug)]
pub struct DownloadWatchResult {
    pub status: String, // "Completed" | "Timeout" | "Error"
    pub detail: String,
    pub filename: Option<String>,
    pub path: Option<String>,
}

fn detected(filename: String, path: String) -> DownloadWatchResult {
    DownloadWatchResult {
        status: "Completed".to_string(),
        detail: format!("Download detected: {filename}"),
        filename: Some(filename),
        path: Some(path),
    }
}

fn timed_out() -> DownloadWatchResult {
    DownloadWatchResult {
        status: "Timeout".to_string(),
        detail: "No download detected within the expected time.".to_string(),
        filename: None,
        path: None,
    }
}

fn watch_error(detail: String) -> DownloadWatchResult {
    DownloadWatchResult {
        status: "Error".to_string(),
        detail,
        filename: None,
        path: None,
    }
}

fn is_audio_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    AUDIO_EXTENSIONS
        .iter()
        .any(|ext| lower.ends_with(&format!(".{ext}")))
}

fn is_partial_or_hidden(name: &str) -> bool {
    let lower = name.to_lowercase();
    PARTIAL_SUFFIXES.iter().any(|suf| lower.ends_with(suf)) || name.starts_with('.')
}

// "What audio files already exist in the downloads folder right now" —
// used to take a baseline snapshot before generation starts, so the watcher
// knows which files already existed and should be ignored.
#[tauri::command]
pub fn snapshot_downloads_folder(app: tauri::AppHandle) -> Vec<String> {
    let Ok(dir) = app.path().download_dir() else {
        return vec![];
    };
    let Ok(entries) = std::fs::read_dir(&dir) else {
        return vec![];
    };
    entries
        .flatten()
        .filter_map(|e| {
            let path = e.path();
            if !path.is_file() {
                return None;
            }
            let name = path.file_name()?.to_str()?.to_string();
            if is_partial_or_hidden(&name) || !is_audio_file(&name) {
                return None;
            }
            Some(name)
        })
        .collect()
}

// "Wait until a new completed audio file appears in the downloads folder"
// — polls every 1.5 s, comparing the current contents against the caller's
// own baseline. A file is "completed" when its size is non-zero and stable
// across two readings 800 ms apart, ruling out a file that is still being
// written. Returns on the first file that passes all checks, or when the
// timeout elapses.
#[tauri::command]
pub fn watch_for_download(
    app: tauri::AppHandle,
    known_filenames: Vec<String>,
    timeout_seconds: u64,
) -> DownloadWatchResult {
    let Ok(dir) = app.path().download_dir() else {
        return watch_error("Cannot locate the system downloads folder.".to_string());
    };
    if !dir.is_dir() {
        return watch_error(format!("Downloads folder not found: {}", dir.display()));
    }

    let deadline = Instant::now() + Duration::from_secs(timeout_seconds);

    loop {
        if Instant::now() >= deadline {
            return timed_out();
        }

        std::thread::sleep(Duration::from_millis(1500));

        let Ok(entries) = std::fs::read_dir(&dir) else {
            return watch_error("Downloads folder became unreadable.".to_string());
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let name = match path.file_name().and_then(|n| n.to_str()) {
                Some(n) => n.to_string(),
                None => continue,
            };

            // Skip pre-existing files, partial downloads, hidden files, and
            // anything that isn't an audio format.
            if known_filenames.contains(&name) || is_partial_or_hidden(&name) || !is_audio_file(&name) {
                continue;
            }

            // File size must be non-zero and identical across two readings
            // to confirm the download is complete.
            let size1 = match entry.metadata() {
                Ok(m) => m.len(),
                Err(_) => continue,
            };
            if size1 == 0 {
                continue;
            }

            std::thread::sleep(Duration::from_millis(800));

            let size2 = match std::fs::metadata(&path) {
                Ok(m) => m.len(),
                Err(_) => continue,
            };

            if size1 == size2 {
                let path_str = path.to_string_lossy().to_string();
                return detected(name, path_str);
            }
            // Size changed — still writing. It will be reconsidered on the
            // next poll iteration.
        }
    }
}
