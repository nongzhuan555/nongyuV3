import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, Animated, Easing, Pressable, Platform, BackHandler, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, useTheme, TextInput, Chip, MD3Theme, Snackbar, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import courseData from '@/jiaowu/course/course.json';
import { fetchCourseSchedule, CourseScheduleData } from '@/jiaowu/course/schedule';
import CourseDetailModal from './CourseDetailModal';
import ExamSchedule from '../ExamSchedule';
import { CourseEntry, AttendanceRecord, WeekRange } from './types';
import { profileStore } from '@/stores/profile';
import { observer } from 'mobx-react-lite';

type GridRow = string[];
type TimeEntry = { day: number; start: number; end: number; odd: boolean; even: boolean };
type Suppression = {
  name: string;
  day: number;
  startPeriod: number;
  endPeriod: number;
  room: string;
  teacher: string;
  weeksList: number[];
};

const COURSE_COLORS = [
  { bg: '#E8F1FF', text: '#2B5797' }, // 柔和蓝
  { bg: '#FDF2F4', text: '#B8325E' }, // 柔和粉
  { bg: '#E6F7F3', text: '#00856F' }, // 柔和绿
  { bg: '#FFF7E6', text: '#B36B00' }, // 柔和橙
  { bg: '#F2F0FA', text: '#5B4FA2' }, // 柔和紫
  { bg: '#EBF9F9', text: '#007C89' }, // 柔和青
  { bg: '#FFF9E6', text: '#997B00' }, // 柔和黄
  { bg: '#F0F4F8', text: '#3E5463' }, // 柔和灰蓝
];

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

function getCourseColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COURSE_COLORS.length;
  return COURSE_COLORS[index];
}

function getHeaderIndexMap(header: GridRow) {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    if (!h) return;
    map[h.trim()] = i;
  });
  return map;
}

function parseWeekRange(s: string) {
  const m = s.match(/(\d+)\s*[-~至到]\s*(\d+)/);
  if (m) return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) };
  const n = s.match(/^(\d+)$/);
  if (n) {
    const v = parseInt(n[1], 10);
    return { start: v, end: v };
  }
  return null;
}

function parseTimeEntries(s: string): TimeEntry[] {
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

function slotIndexFromPeriod(p: number) {
  if (p <= 2) return 0;
  if (p <= 4) return 1;
  if (p <= 6) return 2;
  if (p <= 8) return 3;
  return 4;
}

function maxWeekFromRows(rows: GridRow[], idxWeek: number) {
  let maxW = 1;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const wk = r[idxWeek] || '';
    const pr = parseWeekRange(wk);
    if (pr) maxW = Math.max(maxW, pr.end);
  }
  return maxW;
}

function normalizeCourses(rows: GridRow[]) {
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

function weekMatches(week: number, info: CourseEntry) {
  if (Array.isArray(info.weeksList) && info.weeksList.length > 0) {
    return info.weeksList.includes(week);
  }
  if (week < info.weeks.start || week > info.weeks.end) return false;
  if (info.odd && week % 2 === 0) return false;
  if (info.even && week % 2 === 1) return false;
  return true;
}

function computeCurrentWeek() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const day = first.getDay() === 0 ? 7 : first.getDay();
  const offset = 1 - day;
  const monday = new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
  const diff = now.getTime() - monday.getTime();
  const w = Math.floor(diff / (7 * 24 * 3600 * 1000)) + 1;
  return Math.max(1, w);
}

function anchorMonday() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const day = first.getDay() === 0 ? 7 : first.getDay();
  const offset = 1 - day;
  return new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
}

function mondayOfWeek(week: number) {
  const base = anchorMonday();
  return new Date(base.getTime() + (week - 1) * 7 * 24 * 3600 * 1000);
}

