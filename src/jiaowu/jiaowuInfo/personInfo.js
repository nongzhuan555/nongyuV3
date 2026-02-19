// 解码常见 HTML 实体
function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)));
}

// 清除标签与脚本样式，保留纯文本
function stripTags(s) {
  if (!s) return '';
  let t = s.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<[^>]+>/g, '');
  t = decodeEntities(t);
  t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

// 按优先级挑选第一个非空字段
function pickFirst(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return '';
}

// 解析表格中的键值对
function parseTablePairs(html) {
  const out = {};
  const rows = Array.from(html.matchAll(/<tr[\s\S]*?<\/tr>/gi)).map(m => m[0]);
  rows.forEach(row => {
    const cells = Array.from(row.matchAll(/<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi)).map(m => stripTags(m[2]));
    for (let i = 0; i + 1 < cells.length; i += 2) {
      const key = cells[i].replace(/[:：]\s*$/, '').trim();
      const val = cells[i + 1].trim();
      if (key && val && !out[key]) out[key] = val;
    }
  });
  return out;
}

// 解析行内“键:值”结构
function parseInlinePairs(html) {
  const out = {};
  const text = stripTags(html);
  const re = /([^\s:：\n\r]{2,12})\s*[:：]\s*([^\n\r]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const key = m[1].trim();
    const val = m[2].trim();
    if (key && val && !out[key]) out[key] = val;
  }
  return out;
}

// 清洗教务个人信息页面，输出标准字段
function cleanPersonInfoHtml(html) {
  if (!html || typeof html !== 'string') return { fields: {}, raw: {}, source: 'cleanPersonInfoHtml' };
  const raw = { ...parseTablePairs(html), ...parseInlinePairs(html) };
  // 额外解析“欢迎您”行：例如“欢迎您： 张三 ， 学号：2023xxxx / 身份：学生 / 校区：雅安 / 学院：信息工程学院 / 年级：2023 / 专业：物联网工程（登录IP：...）”
  const txt = stripTags(html);
  const welcomeLineMatch = txt.match(/欢迎您[：:][\s\S]*?(?:\n|$)/);
  if (welcomeLineMatch) {
    const line = welcomeLineMatch[0];
    const nameM = line.match(/欢迎您[：:]\s*([^，,\s]+)\s*[，,]/);
    if (nameM && !raw['姓名']) raw['姓名'] = nameM[1];
    const pairs = [
      { k: '学号', re: /学号[：:]\s*([0-9A-Za-z_-]+)/ },
      { k: '身份', re: /身份[：:]\s*([^\s/，,]+)/ },
      { k: '校区', re: /校区[：:]\s*([^\s/，,]+)/ },
      { k: '学院', re: /学院[：:]\s*([^\s/，,]+)/ },
      { k: '年级', re: /年级[：:]\s*([0-9]{4})/ },
      { k: '专业', re: /专业[：:]\s*([^\s/（(，,]+)/ },
    ];
    pairs.forEach(({ k, re }) => {
      const m = line.match(re);
      if (m && m[1] && !raw[k]) raw[k] = m[1];
    });
  }
  // 清洗值中的尾部括号等冗余信息（如：专业：物联网工程（登录IP：x.x.x.x））
  Object.keys(raw).forEach((k) => {
    if (typeof raw[k] === 'string') {
      let v = raw[k];
      v = v.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').trim();
      raw[k] = v;
    }
  });
  // 字段归一化映射
  const norm = {};
  const map = {
    name: ['姓名', '名字', '姓名（中文）'],
    studentId: ['学号', '学籍号', '学生号'],
    identity: ['身份'],
    grade: ['年级'],
    college: ['学院', '院系', '所属学院'],
    major: ['专业', '专业名称'],
    campus: ['校区', '所在校区'],
  };
  Object.keys(map).forEach(k => {
    norm[k] = pickFirst(raw, map[k]);
  });
  // 过滤空值，输出精简字段
  const filtered = {};
  Object.keys(norm).forEach((k) => {
    if (norm[k] && String(norm[k]).trim()) filtered[k] = String(norm[k]).trim();
  });
  return { fields: filtered, raw, source: 'cleanPersonInfoHtml' };
}

module.exports = {
  cleanPersonInfoHtml,
  default: cleanPersonInfoHtml,
};
