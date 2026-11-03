import { unzipSync, strFromU8 } from 'fflate';

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const texts = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}(?: [^>]*)?>([^<]*)</${tag}>`, 'g'))].map((m) => decode(m[1]));

function unzip(bytes: Uint8Array) {
  const files = unzipSync(bytes);
  return (name: string) => (files[name] ? strFromU8(files[name]) : '');
}

/** Word: paragraphs as lines, tables as Markdown-like rows ("a | b | c"). */
export function docxText(bytes: Uint8Array): string {
  const xml = unzip(bytes)('word/document.xml');
  const body = xml.slice(xml.indexOf('<w:body'));
  const para = (p: string) => decode(p.replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<(?!\/?w:t[ >])[^>]+>/g, '').replace(/<\/?w:t[^>]*>/g, ''));
  const out: string[] = [];
  for (const block of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p[ >][\s\S]*?<\/w:p>|<w:p\/>/g)) {
    const b = block[0];
    if (b.startsWith('<w:tbl')) {
      for (const row of b.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)) {
        const cells = [...row[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((c) => [...c[0].matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map((p) => para(p[0])).join(' ').trim());
        out.push(`| ${cells.join(' | ')} |`);
      }
      out.push('');
    } else out.push(para(b));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Excel: every sheet as rows of ADDRESS=value using the cached values Excel saved. */
export function xlsxText(bytes: Uint8Array): string {
  const read = unzip(bytes);
  const shared = [...read('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1], 't').join(''));
  const rels = Object.fromEntries([...read('xl/_rels/workbook.xml.rels').matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="([^"]+)"/g)].map((m) => [m[1] ?? m[4], m[2] ?? m[3]]));
  const sheets = [...read('xl/workbook.xml').matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)];
  return sheets.map(([, name, rid]) => {
    const path = `xl/${String(rels[rid] ?? '').replace(/^\/?xl\//, '')}`;
    const rows = [...read(path).matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => [...r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>/g)].map(([, ref, attrs, inner]) => {
      const v = /<v>([^<]*)<\/v>/.exec(inner)?.[1] ?? texts(inner, 't').join('');
      const f = /<f[^>]*>([^<]*)<\/f>/.exec(inner)?.[1];
      const val = /t="s"/.test(attrs) ? shared[Number(v)] ?? '' : decode(v);
      return val || f ? `${ref}=${val}${f ? ` {=${decode(f)}}` : ''}` : '';
    }).filter(Boolean).join(' | ')).filter(Boolean);
    return `## Sheet: ${decode(name)}\n${rows.join('\n')}`;
  }).join('\n\n');
}

/** PowerPoint: each slide's text boxes in slide order, plus speaker notes. */
export function pptxText(bytes: Uint8Array): string {
  const read = unzip(bytes);
  const rels = Object.fromEntries([...read('ppt/_rels/presentation.xml.rels').matchAll(/<Relationship [^>]*>/g)].map((m) => [/Id="([^"]+)"/.exec(m[0])?.[1], /Target="([^"]+)"/.exec(m[0])?.[1]]));
  const ids = [...read('ppt/presentation.xml').matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
  return ids.map((rid, i) => {
    const path = `ppt/${String(rels[rid]).replace(/^\/?ppt\//, '')}`;
    const xml = read(path);
    const boxes = [...xml.matchAll(/<p:txBody>([\s\S]*?)<\/p:txBody>/g)].map((b) => [...b[1].matchAll(/<a:p>([\s\S]*?)<\/a:p>|<a:p\/>/g)].map((p) => texts(p[1] ?? '', 'a:t').join('')).filter(Boolean).join(' / ')).filter(Boolean);
    const relXml = read(path.replace('slides/', 'slides/_rels/') + '.rels');
    const notesPath = /Target="\.\.\/notesSlides\/([^"]+)"/.exec(relXml)?.[1];
    const notes = notesPath ? texts(read(`ppt/notesSlides/${notesPath}`), 'a:t').join(' ').replace(/\s+\d+\s*$/, '') : '';
    return `## Slide ${i + 1}\n${boxes.join('\n')}${notes ? `\nNOTES: ${notes}` : ''}`;
  }).join('\n\n');
}
