import type { Backup } from "../types";

interface Props {
  backups: Backup[];
  busy: boolean;
  onRestore: (refName: string) => void;
}

function formatTime(epoch: string): string {
  const secs = Number(epoch);
  if (!Number.isFinite(secs) || secs <= 0) return epoch;
  return new Date(secs * 1000).toLocaleString();
}

/** Lists knife backup refs with one-click restore. */
export default function BackupPanel({ backups, busy, onRestore }: Props) {
  return (
    <aside className="backups">
      <h3>Backups</h3>
      {backups.length === 0 && (
        <p className="muted small">
          None yet. A backup is saved automatically before each rewrite.
        </p>
      )}
      <ul>
        {backups.map((b) => (
          <li key={b.refName}>
            <div className="backup-main">
              <code>{b.target.slice(0, 8)}</code>
              <span className="backup-subject">{b.subject}</span>
            </div>
            <div className="backup-meta">
              <span className="muted small">{formatTime(b.createdAt)}</span>
              <button
                className="link"
                disabled={busy}
                onClick={() => onRestore(b.refName)}
              >
                Restore
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
