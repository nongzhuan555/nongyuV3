import axios from 'axios';
import iconv from 'iconv-lite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import 'iconv-lite/encodings';
import { cleanPersonInfoHtml } from '../jiaowuInfo/personInfo.js';

// 教务登录校验接口
const ENDPOINT = 'https://jiaowu.sicau.edu.cn/jiaoshi/bangong/check.asp';
const FIXED = {
  // 固定参数：来自教务登录表单
  lb: 'S',
  submit: '',
  sign: 'e7a39b3bc356c6ccfd2736fb570cf0',
  hour_key:
    '819929348661855286025327972118498133047381331063899536918199759489377416899358818930337690620558866971528661981289306036893755569067971881335133',
};

const PERSON_INFO_URL = 'https://jiaowu.sicau.edu.cn/jiaoshi/bangong/main/welcome1.asp';
const COMMON_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'accept-encoding': 'gzip, deflate, br, zstd',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
  'upgrade-insecure-requests': '1',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36 Edg/145.0.0.0',
};
const ASP_SESSION_KEY = 'ASPSESSIONIDCEQTSTBS';
const KEY_ASP_COOKIE = 'app:jiaowu:asp_cookie';
let lastCookies = [];

// 确保 Buffer 在 RN 环境中可用
function ensureBuffer() {
  if (!globalThis.Buffer) globalThis.Buffer = Buffer;
}

// 解码教务系统返回的 GBK 页面
function decodeGbkToText(data) {
  ensureBuffer();
  const buf = Buffer.from(data);
  return iconv.decode(buf, 'gbk');
}

function buildResponsePayload(data, status, headers) {
  const responseCookies = headers?.['set-cookie'] || headers?.['Set-Cookie'] || [];
  const normalizedCookies = Array.isArray(responseCookies) ? responseCookies : [responseCookies];
  const text =
    typeof data === 'string'
      ? data
      : (() => {
          try {
            return JSON.stringify(data);
          } catch {
            return String(data);
          }
        })();
  const dataLength = data?.byteLength ?? data?.length ?? (typeof text === 'string' ? text.length : 0);
  return { status, headers, dataLength, preview: text.slice(0, 800), cookies: normalizedCookies.filter(Boolean) };
}

function normalizeCookies(cookies) {
  if (!cookies) return [];
  return (Array.isArray(cookies) ? cookies : [cookies]).filter(Boolean);
}

function findAspCookie(cookies) {
  return normalizeCookies(cookies).find((c) => String(c).startsWith(`${ASP_SESSION_KEY}=`)) || '';
}

async function readSavedAspCookie() {
  try {
    const raw = await AsyncStorage.getItem(KEY_ASP_COOKIE);
    return raw ? String(raw) : '';
  } catch {
    return '';
  }
}

async function saveAspCookie(cookie) {
  if (!cookie) return;
  try {
    await AsyncStorage.setItem(KEY_ASP_COOKIE, cookie);
  } catch {}
}

// 生成随机cookie
function createAspSessionValue(length = 24) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function ensureAspCookie(cookies) {
  const existing = findAspCookie(cookies);
  if (existing) return normalizeCookies(cookies);
  const value = createAspSessionValue(24);
  return [`${ASP_SESSION_KEY}=${value}`, ...normalizeCookies(cookies)];
}

async function resolveBaseCookies(cookies) {
  const base = normalizeCookies(cookies);
  if (base.length) return base;
  if (lastCookies && lastCookies.length) return lastCookies;
  const saved = await readSavedAspCookie();
  return saved ? [saved] : [];
}

function mergeCookies(base, incoming) {
  const out = new Map();
  normalizeCookies(base).forEach((c) => {
    const key = String(c).split('=')[0];
    if (key) out.set(key, c);
  });
  normalizeCookies(incoming).forEach((c) => {
    const key = String(c).split('=')[0];
    if (key) out.set(key, c);
  });
  return Array.from(out.values());
}

// 教务登录：返回是否成功
export async function loginJiaoWu(user, pwd, options = {}) {
  const baseCookies = await resolveBaseCookies(options?.cookies);
  const requestCookies = ensureAspCookie(baseCookies);
  const params = new URLSearchParams();
  params.append('user', user);
  params.append('pwd', pwd);
  // 合并固定参数
  Object.entries(FIXED).forEach(([k, v]) => params.append(k, v));
  try {
    const resp = await axios.post(ENDPOINT, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: requestCookies.join('; ') },
      timeout: 15000,
      withCredentials: true,
      maxRedirects: 0,
      // 允许 302/3xx 作为有效返回，便于判断登录跳转
      validateStatus: (s) => s >= 200 && s < 400,
    });
    // 教务登录失败通常返回脚本页面
    const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    const head = (body || '').trimStart().toLowerCase();
    const failed = head.startsWith('<script language=javascript');
    const cookies = resp.headers?.['set-cookie'] || resp.headers?.['Set-Cookie'] || [];
    const normalized = mergeCookies(requestCookies, cookies);
    lastCookies = normalized;
    const response = buildResponsePayload(resp.data, resp.status, resp.headers);
    if (!failed) {
      await saveAspCookie(findAspCookie(normalized));
    }
    return { passed: !failed, cookies: normalized, response, requestCookies };
  } catch (e) {
    if (e?.response) {
      // 兼容 3xx 被 axios 视为异常的情况
      const body = typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data);
      const head = (body || '').trimStart().toLowerCase();
      const failed = head.startsWith('<script language=javascript');
      const cookies = e.response.headers?.['set-cookie'] || e.response.headers?.['Set-Cookie'] || [];
      const normalized = mergeCookies(requestCookies, cookies);
      lastCookies = normalized;
      const response = buildResponsePayload(e.response.data, e.response.status, e.response.headers);
      if (!failed) {
        await saveAspCookie(findAspCookie(normalized));
      }
      return { passed: !failed, cookies: normalized, response, requestCookies };
    }
    return { passed: false, cookies: [] };
  }
}

