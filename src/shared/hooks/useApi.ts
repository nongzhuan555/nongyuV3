import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import http from '../http';

type Fetcher<T> = (key: string) => Promise<T>;

export function useApi<T = any>(
  key: string | null,
  fetcher?: Fetcher<T>,
  config?: SWRConfiguration<T, any>,
): SWRResponse<T, any> {
  const fn: Fetcher<T> =
    fetcher ??
    (async (k: string) => {
      const res = await http.get<T>(k);
      return res.data;
    });
  return useSWR<T>(key, key ? fn : null, config);
}

export default useApi;
