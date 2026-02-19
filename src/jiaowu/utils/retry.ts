import { profileStore } from '@/stores/profile';
import { loginJiaoWu, fetchJiaowuHtml } from '@/jiaowu/login/login';

/**
 * 带有自动重试机制的教务数据获取函数
 * 当数据清洗结果为空时，尝试使用存储的密码重新登录教务系统，然后再次获取数据
 * 
 * @param url 请求的URL
 * @param cleaner 数据清洗函数，将HTML转换为数据对象
 * @param isEmpty 判断数据是否为空的函数
 * @param context 上下文描述，用于日志
 * @returns 清洗后的数据
 */
export async function fetchAndCleanWithRetry<T>(
  url: string,
  cleaner: (html: string) => T,
  isEmpty: (data: T) => boolean,
  context: string = 'unknown'
): Promise<T> {
  // 第一次尝试获取
  console.log(`[Retry] Fetching ${context}...`);
  let resp = await fetchJiaowuHtml(url);
  let data = cleaner(resp.html);

  // 如果数据为空，尝试重试
  if (isEmpty(data)) {
    console.log(`[Retry] Empty data detected for ${context}, attempting re-login...`);
    
    const { studentId, password } = profileStore.profile;
    
    // 只有当有学号和密码时才尝试重试
    if (studentId && password) {
      try {
        console.log(`[Retry] Re-logging in for user ${studentId}...`);
        const loginResult = await loginJiaoWu(studentId, password);
        
        if (loginResult.passed) {
          console.log(`[Retry] Re-login successful, fetching ${context} again...`);
          // 重新获取数据
          // 注意：这里 fetchJiaowuHtml 会自动使用 loginJiaoWu 更新后的 cookie
          // loginJiaoWu 成功后会更新全局 lastCookies 和 AsyncStorage
          resp = await fetchJiaowuHtml(url);
          data = cleaner(resp.html);
        } else {
          console.warn(`[Retry] Re-login failed for ${studentId}`);
        }
      } catch (e) {
        console.error(`[Retry] Re-login error:`, e);
      }
    } else {
      console.warn(`[Retry] Missing credentials for re-login (id=${studentId}, hasPwd=${!!password})`);
    }
  }

  return data;
}
