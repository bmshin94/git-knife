import { invoke } from "@tauri-apps/api/core";
import type {
  ApplyResult,
  Backup,
  Commit,
  CommitEdit,
  FieldChange,
  RepoInfo,
} from "./types";

export const openRepo = (path: string) => invoke<RepoInfo>("open_repo", { path });

export const listCommits = (path: string, limit: number) =>
  invoke<Commit[]>("list_commits", { path, limit });

export const previewEdits = (path: string, edits: CommitEdit[]) =>
  invoke<FieldChange[]>("preview_edits", { path, edits });

export const applyEdits = (path: string, edits: CommitEdit[]) =>
  invoke<ApplyResult>("apply_edits", { path, edits });

export const listBackups = (path: string) =>
  invoke<Backup[]>("list_backups", { path });

export const restoreBackup = (path: string, refName: string) =>
  invoke<void>("restore_backup", { path, refName });
