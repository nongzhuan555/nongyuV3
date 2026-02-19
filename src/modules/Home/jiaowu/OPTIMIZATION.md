# 教务系统请求优化方案

## 1. 背景与目标
教务系统的学业进度、成绩查询、成绩排名等板块的数据具有**更新频率低、查询密度高**的特点。频繁的重复请求不仅增加了教务网服务器的负担，也导致用户在短时间内切换页面时需要反复等待加载。

为了解决这一问题，我们引入了 **SWR (Stale-While-Revalidate)** 策略进行数据缓存与管理。

## 2. 核心技术选型
- **库**: `swr`
- **版本**: `^2.x`
- **策略**: 客户端内存缓存 + 自动去重 + 按需重新验证

## 3. 实现细节

### 3.1 缓存键设计 (Cache Key)
为了支持多账号切换，缓存键必须包含当前用户的唯一标识（学号）。
格式：`jiaowu/[module_name]/${studentId}`

```typescript
// 示例：学业进度模块
const key = profileStore.profile.studentId 
  ? `jiaowu/progress/${profileStore.profile.studentId}` 
  : null;
```
当 `profileStore.profile.studentId` 发生变化时（例如用户切换账号），Key 会自动变更，SWR 会自动重新发起请求获取新用户的数据，确保数据隔离。

### 3.2 缓存策略配置
针对教务数据的特性，我们配置了较长的去重时间：

```typescript
{
  // 10分钟内重复请求同一 Key，直接返回缓存数据，不发起网络请求
  dedupingInterval: 600000, 
  
  // 禁用窗口聚焦时的自动重新验证，避免用户切屏回来产生的无意义请求
  revalidateOnFocus: false,
}
```

### 3.3 数据获取器 (Fetcher)
复用了现有的 `fetchAndCleanWithRetry` 工具函数，保持了原有的重试机制和数据清洗逻辑。

```typescript
const fetcher = async () => {
  return await fetchAndCleanWithRetry(
    URL,
    cleanFunction,
    validationFunction,
    '模块名称'
  );
};
```

### 3.4 手动刷新机制
虽然有自动缓存，但我们保留了用户手动强制刷新的能力。通过调用 `mutate()` 方法，可以忽略 `dedupingInterval` 限制，立即发起新请求并更新缓存。

```typescript
// 1. 获取 mutate 方法和 isLoading 状态
const { mutate, isLoading } = useSWR(...);

// 2. 绑定到下拉刷新或刷新按钮
// 注意：必须使用箭头函数 () => mutate()，直接传递 mutate 可能导致参数错配
<RefreshControl refreshing={isLoading} onRefresh={() => mutate()} />
```

### 3.5 状态迁移注意事项
在从传统 `useState` 迁移到 `useSWR` 时，需注意变量名的映射：
- `loading` -> `isLoading`
- `load()` -> `mutate()`
- `error` -> `error` (注意 SWR 的 error 是对象，需通过 `error.message` 获取信息)

## 4. 涉及模块
目前已在以下三个核心模块中应用此优化：

1.  **学业进度 (`src/modules/Home/jiaowu/progress`)**
    - 数据相对静态，适合长缓存。
2.  **成绩排名 (`src/modules/Home/jiaowu/rank`)**
    - 排名数据通常在考试季后才会变动，缓存收益高。
3.  **成绩查询 (`src/modules/Home/jiaowu/score`)**
    - 历史成绩完全静态，仅新学期成绩会有变动。

## 5. 收益
- **降低负载**：显著减少了对教务网的重复请求。
- **提升体验**：用户在不同页面间跳转时，数据可“秒开”，无加载等待。
- **代码简化**：移除原本手动维护 `loading`, `error`, `data` 状态的样板代码，转由 SWR 统一管理。
