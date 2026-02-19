import AsyncStorage from '@react-native-async-storage/async-storage';
import http from '@/shared/http';

export interface WeatherInfo {
  // 天气现象中文摘要
  summary: string;
  // 可选温度展示
  temp?: string;
}

type CampusKey = '雅安校区' | '成都校区' | '都江堰校区';

type WeatherApiResponse = {
  current_weather?: {
    temperature?: number;
    weathercode?: number;
  };
};

const CAMPUS_COORDS: Record<CampusKey, { lat: number; lon: number }> = {
  雅安校区: { lat: 29.98, lon: 103.00 },
  成都校区: { lat: 30.67, lon: 104.07 },
  都江堰校区: { lat: 31.00, lon: 103.62 },
};

// 校区兜底选择，保证请求坐标可用
function pickCoords(campus: string): { lat: number; lon: number; name: CampusKey } {
  if (campus in CAMPUS_COORDS) {
    const key = campus as CampusKey;
    return { ...CAMPUS_COORDS[key], name: key };
  }
  return { ...CAMPUS_COORDS['雅安校区'], name: '雅安校区' };
}

// Open-Meteo weathercode 转中文摘要
function mapWeatherCodeToCN(code: number): string {
  if (code === 0) return '晴';
  if (code === 1) return '晴间多云';
  if (code === 2) return '多云';
  if (code === 3) return '阴';
  if (code === 45 || code === 48) return '雾';
  if (code === 51 || code === 53 || code === 55) return '小雨';
  if (code === 56 || code === 57) return '冻毛毛雨';
  if (code === 61) return '小雨';
  if (code === 63) return '中雨';
  if (code === 65) return '大雨';
  if (code === 66 || code === 67) return '冻雨';
  if (code === 71) return '小雪';
  if (code === 73) return '中雪';
  if (code === 75) return '大雪';
  if (code === 77) return '雪粒';
  if (code === 80) return '阵雨';
  if (code === 81) return '中阵雨';
  if (code === 82) return '大阵雨';
  if (code === 85) return '小阵雪';
  if (code === 86) return '大阵雪';
  if (code === 95) return '雷雨';
  if (code === 96 || code === 99) return '雷阵雨伴冰雹';
  return '多云';
}

// 缓存 key 以经纬度为维度
function cacheKey(lat: number, lon: number) {
  return `weather:openmeteo:${lat.toFixed(2)},${lon.toFixed(2)}`;
}

// 本地缓存 TTL：30 分钟
const TTL_MS = 30 * 60 * 1000;

// 按校区拉取天气，带本地缓存与降级
export async function getWeatherByCampus(campus: string): Promise<WeatherInfo> {
  const { lat, lon } = pickCoords(campus);
  const key = cacheKey(lat, lon);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const obj = JSON.parse(raw) as { expireAt: number; data: WeatherInfo };
      if (Date.now() < obj.expireAt) return obj.data;
    }
  } catch {}

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia%2FShanghai`;
    const resp = await http.get<WeatherApiResponse>(url);
    const cw = resp?.data?.current_weather;
    // 温度与天气摘要做基础容错
    const temp = typeof cw?.temperature === 'number' ? `${Math.round(cw.temperature)}℃` : undefined;
    const code = typeof cw?.weathercode === 'number' ? cw.weathercode : -1;
    const summary = mapWeatherCodeToCN(code);
    const data: WeatherInfo = { summary, temp };
    try {
      await AsyncStorage.setItem(key, JSON.stringify({ expireAt: Date.now() + TTL_MS, data }));
    } catch {}
    return data;
  } catch {
    return { summary: '' };
  }
}

// 调试用途：返回原始响应体
export async function getWeatherDebugByCampus(campus: string): Promise<{ info: WeatherInfo; raw: unknown }> {
  const { lat, lon } = pickCoords(campus);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Asia%2FShanghai`;
  const resp = await http.get<WeatherApiResponse>(url);
  const cw = resp?.data?.current_weather;
  const temp = typeof cw?.temperature === 'number' ? `${Math.round(cw.temperature)}℃` : undefined;
  const code = typeof cw?.weathercode === 'number' ? cw.weathercode : -1;
  const summary = mapWeatherCodeToCN(code);
  return { info: { summary, temp }, raw: resp?.data };
}

