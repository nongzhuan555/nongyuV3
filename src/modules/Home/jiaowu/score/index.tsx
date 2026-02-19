import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, LayoutAnimation, Platform, UIManager, TouchableOpacity } from 'react-native';
import { Text, TextInput, Card, Button, ActivityIndicator, useTheme, Appbar, Chip, Divider, Surface, Icon, Portal, Modal, List } from 'react-native-paper';
import { cleanScoreHtml } from '@/jiaowu/jiaowuInfo/scoreInfo';
import { fetchAndCleanWithRetry } from '@/jiaowu/utils/retry';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileStore } from '@/stores/profile';
import { observer } from 'mobx-react-lite';
import useSWR from 'swr';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type ScoreItem = {
  courseName?: string;
  score?: string;
  credit?: string;
  gpa?: string;
  term?: string;
  courseType?: string;
  examType?: string;
  teacher?: string;
};

const parseScore = (v?: string) => {
  if (!v) return 0;
  // Handle special cases like "优", "良", "及格" if necessary, though usually numeric
  if (v === '优') return 95;
  if (v === '良') return 85;
  if (v === '中') return 75;
  if (v === '及格') return 65;
  if (v === '不及格') return 0;
  
  const m = String(v).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

const parseCredit = (v?: string) => {
  if (!v) return 0;
  const m = String(v).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
};

const parseTermValue = (v?: string) => {
  if (!v) return 0;
  const m = String(v).match(/(\d{4})\s*[-~—]\s*(\d{4})\s*[-~—]?\s*(\d)?/);
  if (m) {
    const y1 = Number(m[1]);
    const y2 = Number(m[2]);
    const t = Number(m[3] || 0);
    return y1 * 10000 + y2 * 10 + t;
  }
  const m2 = String(v).match(/(\d{4}).*?(\d)/);
  if (m2) return Number(m2[1]) * 10 + Number(m2[2]);
  return 0;
};

const getScoreColor = (score: number, theme: any) => {
  if (score >= 90) return theme.colors.primary;
  if (score >= 80) return theme.colors.secondary;
  if (score < 60) return theme.colors.error;
  return theme.colors.onSurface;
};

const fetcher = async () => {
  return await fetchAndCleanWithRetry(
    'https://jiaowu.sicau.edu.cn/xuesheng/chengji/chengji/sear_ch_all.asp',
    (html) => cleanScoreHtml(html),
    (data) => !data.list || data.list.length === 0,
    '成绩查询'
  );
};

const ScoreList = observer(() => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [keyword, setKeyword] = useState('');
  const [expandedTerms, setExpandedTerms] = useState<string[]>([]);
  
  // Modal for course details
  const [selectedCourse, setSelectedCourse] = useState<ScoreItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data, error: swrError, isLoading, mutate } = useSWR(
    profileStore.profile.studentId ? `jiaowu/score/${profileStore.profile.studentId}` : null,
    fetcher,
    {
      dedupingInterval: 600000, // 10分钟缓存
      revalidateOnFocus: false,
    }
  );

  const sourceList = (data?.list || []) as ScoreItem[];

  const { groupedList, stats } = useMemo(() => {
    const key = keyword.trim();
    let filtered = sourceList;
    if (key) {
      filtered = sourceList.filter((i) => String(i.courseName || '').includes(key));
    }

    const groups: Record<string, ScoreItem[]> = {};
    let totalCourses = 0;
    let totalCredits = 0;
    let passedCourses = 0;
    let weightedScoreSum = 0;

    filtered.forEach(item => {
      const term = item.term || '未知学期';
      if (!groups[term]) groups[term] = [];
      groups[term].push(item);

      const score = parseScore(item.score);
      const credit = parseCredit(item.credit);
      
      totalCourses++;
      totalCredits += credit;
      if (score >= 60) passedCourses++;
      weightedScoreSum += score * credit;
    });

    const sortedTerms = Object.keys(groups).sort((a, b) => parseTermValue(b) - parseTermValue(a));
    
    // Auto-expand the first term if not manually interacted
    if (sortedTerms.length > 0 && expandedTerms.length === 0 && !key) {
       // Ideally we could set this in useEffect, but for memo purity we just default expand in render logic if needed
       // For now, let's just default to expanding the latest term in the state initialization or effect
    }

    return {
      groupedList: sortedTerms.map(term => ({
        term,
        courses: groups[term],
        termCredits: groups[term].reduce((sum, item) => sum + parseCredit(item.credit), 0),
        termAvg: groups[term].length ? (groups[term].reduce((sum, item) => sum + parseScore(item.score), 0) / groups[term].length).toFixed(1) : '0'
      })),
      stats: {
        totalCourses,
        totalCredits,
        passedCourses,
        avgScore: totalCredits > 0 ? (weightedScoreSum / totalCredits).toFixed(2) : '0.00'
      }
    };
  }, [sourceList, keyword]);

  // Initialize expanded terms with the first term
  React.useEffect(() => {
    if (groupedList.length > 0 && expandedTerms.length === 0) {
      setExpandedTerms([groupedList[0].term]);
    }
  }, [groupedList.length]);

  const toggleTerm = (term: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedTerms(prev => 
      prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]
    );
  };

  const showCourseDetails = (course: ScoreItem) => {
    setSelectedCourse(course);
    setModalVisible(true);
  };

  const renderOverviewCard = () => (
    <Surface style={[styles.overviewCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={2}>
      <View style={styles.overviewRow}>
        <View style={styles.overviewItem}>
          <Text variant="displaySmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>{stats.avgScore}</Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>加权平均分</Text>
        </View>
        <Divider style={{ width: 1, height: 40, backgroundColor: theme.colors.onPrimaryContainer, opacity: 0.2 }} />
        <View style={styles.overviewItem}>
          <Text variant="displaySmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>{stats.totalCredits}</Text>
          <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, opacity: 0.8 }}>总学分</Text>
        </View>
      </View>
      <View style={styles.overviewFooter}>
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
          共修 {stats.totalCourses} 门课程，通过 {stats.passedCourses} 门
        </Text>
      </View>
    </Surface>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color={theme.colors.onPrimary} />
        <Appbar.Content title="成绩查询" titleStyle={{ color: theme.colors.onPrimary, fontWeight: 'bold' }} />
        <Appbar.Action icon="refresh" onPress={() => mutate()} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <TextInput
          mode="outlined"
          placeholder="搜索课程名称"
          value={keyword}
          onChangeText={setKeyword}
          left={<TextInput.Icon icon="magnify" />}
          style={[styles.searchInput, { backgroundColor: theme.colors.surface }]}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          dense
        />
      </View>

      {isLoading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>正在获取最新成绩...</Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {swrError && (
             <Surface style={[styles.errorCard, { backgroundColor: theme.colors.errorContainer }]}>
               <Icon source="alert-circle" size={24} color={theme.colors.onErrorContainer} />
               <Text style={{ color: theme.colors.onErrorContainer, marginLeft: 8 }}>{swrError.message || '获取成绩失败，请稍后重试'}</Text>
             </Surface>
          )}

          {!keyword && renderOverviewCard()}

          {groupedList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon source="file-document-outline" size={64} color={theme.colors.outline} />
              <Text style={{ marginTop: 16, color: theme.colors.outline }}>暂无成绩记录</Text>
            </View>
          ) : (
            groupedList.map((group) => (
              <View key={group.term} style={styles.termSection}>
                <TouchableOpacity 
                  style={[styles.termHeader, { backgroundColor: theme.colors.surface }]} 
                  onPress={() => toggleTerm(group.term)}
                  activeOpacity={0.7}
                >
                  <View style={styles.termInfo}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onSurface }}>{group.term}</Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {group.courses.length} 门课 · 平均 {group.termAvg}
                    </Text>
                  </View>
                  <Icon 
                    source={expandedTerms.includes(group.term) ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={theme.colors.onSurfaceVariant} 
                  />
                </TouchableOpacity>
                
                {expandedTerms.includes(group.term) && (
                  <View style={styles.courseList}>
                    {group.courses.map((course, idx) => (
                      <TouchableOpacity 
                        key={`${course.courseName}-${idx}`} 
                        style={[styles.courseItem, { backgroundColor: theme.colors.surface }]}
                        onPress={() => showCourseDetails(course)}
                      >
                        <View style={styles.courseMain}>
                          <Text variant="bodyLarge" style={{ fontWeight: '600', color: theme.colors.onSurface, marginBottom: 4 }}>
                            {course.courseName}
                          </Text>
                          <View style={styles.courseMeta}>
                            <Chip 
                              compact 
                              textStyle={{ fontSize: 10, marginVertical: 0, marginHorizontal: 4 }} 
                              style={{ height: 20, backgroundColor: theme.colors.secondaryContainer, marginRight: 6 }}
                            >
                              {course.courseType || '未知'}
                            </Chip>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                              {course.credit} 学分
                            </Text>
                          </View>
                        </View>
                        <View style={styles.scoreContainer}>
                          <Text 
                            variant="titleLarge" 
                            style={{ 
                              fontWeight: 'bold', 
                              color: getScoreColor(parseScore(course.score), theme) 
                            }}
                          >
                            {course.score}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Portal>
        <Modal 
          visible={modalVisible} 
          onDismiss={() => setModalVisible(false)} 
          contentContainerStyle={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
        >
          {selectedCourse && (
            <>
              <Text variant="headlineSmall" style={{ fontWeight: 'bold', marginBottom: 16, color: theme.colors.onSurface }}>
                {selectedCourse.courseName}
              </Text>
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>最终成绩</Text>
                <Text style={[styles.detailValue, { color: getScoreColor(parseScore(selectedCourse.score), theme), fontWeight: 'bold', fontSize: 20 }]}>
                  {selectedCourse.score}
                </Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />
              
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>学分</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{selectedCourse.credit}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>绩点</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{selectedCourse.gpa}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>课程性质</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{selectedCourse.courseType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>考核方式</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{selectedCourse.examType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>授课教师</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{selectedCourse.teacher}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}>修读学期</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{selectedCourse.term}</Text>
              </View>

              <Button mode="contained" onPress={() => setModalVisible(false)} style={{ marginTop: 24 }}>
                关闭
              </Button>
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
});

export default ScoreList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInput: {
    height: 40,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewFooter: {
    alignItems: 'center',
    opacity: 0.8,
  },
  errorCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  termSection: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  termHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  termInfo: {
    flex: 1,
  },
  courseList: {
    marginTop: 1,
  },
  courseItem: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  courseMain: {
    flex: 1,
    paddingRight: 16,
  },
  courseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  modalContent: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
});
