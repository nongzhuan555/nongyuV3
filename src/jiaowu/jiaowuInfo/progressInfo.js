function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

function stripTags(s) {
  if (!s) return '';
  let t = s.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<[^>]+>/g, '');
  t = decodeEntities(t);
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

function extractSegments(html, tagName) {
  const re = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  const segments = [];
  let depth = 0;
  let start = -1;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[0];
    const isClose = /^<\//.test(tag);
    if (!isClose) {
      if (depth === 0) start = m.index;
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        segments.push(html.slice(start, m.index + tag.length));
        start = -1;
      }
    }
  }
  return segments;
}

function extractCells(rowHtml) {
  const re = /<\/?(td|th)\b[^>]*>/gi;
  const segments = [];
  let depth = 0;
  let start = -1;
  let m;
  while ((m = re.exec(rowHtml))) {
    const tag = m[0];
    const isClose = /^<\//.test(tag);
    if (!isClose) {
      if (depth === 0) start = m.index;
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        segments.push(rowHtml.slice(start, m.index + tag.length));
        start = -1;
      }
    }
  }
  return segments;
}

function parseTable(html) {
  const rows = extractSegments(html, 'tr');
  return rows.map((row) => extractCells(row).map((cell) => stripTags(cell).trim()));
}

function findProgressTable(html) {
  const tables = extractSegments(html, 'table');
  const headerKeywords = ['课程性质', '应修学分', '已修学分', '学分差', '可结转学分', '分段完成进度'];
  let best = null;
  let bestScore = -1;
  tables.forEach((tb) => {
    const grid = parseTable(tb).filter((r) => r.some((c) => c));
    if (grid.length === 0) return;
    const score = grid.slice(0, 5).reduce((acc, row) => {
      const hit = row.reduce((sum, c) => sum + (headerKeywords.some((k) => c.includes(k)) ? 1 : 0), 0);
      return acc + hit;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = { grid, html: tb };
    }
  });
  return best;
}

function parseTitleMeta(html) {
  const txt = stripTags(html);
  const titleLine = txt.match(/【[^】]+】[^\n]+学业进度统计/);
  if (!titleLine) return {};
  const line = titleLine[0];
  const majorClass = (line.match(/【([^】]+)】/) || [])[1] || '';
  const name = (line.match(/】([^（(]+)\s*[（(]/) || [])[1] || '';
  const studentId = (line.match(/[（(]\s*(\d+)\s*[）)]/) || [])[1] || '';
  return {
    majorClass: majorClass.trim(),
    name: name.trim(),
    studentId: studentId.trim(),
  };
}

function parsePercent(value) {
  if (!value) return '';
  const m = String(value).match(/-?\d+(\.\d+)?%/);
  return m ? m[0] : '';
}

function cleanProgressHtml(html) {
  if (!html || typeof html !== 'string') return { meta: {}, list: [], source: 'cleanProgressHtml' };
  const meta = parseTitleMeta(html);
  const hit = findProgressTable(html);
  if (!hit) return { meta, list: [], source: 'cleanProgressHtml' };
  const headerKeywords = ['课程性质', '应修学分', '已修学分', '学分差', '可结转学分', '分段完成进度'];
  const grid = hit.grid.filter((r) => r.some((c) => c));
  if (grid.length < 3) return { meta, list: [], source: 'cleanProgressHtml' };
  const headerIndex = grid.findIndex((r) => r.some((c) => headerKeywords.some((k) => c.includes(k))));
  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 2;
  const items = [];
  let currentGroup = '';
  for (let i = startIndex; i < grid.length; i++) {
    const row = grid[i];
    const cells = row.filter((c) => c !== '');
    if (cells.length < 6) continue;
    if (cells.length === 7) {
      currentGroup = cells[0];
      items.push({
        group: currentGroup,
        category: cells[1],
        requiredCredits: cells[2],
        earnedCredits: cells[3],
        diffCredits: cells[4],
        carryCredits: cells[5],
        progress: parsePercent(cells[6]) || cells[6],
      });
    } else {
      items.push({
        group: currentGroup,
        category: cells[0],
        requiredCredits: cells[1],
        earnedCredits: cells[2],
        diffCredits: cells[3],
        carryCredits: cells[4],
        progress: parsePercent(cells[5]) || cells[5],
      });
    }
  }
  return { meta, list: items, source: 'cleanProgressHtml' };
}

module.exports = {
  cleanProgressHtml,
  default: cleanProgressHtml,
};
