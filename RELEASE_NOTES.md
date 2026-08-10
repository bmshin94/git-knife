# git-knife v0.1.0 🔪

A clean desktop GUI for editing git commit metadata directly — **message, author
date, committer date, author/committer name & email** — like editing a table. It
wraps the real `git` CLI and rebuilds commits with `commit-tree`, reusing each
original tree, so **file contents are never changed** — only metadata.

## Highlights

- ✏️ **Edit any commit's** message, author/committer name, email, and dates (timezone-aware)
- 🔎 **Bulk find & replace** across commit metadata — literal or **regex** (great for fixing a wrong email across a whole history)
- 👀 **Preview every change** before it's applied
- ♻️ **Automatic backup** ref before each rewrite + one-click restore — nothing is unrecoverable
- 🔪 Transparent, opt-out **signature note** on `refs/notes/git-knife`
- 🔒 Merge commits are locked (linear history only, this release)

## Downloads

| OS | File |
|----|------|
| **Windows** | `.msi` (or the `-setup.exe`) |
| **macOS** (Apple Silicon + Intel) | `.dmg` |
| **Linux** | `.AppImage` (portable) or `.deb` |

> ⚠️ **Unsigned builds.** No code-signing cert yet, so macOS shows an
> "unidentified developer" prompt (right-click → Open) and Windows shows
> SmartScreen (More info → Run anyway). Safe to dismiss — or build from source.

## After a rewrite

Rewriting changes commit hashes, so pushing needs a force-with-lease:

    git push --force-with-lease origin <branch>

## Known limitations

- No reorder / squash / drop yet, and no merge-commit rewriting (planned).
- Not a full git client — this release is focused on commit-metadata editing.

Built with Tauri 2 + React. Feedback and issues welcome!
