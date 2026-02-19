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

function parseTable(html) {
  const rows = Array.from(html.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map((m) => m[0]);
  return rows.map((row) =>
    Array.from(row.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)).map((m) => stripTags(m[2]).trim()),
  );
}

function findScoreTable(html) {
  const tables = Array.from(html.matchAll(/<table[\s\S]*?<\/table>/gi)).map((m) => m[0]);
  const headerKeywords = ['课程', '成绩', '学分', '绩点', '学期', '课程性质', '考试性质'];
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
    courseName: idx(['课程名称', '课程名', '课程']),
    score: idx(['成绩', '总评成绩', '最终成绩']),
    credit: idx(['学分']),
    gradePoint: idx(['绩点']),
    term: idx(['学年学期', '学期', '学年']),
    courseType: idx(['课程性质', '性质']),
    examType: idx(['考试性质', '考核方式']),
    teacher: idx(['任课教师', '教师']),
  };
}

function pickCell(row, i) {
  if (i < 0 || i >= row.length) return '';
  return String(row[i] ?? '').trim();
}

function cleanScoreHtml(html) {
  if (!html || typeof html !== 'string') return { list: [], columns: {}, source: 'cleanScoreHtml' };
  const hit = findScoreTable(html);
  if (!hit) return { list: [], columns: {}, source: 'cleanScoreHtml' };
  const grid = hit.grid.filter((r) => r.some((c) => c));
  if (grid.length < 2) return { list: [], columns: {}, source: 'cleanScoreHtml' };
  const header = grid[0];
  const cols = detectColumns(header);
  const items = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const item = {};
    const cName = pickCell(row, cols.courseName);
    const cScore = pickCell(row, cols.score);
    const cCredit = pickCell(row, cols.credit);
    const cGpa = pickCell(row, cols.gradePoint);
    const cTerm = pickCell(row, cols.term);
    const cType = pickCell(row, cols.courseType);
    const cExam = pickCell(row, cols.examType);
    const cTeacher = pickCell(row, cols.teacher);
    if (!cName && !cScore && !cCredit) continue;
    if (cName) item.courseName = cName;
    if (cScore) item.score = cScore;
    if (cCredit) item.credit = cCredit;
    if (cGpa) item.gpa = cGpa;
    if (cTerm) item.term = cTerm;
    if (cType) item.courseType = cType;
    if (cExam) item.examType = cExam;
    if (cTeacher) item.teacher = cTeacher;
    items.push(item);
  }
  return { list: items, columns: cols, source: 'cleanScoreHtml' };
}

module.exports = {
  cleanScoreHtml,
  default: cleanScoreHtml,
};
