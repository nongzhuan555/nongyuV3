async function main() {
  const fs = await import('fs');
  const path = await import('path');
  const ROOT = path.resolve(__dirname, '..');
  const SRC_HTML = path.join(ROOT, 'src', 'jiaowu', 'jiaowuInfo', 'source.html');
  const OUT_TS = path.join(ROOT, 'src', 'jiaowu', 'jiaowuInfo', 'source.raw.ts');
  const SCORE_HTML = path.join(ROOT, 'src', 'jiaowu', 'jiaowuInfo', 'score.html');
  const SCORE_OUT_TS = path.join(ROOT, 'src', 'jiaowu', 'jiaowuInfo', 'score.raw.ts');
  const RANK_HTML = path.join(ROOT, 'src', 'jiaowu', 'jiaowuInfo', 'rank.html');
  const RANK_OUT_TS = path.join(ROOT, 'src', 'jiaowu', 'jiaowuInfo', 'rank.raw.ts');
  const PROGRESS_HTML = path.join(ROOT, 'src', 'jiaowu', 'jiaowuInfo', 'progress.html');
  const PROGRESS_OUT_TS = path.join(ROOT, 'src', 'jiaowu', 'jiaowuInfo', 'progress.raw.ts');
  try {
    if (!fs.existsSync(SRC_HTML)) {
      console.log('[generate-source-raw] source.html 未找到，跳过生成。');
    } else {
      const text = fs.readFileSync(SRC_HTML, 'utf8');
      const code = `const SOURCE_HTML = ${JSON.stringify(text)};\n\nexport default SOURCE_HTML;\n`;
      fs.writeFileSync(OUT_TS, code, 'utf8');
      console.log('[generate-source-raw] 已根据 source.html 生成 source.raw.ts');
    }
    if (fs.existsSync(SCORE_HTML)) {
      const text2 = fs.readFileSync(SCORE_HTML, 'utf8');
      const code2 = `const SCORE_HTML = ${JSON.stringify(text2)};\n\nexport default SCORE_HTML;\n`;
      fs.writeFileSync(SCORE_OUT_TS, code2, 'utf8');
      console.log('[generate-source-raw] 已根据 score.html 生成 score.raw.ts');
    } else {
      console.log('[generate-source-raw] score.html 未找到，跳过生成。');
    }
    if (fs.existsSync(RANK_HTML)) {
      const text3 = fs.readFileSync(RANK_HTML, 'utf8');
      const code3 = `const RANK_HTML = ${JSON.stringify(text3)};\n\nexport default RANK_HTML;\n`;
      fs.writeFileSync(RANK_OUT_TS, code3, 'utf8');
      console.log('[generate-source-raw] 已根据 rank.html 生成 rank.raw.ts');
    } else {
      console.log('[generate-source-raw] rank.html 未找到，跳过生成。');
    }
    if (fs.existsSync(PROGRESS_HTML)) {
      const text4 = fs.readFileSync(PROGRESS_HTML, 'utf8');
      const code4 = `const PROGRESS_HTML = ${JSON.stringify(text4)};\n\nexport default PROGRESS_HTML;\n`;
      fs.writeFileSync(PROGRESS_OUT_TS, code4, 'utf8');
      console.log('[generate-source-raw] 已根据 progress.html 生成 progress.raw.ts');
    } else {
      console.log('[generate-source-raw] progress.html 未找到，跳过生成。');
    }
  } catch (e) {
    console.error('[generate-source-raw] 生成失败：', e && e.message);
    process.exit(1);
  }
}

main();
