import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, SegmentedButtons, ActivityIndicator, useTheme, MD3Theme } from 'react-native-paper';
import { getTimeSlotLabel } from '@/shared/time';
import { getWeatherDebugByCampus } from '@/shared/weather';

const CAMPUS_OPTIONS = ['雅安校区', '成都校区', '都江堰校区'] as const;
type Campus = (typeof CAMPUS_OPTIONS)[number];

export default function WeatherProbe() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [campus, setCampus] = useState<Campus>('雅安校区');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: string; temp?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<unknown | null>(null);

  const slot = getTimeSlotLabel();

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { info, raw } = await getWeatherDebugByCampus(campus);
      setResult(info);
      setRaw(raw);
    } catch {
      setError('获取失败');
    } finally {
      setLoading(false);
    }
  }, [campus]);

  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={styles.title}>天气调试</Text>

      <SegmentedButtons
        value={campus}
        onValueChange={(v) => {
          if (CAMPUS_OPTIONS.includes(v as Campus)) setCampus(v as Campus);
          else setCampus('雅安校区');
        }}
        buttons={CAMPUS_OPTIONS.map((c) => ({ value: c, label: c }))}
        style={styles.segment}
      />

      <View style={styles.row}>
        <Text>当前时段：{slot}</Text>
        <Button mode="contained" onPress={fetchWeather} style={styles.pullBtn} disabled={loading}>
          拉取天气
        </Button>
      </View>

      <View style={styles.result}>
        {loading ? <ActivityIndicator /> : null}
        {!loading && error ? <Text style={styles.err}>{error}</Text> : null}
        {!loading && !error && result ? (
          <Text>校区：{campus}；天气：{result.summary}{result.temp ? `，${result.temp}` : ''}</Text>
        ) : null}
        {!loading && !error && raw ? (
          <View style={styles.rawBox}>
            <Text selectable style={styles.rawText}>{JSON.stringify(raw, null, 2)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: MD3Theme) {
  return StyleSheet.create({
    wrap: {
      width: '100%',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    title: {
      marginBottom: 8,
    },
    segment: {
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pullBtn: {
      marginLeft: 12,
    },
    result: {
      marginTop: 12,
      minHeight: 28,
      justifyContent: 'center',
    },
    rawBox: {
      marginTop: 8,
      padding: 8,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    rawText: {
      fontSize: 12,
    },
    err: {
      color: theme.colors.error,
    },
  });
}
