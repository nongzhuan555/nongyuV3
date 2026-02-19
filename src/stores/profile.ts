import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeAutoObservable, reaction, toJS } from 'mobx';

export type ProfileData = {
  // 用户姓名/昵称
  name: string;
  // 学号
  studentId: string;
  // QQ
  qq: string;
  // 班级
  className: string;
  // 年级
  grade: string;
  // 学院
  college: string;
  // 专业
  major: string;
  // 校区
  campus: string;
  // 性别
  gender: string;
  // 生源地
  origin: string;
  // 教务密码（用于自动重试）
  password?: string;
  // 二课密码（用于自动重试）
  secondPwd?: string;
};

export type WebOpenMode = 'internal' | 'external';

const DEFAULT_PROFILE: ProfileData = {
  name: '',
  studentId: '',
  qq: '',
  className: '',
  grade: '',
  college: '',
  major: '',
  campus: '',
  gender: '',
  origin: '',
  password: '',
  secondPwd: '',
};

// 本地存储 key
const KEY_PROFILE = 'app:profile:data';
const KEY_TOKEN = 'app:auth:token';
const KEY_COURSE = 'app:course:cache';
const KEY_WEB_OPEN = 'app:web:open_mode';

class ProfileStore {
  // 初始化完成标记
  ready = false;
  // 用户资料
  profile: ProfileData = { ...DEFAULT_PROFILE };
  // 登录 token
  token: string = '';
  // 课表缓存
  courseCache: unknown = null;
  webOpenMode: WebOpenMode = 'external';
  // 默认启动页是否为课表
  defaultCourse: boolean = false;

  constructor() {
    makeAutoObservable(this);
    // 任意字段变化触发持久化
    reaction(
      () => ({
        p: toJS(this.profile),
        t: this.token,
        c: this.courseCache,
        w: this.webOpenMode,
        d: this.defaultCourse,
      }),
      () => {
        this.save();
      },
    );
  }

  async load() {
    const p = await this.getPersistedProfile();
    if (p) {
      if (p.p) this.profile = p.p;
      if (p.t) this.token = p.t;
      if (p.c) this.courseCache = p.c;
      if (p.w) this.webOpenMode = p.w;
      if (p.d !== undefined) this.defaultCourse = p.d;
    }
    this.ready = true;
  }

  async save() {
    const payload = {
      p: toJS(this.profile),
      t: this.token,
      c: this.courseCache,
      w: this.webOpenMode,
      d: this.defaultCourse,
    };
    await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(payload));
  }

  async getPersistedProfile() {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  setProfile(partial: Partial<ProfileData>) {
    // 批量更新资料
    this.profile = { ...this.profile, ...partial };
  }

  setField<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    // 更新单个字段
    this.profile = { ...this.profile, [key]: value };
  }

  setToken(token: string) {
    // 更新登录 token
    this.token = token || '';
  }

  setCourseCache(payload: unknown) {
    // 更新课表缓存
    this.courseCache = payload;
  }

  setWebOpenMode(mode: WebOpenMode) {
    this.webOpenMode = mode === 'external' ? 'external' : 'internal';
  }

  setDefaultCourse(enabled: boolean) {
    this.defaultCourse = enabled;
  }

  async clear() {
    // 清空用户数据
    this.profile = { ...DEFAULT_PROFILE };
    this.token = '';
    this.courseCache = null;
    await this.save();
    // 清空课程相关本地缓存
    await AsyncStorage.multiRemove(['JIAOWU_COURSE_DATA', 'JIAOWU_CUSTOM_COURSE_DATA']);
  }
}

export const profileStore = new ProfileStore();

