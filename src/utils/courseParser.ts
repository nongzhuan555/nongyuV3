import { CourseEntry } from '@/modules/Course/components/CourseTable/types';

export type GridRow = string[];
export type TimeEntry = { day: number; start: number; end: number; odd: boolean; even: boolean };

// 课程时间表
export const COURSE_TIMES = [
  { start: '08:10', end: '08:55' },
  { start: '09:05', end: '09:50' },
  { start: '10:10', end: '10:55' },
  { start: '11:05', end: '11:50' },
  { start: '14:20', end: '15:05' },
  { start: '15:15', end: '16:00' },
  { start: '16:20', end: '17:05' },
  { start: '17:15', end: '18:00' },
  { start: '19:30', end: '20:15' },
  { start: '20:25', end: '21:10' },
];

export function getHeaderIndexMap(header: GridRow) {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    if (!h) return;
    map[h.trim()] = i;
  });
  return map;
}

export function parseWeekRange(s: string) {
  const m = s.match(/(\d+)\s*[-~至到]\s*(\d+)/);
  if (m) return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) };
  const n = s.match(/^(\d+)$/);
  if (n) {
    const v = parseInt(n[1], 10);
    return { start: v, end: v };
  }
  return null;
}

export function parseTimeEntries(s: string): TimeEntry[] {
  if (!s) return [];
  const lines = s.split(/\n+/).map(t => t.trim()).filter(Boolean);
  return lines
    .map(line => {
      if (/任课教师自行安排/.test(line)) return null;
      const even = /\(双\)/.test(line);
      const odd = /\(单\)/.test(line);
      const nums = line.replace(/\(单\)|\(双\)/g, '').split(',').map(t => t.trim()).filter(Boolean);
      const dayStart = nums[0]?.match(/^(\d+)-(\d+)$/);
      const dayEnd = nums[1]?.match(/^(\d+)-(\d+)$/);
      if (!dayStart) return null;
      const d1 = parseInt(dayStart[1], 10);
      const p1 = parseInt(dayStart[2], 10);
      let d2 = d1;
      let p2 = p1;
      if (dayEnd) {
        d2 = parseInt(dayEnd[1], 10);
        p2 = parseInt(dayEnd[2], 10);
      }
      if (d1 !== d2) return null;
      return { day: d1, start: Math.min(p1, p2), end: Math.max(p1, p2), odd, even };
    })
    .filter((item): item is TimeEntry => item !== null);
}

export function maxWeekFromRows(rows: GridRow[], idxWeek: number) {
  let maxW = 1;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const wk = r[idxWeek] || '';
    const pr = parseWeekRange(wk);
    if (pr) maxW = Math.max(maxW, pr.end);
  }
  return maxW;
}

export function normalizeCourses(rows: GridRow[]) {
  if (!rows.length) return { courses: [], maxWeek: 1 };
  const header = rows[0];
  const map = getHeaderIndexMap(header);
  const idxName = map['课程名称'] ?? 1;
  const idxWeeks = map['周次'] ?? 3;
  const idxRoom = map['教室'] ?? 4;
  const idxTime = map['上课时间'] ?? 5;
  const idxTeacher = map['教师'] ?? 14;
  const maxWeek = maxWeekFromRows(rows, idxWeeks);
  const courses: CourseEntry[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[idxName] || '').trim();
    if (!name) continue;
    const weekStr = (r[idxWeeks] || '').trim();
    const pr = parseWeekRange(weekStr);
    if (!pr) continue;
    const roomStr = (r[idxRoom] || '').trim();
    const timeStr = (r[idxTime] || '').trim();
    const teacher = (r[idxTeacher] || '').trim();
    const entries = parseTimeEntries(timeStr);
    const rooms = roomStr.split(/\n+/).map(t => t.trim()).filter(Boolean);
    entries.forEach((e, idx) => {
      courses.push({
        name,
        teacher,
        weeks: pr,
        day: e.day,
        startPeriod: e.start,
        endPeriod: e.end,
        odd: e.odd,
        even: e.even,
        room: rooms[idx] || rooms[0] || '',
        timeRaw: timeStr,
      });
    });
  }
  return { courses, maxWeek };
}

export function weekMatches(week: number, info: CourseEntry) {
  if (Array.isArray(info.weeksList) && info.weeksList.length > 0) {
    return info.weeksList.includes(week);
  }
  if (week < info.weeks.start || week > info.weeks.end) return false;
  if (info.odd && week % 2 === 0) return false;
  if (info.even && week % 2 === 1) return false;
  return true;
}

export function anchorMonday() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const day = first.getDay() === 0 ? 7 : first.getDay();
  const offset = 1 - day;
  return new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
}

export function mondayOfWeek(week: number) {
  const base = anchorMonday();
  return new Date(base.getTime() + (week - 1) * 7 * 24 * 3600 * 1000);
}
