//! Backup refs created before each rewrite, and restoring from them.
//!
//! Backups live under `refs/knife-backup/<branch>/<epoch-seconds>` and point at
//! the branch tip as it was immediately before an apply. Restoring is a plain
//! `git reset --hard` to that commit.

use serde::Serialize;

use crate::commits;
use crate::git;

const US: char = '\u{1f}';

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Backup {
    pub ref_name: String,
    /// Commit hash the backup points at.
    pub target: String,
    /// Unix epoch seconds (as a string) parsed from the ref name.
    pub created_at: String,
    pub branch: String,
    /// Subject of the target commit, for display.
    pub subject: String,
}

/// List all knife backup refs, newest first.
pub fn list_backups(path: &str) -> Result<Vec<Backup>, String> {
    let info = commits::open_repo(path)?;
    let repo = info.path.as_str();

    let out = git::run(
        repo,
        &[
            "for-each-ref",
            &format!("--format=%(refname){US}%(objectname){US}%(subject)"),
            "refs/knife-backup",
        ],
        &[],
        None,
    )?;

    let mut backups = Vec::new();
    for line in out.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let f: Vec<&str> = line.split(US).collect();
        if f.len() < 3 {
            continue;
        }
        let ref_name = f[0].to_string();
        let rest = ref_name
            .strip_prefix("refs/knife-backup/")
            .unwrap_or(&ref_name);
        // Branch may contain slashes; the final segment is the timestamp.
        let (branch, created_at) = match rest.rsplit_once('/') {
            Some((b, t)) => (b.to_string(), t.to_string()),
            None => (String::new(), rest.to_string()),
        };
        backups.push(Backup {
            ref_name,
            target: f[1].to_string(),
            created_at,
            branch,
            subject: f[2].to_string(),
        });
    }

    // Newest first by epoch timestamp.
    backups.sort_by(|a, b| {
        let ai = a.created_at.parse::<u64>().unwrap_or(0);
        let bi = b.created_at.parse::<u64>().unwrap_or(0);
        bi.cmp(&ai)
    });

    Ok(backups)
}

/// Restore the working branch to a backup ref via `git reset --hard`.
pub fn restore_backup(path: &str, ref_name: &str) -> Result<(), String> {
    if !ref_name.starts_with("refs/knife-backup/") {
        return Err("Refusing to restore a ref outside refs/knife-backup/.".to_string());
    }
    let info = commits::open_repo(path)?;
    let repo = info.path.as_str();

    let target = git::run(repo, &["rev-parse", ref_name], &[], None)?
        .trim()
        .to_string();
    git::run(repo, &["reset", "--hard", &target], &[], None)?;
    Ok(())
}
