import axios from 'axios';

const ENDPOINT = 'https://jiaowu.sicau.edu.cn/jiaoshi/bangong/check.asp';
const FIXED = {
  lb: 'S',
  submit: '',
  sign: 'da77923c6b859c87e820ff4d322a08',
  hour_key:
    '813310638864670590676478906279388133047381331063886420559721089989308156866514328199293486022107866971528864880589951801886596058602407786034497',
};

export async function loginJiaoWu(user, pwd) {
  const params = new URLSearchParams();
  params.append('user', user);
  params.append('pwd', pwd);
  Object.entries(FIXED).forEach(([k, v]) => params.append(k, v));
  try {
    const resp = await axios.post(ENDPOINT, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    const body = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
    const head = (body || '').trimStart().toLowerCase();
    const failed = head.startsWith('<script language=javascript');
    return !failed;
  } catch (e) {
    if (e?.response) {
      const body = typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data);
      const head = (body || '').trimStart().toLowerCase();
      const failed = head.startsWith('<script language=javascript');
      return !failed;
    }
    return false;
  }
}

export async function loginJiaoWuRaw(user, pwd) {
  const params = new URLSearchParams();
  params.append('user', user);
  params.append('pwd', pwd);
  Object.entries(FIXED).forEach(([k, v]) => params.append(k, v));
  try {
    const resp = await axios.post(ENDPOINT, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
      withCredentials: true,
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });
    return { status: resp.status, data: resp.data, headers: resp.headers };
  } catch (e) {
    if (e?.response) {
      const r = e.response;
      return { status: r.status, data: r.data, headers: r.headers };
    }
    throw e;
  }
}

export default loginJiaoWu;
