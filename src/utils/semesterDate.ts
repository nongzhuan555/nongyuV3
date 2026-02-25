import AsyncStorage from '@react-native-async-storage/async-storage';

const SEMESTER_START_DATE_KEY = 'APP_SEMESTER_START_DATE';

export async function getSemesterStartDate(): Promise<Date | null> {
  try {
    const value = await AsyncStorage.getItem(SEMESTER_START_DATE_KEY);
    if (value) {
      return new Date(parseInt(value, 10));
    }
  } catch (e) {
    console.error('Failed to load semester start date', e);
  }
  return null;
}

export async function saveSemesterStartDate(date: Date) {
  try {
    await AsyncStorage.setItem(SEMESTER_START_DATE_KEY, date.getTime().toString());
  } catch (e) {
    console.error('Failed to save semester start date', e);
  }
}

export function computeCurrentWeek(startDate: Date) {
  const now = new Date();
  // Ensure we compare start of days
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  // Find the Monday of the start date's week
  const day = start.getDay() === 0 ? 7 : start.getDay();
  const offset = 1 - day; // Monday is 1
  const monday = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
  
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);
  
  const diff = current.getTime() - monday.getTime();
  const w = Math.floor(diff / (7 * 24 * 3600 * 1000)) + 1;
  return Math.max(1, w);
}

export function getMondayOfWeek(week: number, startDate: Date) {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const day = start.getDay() === 0 ? 7 : start.getDay();
  const offset = 1 - day;
  const firstMonday = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
  
  return new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 3600 * 1000);
}
