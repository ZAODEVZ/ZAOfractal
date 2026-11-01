// A small Markdown block parser for the whitepaper reader. Native text, no webview.
export type Inline = { text: string; bold?: boolean; italic?: boolean; code?: boolean; href?: string };

export type Block =
  | { kind: 'h2' | 'h3'; text: string }
  | { kind: 'p' | 'quote'; spans: Inline[] }
  | { kind: 'li'; ordered: string | null; spans: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'table'; rows: Inline[][][] }
  | { kind: 'rule' };

const INLINE = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;
const FENCE = '`'.repeat(3);

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ text: src.slice(last, index) });
    const t = m[0];
    if (t.startsWith('**')) out.push({ text: t.slice(2, -2), bold: true });
    else if (t.startsWith('`')) out.push({ text: t.slice(1, -1), code: true });
    else if (t.startsWith('[')) {
      const link = LINK.exec(t);
      if (link) out.push(/^https?:\/\//.test(link[2]) ? { text: link[1], href: link[2] } : { text: link[1] });
    } else out.push({ text: t.slice(1, -1), italic: true });
    last = index + t.length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

export function parseBlocks(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const out: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: 'p', spans: parseInline(para.join(' ')) });
    para = [];
  };
  const cells = (l: string) =>
    l.trim().replace(/^\||\|$/g, '').split('|').map((c) => parseInline(c.trim()));

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith(FENCE)) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].trim().startsWith(FENCE); i++) code.push(lines[i]);
      out.push({ kind: 'code', text: code.join('\n') });
    } else if (!t) {
      flush();
    } else if (/^(-{3,}|\*{3,})$/.test(t)) {
      flush();
      out.push({ kind: 'rule' });
    } else if (/^#{1,2} /.test(t)) {
      flush();
      out.push({ kind: 'h2', text: t.replace(/^#+ /, '') });
    } else if (/^#{3,6} /.test(t)) {
      flush();
      out.push({ kind: 'h3', text: t.replace(/^#+ /, '') });
    } else if (t.startsWith('>')) {
      flush();
      out.push({ kind: 'quote', spans: parseInline(t.replace(/^>+ ?/, '')) });
    } else if (/^[-*] /.test(t)) {
      flush();
      out.push({ kind: 'li', ordered: null, spans: parseInline(t.slice(2)) });
    } else if (/^\d+\. /.test(t)) {
      flush();
      const m = /^(\d+)\. (.*)$/.exec(t);
      if (m) out.push({ kind: 'li', ordered: m[1], spans: parseInline(m[2]) });
    } else if (t.startsWith('|') && /^\|?[\s:|-]+\|?$/.test(lines[i + 1]?.trim() ?? '')) {
      flush();
      const rows = [cells(t)];
      for (i += 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(cells(lines[i]));
      i--;
      out.push({ kind: 'table', rows });
    } else {
      para.push(t);
    }
  }
  flush();
  return out;
}
