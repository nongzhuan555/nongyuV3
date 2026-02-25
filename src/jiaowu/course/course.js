export function cleanCourseHtml(html) {
  if (!html || typeof html !== 'string') return { grid: [], rows: 0, cols: 0 };
  // 使用非贪婪匹配获取所有 table，避免大文本正则性能问题
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi);
  const tables = tableMatches ? Array.from(tableMatches) : [];
  const target = tables.sort((a, b) => b.length - a.length)[0] || html;
  
  // 使用非贪婪匹配获取所有 tr
  const rowMatches = target.match(/<tr[\s\S]*?<\/tr>/gi);
  const rows = rowMatches ? Array.from(rowMatches) : [];
  
  const grid = rows.map(row => {
    // 匹配 td 或 th
    const cellMatches = row.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi);
    const cells = cellMatches ? Array.from(cellMatches).map(cellHtml => {
       // 提取标签内容：简单去除首尾标签
       return cellHtml.replace(/^<(td|th)[^>]*>/i, '').replace(/<\/(td|th)>$/i, '');
    }) : [];
    
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
