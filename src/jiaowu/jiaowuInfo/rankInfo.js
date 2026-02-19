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

function findRankTable(html) {
  const tables = extractSegments(html, 'table');
  const headerKeywords = ['排名', '加权', '学号', '姓名', '专业', '年级'];
  let best = null;
  let bestScore = -1;
  tables.forEach((tb) => {
    const grid = parseTable(tb);
    if (grid.length === 0) return;
    const header = grid.find((r) => r.some((c) => c)) || [];
    const score = header.reduce((acc, c) => {
      return acc + (headerKeywords.some((k) => c.includes(k)) ? 1 : 0);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      best = { grid, html: tb };
    }
  });
  return best;
}

function normalizeHeader(header) {
  return header.map((h) => h.replace(/\s+/g, '').replace(/：|:/g, '').toLowerCase());
}

function detectColumns(header) {
  const h = normalizeHeader(header);
  const idx = (names) => h.findIndex((x) => names.some((n) => x.includes(n)));
  return {
    index: idx(['序', '序号']),
    campus: idx(['校区']),
    college: idx(['系别', '学院']),
    major: idx(['专业']),
    grade: idx(['年级']),
    studentId: idx(['学号']),
    name: idx(['姓名']),
    className: idx(['班级']),
    weightedScore: idx(['有效必修加权成绩', '加权成绩', '加权平均成绩']),
    majorRank: idx(['专业排名', '排名']),
    status: idx(['在读情况', '在读']),
  };
}

function pickCell(row, i) {
  if (i < 0 || i >= row.length) return '';
  return String(row[i] ?? '').trim();
}

function cleanRankHtml(html) {
  if (!html || typeof html !== 'string') return { list: [], columns: {}, source: 'cleanRankHtml' };
  const hit = findRankTable(html);
  if (!hit) return { list: [], columns: {}, source: 'cleanRankHtml' };
  const grid = hit.grid.filter((r) => r.some((c) => c));
  if (grid.length < 2) return { list: [], columns: {}, source: 'cleanRankHtml' };
  const header = grid[0];
  const cols = detectColumns(header);
  const items = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const item = {};
    const vIndex = pickCell(row, cols.index);
    const vCampus = pickCell(row, cols.campus);
    const vCollege = pickCell(row, cols.college);
    const vMajor = pickCell(row, cols.major);
    const vGrade = pickCell(row, cols.grade);
    const vStudentId = pickCell(row, cols.studentId);
    const vName = pickCell(row, cols.name);
    const vClass = pickCell(row, cols.className);
    const vWeighted = pickCell(row, cols.weightedScore);
    const vRank = pickCell(row, cols.majorRank);
    const vStatus = pickCell(row, cols.status);
    if (!vStudentId && !vName && !vWeighted && !vRank) continue;
    if (vIndex) item.index = vIndex;
    if (vCampus) item.campus = vCampus;
    if (vCollege) item.college = vCollege;
    if (vMajor) item.major = vMajor;
    if (vGrade) item.grade = vGrade;
    if (vStudentId) item.studentId = vStudentId;
    if (vName) item.name = vName;
    if (vClass) item.className = vClass;
    if (vWeighted) item.weightedScore = vWeighted;
    if (vRank) item.majorRank = vRank;
    if (vStatus) item.status = vStatus;
    items.push(item);
  }
  return { list: items, columns: cols, source: 'cleanRankHtml' };
}

module.exports = {
  cleanRankHtml,
  default: cleanRankHtml,
};
