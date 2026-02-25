import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { ExamItem } from '@/jiaowu/jiaowuInfo/examInfo';

// Standard course times
const COURSE_TIMES = [
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

type CourseEntry = {
  name: string;
  teacher: string;
  weeks: { start: number; end: number };
  day: number;
  startPeriod: number;
  endPeriod: number;
  odd: boolean;
  even: boolean;
  room: string;
  weeksList?: number[];
};

function weekMatches(week: number, info: CourseEntry) {
  if (Array.isArray(info.weeksList) && info.weeksList.length > 0) {
    return info.weeksList.includes(week);
  }
  if (week < info.weeks.start || week > info.weeks.end) return false;
  if (info.odd && week % 2 === 0) return false;
  if (info.even && week % 2 === 1) return false;
  return true;
}

function getMinutesFromTime(timeStr: string) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function parseExamDate(examTime?: string, currentWeek: number = 0) {
  if (!examTime) return null;
  // Try to match "2024-06-20" or "2024/06/20" or "2024年06月20日"
  const dateMatch = examTime.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
  if (dateMatch) {
    const year = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1;
    const day = parseInt(dateMatch[3]);
    
    // Try to match time "14:30-16:30"
    const timeMatch = examTime.match(/(\d{1,2}:\d{2})/);
    let hours = 0;
    let minutes = 0;
    
    if (timeMatch) {
      const [h, m] = timeMatch[1].split(':').map(Number);
      hours = h;
      minutes = m;
    }
    
    return new Date(year, month, day, hours, minutes);
  }

  // Try to match "【考试时间：】 第18周-星 期3-上午(09:00—11:00)"
  // Format: 第X周-星期Y
  const weekMatch = examTime.match(/第(\d+)周-星\s*期(\d)/);
  if (weekMatch && currentWeek > 0) {
    const targetWeek = parseInt(weekMatch[1]);
    const targetDay = parseInt(weekMatch[2]); // 1-7
    
    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    
    const diffWeeks = targetWeek - currentWeek;
    const diffDays = targetDay - currentDay;
    
    const targetDate = new Date(now.getTime() + (diffWeeks * 7 + diffDays) * 24 * 60 * 60 * 1000);
    
    // Try to match time in parenthesis (09:00-11:00)
    const timeMatch = examTime.match(/\((\d{2}):(\d{2})/);
    if (timeMatch) {
      targetDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), 0, 0);
    } else {
      targetDate.setHours(0, 0, 0, 0);
    }
    
    return targetDate;
  }
  
  return null;
}

