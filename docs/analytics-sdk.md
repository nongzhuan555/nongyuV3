# 埋点 SDK 技术文档

## 1. 简介
本 SDK 用于收集 React Native 应用的用户行为数据和客户端性能数据，支持离线缓存、批量上报、失败重试等特性。

## 2. 核心功能
### 2.1 用户行为采集
- **进入应用 (user_enter_app)**: 统计日活/月活。
- **进入页面 (user_enter_page)**: 统计页面访问量。
- **点击按钮 (user_click_button)**: 统计功能点击率。

### 2.2 性能数据采集
- **页面加载耗时 (page_load_time)**: 统计页面渲染性能。

### 2.3 技术特性
- **批量上报**: 支持按数量（默认10条）或时间（默认10秒）批量上报。
- **断网续传**: 网络异常时自动缓存，恢复后重试。
- **自动重试**: 上报失败自动重试（默认3次）。
- **线程安全**: 内部队列管理，确保高并发下数据不丢失。
- **生命周期感知**: App 进入后台自动保存数据并尝试上报。

## 3. 集成指南

### 3.1 初始化
在 App 启动入口（如 `App.tsx`）进行初始化：

```typescript
import analytics from '@/src/sdk/analytics';
import env from '@/config';

analytics.init({
  endpoint: `${env.api.baseURL}/events/track`, // 动态读取 config
  token: 'your_token_here', // 可选，会在 App.tsx 中自动监听 store 更新
  batchSize: 10,
  flushInterval: 10000,
  debug: __DEV__,
});
```

### 3.2 用户登录关联
用户登录成功后设置 User ID：

```typescript
analytics.setUserId("20210001"); // 支持字符串或数字
```

### 3.3 埋点调用示例

#### 进入应用
通常在 `App.tsx` 的 `useEffect` 中调用：

```typescript
useEffect(() => {
  analytics.trackAppLaunch({
    from: 'push_notification', // 可选参数
  });
}, []);
```

#### 进入页面
在页面组件或路由监听中调用：

```typescript
// 页面加载
useEffect(() => {
  const startTime = Date.now();
  
  analytics.trackPageView('HomePage', {
    source: 'tab_bar',
  });

  // 模拟页面加载完成
  return () => {
    const duration = Date.now() - startTime;
    analytics.trackPageLoad('HomePage', duration);
  };
}, []);
```

#### 点击按钮
在交互事件中调用：

```typescript
<Button onPress={() => {
  analytics.trackClick('submit_button', 'LoginPage', {
    method: 'wechat',
  });
}}>
  登录
</Button>
```

## 4. 技术实现细节

### 4.1 数据模型
所有事件统一遵循 `AnalyticsEvent` 接口：
- `event_uuid`: UUID v4，保证事件唯一性。
- `event_type`: 事件类型枚举。
- `event_time`: 发生时间 (YYYY-MM-DD HH:mm:ss)。
- `user_id`: 用户ID，未登录为0。
- `device_info`: 设备信息（系统版本等）。

### 4.2 队列管理
- **内存队列**: `AnalyticsTracker` 维护一个 `queue` 数组。
- **持久化**: 每次 `track` 或 App 进入后台时，队列同步保存至 `AsyncStorage`。
- **初始化加载**: SDK 启动时自动从本地存储恢复未发送的事件。

### 4.3 上报策略
- **触发条件**: 
  1. 队列长度 >= `batchSize`。
  2. 定时器 `flushInterval` 触发。
  3. App 进入后台 (`AppState` 变为 `background`)。
- **失败处理**: 上报请求失败（非200状态码）时，事件保留在队列头部，等待下一次触发重试。

### 4.4 性能优化
- **UUID生成**: 优先使用 `crypto.randomUUID`，降级使用 Math.random。
- **网络请求**: 使用 `axios` 并配置超时时间。
- **存储优化**: 异步写入 `AsyncStorage`，避免阻塞 UI 线程。

## 5. API 参考

### `init(config: AnalyticsConfig)`
初始化 SDK。

### `setUserId(userId: string | number)`
设置当前用户 ID。

### `track(eventType: string, properties?: object, pageName?: string, elementName?: string, durationMs?: number)`
通用埋点方法。

### `trackPageView(pageName: string, properties?: object)`
快捷方法：进入页面。

### `trackClick(elementName: string, pageName?: string, properties?: object)`
快捷方法：点击元素。

### `trackPageLoad(pageName: string, durationMs: number, properties?: object)`
快捷方法：记录页面加载耗时。
