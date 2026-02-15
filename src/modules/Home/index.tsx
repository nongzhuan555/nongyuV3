import React from 'react';
import { Text, View, StyleSheet, ScrollView } from 'react-native';
import TopTab from '@/shared/components/TopTab';
import WeatherProbe from './components/WeatherProbe';

export default function Home() {
  return (
    <View style={styles['home__wrap']}>
      <TopTab />
      <ScrollView contentContainerStyle={styles['home__screen']}>
        <Text style={styles['home__text']}>这是首页</Text>
        <WeatherProbe />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  home__wrap: {
    flex: 1,
    backgroundColor: '#fff',
  },
  home__screen: {
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  home__text: {
    fontSize: 20,
    color: '#333',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