function formatMD(d: Date) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}/${day}`;
}

function getWeekDates(week: number) {
  const mon = mondayOfWeek(week);
  const arr: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
    arr.push(formatMD(d));
  }
  return arr;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildWeekMatrix(
  maxWeek: number,
  courses: CourseEntry[],
  suppressed?: (c: CourseEntry, w: number) => boolean,
) {
  const weeks: Array<Array<Array<CourseEntry[]>>> = [];
  for (let w = 1; w <= maxWeek; w++) {
    const grid: Array<Array<CourseEntry[]>> = Array.from({ length: 5 }).map(() =>
      Array.from({ length: 7 }).map(() => [] as CourseEntry[]),
    );
    courses.forEach(c => {
      if (!weekMatches(w, c)) return;
      if (suppressed && suppressed(c, w)) return;
      const row = slotIndexFromPeriod(c.startPeriod);
      const col = Math.min(7, Math.max(1, c.day)) - 1;
      grid[row][col].push(c);
    });
    weeks.push(grid);
  }
  return weeks;
}

const WeekSlide = React.memo(({
  weekIndex,
  grid,
  maxWeek,
  curWeekIndex,
  width,
  pageHeight,
  theme,
  styles,
  armedCell,
  onCellPress,
  onModalOpen,
  onGoThisWeek,
}: {
  weekIndex: number;
  grid: Array<Array<CourseEntry[]>>;
  maxWeek: number;
  curWeekIndex: number;
  width: number;
  pageHeight: number;
  theme: MD3Theme;
  styles: any;
  armedCell: { week: number; c: number; r: number } | null;
  onCellPress: (week: number, c: number, r: number) => void;
  onModalOpen: (course: CourseEntry) => void;
  onGoThisWeek: () => void;
}) => {
  const [hoverThisWeek, setHoverThisWeek] = useState(false);
  const dates = useMemo(() => getWeekDates(weekIndex + 1), [weekIndex]);
  const mon = useMemo(() => mondayOfWeek(weekIndex + 1), [weekIndex]);
  const today = useMemo(() => new Date(), []);

  const isCurrentWeek = weekIndex === curWeekIndex;

  return (
    <View style={{ width }}>
      <View style={styles.grid}>
        {/* 固定表头 */}
        <View style={[styles.headerRow]}>
          <View style={[styles.headerCell, styles.timeCell]}>
            <Text style={styles.headerWeekText}>第{weekIndex + 1}周</Text>
            <Text style={styles.headerWeekSub}>共{maxWeek}周</Text>
          </View>
          {['周一','周二','周三','周四','周五','周六','周日'].map((d, i) => {
            const cur = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
            const isToday = isSameDay(cur, today);
            return (
              <View key={i} style={[styles.headerCell, isToday && styles.headerCellToday]}>
                <Text style={[styles.headerText, isToday && styles.headerToday]}>{d}</Text>
                <Text style={[styles.dateText, isToday && styles.headerToday]}>{dates[i]}</Text>
              </View>
            );
          })}
        </View>

        {/* 可滚动课程内容 */}
        <ScrollView
          style={{ maxHeight: pageHeight }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          {grid.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              <View style={[styles.cell, styles.timeCell]}>
                <View style={styles.timeSlot}>
                  <Text style={styles.timeValue}>{COURSE_TIMES[rIdx * 2]?.start}</Text>
                  <Text style={styles.timeIndex}>{rIdx * 2 + 1}</Text>
                  <Text style={styles.timeValue}>{COURSE_TIMES[rIdx * 2]?.end}</Text>
                </View>
                <View style={styles.timeSlot}>
                  <Text style={styles.timeValue}>{COURSE_TIMES[rIdx * 2 + 1]?.start}</Text>
                  <Text style={styles.timeIndex}>{rIdx * 2 + 2}</Text>
                  <Text style={styles.timeValue}>{COURSE_TIMES[rIdx * 2 + 1]?.end}</Text>
                </View>
              </View>
              {row.map((cell, cIdx) => {
                const course = cell[0];
                const colors = course ? getCourseColor(course.name) : null;
                const isArmed = armedCell && armedCell.week === weekIndex && armedCell.c === cIdx && armedCell.r === rIdx;
                return (
                  <View key={cIdx} style={styles.cell}>
                    {cell.length > 0 ? (
                      <Pressable
                        onPress={() => onModalOpen(cell[0])}
                        style={({ pressed }) => [
                          { flex: 1 },
                          pressed && {
                            transform: [{ scale: 0.95 }],
                          }
                        ]}
                      >
                        <View style={[styles.card, { backgroundColor: colors?.bg }]}>
                          <Text numberOfLines={4} style={[styles.cardTitle, { color: colors?.text, backgroundColor: 'transparent' }]}>{cell[0].name}</Text>
                          {!!cell[0].room && <Text numberOfLines={2} style={[styles.cardDesc, { color: colors?.text, backgroundColor: 'transparent' }]}>{cell[0].room}</Text>}
                          {!!cell[0].teacher && <Text numberOfLines={1} style={[styles.cardDesc, { color: colors?.text, backgroundColor: 'transparent' }]}>{cell[0].teacher}</Text>}
                        </View>
                      </Pressable>
                    ) : (
                      <Pressable 
                        style={[
                          styles.emptyHit, 
                          isArmed && { 
                            backgroundColor: theme.colors.primaryContainer + '20',
                            borderRadius: 8 
                          }
                        ]} 
                        onPress={() => onCellPress(weekIndex, cIdx, rIdx)}
                      >
                        {isArmed ? (
                          <View style={[styles.plusBtn, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.shadow }]}>
                            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.onPrimary} />
                          </View>
                        ) : null}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
      {!isCurrentWeek ? (
        <Pressable
          onHoverIn={() => setHoverThisWeek(true)}
          onHoverOut={() => setHoverThisWeek(false)}
          style={[
            styles.thisWeekBtnWrap,
            Platform.OS === 'web' ? { opacity: hoverThisWeek ? 1 : 0 } : { opacity: 1 },
          ]}
        >
          <Pressable onPress={onGoThisWeek} style={[styles.thisWeekBtn, { backgroundColor: theme.colors.primary }]}>
            <MaterialCommunityIcons name="undo" size={22} color={theme.colors.onPrimary} />
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}, (prev, next) => {
  const prevArmed = prev.armedCell && prev.armedCell.week === prev.weekIndex;
  const nextArmed = next.armedCell && next.armedCell.week === next.weekIndex;
  // If armed state for this week changed
  if (!!prevArmed !== !!nextArmed) return false;
  // If both armed, check if position changed
  if (prevArmed && nextArmed) {
    if (prev.armedCell?.c !== next.armedCell?.c || prev.armedCell?.r !== next.armedCell?.r) return false;
  }
  
  return (
    prev.weekIndex === next.weekIndex &&
    prev.maxWeek === next.maxWeek &&
    prev.curWeekIndex === next.curWeekIndex &&
    prev.width === next.width &&
    prev.pageHeight === next.pageHeight &&
    prev.grid === next.grid
  );
});

function CourseTable({ onTitleChange }: { onTitleChange?: (title: string) => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  
  const [scheduleData, setScheduleData] = useState<CourseScheduleData>(courseData as any);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const COURSE_STORAGE_KEY = 'JIAOWU_COURSE_DATA';
  const CUSTOM_COURSE_STORAGE_KEY = 'JIAOWU_CUSTOM_COURSE_DATA';

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      // 优先从本地加载
      const localData = await AsyncStorage.getItem(COURSE_STORAGE_KEY);
      if (localData) {
        setScheduleData(JSON.parse(localData));
      } else {
        // 本地没有数据，再从网络拉取
        try {
          const data = await fetchCourseSchedule();
          setScheduleData(data);
          AsyncStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
          // 网络拉取失败，且本地无数据，则显示空状态
          setScheduleData(null);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch course schedule:', err);
      setErrorMsg('获取课表数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const { profile } = profileStore;
  // 监听用户登录状态变化
  useEffect(() => {
    // 如果没有学号，说明已退出或未登录，直接清空数据
    if (!profile.studentId) {
      setScheduleData(null);
      setCustoms([]);
    } else {
      // 有学号，说明是登录状态，执行数据加载
      fetchSchedule();
      AsyncStorage.getItem(CUSTOM_COURSE_STORAGE_KEY).then(json => {
        if (json) {
          try {
            setCustoms(JSON.parse(json));
          } catch (e) {
            console.error('Failed to parse custom courses', e);
          }
        } else {
          setCustoms([]);
        }
      });
    }
  }, [profile.studentId, fetchSchedule]);

  // 保存自定义课程数据
  useEffect(() => {
    if (customs.length > 0) {
      AsyncStorage.setItem(CUSTOM_COURSE_STORAGE_KEY, JSON.stringify(customs));
    }
  }, [customs]);

  const grid = (scheduleData?.grid || []) as GridRow[];

  const { courses, maxWeek } = useMemo(() => normalizeCourses(grid), [grid]);
  const [customs, setCustoms] = useState<CourseEntry[]>([]);
  const allCourses = useMemo(() => [...courses, ...customs], [courses, customs]);
  const weeks = useMemo(() => buildWeekMatrix(maxWeek, allCourses, isSuppressed), [maxWeek, allCourses]);
  const width = Dimensions.get('window').width;
  const height = Dimensions.get('window').height;
  const flatListRef = useRef<FlatList>(null);
  const initialWeek = Math.min(maxWeek, Math.max(1, computeCurrentWeek()));
  const [active, setActive] = useState(initialWeek - 1);

  // Sync title with parent
  useEffect(() => {
    if (onTitleChange) {
      if (active === maxWeek) {
        onTitleChange('考试安排（正考）');
      } else {
        onTitleChange('课程表');
      }
    }
  }, [active, maxWeek, onTitleChange]);

  const [selected, setSelected] = useState<CourseEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const confirmFade = useRef(new Animated.Value(0)).current;
  const confirmScale = useRef(new Animated.Value(0.96)).current;
  const [deleteWeeks, setDeleteWeeks] = useState<number[]>([]);
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [addVisible, setAddVisible] = useState(false);
  const addFade = useRef(new Animated.Value(0)).current;
  const addScale = useRef(new Animated.Value(0.96)).current;
  const [addTarget, setAddTarget] = useState<{ day: number; slot: number } | null>(null);
  const [addTitle, setAddTitle] = useState('');
  const [addRoom, setAddRoom] = useState('');
  const [addTeacher, setAddTeacher] = useState('');
  const [addType, setAddType] = useState<'course' | 'schedule'>('schedule');
  const [addWeeks, setAddWeeks] = useState<number[]>([]);
  const [armedCell, setArmedCell] = useState<{ week: number; c: number; r: number } | null>(null);
  const armedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => {
      // FlatList scrollToIndex
      if (flatListRef.current && active < maxWeek + 1) {
         flatListRef.current.scrollToIndex({ index: active, animated: false });
      }
    }, 0);
  }, [width]);

  const goThisWeek = () => {
    const w = Math.min(maxWeek, Math.max(1, computeCurrentWeek())) - 1;
    setActive(w);
    flatListRef.current?.scrollToIndex({ index: w, animated: true });
  };

  const weeksOfCourse = (course: CourseEntry, maxWeekLocal: number) => {
    if (Array.isArray(course.weeksList) && course.weeksList.length > 0) {
      return course.weeksList.slice();
    }
    const arr: number[] = [];
    const start = course?.weeks?.start ?? 1;
    const end = Math.min(maxWeekLocal, course?.weeks?.end ?? maxWeekLocal);
    for (let w = start; w <= end; w++) {
      if (course.odd && w % 2 === 0) continue;
      if (course.even && w % 2 === 1) continue;
      arr.push(w);
    }
    return arr;
  };

  // 考勤数据 state: { [courseName]: { present: 0, late: 0, absent: 0 } }
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});

  const handleUpdateAttendance = (type: keyof AttendanceRecord, delta: number) => {
    if (!selected) return;
    setAttendanceData(prev => {
      const current = prev[selected.name] || { present: 0, late: 0, absent: 0 };
      const newValue = Math.max(0, current[type] + delta);
      return {
        ...prev,
        [selected.name]: { ...current, [type]: newValue },
      };
    });
  };

  const openModal = useCallback((course: CourseEntry) => {
    // 快速显示一个加载状态，让用户感觉到交互
    setLoading(true);

    // 将实际的弹窗显示推迟到下一帧，给UI渲染loading的机会
    requestAnimationFrame(() => {
      setTimeout(() => {
        setSelected(course);
        const all = weeksOfCourse(course, maxWeek);
        const cur = active + 1;
        setDeleteWeeks(all.includes(cur) ? [cur] : []);
        setModalVisible(true);
        setLoading(false);
      }, 0);
    });
  }, [active, maxWeek]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    // setSelected(null); 
  }, []);

  const openAdd = useCallback((day: number, slot: number, targetWeek?: number) => {
    setAddTarget({ day, slot });
    setAddTitle('');
    setAddRoom('');
    setAddTeacher('');
    setAddType('schedule');
    setAddWeeks([targetWeek !== undefined ? targetWeek + 1 : active + 1]); // 默认选择当前周
    setAddVisible(true);
    addFade.setValue(0);
    addScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(addFade, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(addScale, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [active]);

  const closeAdd = useCallback(() => {
    Animated.parallel([
      Animated.timing(addFade, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(addScale, { toValue: 0.96, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setAddVisible(false);
      setAddTarget(null);
    });
  }, []);

  const openConfirm = useCallback(() => {
    if (deleteWeeks.length === 0) return;
    setConfirmVisible(true);
    confirmFade.setValue(0);
    confirmScale.setValue(0.96);
    Animated.parallel([
      Animated.timing(confirmFade, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(confirmScale, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [deleteWeeks.length]);

  const closeConfirm = useCallback(() => {
    Animated.parallel([
      Animated.timing(confirmFade, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(confirmScale, { toValue: 0.96, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setConfirmVisible(false);
    });
  }, []);

  // 监听硬件返回键
  useEffect(() => {
    const onBackPress = () => {
      if (confirmVisible) {
        closeConfirm();
        return true;
      }
      if (addVisible) {
        closeAdd();
        return true;
      }
      if (modalVisible) {
        closeModal();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => subscription.remove();
  }, [confirmVisible, addVisible, modalVisible, closeConfirm, closeAdd, closeModal]);

  const toggleWeek = (w: number) => {
    setAddWeeks((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w].sort((a, b) => a - b)));
  };

  const addConfirm = () => {
    if (!addTarget || !addTitle.trim() || addWeeks.length === 0) return;
    const slot = addTarget.slot;
    const startPeriod = slot === 0 ? 1 : slot === 1 ? 3 : slot === 2 ? 5 : slot === 3 ? 7 : 9;
    const endPeriod = startPeriod + 1;
    const newItem: CourseEntry = {
      name: addTitle.trim(),
      room: addRoom.trim(),
      teacher: addTeacher.trim(),
      weeks: { start: 1, end: maxWeek },
      day: addTarget.day + 1, // cIdx starts from 0, day uses 1..7
      startPeriod,
      endPeriod,
      odd: false,
      even: false,
      weeksList: addWeeks.slice(),
      timeRaw: '',
      isCustom: addType === 'schedule',
    };
    setCustoms((prev) => [...prev, newItem]);
    closeAdd();
  };

  const handleEmptyCellPress = useCallback((week: number, cIdx: number, rIdx: number) => {
    if (armedCell && armedCell.week === week && armedCell.c === cIdx && armedCell.r === rIdx) {
      if (armedTimer.current) {
        clearTimeout(armedTimer.current);
        armedTimer.current = null;
      }
      setArmedCell(null);
      openAdd(cIdx, rIdx, week);
    } else {
      if (armedTimer.current) {
        clearTimeout(armedTimer.current);
        armedTimer.current = null;
      }
      setArmedCell({ week, c: cIdx, r: rIdx });
      armedTimer.current = setTimeout(() => {
        setArmedCell(null);
        armedTimer.current = null;
      }, 1800);
    }
  }, [armedCell, openAdd]);

  const isSuppressed = (course: CourseEntry, week: number) => {
    const keyMatch = (s: Suppression) =>
      s.name === course.name &&
      s.day === course.day &&
      s.startPeriod === course.startPeriod &&
      s.endPeriod === course.endPeriod &&
      s.room === (course.room || '') &&
      s.teacher === (course.teacher || '');
    const sup = suppressions.find(keyMatch);
    return sup ? sup.weeksList.includes(week) : false;
  };

  const performDelete = () => {
    if (!selected || deleteWeeks.length === 0) return;
    if (Array.isArray(selected.weeksList) && selected.weeksList.length > 0) {
      setCustoms(prev => {
        return prev
          .map(item => {
            if (item !== selected) return item;
            const rest = item.weeksList?.filter((w) => !deleteWeeks.includes(w)) ?? [];
            if (rest.length === 0) return null;
            return { ...item, weeksList: rest };
          })
          .filter((item): item is CourseEntry => item !== null);
      });
    } else {
      const keyMatch = (s: Suppression) =>
        s.name === selected.name &&
        s.day === selected.day &&
        s.startPeriod === selected.startPeriod &&
        s.endPeriod === selected.endPeriod &&
        s.room === (selected.room || '') &&
        s.teacher === (selected.teacher || '');
      setSuppressions(prev => {
        const idx = prev.findIndex(keyMatch);
        if (idx >= 0) {
          const merged = Array.from(new Set([...prev[idx].weeksList, ...deleteWeeks])).sort((a, b) => a - b);
          const copy = prev.slice();
          copy[idx] = { ...copy[idx], weeksList: merged };
          return copy;
        }
        return [
          ...prev,
          {
            name: selected.name,
            day: selected.day,
            startPeriod: selected.startPeriod,
            endPeriod: selected.endPeriod,
            room: selected.room || '',
            teacher: selected.teacher || '',
            weeksList: deleteWeeks.slice(),
          },
        ];
      });
    }
    setDeleteWeeks([]);
    closeModal();
  };

  const curWeekIndex = Math.min(maxWeek, Math.max(1, computeCurrentWeek())) - 1;

  const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
    const pageHeight = containerHeight > 0 ? containerHeight : Math.max(400, height - 24 - insets.top);
    
    if (index === maxWeek) {
       return (
         <View style={{ width, height: pageHeight }}>
            <ExamSchedule />
         </View>
       );
    }

    return (
      <WeekSlide
        weekIndex={index}
        grid={weeks[index]}
        maxWeek={maxWeek}
        curWeekIndex={curWeekIndex}
        width={width}
        pageHeight={pageHeight}
        theme={theme}
        styles={styles}
        armedCell={armedCell}
        onCellPress={handleEmptyCellPress}
        onModalOpen={openModal}
        onGoThisWeek={goThisWeek}
      />
    );
  }, [weeks, maxWeek, curWeekIndex, width, height, insets, theme, styles, armedCell, handleEmptyCellPress, openModal, goThisWeek, containerHeight]);

  return (
    <View style={styles.wrap} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      <FlatList
        ref={flatListRef}
        data={Array.from({ length: maxWeek + 1 })}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialScrollIndex={active}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActive(idx);
        }}
        onScrollBeginDrag={() => {
          if (armedTimer.current) {
            clearTimeout(armedTimer.current);
            armedTimer.current = null;
          }
          setArmedCell(null);
        }}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        removeClippedSubviews={Platform.OS === 'android'}
      />


      <CourseDetailModal
        visible={modalVisible}
        course={selected}
        attendance={selected ? (attendanceData[selected.name] || { present: 0, late: 0, absent: 0 }) : { present: 0, late: 0, absent: 0 }}
        onClose={closeModal}
        onDelete={openConfirm}
        onUpdateAttendance={handleUpdateAttendance}
      />

      {addVisible ? (
        <View pointerEvents="auto" style={styles.overlay}>
          <Pressable onPress={closeAdd} style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.backdrop, { opacity: addFade }]} />
          </Pressable>
          <Animated.View style={[styles.modal, { opacity: addFade, transform: [{ scale: addScale }] }]}>
            <Text style={styles.modalTitle}>添加日程</Text>
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <Chip
                selected={addType === 'schedule'}
                onPress={() => setAddType('schedule')}
                style={{ marginRight: 8 }}
                showSelectedOverlay
              >
                日程
              </Chip>
              <Chip
                selected={addType === 'course'}
                onPress={() => setAddType('course')}
                showSelectedOverlay
              >
                课程
              </Chip>
            </View>
            <TextInput
              mode="outlined"
              label="标题"
              value={addTitle}
              onChangeText={setAddTitle}
              style={{ marginBottom: 8 }}
            />
            <TextInput
              mode="outlined"
              label="地点"
              value={addRoom}
              onChangeText={setAddRoom}
              style={{ marginBottom: 8 }}
            />
            {addType === 'course' && (
              <TextInput
                mode="outlined"
                label="教师"
                value={addTeacher}
                onChangeText={setAddTeacher}
                style={{ marginBottom: 8 }}
              />
            )}
            <Text style={[styles.modalText, { marginBottom: 6 }]}>选择周次</Text>
            <View style={styles.weekChips}>
              {Array.from({ length: maxWeek }).map((_, i) => {
                const w = i + 1;
                const selected = addWeeks.includes(w);
                return (
                  <Chip
                    key={w}
                    selected={selected}
                    onPress={() => toggleWeek(w)}
                    compact
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    {w}
                  </Chip>
                );
              })}
            </View>
            <View style={styles.modalActionsRow}>
              <Button onPress={() => setAddWeeks([])}>清空</Button>
              <Button onPress={() => setAddWeeks(Array.from({ length: maxWeek }, (_, i) => i + 1))}>全选</Button>
              <View style={{ flex: 1 }} />
              <Button mode="contained" onPress={addConfirm} disabled={!addTitle.trim() || addWeeks.length === 0}>
                确认添加
              </Button>
            </View>
          </Animated.View>
        </View>
      ) : null}

      {confirmVisible ? (
        <View pointerEvents="auto" style={styles.overlay}>
          <Pressable onPress={closeConfirm} style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.backdrop, { opacity: confirmFade }]} />
          </Pressable>
          <Animated.View style={[styles.modal, { opacity: confirmFade, transform: [{ scale: confirmScale }] }]}>
            <Text style={styles.modalTitle}>确认删除</Text>
            <Text style={[styles.modalText, { marginTop: 6 }]}>
              将删除以下周次的“{selected?.name || ''}”：
            </Text>
            <View style={styles.weekChips}>
              {deleteWeeks.map(w => (
                <Chip key={`cf-${w}`} compact style={styles.chip}>
                  {w}
                </Chip>
              ))}
            </View>
            <View style={styles.modalActionsRow}>
              <Button onPress={closeConfirm}>取消</Button>
              <View style={{ flex: 1 }} />
              <Button mode="contained" onPress={() => { performDelete(); closeConfirm(); }}>
                确认删除
              </Button>
            </View>
          </Animated.View>
        </View>
      ) : null}

      {/* 错误提示 Snackbar */}
      <Snackbar
        visible={!!errorMsg}
        onDismiss={() => setErrorMsg(null)}
        duration={3000}
        action={{
          label: '重试',
          onPress: fetchSchedule,
        }}
      >
        {errorMsg}
      </Snackbar>

      {/* 加载中指示器 */}
      {loading && (
        <View style={styles.loadingContainer} pointerEvents="none">
          <ActivityIndicator animating={true} size="large" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

export default observer(CourseTable);

function createStyles(theme: MD3Theme) {
  return StyleSheet.create({
    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.6)',
      zIndex: 1000,
    },
    wrap: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  toolbar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
  },
  btn: {
    borderRadius: 10,
  },
  grid: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flex: 1,
    minHeight: 120,
    marginBottom: 2,
  },
  headerCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCellToday: {
    backgroundColor: theme.colors.primaryContainer + '40', // 25% opacity
    borderRadius: 8,
  },
  cell: {
    flex: 1,
    padding: 2,
    justifyContent: 'center',
  },
  timeCell: {
    width: 36,
    flex: 0,
    paddingHorizontal: 0,
    justifyContent: 'center',
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeIndex: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.onSurfaceVariant,
    lineHeight: 16,
    marginVertical: 2,
  },
  timeValue: {
    fontSize: 9,
    color: theme.colors.onSurfaceVariant,
    opacity: 0.6,
    transform: [{ scale: 0.85 }],
    lineHeight: 10,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  headerWeekText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.onSurfaceVariant,
  },
  headerWeekSub: {
    fontSize: 10,
    opacity: 0.6,
    marginTop: 2,
    color: theme.colors.onSurfaceVariant,
  },
  dateText: {
    fontSize: 11,
    opacity: 0.8,
    marginTop: 2,
    color: theme.colors.onSurfaceVariant,
  },
  headerToday: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 4,
    fontWeight: '500',
  },
  card: {
    flex: 1,
    borderRadius: 8, // 稍微减小圆角，让空间利用率更高
    paddingVertical: 4, // 减小垂直内边距
    paddingHorizontal: 4, // 减小水平内边距
    minHeight: 56,
    justifyContent: 'center',
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Elevation for Android
    elevation: 2,
  },
  cardTitle: {
    fontSize: 10, // 缩小字体
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2, // 减小间距
    lineHeight: 13, // 紧凑行高
  },
  cardDesc: {
    fontSize: 9, // 缩小字体
    opacity: 0.85,
    marginTop: 1,
    textAlign: 'center',
    lineHeight: 11, // 紧凑行高
  },
  emptyCell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  emptyHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  modal: {
    width: '84%',
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  modalText: {
    fontSize: 14,
    marginTop: 6,
    color: theme.colors.onSurfaceVariant,
  },
  modalActions: {
    marginTop: 14,
    alignItems: 'flex-end',
  },
  weekChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    marginHorizontal: 4,
    marginVertical: 4,
  },
  chipSelected: {
    backgroundColor: theme.colors.secondaryContainer,
  },
  modalActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thisWeekBtnWrap: {
    position: 'absolute',
    right: 10,
    top: 64,
    zIndex: 10,
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thisWeekBtn: {
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  });
}
