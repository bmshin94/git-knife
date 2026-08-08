// Hide the console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod backup;
mod commits;
mod git;
mod rewrite;

use backup::Backup;
use commits::{Commit, RepoInfo};
use rewrite::{ApplyResult, CommitEdit, FieldChange};

#[tauri::command]
fn open_repo(path: String) -> Result<RepoInfo, String> {
    commits::open_repo(&path)
}

#[tauri::command]
fn list_commits(path: String, limit: u32) -> Result<Vec<Commit>, String> {
    commits::list_commits(&path, limit)
}

#[tauri::command]
fn preview_edits(path: String, edits: Vec<CommitEdit>) -> Result<Vec<FieldChange>, String> {
    rewrite::preview_edits(&path, &edits)
}

#[tauri::command]
fn apply_edits(path: String, edits: Vec<CommitEdit>) -> Result<ApplyResult, String> {
    rewrite::apply_edits(&path, &edits)
}

#[tauri::command]
fn list_backups(path: String) -> Result<Vec<Backup>, String> {
    backup::list_backups(&path)
}

#[tauri::command]
fn restore_backup(path: String, ref_name: String) -> Result<(), String> {
    backup::restore_backup(&path, &ref_name)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_repo,
            list_commits,
            preview_edits,
            apply_edits,
            list_backups,
            restore_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running git-knife");
}
