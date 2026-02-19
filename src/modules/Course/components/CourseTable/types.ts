export type WeekRange = { start: number; end: number };

export type CourseEntry = {
  name: string;
  teacher: string;
  weeks: WeekRange;
  day: number;
  startPeriod: number;
  endPeriod: number;
  odd: boolean;
  even: boolean;
  room: string;
  timeRaw: string;
  weeksList?: number[];
  isCustom?: boolean;
};

export type AttendanceRecord = {
  present: number;
  late: number;
  absent: number;
};
