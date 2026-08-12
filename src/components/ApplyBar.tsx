import type { FieldChange } from "../types";

interface Props {
  dirtyCount: number;
  rewriteCount: number; // commits that will be rebuilt (incl. descendants)
  pushedWarning: boolean;
  signedCount: number; // signed commits inside the rewrite range
  resign: boolean;
  onToggleResign: (next: boolean) => void;
  busy: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

/** Sticky action bar shown while there are pending edits. */
export default function ApplyBar({
  dirtyCount,
  rewriteCount,
  pushedWarning,
  signedCount,
  resign,
  onToggleResign,
  busy,
  onApply,
  onDiscard,
}: Props) {
  if (dirtyCount === 0) return null;
  return (
    <div className="applybar">
      <div className="applybar-info">
        <strong>{dirtyCount}</strong> commit{dirtyCount === 1 ? "" : "s"} edited
        <span className="sep">·</span>
        <span className="muted">
          {rewriteCount} commit{rewriteCount === 1 ? "" : "s"} will be rewritten
        </span>
        {pushedWarning && (
          <span className="warn" title="Some of these commits appear to be pushed">
            ⚠ rewrites pushed history
          </span>
        )}
        {signedCount > 0 && (
          <span className="warn" title="Rewriting strips GPG/SSH signatures">
            ⚠ {signedCount} signed
          </span>
        )}
        {signedCount > 0 && (
          <label
            className="chk resign-toggle"
            title="Re-sign the rebuilt commits with your configured key (user.signingkey / gpg.format)"
          >
            <input
              type="checkbox"
              checked={resign}
              onChange={(e) => onToggleResign(e.target.checked)}
            />
            re-sign
          </label>
        )}
      </div>
      <div className="applybar-actions">
        <button className="ghost" onClick={onDiscard} disabled={busy}>
          Discard edits
        </button>
        <button className="primary" onClick={onApply} disabled={busy}>
          {busy ? "Applying…" : "Review & apply"}
        </button>
      </div>
    </div>
  );
}

interface ConfirmProps {
  changes: FieldChange[];
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal that previews every field change before rewriting. */
export function ConfirmDialog({ changes, busy, onConfirm, onCancel }: ConfirmProps) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Confirm rewrite</h2>
        <p className="muted">
          A backup ref will be created before anything changes. File contents are
          not touched — only the metadata below.
        </p>
        <div className="changes">
          {changes.length === 0 && <p>No effective changes.</p>}
          {changes.map((ch, i) => (
            <div className="change" key={i}>
              <div className="change-head">
                <code>{ch.hash.slice(0, 8)}</code>
                <span className="field">{ch.field}</span>
              </div>
              <div className="change-diff">
                <span className="old">{ch.oldValue || "∅"}</span>
                <span className="arrow">→</span>
                <span className="new">{ch.newValue || "∅"}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={onConfirm}
            disabled={busy || changes.length === 0}
          >
            {busy ? "Rewriting…" : "Rewrite history"}
          </button>
        </div>
      </div>
    </div>
  );
}
