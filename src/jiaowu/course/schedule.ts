import { fetchAndCleanWithRetry } from '../utils/retry';
import { cleanCourseHtml } from './course';

const COURSE_URL = 'https://jiaowu.sicau.edu.cn/xuesheng/gongxuan/gongxuan/kbbanji.asp?title_id1=4';

export interface CourseScheduleData {
  grid: string[][];
  rows: number;
  cols: number;
}

export async function fetchCourseSchedule(): Promise<CourseScheduleData> {
  try {
    const data = await fetchAndCleanWithRetry<CourseScheduleData>(
      COURSE_URL,
      (html) => cleanCourseHtml(html),
      (data) => !data.grid || data.grid.length <= 1, // 如果只有表头或者没有数据，视为失败，尝试重试
      '本学期课表'
    );
    console.log('清洗后的课表数据:', JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('获取课表失败:', error);
    throw error;
  }
}
