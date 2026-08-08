import { useMemo, useState } from "react";
import { open as openDialog, ask } from "@tauri-apps/plugin-dialog";
import {
  applyEdits,
  listBackups,
  listCommits,
  openRepo,
  previewEdits,
  restoreBackup,
} from "./api";
import type { Backup, Commit, CommitEdit, FieldChange, RepoInfo } from "./types";
import CommitTable, { type EditableField } from "./components/CommitTable";
import ApplyBar, { ConfirmDialog } from "./components/ApplyBar";
import BackupPanel from "./components/BackupPanel";

const LIMIT = 200;

export default function App() {
  const [pathInput, setPathInput] = useState("");
  const [repo, setRepo] = useState<RepoInfo | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [edits, setEdits] = useState<Record<string, CommitEdit>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<FieldChange[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dirtyCount = Object.keys(edits).length;

  // Commits are newest-first; the rewrite range spans from the oldest edited
  // commit up to the tip, so its length is (max dirty index + 1).
  const rewriteCount = useMemo(() => {
    let maxIdx = -1;
    commits.forEach((c, i) => {
      if (edits[c.hash]) maxIdx = Math.max(maxIdx, i);
    });
    return maxIdx + 1;
  }, [commits, edits]);

  const pushedWarning =
    repo?.aheadOfUpstream != null && rewriteCount > repo.aheadOfUpstream;

  async function reload(path: string) {
    const [cs, bs] = await Promise.all([listCommits(path, LIMIT), listBackups(path)]);
    setCommits(cs);
    setBackups(bs);
  }

  async function doOpen(path: string) {
    if (!path.trim()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const info = await openRepo(path.trim());
      setRepo(info);
      setPathInput(info.path);
      setEdits({});
      setExpanded(null);
      await reload(info.path);
    } catch (e) {
      setRepo(null);
      setCommits([]);
      setBackups([]);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function browse() {
    const picked = await openDialog({ directory: true, title: "Select a git repository" });
    if (typeof picked === "string") {
      setPathInput(picked);
      await doOpen(picked);
    }
  }

  function onField(
    hash: string,
    field: EditableField,
    value: string,
    original: string
  ) {
    setEdits((prev) => {
      const cur: CommitEdit = { ...(prev[hash] ?? { hash }) };
      if (value === original) {
        delete cur[field];
      } else {
        cur[field] = value;
      }
      const hasEdits = Object.keys(cur).some((k) => k !== "hash");
      const next = { ...prev };
      if (hasEdits) next[hash] = cur;
      else delete next[hash];
      return next;
    });
  }

  function resetRow(hash: string) {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[hash];
      return next;
    });
  }

  function toggle(hash: string) {
    setExpanded((cur) => (cur === hash ? null : hash));
  }

  async function startApply() {
    if (!repo) return;
    setBusy(true);
    setError(null);
    try {
      const changes = await previewEdits(repo.path, Object.values(edits));
      setConfirm(changes);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function confirmApply() {
    if (!repo) return;
    setBusy(true);
    setError(null);
    try {
      const res = await applyEdits(repo.path, Object.values(edits));
      setConfirm(null);
      setEdits({});
      setExpanded(null);
      setNotice(
        `Rewrote ${res.rewrittenCount} commit${res.rewrittenCount === 1 ? "" : "s"}. ` +
          `New HEAD ${res.newHead.slice(0, 8)} · backup ${res.backupRef}`
      );
      const info = await openRepo(repo.path);
      setRepo(info);
      await reload(info.path);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function restore(refName: string) {
    if (!repo) return;
    const ok = await ask(
      "Restore this backup? This runs `git reset --hard` and discards the " +
        "current branch tip (and any uncommitted changes).",
      { title: "Restore backup", kind: "warning" }
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await restoreBackup(repo.path, refName);
      setEdits({});
      setExpanded(null);
      setNotice("Restored from backup.");
      const info = await openRepo(repo.path);
      setRepo(info);
      await reload(info.path);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🔪</span>
          <span>git-knife</span>
        </div>
        <div className="repo-open">
          <input
            className="path"
            placeholder="/path/to/repository"
            value={pathInput}
            spellCheck={false}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doOpen(pathInput)}
          />
          <button className="ghost" onClick={browse} disabled={busy}>
            Browse…
          </button>
          <button className="primary" onClick={() => doOpen(pathInput)} disabled={busy}>
            Open
          </button>
        </div>
      </header>

      {repo && (
        <div className="repo-info">
          <span>
            <span className="muted">branch</span> <strong>{repo.branch}</strong>
          </span>
          <span>
            <span className="muted">HEAD</span> <code>{repo.head.slice(0, 8)}</code>
          </span>
          <span>
            <span className="muted">upstream</span>{" "}
            {repo.upstream ? (
              <>
                <code>{repo.upstream}</code>
                {repo.aheadOfUpstream != null && (
                  <span className="muted"> ({repo.aheadOfUpstream} ahead)</span>
                )}
              </>
            ) : (
              <span className="muted">none</span>
            )}
          </span>
        </div>
      )}

      {error && (
        <div className="banner error" onClick={() => setError(null)}>
          {error}
        </div>
      )}
      {notice && (
        <div className="banner notice" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}

      <main className="content">
        {!repo ? (
          <div className="empty">
            <h1>Edit any commit — message, dates, author.</h1>
            <p className="muted">
              Open a git repository to see its commits. Click a commit to edit its
              message, author/committer name, email, and dates, then apply. Every
              rewrite is backed up first and never changes file contents.
            </p>
          </div>
        ) : (
          <div className="workspace">
            <div className="table-wrap">
              {commits.length === 0 ? (
                <p className="muted">No commits found.</p>
              ) : (
                <CommitTable
                  commits={commits}
                  edits={edits}
                  expanded={expanded}
                  onToggle={toggle}
                  onField={onField}
                  onResetRow={resetRow}
                />
              )}
            </div>
            <BackupPanel backups={backups} busy={busy} onRestore={restore} />
          </div>
        )}
      </main>

      <ApplyBar
        dirtyCount={dirtyCount}
        rewriteCount={rewriteCount}
        pushedWarning={!!pushedWarning}
        busy={busy}
        onApply={startApply}
        onDiscard={() => setEdits({})}
      />

      {confirm && (
        <ConfirmDialog
          changes={confirm}
          busy={busy}
          onConfirm={confirmApply}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
