
function decodeEntities(s: string) {
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

function stripTags(s: string) {
  if (!s) return '';
  let t = s.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<[^>]+>/g, '');
  t = decodeEntities(t);
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

function parseTable(html: string) {
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi);
  const rows = rowMatches ? Array.from(rowMatches) : [];
  
  return rows.map((row) => {
    const cellMatches = row.match(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi);
    const cells = cellMatches ? Array.from(cellMatches) : [];
    return cells.map((cell) => {
       const content = cell.replace(/^<(td|th)[^>]*>/i, '').replace(/<\/(td|th)>$/i, '');
       return stripTags(content).trim();
    });
  });
}

function findExamTable(html: string) {
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi);
  const tables = tableMatches ? Array.from(tableMatches) : [];
  const headerKeywords = ['课程', '时间', '地点', '座号', '考试'];
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

function normalizeHeader(header: string[]) {
  return header.map((h) => h.replace(/\s+/g, '').replace(/：|:/g, '').toLowerCase());
}

function detectColumns(header: string[]) {
  const h = normalizeHeader(header);
  const idx = (names: string[]) => h.findIndex((x) => names.some((n) => x.includes(n)));
  return {
    courseName: idx(['课程名称', '课程名', '课程']),
    examTime: idx(['考试时间', '时间']),
    examRoom: idx(['考试地点', '地点', '教室']),
    seatNumber: idx(['座位号', '座号']),
    examStatus: idx(['考试状态', '状态']),
    assessmentMethod: idx(['考核方式', '考试方式']),
    credit: idx(['学分']),
    campus: idx(['校区']),
  };
}

function pickCell(row: string[], i: number) {
  if (i < 0 || i >= row.length) return '';
  return String(row[i] ?? '').trim();
}

export interface ExamItem {
  courseName?: string;
  examTime?: string;
  examRoom?: string;
  seatNumber?: string;
  examStatus?: string;
  assessmentMethod?: string;
  credit?: string;
  campus?: string;
}

export interface ExamData {
  list: ExamItem[];
  source: string;
}

export function cleanExamHtml(html: string): ExamData {
  if (!html || typeof html !== 'string') return { list: [], source: 'cleanExamHtml' };
  const hit = findExamTable(html);
  if (!hit) return { list: [], source: 'cleanExamHtml' };
  const grid = hit.grid.filter((r) => r.some((c) => c));
  if (grid.length < 2) return { list: [], source: 'cleanExamHtml' };
  const header = grid[0];
  const cols = detectColumns(header);
  const items: ExamItem[] = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const item: ExamItem = {};
    const cName = pickCell(row, cols.courseName);
    const cTime = pickCell(row, cols.examTime);
    const cRoom = pickCell(row, cols.examRoom);
    const cSeat = pickCell(row, cols.seatNumber);
    const cStatus = pickCell(row, cols.examStatus);
    const cMethod = pickCell(row, cols.assessmentMethod);
    const cCredit = pickCell(row, cols.credit);
    const cCampus = pickCell(row, cols.campus);

    if (!cName && !cTime) continue;
    
    if (cName) item.courseName = cName;
    if (cTime) item.examTime = cTime;
    if (cRoom) item.examRoom = cRoom;
    if (cSeat) item.seatNumber = cSeat;
    if (cStatus) item.examStatus = cStatus;
    if (cMethod) item.assessmentMethod = cMethod;
    if (cCredit) item.credit = cCredit;
    if (cCampus) item.campus = cCampus;
    
    items.push(item);
  }
  return { list: items, source: 'cleanExamHtml' };
}
