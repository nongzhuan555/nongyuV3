const semverGte = (a, b) => {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return true;
};

const required = '20.19.4';
const current = process.version;

if (!semverGte(current, required)) {
  console.error(
    `当前 Node 版本为 ${current}，需要 >= ${required} 才能正常运行 Expo/Metro。在 Windows 上请使用 nvm-windows 安装并切换 Node 版本。`,
  );
  process.exit(1);
} else {
  console.log(`Node 版本 ${current} 满足要求 (>= ${required})`);
}
