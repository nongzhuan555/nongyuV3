import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import http from '../http';

type Params = Record<string, unknown> | undefined;
type ApiKey = string | [string, Params] | null;
type Fetcher<T> = (url: string, params?: Params) => Promise<T>;

export function useApi<T = unknown>(
  key: ApiKey,
  fetcher?: Fetcher<T>,
  config?: SWRConfiguration<T, unknown>,
): SWRResponse<T, unknown> {
  // 默认 GET fetcher：支持 url + params
  const fn: Fetcher<T> =
    fetcher ??
    (async (url: string, params?: Params) => {
      const res = await http.get<T>(url, { params });
      return res.data;
    });

  // SWR 传入 key 数组时的参数拆解
  const swrFetcher = (...args: [string, Params?]) => fn(args[0], args[1]);
  return useSWR<T>(key, key ? swrFetcher : null, config);
}

export function useGet<T = unknown>(
  url?: string | null,
  params?: Params,
  config?: SWRConfiguration<T, unknown>,
): SWRResponse<T, unknown> {
  // 使用数组 key 保证 params 变化可触发重新请求
  const key: ApiKey = url ? [url, params] : null;
  return useApi<T>(key, undefined, config);
}

export default useApi;
