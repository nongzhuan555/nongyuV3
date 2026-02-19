import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig, AxiosResponse } from 'axios';
import { env } from '@/config';

type HttpError = {
  // 统一错误提示信息，便于 UI 层直接展示
  message: string;
  // 可能存在的 HTTP 状态码
  status?: number;
  // 可能存在的响应体数据
  data?: unknown;
};

type SetConfig = {
  // 可选的全局 baseURL
  baseURL?: string;
  // 可选的超时设置
  timeout?: number;
  // 可选的鉴权 token
  token?: string;
};

type RequestErrorHandler = (() => void) | null;
type RequestConfig = AxiosRequestConfig & { suppressErrorToast?: boolean };

// 运行期鉴权 token 缓存
let authToken = '';
let requestErrorHandler: RequestErrorHandler = null;

function safeJson(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function sanitizeHeaders(headers: AxiosRequestConfig['headers']) {
  const out = { ...(headers || {}) } as Record<string, unknown>;
  if (typeof out.Authorization === 'string') out.Authorization = 'Bearer ***';
  if (typeof out.authorization === 'string') out.authorization = 'Bearer ***';
  if (typeof out.Cookie === 'string') out.Cookie = '***';
  if (typeof out.cookie === 'string') out.cookie = '***';
  return out;
}

function buildRequestLog(config: AxiosRequestConfig) {
  return {
    method: String(config.method || 'get').toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    timeout: config.timeout,
    params: safeJson(config.params),
    data: safeJson(config.data),
    headers: sanitizeHeaders(config.headers),
  };
}

// 全局 axios 实例，统一拦截与默认配置
export const http = axios.create({
  baseURL: env.api.baseURL,
  timeout: env.api.timeout,
});

// 动态更新全局请求配置
export function setHttpConfig(config: SetConfig) {
  if (typeof config.baseURL === 'string') {
    http.defaults.baseURL = config.baseURL;
  }
  if (typeof config.timeout === 'number') {
    http.defaults.timeout = config.timeout;
  }
  if (typeof config.token === 'string') {
    authToken = config.token;
  }
}

export function setRequestErrorHandler(handler: RequestErrorHandler) {
  requestErrorHandler = handler;
}

function notifyRequestError(error?: unknown) {
  const err = error as { config?: { suppressErrorToast?: boolean } } | undefined;
  const suppress = err?.config?.suppressErrorToast === true;
  if (!suppress && requestErrorHandler) requestErrorHandler();
}

axios.interceptors.response.use(
  (resp) => resp,
  (error) => {
    notifyRequestError(error);
    return Promise.reject(error);
  },
);

http.interceptors.request.use((config) => {
  // 统一注入鉴权头
  if (authToken) {
    const headers = config.headers ?? {};
    const nextHeaders =
      headers instanceof AxiosHeaders
        ? headers
        : new AxiosHeaders(headers as Record<string, string>);
    nextHeaders.set('Authorization', `Bearer ${authToken}`);
    config.headers = nextHeaders;
  }
  console.log('[HTTP] 请求', buildRequestLog(config));
  return config;
});

http.interceptors.response.use(
  (resp) => resp,
  (error) => {
    notifyRequestError(error);
    return Promise.reject(error);
  },
);

// 统一错误结构，避免页面层散落判断逻辑
export function toHttpError(error: unknown): HttpError {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<unknown>;
    return {
      message: err.message || '请求失败',
      status: err.response?.status,
      data: err.response?.data,
    };
  }
  const err = error as { message?: string } | null;
  return { message: err?.message || '请求失败' };
}

// GET 请求封装，返回 axios 原始响应
export function get<T = unknown>(url: string, config?: RequestConfig): Promise<AxiosResponse<T>> {
  return http.get<T>(url, config);
}

// POST 请求封装，返回 axios 原始响应
export function post<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponse<T>> {
  return http.post<T>(url, data, config);
}

// PUT 请求封装，返回 axios 原始响应
export function put<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponse<T>> {
  return http.put<T>(url, data, config);
}

// PATCH 请求封装，返回 axios 原始响应
export function patch<T = unknown>(url: string, data?: unknown, config?: RequestConfig): Promise<AxiosResponse<T>> {
  return http.patch<T>(url, data, config);
}

// DELETE 请求封装，返回 axios 原始响应
export function del<T = unknown>(url: string, config?: RequestConfig): Promise<AxiosResponse<T>> {
  return http.delete<T>(url, config);
}

export default http;
