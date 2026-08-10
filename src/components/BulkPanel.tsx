import { BULK_FIELDS, type BulkField, type BulkResult, type BulkSpec } from "../bulk";

interface Props {
  spec: BulkSpec;
  result: BulkResult;
  busy: boolean;
  onChange: (patch: Partial<BulkSpec>) => void;
  onStage: () => void;
  onClose: () => void;
}

/** Bulk find & replace across commit metadata, with literal or regex matching. */
export default function BulkPanel({
  spec,
  result,
  busy,
  onChange,
  onStage,
  onClose,
}: Props) {
  function toggleField(f: BulkField) {
    const has = spec.fields.includes(f);
    onChange({
      fields: has ? spec.fields.filter((x) => x !== f) : [...spec.fields, f],
    });
  }

  const canStage =
    !busy && !result.error && result.matchedCommits > 0 && spec.find.length > 0;

  return (
    <div className="bulk">
      <div className="bulk-head">
        <strong>Bulk find &amp; replace</strong>
        <button className="link" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="bulk-fields">
        {BULK_FIELDS.map((f) => (
          <label key={f.key} className="chk">
            <input
              type="checkbox"
              checked={spec.fields.includes(f.key)}
              onChange={() => toggleField(f.key)}
            />
            {f.label}
          </label>
        ))}
      </div>

      <div className="bulk-row">
        <label>
          <span>Find{spec.regex ? " (regex)" : ""}</span>
          <input
            value={spec.find}
            spellCheck={false}
            placeholder={spec.regex ? "e.g. old@(\\w+)\\.com" : "text to find"}
            onChange={(e) => onChange({ find: e.target.value })}
          />
        </label>
        <label>
          <span>Replace{spec.regex ? " ($1 backrefs ok)" : ""}</span>
          <input
            value={spec.replace}
            spellCheck={false}
            placeholder="replacement"
            onChange={(e) => onChange({ replace: e.target.value })}
          />
        </label>
      </div>

      <div className="bulk-opts">
        <label className="chk">
          <input
            type="checkbox"
            checked={spec.regex}
            onChange={(e) => onChange({ regex: e.target.checked })}
          />
          Regex
        </label>
        <label className="chk">
          <input
            type="checkbox"
            checked={spec.caseSensitive}
            onChange={(e) => onChange({ caseSensitive: e.target.checked })}
          />
          Case-sensitive
        </label>

        <span className="bulk-status">
          {result.error ? (
            <span className="err">{result.error}</span>
          ) : spec.find.length === 0 ? (
            <span className="muted">Enter text to preview matches</span>
          ) : (
            <span className={result.matchedCommits ? "ok" : "muted"}>
              {result.matchedCommits} commit
              {result.matchedCommits === 1 ? "" : "s"} · {result.replacements}{" "}
              replacement{result.replacements === 1 ? "" : "s"}
            </span>
          )}
        </span>

        <button className="primary" onClick={onStage} disabled={!canStage}>
          Stage {result.matchedCommits || ""} edit
          {result.matchedCommits === 1 ? "" : "s"}
        </button>
      </div>

      <p className="muted small bulk-note">
        Staged edits appear as highlighted rows — review them in the table, then
        use <strong>Review &amp; apply</strong>. Merge commits are skipped.
      </p>
    </div>
  );
}
