import { useMemo } from "react";

interface Props {
  /** ISO-8601 with offset, e.g. 2020-01-02T12:00:00+05:30 */
  value: string;
  onChange: (iso: string) => void;
  edited?: boolean;
}

const ISO_RE =
  /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}:?\d{2}|Z)$/;

interface Parts {
  local: string; // YYYY-MM-DDTHH:MM for <input type=datetime-local>
  seconds: string; // SS
  offset: string; // ±HH:MM
}

function parse(value: string): Parts {
  const m = ISO_RE.exec(value.trim());
  if (!m) {
    return { local: "", seconds: "00", offset: "+00:00" };
  }
  const [, date, hh, mm, ss, rawOff] = m;
  let offset = rawOff === "Z" ? "+00:00" : rawOff;
  if (!offset.includes(":") && offset.length === 5) {
    offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
  }
  return { local: `${date}T${hh}:${mm}`, seconds: ss, offset };
}

function compose(p: Parts): string {
  if (!p.local) return "";
  const off = /^[+-]\d{2}:\d{2}$/.test(p.offset) ? p.offset : "+00:00";
  return `${p.local}:${p.seconds}${off}`;
}

/** Edits an ISO date as a datetime-local input plus an explicit UTC offset. */
export default function DateField({ value, onChange, edited }: Props) {
  const parts = useMemo(() => parse(value), [value]);

  return (
    <span className={`datefield${edited ? " edited" : ""}`}>
      <input
        type="datetime-local"
        step={1}
        value={parts.local}
        onChange={(e) => onChange(compose({ ...parts, local: e.target.value }))}
      />
      <input
        className="offset"
        type="text"
        spellCheck={false}
        value={parts.offset}
        placeholder="+00:00"
        title="UTC offset, e.g. +02:00"
        onChange={(e) => onChange(compose({ ...parts, offset: e.target.value }))}
      />
    </span>
  );
}
