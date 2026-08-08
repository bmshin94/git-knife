import { Fragment } from "react";
import type { Commit, CommitEdit } from "../types";
import DateField from "./DateField";

export type EditableField = keyof Omit<CommitEdit, "hash">;

interface Props {
  commits: Commit[];
  edits: Record<string, CommitEdit>;
  expanded: string | null;
  onToggle: (hash: string) => void;
  onField: (hash: string, field: EditableField, value: string, original: string) => void;
  onResetRow: (hash: string) => void;
}

/** Reconstruct the full message the way it is stored (subject + blank + body). */
export function fullMessage(c: Commit): string {
  return c.body.trim() ? `${c.subject}\n\n${c.body.trim()}` : c.subject;
}

function shortDate(iso: string): string {
  // Show the stored local time without the offset for compactness.
  return iso.replace("T", " ").replace(/([+-]\d{2}:\d{2})$/, " $1");
}

export default function CommitTable({
  commits,
  edits,
  expanded,
  onToggle,
  onField,
  onResetRow,
}: Props) {
  return (
    <table className="commits">
      <thead>
        <tr>
          <th className="col-hash">Commit</th>
          <th className="col-subject">Subject</th>
          <th className="col-author">Author</th>
          <th className="col-date">Author date</th>
          <th className="col-date">Committer date</th>
        </tr>
      </thead>
      <tbody>
        {commits.map((c) => {
          const edit = edits[c.hash];
          const dirty = !!edit;
          const eff = (f: EditableField, original: string) =>
            (edit?.[f] as string | undefined) ?? original;
          const isOpen = expanded === c.hash;

          const origMsg = fullMessage(c);

          return (
            <Fragment key={c.hash}>
              <tr
                className={
                  "commit-row" +
                  (dirty ? " dirty" : "") +
                  (c.isMerge ? " merge" : "") +
                  (isOpen ? " open" : "")
                }
                onClick={() => !c.isMerge && onToggle(c.hash)}
                title={c.isMerge ? "Merge commits can't be edited in this version" : ""}
              >
                <td className="col-hash">
                  <code>{c.hash.slice(0, 8)}</code>
                  {c.isMerge && <span className="badge">merge</span>}
                  {dirty && <span className="dot" title="edited" />}
                </td>
                <td className="col-subject">{eff("message", origMsg).split("\n")[0]}</td>
                <td className="col-author">
                  {eff("authorName", c.authorName)}
                </td>
                <td className="col-date">{shortDate(eff("authorDate", c.authorDate))}</td>
                <td className="col-date">
                  {shortDate(eff("committerDate", c.committerDate))}
                </td>
              </tr>

              {isOpen && (
                <tr key={c.hash + "-editor"} className="editor-row">
                  <td colSpan={5}>
                    <div className="editor">
                      <label className="full">
                        <span>Message</span>
                        <textarea
                          rows={3}
                          value={eff("message", origMsg)}
                          onChange={(e) =>
                            onField(c.hash, "message", e.target.value, origMsg)
                          }
                        />
                      </label>

                      <label>
                        <span>Author name</span>
                        <input
                          value={eff("authorName", c.authorName)}
                          onChange={(e) =>
                            onField(c.hash, "authorName", e.target.value, c.authorName)
                          }
                        />
                      </label>
                      <label>
                        <span>Author email</span>
                        <input
                          value={eff("authorEmail", c.authorEmail)}
                          onChange={(e) =>
                            onField(c.hash, "authorEmail", e.target.value, c.authorEmail)
                          }
                        />
                      </label>

                      <label>
                        <span>Author date</span>
                        <DateField
                          value={eff("authorDate", c.authorDate)}
                          edited={edit?.authorDate !== undefined}
                          onChange={(v) => onField(c.hash, "authorDate", v, c.authorDate)}
                        />
                      </label>
                      <label>
                        <span>Committer date</span>
                        <DateField
                          value={eff("committerDate", c.committerDate)}
                          edited={edit?.committerDate !== undefined}
                          onChange={(v) =>
                            onField(c.hash, "committerDate", v, c.committerDate)
                          }
                        />
                      </label>

                      <label>
                        <span>Committer name</span>
                        <input
                          value={eff("committerName", c.committerName)}
                          onChange={(e) =>
                            onField(c.hash, "committerName", e.target.value, c.committerName)
                          }
                        />
                      </label>
                      <label>
                        <span>Committer email</span>
                        <input
                          value={eff("committerEmail", c.committerEmail)}
                          onChange={(e) =>
                            onField(c.hash, "committerEmail", e.target.value, c.committerEmail)
                          }
                        />
                      </label>

                      <div className="editor-actions">
                        <code className="muted">{c.hash}</code>
                        {dirty && (
                          <button className="link" onClick={() => onResetRow(c.hash)}>
                            Reset this commit
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
