import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text, Surface, useTheme, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export function SemesterEndState({ onLookBack }: { onLookBack?: () => void }) {
  const theme = useTheme();
  const { width } = Dimensions.get('window');
  const { colors } = theme;

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <LinearGradient
          colors={[colors.primaryContainer, colors.surface]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons 
              name="beach" 
              size={80} 
              color={colors.primary} 
            />
            <MaterialCommunityIcons 
              name="check-decagram" 
              size={30} 
              color={colors.tertiary} 
              style={[styles.checkIcon, { backgroundColor: colors.surface }]}
            />
          </View>
          
          <Text variant="headlineSmall" style={[styles.title, { color: colors.primary }]}>
            本学期已结束
          </Text>
          
          <Text variant="bodyMedium" style={[styles.subtitle, { color: colors.secondary }]}>
            农屿课表提示：我们下学期再见啦
          </Text>

          <View style={styles.divider} />

          <Text variant="bodySmall" style={[styles.quote, { color: colors.outline }]}>
            “所有的努力都将会有回报，好好享受假期吧！”
          </Text>

          {onLookBack && (
            <Button 
              mode="contained-tonal" 
              onPress={onLookBack}
              style={styles.button}
              icon="history"
            >
              回顾本学期
            </Button>
          )}
        </LinearGradient>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  checkIcon: {
    position: 'absolute',
    right: -10,
    bottom: 0,
    borderRadius: 15,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    width: '80%',
    marginBottom: 24,
  },
  quote: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    borderRadius: 20,
  },
});
