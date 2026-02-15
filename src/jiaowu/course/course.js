export function cleanCourseHtml(html) {
  if (!html || typeof html !== 'string') return { grid: [], rows: 0, cols: 0 };
  const tables = Array.from(html.matchAll(/<table[\s\S]*?<\/table>/gi)).map(m => m[0]);
  const target = tables.sort((a, b) => b.length - a.length)[0] || html;
  const rows = Array.from(target.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map(m => m[0]);
  const grid = rows.map(row => {
    const cells = Array.from(row.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)).map(m => m[2]);
    return cells.map(c => {
      let t = c.replace(/<br\s*\/?>/gi, '\n');
      t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
      t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
      t = t.replace(/<[^>]+>/g, '');
      t = t.replace(/&nbsp;|&#160;/gi, ' ');
      t = t.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/g, '\'');
      return t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    });
  });
  const maxCols = grid.reduce((m, r) => Math.max(m, r.length), 0);
  return { grid, rows: grid.length, cols: maxCols };
}

export default cleanCourseHtml;
