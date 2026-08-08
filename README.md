# git-knife 🔪

A clean desktop GUI for editing git commit metadata directly — **message,
author date, committer date, author name/email** — like editing a table.

Existing GUIs (GitKraken, Sublime Merge, Fork, lazygit) reword and reorder well
but treat commit **dates** as effectively immutable and don't expose committer
date / author identity for arbitrary commits. The tools that *can* rewrite that
metadata (`git-filter-repo`, `git rebase` env tricks, `git commit-tree`) have no
GUI. git-knife fills that gap.

It never reimplements git — it shells out to the system `git` CLI and rebuilds
commits with `git commit-tree`, reusing each commit's original tree so **file
contents are provably never changed**.

## Status (MVP)

- ✅ Open a repo, list commits on the current branch
- ✅ Edit message / author name+email / author date / committer date / committer name+email
- ✅ Preview every change before applying
- ✅ Automatic backup ref before each rewrite + one-click restore
- ✅ Warns when a rewrite would touch already-pushed history
- ✅ Merge commits are locked (not editable in this version)
- ⛔ Not yet: reorder / squash / drop, merge rewriting, staging/branches/remotes

## Requirements

- **git** (2.x)
- **Node.js** + **pnpm** (`corepack enable pnpm`, or `npm i -g pnpm`)
- **Rust** (stable) — install via <https://rustup.rs>
- Linux system deps for Tauri v2: `webkit2gtk-4.1`, `libgtk-3`, `libayatana-appindicator3`, `librsvg2`
  (Debian/Ubuntu: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`)

## Run (dev)

```bash
pnpm install
pnpm tauri dev
```

The first `cargo` build downloads and compiles the Tauri crates (a few minutes).

## Build a bundle

```bash
pnpm tauri build
```

> Packaging (`tauri build`) needs app icons. Generate them once from any square
> PNG with `pnpm tauri icon path/to/icon.png`, which populates
> `src-tauri/icons/`. Dev runs don't need this.

## How it works

- `src-tauri/src/git.rs` — the only place that spawns `git`.
- `commits.rs` — `open_repo`, `list_commits` (NUL/record-separator parsing).
- `rewrite.rs` — `preview_edits` + `apply_edits`: rebuilds the chain from the
  earliest edited commit to the tip via `commit-tree`, then saves a backup ref
  and moves the branch with a compare-and-swap on the old tip.
- `backup.rs` — lists `refs/knife-backup/*` and restores via `git reset --hard`.

The rewrite strategy is validated at the git level by
`scratchpad/verify_engine.sh` (reproduces the exact commit-tree flow and asserts
the content diff is empty).

## Safety

Every apply creates `refs/knife-backup/<branch>/<epoch>` pointing at the old tip
before touching anything. Nothing is force-deleted; restore is always available
from the Backups panel.
