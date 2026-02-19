import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import cleanCourseHtml from '@/jiaowu/course/course';
import axios from 'axios';
import iconv from 'iconv-lite';
import { Buffer } from 'buffer';
import 'iconv-lite/encodings';

export default function CourseCleaner() {
  const theme = useTheme();
  // 输入的原始 HTML 文本
  const [html, setHtml] = useState('');
  // 清洗后的 JSON 文本
  const [jsonText, setJsonText] = useState('');
  // 错误提示
  const [err, setErr] = useState<string | null>(null);

  const onClean = () => {
    // 清空错误并尝试清洗
    setErr(null);
    try {
      const data = cleanCourseHtml(html);
      setJsonText(JSON.stringify(data, null, 2));
    } catch (e) {
      const err = e as { message?: string } | null;
      setErr(err?.message || '清洗失败');
    }
  };

  const loadDemo = async () => {
    // 拉取教务示例页面并完成 GBK 解码
    setErr(null);
    setJsonText('');
    try {
      const url = 'https://jiaowu.sicau.edu.cn/xuesheng/gongxuan/gongxuan/kbbanji.asp?title_id1=4';
      const resp = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
      const globalObj = globalThis as { Buffer?: typeof Buffer };
      if (!globalObj.Buffer) globalObj.Buffer = Buffer;
      const buf = Buffer.from(resp.data);
      const text = iconv.decode(buf, 'gbk');
      setHtml(text);
      const data = cleanCourseHtml(text);
      setJsonText(JSON.stringify(data, null, 2));
    } catch (e) {
      const err = e as { message?: string } | null;
      // 失败时回退到内置样例，保证页面可用
      const sample = `
      <html><body>
      <table border="1">
        <tr><th>时间/星期</th><th>周一</th><th>周二</th><th>周三</th></tr>
        <tr><td>第1-2节</td><td>高等数学<br/>一教101</td><td></td><td>大学英语<br/>外语楼202</td></tr>
        <tr><td>第3-4节</td><td>线性代数<br/>一教102</td><td>C语言程序设计<br/>机房A</td><td></td></tr>
      </table>
      </body></html>`;
      setHtml(sample);
      try {
        const data = cleanCourseHtml(sample);
        setJsonText(JSON.stringify(data, null, 2));
      } catch {}
      setErr(err?.message ? `在线获取示例源码失败：${err.message}` : '在线获取示例源码失败，已使用内置示例。');
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>课程表清洗调试</Text>
      <TextInput
        label="粘贴教务页面HTML源码"
        mode="outlined"
        value={html}
        onChangeText={setHtml}
        style={[styles.input, { backgroundColor: theme.colors.surface }]}
        multiline
        numberOfLines={8}
      />
      <View style={styles.btnRow}>
        <Button mode="contained" onPress={onClean} style={styles.btn} disabled={!html.trim()}>
          清洗为 JSON
        </Button>
        <Button mode="outlined" onPress={loadDemo} style={styles.btn}>
          加载示例源码
        </Button>
      </View>
      {err ? <Text style={[styles.err, { color: theme.colors.error }]}>{err}</Text> : null}
      {!!jsonText && (
        <View style={[styles.resultBox, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text selectable style={[styles.resultText, { color: theme.colors.onSurface }]}>{jsonText}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    marginBottom: 10,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    borderRadius: 10,
  },
  err: {
    marginTop: 8,
  },
  resultBox: {
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
  },
  resultText: {
    fontSize: 12,
  },
});
