# 课表页面性能优化与实现思路

本文档记录了针对 `CourseTable` 组件及相关模块进行的性能优化措施和实现细节。

## 1. 渲染性能优化 (CourseTable)

### 问题分析
原有的 `ScrollView` 实现方式在渲染大量课程数据（20+周次）时，会一次性创建所有周次的视图，导致：
- 内存占用过高
- 初始加载慢
- 左右滑动时帧率下降（掉帧）

### 解决方案：FlatList 重构
我们将外层容器从 `ScrollView` 迁移到了 `FlatList`，利用其虚拟化特性大幅提升性能。

#### 关键配置
- **windowSize={3}**: 仅保留当前周及前后各一周的视图在内存中，极大降低内存压力。
- **getItemLayout**: 实现了固定高度/宽度的布局计算，避免了动态测量开销，使滚动更加流畅。
  ```typescript
  getItemLayout={(_, index) => ({
    length: width,
    offset: width * index,
    index,
  })}
  ```
- **initialNumToRender={1}**: 初始只渲染当前周，加快首屏显示速度。
- **removeClippedSubviews**: 在 Android 上开启裁剪，进一步优化视图层级。

## 2. 组件级优化 (WeekSlide)

### 问题分析
在 `FlatList` 中，虽然实现了虚拟化，但当父组件状态（如 `armedCell` 点击高亮）变化时，默认会导致所有渲染中的 `Item` 重新渲染。对于复杂的课表网格，这是不必要的性能浪费。

### 解决方案：React.memo 与自定义比较
我们将每一周的视图提取为独立的 `WeekSlide` 组件，并使用 `React.memo` 进行包裹。

#### 自定义比较逻辑 (arePropsEqual)
我们实现了严格的 `props` 比较函数，仅在以下情况触发重渲染：
1. **基础属性变化**：`weekIndex`, `maxWeek`, `curWeekIndex`, `theme` 等发生变化。
2. **高亮状态变化 (Armed Cell)**：
   - 如果当前周是 **上一次** 被高亮的周（需要取消高亮）。
   - 如果当前周是 **这一次** 被高亮的周（需要显示高亮）。
   - 如果高亮在其他周发生变化，当前周 **不** 重新渲染。

```typescript
(prev, next) => {
  const prevArmed = prev.armedCell && prev.armedCell.week === prev.weekIndex;
  const nextArmed = next.armedCell && next.armedCell.week === next.weekIndex;
  
  // 只有当本周的高亮状态发生实质性改变时才更新
  if (!!prevArmed !== !!nextArmed) return false;
  if (prevArmed && nextArmed) {
    // 如果位置变了才更新
    if (prev.armedCell?.c !== next.armedCell?.c || prev.armedCell?.r !== next.armedCell?.r) return false;
  }
  
  // ...其他基础属性比较
  return true; // 阻止不必要的更新
}
```

## 3. 数据缓存策略 (ExamSchedule)

### 问题分析
考试安排数据变化频率低，但查询耗时。每次进入页面都重新请求会导致用户体验不佳且浪费流量。

### 解决方案：持久化缓存 (SWR + AsyncStorage)
我们结合了 `useSWR` 和 `AsyncStorage` 实现了“优先读取本地，按需请求”的策略。

- **本地优先**：组件挂载时首先读取 `AsyncStorage` 中的缓存数据。
- **SWR 配置**：
  - `fallbackData`: 使用本地缓存作为初始数据。
  - `revalidateOnMount`: 如果本地有数据，则 **不** 自动发起请求（`!cachedData`）。
  - `dedupingInterval`: 设置较长的去重时间。
- **数据一致性**：在用户退出登录时，通过 `AsyncStorage.multiRemove` 清除所有缓存数据，确保隐私安全。

## 4. 日程功能重构 (Calendar Integration)

### 问题分析
原有的 `expo-calendar` 库在部分 Android 机型上表现不稳定，且权限请求复杂。

### 解决方案：Native Intent (Android)
回退到更底层的 Android Intent 机制，使用 `expo-intent-launcher` 直接调用系统日历插入页面。

- **稳定性**：不依赖第三方日历库的复杂逻辑，直接由系统处理。
- **功能增强**：
  - `eventTimezone`: 明确指定 'Asia/Shanghai'。
  - `hasAlarm`: 提示系统开启默认提醒。
  - `description`: 自动填充详细的课程信息和温馨提示。

---
*文档生成时间：2026-02-20*
