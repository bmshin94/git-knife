import type { Commit, CommitEdit } from "./types";
import { fullMessage } from "./components/CommitTable";

/** Fields a bulk find & replace can target. */
export type BulkField =
  | "message"
  | "authorName"
  | "authorEmail"
  | "committerName"
  | "committerEmail";

export const BULK_FIELDS: { key: BulkField; label: string }[] = [
  { key: "message", label: "Message" },
  { key: "authorName", label: "Author name" },
  { key: "authorEmail", label: "Author email" },
  { key: "committerName", label: "Committer name" },
  { key: "committerEmail", label: "Committer email" },
];

export interface BulkSpec {
  fields: BulkField[];
  find: string;
  replace: string;
  regex: boolean;
  caseSensitive: boolean;
}

export const emptyBulkSpec: BulkSpec = {
  fields: ["message"],
  find: "",
  replace: "",
  regex: false,
  caseSensitive: true,
};

export interface BulkResult {
  /** hash -> { field -> new value } for commits that would change. */
  edits: Record<string, Partial<Record<BulkField, string>>>;
  matchedCommits: number;
  replacements: number;
  error: string | null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Current effective value of a field (a pending edit if any, else the original). */
export function effectiveValue(
  c: Commit,
  field: BulkField,
  edits: Record<string, CommitEdit>
): string {
  const e = edits[c.hash];
  if (field === "message") {
    return (e?.message as string | undefined) ?? fullMessage(c);
  }
  const key = field as Exclude<BulkField, "message">;
  return (e?.[key] as string | undefined) ?? c[key];
}

/**
 * Compute a bulk find & replace over the given commits, honoring any pending
 * edits so successive bulk passes compose. Merge commits are skipped. Pure — it
 * does not mutate anything; the caller merges `edits` into its edit state.
 */
export function computeBulk(
  commits: Commit[],
  edits: Record<string, CommitEdit>,
  spec: BulkSpec
): BulkResult {
  const out: BulkResult = {
    edits: {},
    matchedCommits: 0,
    replacements: 0,
    error: null,
  };
  if (!spec.find || spec.fields.length === 0) return out;

  let re: RegExp;
  try {
    const flags = "g" + (spec.caseSensitive ? "" : "i");
    re = new RegExp(spec.regex ? spec.find : escapeRegExp(spec.find), flags);
  } catch (err) {
    out.error = `Invalid regex: ${err instanceof Error ? err.message : String(err)}`;
    return out;
  }

  // In literal mode, keep `$` in the replacement literal (no $1 backrefs).
  const replacement = spec.regex ? spec.replace : spec.replace.replace(/\$/g, "$$$$");

  for (const c of commits) {
    if (c.isMerge) continue;
    const changed: Partial<Record<BulkField, string>> = {};
    let count = 0;

    for (const field of spec.fields) {
      const orig = effectiveValue(c, field, edits);
      const matches = orig.match(re);
      if (!matches) continue;
      const next = orig.replace(re, replacement);
      if (next !== orig) {
        changed[field] = next;
        count += matches.length;
      }
    }

    if (Object.keys(changed).length > 0) {
      out.edits[c.hash] = changed;
      out.matchedCommits += 1;
      out.replacements += count;
    }
  }

  return out;
}