export async function updateWidgetData(courses: CourseEntry[], currentWeek: number, exams: ExamItem[] = []) {
  if (Platform.OS !== 'android') return;

  try {
    const now = new Date();
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    // Filter today's courses
    const todayCourses = courses
      .filter(c => c.day === day && weekMatches(currentWeek, c))
      .sort((a, b) => a.startPeriod - b.startPeriod);

    // Calculate last week of courses to determine if semester is over
    let maxCourseWeek = 0;
    courses.forEach(c => {
      const end = c.weeks?.end || 0;
      if (end > maxCourseWeek) maxCourseWeek = end;
    });
    
    // Check if courses are effectively over for the semester
    const isSemesterCoursesOver = currentWeek > maxCourseWeek;

    let title = '今日无课';
    let info = '好好休息吧';
    
    const data: any = {
      updateTime: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      date: `${now.getMonth() + 1}月${now.getDate()}日 周${['日','一','二','三','四','五','六'][now.getDay()]}`
    };
    
    let hasUpcomingCourse = false;
    let courseData: any = {};

    if (todayCourses.length > 0) {
      // Find current or next course
      // A course is "upcoming" if its END time is in the future
      const upcomingIndex = todayCourses.findIndex(c => {
        const periodIndex = Math.min(Math.max(0, c.endPeriod - 1), COURSE_TIMES.length - 1);
        const timeObj = COURSE_TIMES[periodIndex];
        const endTime = getMinutesFromTime(timeObj ? timeObj.end : '23:59');
        return endTime > currentTime;
      });

      if (upcomingIndex !== -1) {
        hasUpcomingCourse = true;
        const c = todayCourses[upcomingIndex];
        title = c.name;
        
        const startObj = COURSE_TIMES[Math.min(Math.max(0, c.startPeriod - 1), COURSE_TIMES.length - 1)];
        const endObj = COURSE_TIMES[Math.min(Math.max(0, c.endPeriod - 1), COURSE_TIMES.length - 1)];
        const timeRange = `${startObj?.start}-${endObj?.end}`;
        
        info = `${timeRange} @ ${c.room || '未知教室'}`;

        courseData = {
          courseName: c.name,
          teacher: c.teacher || '未知教师',
          room: c.room || '未知教室',
          timeRange: timeRange,
          hasCourse: true,
          mode: 'course'
        };
      }
    }

    if (hasUpcomingCourse) {
      Object.assign(data, courseData);
    } else {
      // No upcoming courses today. Check for exams or semester end.
      
      // Filter upcoming exams
      const upcomingExams = exams
        .map(e => ({ ...e, parsedDate: parseExamDate(e.examTime, currentWeek) }))
        .filter(e => e.parsedDate && e.parsedDate > now)
        .sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0));
        
      const nextExam = upcomingExams.length > 0 ? upcomingExams[0] : null;

      // Logic:
      // 1. If we have a next exam AND (Semester courses are over OR Exam is very soon (within 3 days))
      // 2. Else if semester courses are over AND no exams -> Semester End
      // 3. Else (Standard day in semester) -> "Today's class over" / "No class today"
      
      const daysUntilExam = nextExam ? (nextExam.parsedDate!.getTime() - now.getTime()) / (1000 * 3600 * 24) : 999;
      const showExam = nextExam && (isSemesterCoursesOver || daysUntilExam <= 3);

      if (showExam && nextExam) {
        title = nextExam.courseName || '考试';
        
        // Parse date and time for better display
        let displayTime = nextExam.examTime || '';
        let displayDate = data.date;
        
        // Use parsedDate for displayDate if available
        if (nextExam.parsedDate) {
          const m = nextExam.parsedDate.getMonth() + 1;
          const d = nextExam.parsedDate.getDate();
          const weekDay = nextExam.parsedDate.getDay();
          const weekStr = ['日','一','二','三','四','五','六'][weekDay];
          displayDate = `${m}月${d}日 周${weekStr}`;
        }

        // Try to extract clean time string
        // Match "上午(09:00—11:00)" or similar patterns
        // Support both hyphen (-) and em-dash (—)
        const cleanTimeMatch = nextExam.examTime?.match(/(上午|下午|晚上)\s*\(\d{2}:\d{2}[—\-]\d{2}:\d{2}\)/);
        
        if (cleanTimeMatch) {
           displayTime = cleanTimeMatch[0];
        } else {
           // Fallback: Remove date part if it's a standard date string
           const dateMatch = nextExam.examTime?.match(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})/);
           if (dateMatch) {
             displayTime = nextExam.examTime?.replace(dateMatch[0], '').trim() || '';
           }
        }

        info = `${displayTime} @ ${nextExam.examRoom || '地点待定'}`;
        
        Object.assign(data, {
          courseName: nextExam.courseName || '考试',
          teacher: nextExam.assessmentMethod || '考试',
          room: nextExam.examRoom || '地点待定',
          timeRange: displayTime,
          seat: nextExam.seatNumber || '', // Explicit seat field
          date: displayDate, // Update date to exam date
          hasCourse: true, 
          mode: 'exam'
        });
      } else if (isSemesterCoursesOver && !nextExam) {
        // Semester ended
        title = '本学期已结束';
        info = '我们下学期再见！';
        
        Object.assign(data, {
          courseName: '本学期已结束',
          info: '我们下学期再见！',
          hasCourse: false,
          mode: 'semester_end'
        });
      } else {
        // Standard "No course" or "Courses over"
        if (todayCourses.length > 0) {
          title = '今日课程已结束';
          info = `共${todayCourses.length}节课，辛苦了`;
          Object.assign(data, {
            courseName: '今日课程已结束',
            info: `共${todayCourses.length}节课，辛苦了`,
            hasCourse: false,
            mode: 'course_end'
          });
        } else {
          title = '今日无课';
          info = '好好休息吧';
          Object.assign(data, {
            courseName: '今日无课',
            info: '好好休息吧',
            hasCourse: false,
            mode: 'no_course'
          });
        }
      }
    }

    // Keep title/info for backward compatibility or fallback
    data.title = title;
    data.info = info;

    const path = FileSystem.documentDirectory + 'widget_data.json';
    
    // Use FileSystem.writeAsStringAsync (legacy API) as it is still supported and working
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
    
    console.log('Widget data updated:', data);

  } catch (e) {
    console.log('Widget update status:', e);
  }
}

export async function writeWidgetSchedule(
  courses: CourseEntry[],
  semesterStart?: Date
) {
  if (Platform.OS !== 'android') return;
  try {
    const payload = {
      semesterStart: semesterStart ? semesterStart.toISOString() : null,
      courses: courses.map(c => ({
        name: c.name,
        teacher: c.teacher,
        room: c.room,
        day: c.day,
        startPeriod: c.startPeriod,
        endPeriod: c.endPeriod,
        weeks: c.weeks,
        odd: !!c.odd,
        even: !!c.even,
        weeksList: Array.isArray(c.weeksList) ? c.weeksList : [],
      })),
    };
    const path = FileSystem.documentDirectory + 'widget_schedule.json';
    await FileSystem.writeAsStringAsync(path, JSON.stringify(payload));
    console.log('Widget schedule written:', { count: payload.courses.length, semesterStart: payload.semesterStart });
  } catch (e) {
    console.warn('Failed to write widget schedule', e);
  }
}
