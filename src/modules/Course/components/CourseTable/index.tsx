import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View, Animated, Easing, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, useTheme, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
const courseData = require('@/jiaowu/course/course.json');

type GridRow = string[];

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

function parseTimeEntries(s: string) {
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
    .filter(Boolean) as Array<{ day: number; start: number; end: number; odd: boolean; even: boolean }>;
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
  const courses: any[] = [];
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

function weekMatches(week: number, info: any) {
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

function buildWeekMatrix(maxWeek: number, courses: any[], suppressed?: (c: any, w: number) => boolean) {
  const weeks: Array<Array<Array<any>>> = [];
  for (let w = 1; w <= maxWeek; w++) {
    const grid: Array<Array<any>> = Array.from({ length: 5 }).map(() => Array.from({ length: 7 }).map(() => []));
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

export default function CourseTable() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const grid = (courseData?.grid || []) as GridRow[];
  const { courses, maxWeek } = useMemo(() => normalizeCourses(grid), [grid]);
  const [customs, setCustoms] = useState<any[]>([]);
  const allCourses = useMemo(() => [...courses, ...customs], [courses, customs]);
  const weeks = useMemo(() => buildWeekMatrix(maxWeek, allCourses, isSuppressed), [maxWeek, allCourses, suppressions]);
  const width = Dimensions.get('window').width;
  const height = Dimensions.get('window').height;
  const svRef = useRef<ScrollView>(null);
  const initialWeek = Math.min(maxWeek, Math.max(1, computeCurrentWeek()));
  const [active, setActive] = useState(initialWeek - 1);
  const [selected, setSelected] = useState<any | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const [confirmVisible, setConfirmVisible] = useState(false);
  const confirmFade = useRef(new Animated.Value(0)).current;
  const confirmScale = useRef(new Animated.Value(0.96)).current;
  const [deleteWeeks, setDeleteWeeks] = useState<number[]>([]);
  const [suppressions, setSuppressions] = useState<Array<{
    name: string;
    day: number;
    startPeriod: number;
    endPeriod: number;
    room: string;
    teacher: string;
    weeksList: number[];
  }>>([]);
  const [addVisible, setAddVisible] = useState(false);
  const addFade = useRef(new Animated.Value(0)).current;
  const addScale = useRef(new Animated.Value(0.96)).current;
  const [addTarget, setAddTarget] = useState<{ day: number; slot: number } | null>(null);
  const [addTitle, setAddTitle] = useState('');
  const [addRoom, setAddRoom] = useState('');
  const [addWeeks, setAddWeeks] = useState<number[]>([]);
  const [armedCell, setArmedCell] = useState<{ c: number; r: number } | null>(null);
  const armedTimer = useRef<any>(null);

  useEffect(() => {
    setTimeout(() => {
      svRef.current?.scrollTo({ x: active * width, animated: false });
    }, 0);
  }, [width]);

  const goThisWeek = () => {
    const w = Math.min(maxWeek, Math.max(1, computeCurrentWeek())) - 1;
    setActive(w);
    svRef.current?.scrollTo({ x: w * width, animated: true });
  };

  const weeksOfCourse = (course: any, maxWeekLocal: number) => {
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

  const openModal = useCallback((course: any) => {
    setSelected(course);
    const all = weeksOfCourse(course, maxWeek);
    const cur = active + 1;
    setDeleteWeeks(all.includes(cur) ? [cur] : []);
    setModalVisible(true);
    fade.setValue(0);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [active, maxWeek]);

  const closeModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.96, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => {
      setModalVisible(false);
      setSelected(null);
    });
  }, []);

  const openAdd = useCallback((day: number, slot: number) => {
    setAddTarget({ day, slot });
    setAddTitle('');
    setAddRoom('');
    setAddWeeks([active + 1]); // 默认选择当前周
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

  const toggleWeek = (w: number) => {
    setAddWeeks((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w].sort((a, b) => a - b)));
  };

  const addConfirm = () => {
    if (!addTarget || !addTitle.trim() || addWeeks.length === 0) return;
    const slot = addTarget.slot;
    const startPeriod = slot === 0 ? 1 : slot === 1 ? 3 : slot === 2 ? 5 : slot === 3 ? 7 : 9;
    const endPeriod = startPeriod + 1;
    const newItem = {
      name: addTitle.trim(),
      room: addRoom.trim(),
      teacher: '',
      day: addTarget.day + 1, // cIdx starts from 0, day uses 1..7
      startPeriod,
      endPeriod,
      odd: false,
      even: false,
      weeksList: addWeeks.slice(),
    };
    setCustoms((prev) => [...prev, newItem]);
    closeAdd();
  };

  const handleEmptyCellPress = (cIdx: number, rIdx: number) => {
    if (armedCell && armedCell.c === cIdx && armedCell.r === rIdx) {
      if (armedTimer.current) {
        clearTimeout(armedTimer.current);
        armedTimer.current = null;
      }
      setArmedCell(null);
      openAdd(cIdx, rIdx);
    } else {
      if (armedTimer.current) {
        clearTimeout(armedTimer.current);
        armedTimer.current = null;
      }
      setArmedCell({ c: cIdx, r: rIdx });
      armedTimer.current = setTimeout(() => {
        setArmedCell(null);
        armedTimer.current = null;
      }, 1800);
    }
  };

  const isSuppressed = (course: any, week: number) => {
    const keyMatch = (s: any) =>
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
            const rest = item.weeksList.filter((w: number) => !deleteWeeks.includes(w));
            if (rest.length === 0) return null as any;
            return { ...item, weeksList: rest };
          })
          .filter(Boolean);
      });
    } else {
      const keyMatch = (s: any) =>
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
  const [hoverThisWeek, setHoverThisWeek] = useState(false);

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={svRef}
        horizontal
        pagingEnabled
        onScrollBeginDrag={() => {
          if (armedTimer.current) {
            clearTimeout(armedTimer.current);
            armedTimer.current = null;
          }
          setArmedCell(null);
        }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setActive(idx);
        }}
        showsHorizontalScrollIndicator={false}
      >
        {weeks.map((grid, idx) => {
          const dates = getWeekDates(idx + 1);
          const mon = mondayOfWeek(idx + 1);
          const today = new Date();
          const pageHeight = Math.max(400, height - 24 - insets.top);
          return (
            <View key={idx} style={{ width }}>
              <ScrollView
                style={{ maxHeight: pageHeight }}
                nestedScrollEnabled
                showsVerticalScrollIndicator
              >
                <View style={styles.grid}>
                  <View style={[styles.headerRow]}>
                    <View style={[styles.headerCell, styles.timeCell]}>
                      <Text style={styles.headerWeekText}>第{idx + 1}周</Text>
                      <Text style={styles.headerWeekSub}>共{maxWeek}周</Text>
                    </View>
                    {['周一','周二','周三','周四','周五','周六','周日'].map((d, i) => {
                      const cur = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
                      const isToday = isSameDay(cur, today);
                      return (
                        <View key={i} style={styles.headerCell}>
                          <Text style={[styles.headerText, isToday && styles.headerToday]}>{d}</Text>
                          <Text style={[styles.dateText, isToday && styles.headerToday]}>{dates[i]}</Text>
                        </View>
                      );
                    })}
                  </View>
                  {grid.map((row, rIdx) => (
                    <View key={rIdx} style={styles.row}>
                      <View style={[styles.cell, styles.timeCell]}>
                        <Text style={styles.timeText}>{['1-2节','3-4节','5-6节','7-8节','9-10节'][rIdx]}</Text>
                      </View>
                      {row.map((cell, cIdx) => (
                        <View key={cIdx} style={styles.cell}>
                          {cell.length > 0 ? (
                            <TouchableOpacity activeOpacity={0.9} onPress={() => openModal(cell[0])}>
                              <View style={styles.card}>
                                <Text numberOfLines={3} style={styles.cardTitle}>{cell[0].name}</Text>
                                {!!cell[0].room && <Text numberOfLines={1} style={styles.cardDesc}>{cell[0].room}</Text>}
                                {!!cell[0].teacher && <Text numberOfLines={1} style={styles.cardDesc}>{cell[0].teacher}</Text>}
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <Pressable style={styles.emptyHit} onPress={() => handleEmptyCellPress(cIdx, rIdx)}>
                              {armedCell && armedCell.c === cIdx && armedCell.r === rIdx ? (
                                <View style={styles.plusWrap}>
                                  <Text style={styles.plus}>＋</Text>
                                </View>
                              ) : null}
                            </Pressable>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
              {idx !== curWeekIndex ? (
                <Pressable
                  onHoverIn={() => setHoverThisWeek(true)}
                  onHoverOut={() => setHoverThisWeek(false)}
                  style={[
                    styles.thisWeekBtnWrap,
                    Platform.OS === 'web' ? { opacity: hoverThisWeek ? 1 : 0 } : { opacity: 1 },
                  ]}
                >
                  <Pressable onPress={goThisWeek} style={[styles.thisWeekBtn, { backgroundColor: theme.colors.primary }]}>
                    <MaterialCommunityIcons name="undo" size={22} color={theme.colors.onPrimary} />
                  </Pressable>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {modalVisible ? (
        <View pointerEvents="auto" style={styles.overlay}>
          <Pressable onPress={closeModal} style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.backdrop, { opacity: fade }]} />
          </Pressable>
          <Animated.View style={[styles.modal, { opacity: fade, transform: [{ scale }] }]}>
            <Text style={styles.modalTitle}>{selected?.name || '课程'}</Text>
            {!!selected?.teacher && <Text style={styles.modalText}>教师：{selected.teacher}</Text>}
            {!!selected?.room && <Text style={styles.modalText}>教室：{selected.room}</Text>}
            <Text style={styles.modalText}>
              周次：{selected?.weeks?.start}-{selected?.weeks?.end}{selected?.odd ? '（单周）' : ''}{selected?.even ? '（双周）' : ''}
            </Text>
            <Text style={styles.modalText}>
              时间：周{selected?.day} 第{selected?.startPeriod}-{selected?.endPeriod}节
            </Text>
            {selected ? (
              <>
                <Text style={[styles.modalText, { marginTop: 12 }]}>选择要删除的周次</Text>
                <View style={styles.weekChips}>
                  {weeksOfCourse(selected, maxWeek).map((w: number) => {
                    const on = deleteWeeks.includes(w);
                    return (
                      <Chip
                        key={`del-${w}`}
                        selected={on}
                        onPress={() =>
                          setDeleteWeeks(prev =>
                            prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w].sort((a, b) => a - b),
                          )
                        }
                        compact
                        style={[styles.chip, on && styles.chipSelected]}
                      >
                        {w}
                      </Chip>
                    );
                  })}
                </View>
                <View style={styles.modalActionsRow}>
                  <Button onPress={() => setDeleteWeeks([])}>清空</Button>
                  <Button onPress={() => setDeleteWeeks(weeksOfCourse(selected, maxWeek))}>全选</Button>
                  <View style={{ flex: 1 }} />
                  <Button
                    mode="contained"
                    disabled={deleteWeeks.length === 0}
                    onPress={openConfirm}
                  >
                    删除所选周次
                  </Button>
                </View>
              </>
            ) : null}
          </Animated.View>
        </View>
      ) : null}

      {addVisible ? (
        <View pointerEvents="auto" style={styles.overlay}>
          <Pressable onPress={closeAdd} style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.backdrop, { opacity: addFade }]} />
          </Pressable>
          <Animated.View style={[styles.modal, { opacity: addFade, transform: [{ scale: addScale }] }]}>
            <Text style={styles.modalTitle}>添加日程</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#fff',
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
    marginHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e5ea',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f6f8fa',
  },
  row: {
    flexDirection: 'row',
    flex: 1,
  },
  headerCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e5ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    flex: 1,
    padding: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: '#e1e5ea',
    justifyContent: 'center',
  },
  timeCell: {
    width: 45,
    flex: 0,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerWeekText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerWeekSub: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  headerToday: {
    color: '#0A7C59',
    fontWeight: '700',
  },
  timeText: {
    fontSize: 13,
  },
  card: {
    backgroundColor: '#eef6f3',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 56,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  emptyCell: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecef',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    fontSize: 12,
    color: '#9aa4ad',
  },
  emptyHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  plus: {
    fontSize: 22,
    color: '#9aa4ad',
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
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    marginTop: 6,
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
    backgroundColor: '#e6f4ef',
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
