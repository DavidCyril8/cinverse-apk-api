export interface SubtitleEntry {
  startMs: number;
  endMs: number;
  text: string;
}

function parseTime(raw: string): number {
  const s = raw.trim().replace(",", ".");
  const parts = s.split(":");
  if (parts.length === 3) {
    return (parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])) * 1000;
  }
  if (parts.length === 2) {
    return (parseInt(parts[0]) * 60 + parseFloat(parts[1])) * 1000;
  }
  return parseFloat(s) * 1000;
}

export function parseSubtitle(raw: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  const content = raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const blocks = content.split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.trim().split("\n");
    let ti = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("-->")) { ti = i; break; }
    }
    if (ti === -1) continue;

    const timeParts = lines[ti].split("-->");
    if (timeParts.length < 2) continue;

    const startMs = parseTime(timeParts[0]);
    const endRaw = timeParts[1].split(/\s+/).find((p) => p.includes(":")) ?? timeParts[1];
    const endMs = parseTime(endRaw);

    const txt = lines
      .slice(ti + 1)
      .join("\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\{[^}]+\}/g, "")
      .trim();

    if (txt && endMs > startMs) {
      entries.push({ startMs, endMs, text: txt });
    }
  }
  return entries;
}

export function getCurrentSubtitle(entries: SubtitleEntry[], posMs: number): string | null {
  return entries.find((e) => posMs >= e.startMs && posMs <= e.endMs)?.text ?? null;
}