// 拉取教务个人信息原始 HTML
export async function fetchPersonInfoHtml(options = {}) {
  const { user, pwd, cookies } = options || {};
  let useCookies = await resolveBaseCookies(cookies);
  if ((!useCookies || useCookies.length === 0) && user && pwd) {
    const loginResp = await loginJiaoWu(user, pwd);
    if (!loginResp?.passed) {
      throw new Error('教务登录失败');
    }
    useCookies = loginResp?.cookies || [];
  }
  if (!findAspCookie(useCookies)) {
    throw new Error('缺少 ASPSESSIONIDCEQTSTBS');
  }
  if (!useCookies || useCookies.length === 0) {
    throw new Error('缺少教务登录 Cookie');
  }
  lastCookies = useCookies;
  const resp = await axios.get(PERSON_INFO_URL, {
    responseType: 'arraybuffer',
    timeout: 15000,
    withCredentials: true,
    headers: { ...COMMON_HEADERS, referer: PERSON_INFO_URL, Cookie: useCookies.join('; ') },
    validateStatus: (s) => s >= 200 && s < 400,
  });
  const html = decodeGbkToText(resp.data);
  const response = buildResponsePayload(html, resp.status, resp.headers);
  return {
    html,
    response,
    requestCookies: useCookies,
  };
}

export async function fetchJiaowuHtml(url, options = {}) {
  const { cookies } = options || {};
  let useCookies = await resolveBaseCookies(cookies);
  
  // 对于无需登录的页面，如果没有cookie，自动生成一个临时的
  useCookies = ensureAspCookie(useCookies);
  
  lastCookies = useCookies;
  
  console.log(`[Jiaowu] Fetching: ${url}`);
  console.log(`[Jiaowu] Cookies: ${useCookies.join('; ')}`);

  try {
    const resp = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      withCredentials: true,
      headers: { ...COMMON_HEADERS, referer: url, Cookie: useCookies.join('; ') },
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const html = decodeGbkToText(resp.data);
    
    console.log(`[Jiaowu] Response status: ${resp.status}`);
    console.log(`[Jiaowu] Response preview: ${html.slice(0, 500)}...`);

    const response = buildResponsePayload(html, resp.status, resp.headers);
    return {
      html,
      response,
      requestCookies: useCookies,
    };
  } catch (e) {
    console.error(`[Jiaowu] Fetch error: ${e.message}`);
    throw e;
  }
}

export async function getPersonInfoFromJiaowu(cookies = []) {
  let useCookies = await resolveBaseCookies(cookies);
  if (!findAspCookie(useCookies)) {
    throw new Error('缺少 ASPSESSIONIDCEQTSTBS');
  }
  if (!useCookies || useCookies.length === 0) {
    throw new Error('缺少教务登录 Cookie');
  }
  lastCookies = useCookies;
  const resp = await axios.get(PERSON_INFO_URL, {
    responseType: 'arraybuffer',
    timeout: 15000,
    headers: { ...COMMON_HEADERS, referer: PERSON_INFO_URL, Cookie: useCookies.join('; ') },
    validateStatus: (s) => s >= 200 && s < 400,
  });
  const html = decodeGbkToText(resp.data);
  const response = buildResponsePayload(html, resp.status, resp.headers);
  return {
    ...cleanPersonInfoHtml(html),
    response,
    requestCookies: useCookies,
  };
}

// 教务登录原始返回：用于调试
export async function loginJiaoWuRaw(user, pwd, options = {}) {
  const baseCookies = await resolveBaseCookies(options?.cookies);
  const requestCookies = ensureAspCookie(baseCookies);
  const params = new URLSearchParams();
  params.append('user', user);
  params.append('pwd', pwd);
  // 合并固定参数
  Object.entries(FIXED).forEach(([k, v]) => params.append(k, v));
  try {
    const resp = await axios.post(ENDPOINT, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: requestCookies.join('; ') },
      timeout: 15000,
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return { status: resp.status, data: resp.data, headers: resp.headers, requestCookies };
  } catch (e) {
    if (e?.response) {
      const r = e.response;
      return { status: r.status, data: r.data, headers: r.headers, requestCookies };
    }
    throw e;
  }
}

export default loginJiaoWu;
