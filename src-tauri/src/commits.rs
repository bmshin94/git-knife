//! Reading repository metadata and the commit list.
//!
//! `git log` is asked to emit fields separated by the ASCII unit separator
//! (0x1f) and records separated by the record separator (0x1e), which cannot
//! occur in commit metadata, so parsing is unambiguous even with multi-line
//! bodies.

use serde::Serialize;

use crate::git;

const US: char = '\u{1f}'; // unit separator, between fields
const RS: char = '\u{1e}'; // record separator, between commits

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    /// Absolute path to the repository top level.
    pub path: String,
    /// Current branch name, or "HEAD" when detached.
    pub branch: String,
    /// Full HEAD commit hash.
    pub head: String,
    /// Upstream tracking ref (e.g. "origin/main"), if configured.
    pub upstream: Option<String>,
    /// Number of local commits not present on the upstream (i.e. unpushed).
    pub ahead_of_upstream: Option<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Commit {
    pub hash: String,
    pub parents: Vec<String>,
    pub author_name: String,
    pub author_email: String,
    /// Strict ISO-8601 with offset, e.g. `2020-01-02T12:00:00+00:00`.
    pub author_date: String,
    pub committer_name: String,
    pub committer_email: String,
    pub committer_date: String,
    pub subject: String,
    pub body: String,
    pub is_merge: bool,
}

/// Validate a path is inside a git repo and return branch/HEAD/upstream info.
pub fn open_repo(path: &str) -> Result<RepoInfo, String> {
    let top = git::run(path, &["rev-parse", "--show-toplevel"], &[], None)
        .map_err(|_| format!("Not a git repository: {path}"))?
        .trim()
        .to_string();

    let branch = git::run(&top, &["rev-parse", "--abbrev-ref", "HEAD"], &[], None)?
        .trim()
        .to_string();

    let head = git::run(&top, &["rev-parse", "HEAD"], &[], None)
        .map_err(|_| "Repository has no commits yet".to_string())?
        .trim()
        .to_string();

    let upstream = git::run(
        &top,
        &[
            "rev-parse",
            "--abbrev-ref",
            "--symbolic-full-name",
            "@{upstream}",
        ],
        &[],
        None,
    )
    .ok()
    .map(|s| s.trim().to_string());

    let ahead_of_upstream = upstream.as_ref().and_then(|up| {
        git::run(
            &top,
            &["rev-list", "--count", &format!("{up}..HEAD")],
            &[],
            None,
        )
        .ok()
        .and_then(|s| s.trim().parse::<u32>().ok())
    });

    Ok(RepoInfo {
        path: top,
        branch,
        head,
        upstream,
        ahead_of_upstream,
    })
}

/// List up to `limit` commits reachable from HEAD, newest first.
pub fn list_commits(repo: &str, limit: u32) -> Result<Vec<Commit>, String> {
    let limit = limit.max(1);
    let fmt = format!(
        "--format=%H{US}%P{US}%an{US}%ae{US}%aI{US}%cn{US}%ce{US}%cI{US}%s{US}%b{RS}"
    );
    let out = git::run(
        repo,
        &["log", &format!("-{limit}"), &fmt],
        &[],
        None,
    )?;

    let mut commits = Vec::new();
    for record in out.split(RS) {
        let record = record.trim_start_matches('\n');
        if record.trim().is_empty() {
            continue;
        }
        let f: Vec<&str> = record.split(US).collect();
        if f.len() < 10 {
            continue;
        }
        let parents: Vec<String> = f[1].split_whitespace().map(str::to_string).collect();
        let is_merge = parents.len() > 1;
        commits.push(Commit {
            hash: f[0].to_string(),
            parents,
            author_name: f[2].to_string(),
            author_email: f[3].to_string(),
            author_date: f[4].to_string(),
            committer_name: f[5].to_string(),
            committer_email: f[6].to_string(),
            committer_date: f[7].to_string(),
            subject: f[8].to_string(),
            body: f[9].to_string(),
            is_merge,
        });
    }
    Ok(commits)
}
