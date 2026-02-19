import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { getTimeSlotLabel } from '@/shared/time';
import { profileStore } from '@/stores/profile';
import { getWeatherByCampus } from '@/shared/weather';
import { post, setHttpConfig } from '@/shared/http';

export default function Greeting() {
  const theme = useTheme();
  const [content, setContent] = useState('');
  const [displayText, setDisplayText] = useState('');
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  const getTimePeriod = useCallback(() => getTimeSlotLabel(), []);

  const buildFallbackText = useCallback((name: string, timePeriod: string) => {
    return `${name}你好，现在是${timePeriod}，祝你学习顺利`;
  }, []);

  const buildWeatherText = useCallback((summary?: string, temp?: string) => {
    const safeSummary = summary?.trim() || '未知天气';
    return temp?.trim() ? `${safeSummary}，${temp}` : safeSummary;
  }, []);

  const fetchGreeting = useCallback(async () => {
    const name = profileStore.profile.name?.trim() || '同学';
    const campus = profileStore.profile.campus?.trim() || '雅安校区';
    const timePeriod = getTimePeriod();
    const fallbackText = buildFallbackText(name, timePeriod);
    setContent(fallbackText);
    try {
      const weather = await getWeatherByCampus(campus);
      const weatherText = buildWeatherText(weather.summary, weather.temp);
      const token = profileStore.token?.trim() || '';
      if (token) setHttpConfig({ token });
      const resp = await post('/ai/chat', {
        name,
        weather: weatherText,
        time_period: timePeriod,
      }, { suppressErrorToast: true });
      const data = resp?.data as { data?: { content?: string } } | undefined;
      console.log('AI 问候响应报文', data);
      const text = data?.data?.content?.trim();
      if (text) setContent(text);
    } catch {
    }
  }, [buildFallbackText, buildWeatherText, getTimePeriod]);

  useEffect(() => {
    fetchGreeting();
  }, [fetchGreeting]);

  useEffect(() => {
    if (!content) return;
    if (typingTimer.current) clearInterval(typingTimer.current);
    setDisplayText('');
    let index = 0;
    typingTimer.current = setInterval(() => {
      index += 1;
      setDisplayText(content.slice(0, index));
      if (index >= content.length && typingTimer.current) {
        clearInterval(typingTimer.current);
        typingTimer.current = null;
      }
    }, 40);
    return () => {
      if (typingTimer.current) clearInterval(typingTimer.current);
      typingTimer.current = null;
    };
  }, [content]);

  return (
    <View style={styles['greet__wrap']}>
      <Text style={[styles['greet__text'], { color: theme.colors.onPrimaryContainer }]} numberOfLines={3}>
        {displayText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greet__wrap: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  greet__text: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 'bold',
  },
});
