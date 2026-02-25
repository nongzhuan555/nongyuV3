import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Animated, Easing, ViewStyle, TouchableOpacity } from 'react-native';
import { Text, useTheme, Surface, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type TopToastType = 'success' | 'error' | 'info' | 'warning';

export interface TopToastProps {
  visible: boolean;
  message: string | null;
  type?: TopToastType;
  duration?: number;
  onDismiss?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export default function TopToast({
  visible,
  message,
  type = 'info',
  duration = 2000,
  onDismiss,
  action,
  style,
}: TopToastProps) {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const [show, setShow] = useState(visible);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();

      if (duration > 0 && onDismiss) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          onDismiss();
        }, duration);
      }
    } else {
      // Animate out then hide
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start(() => {
        setShow(false);
      });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, duration, onDismiss]);

  if (!show && !visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50'; // Green
      case 'error':
        return '#F44336'; // Red
      case 'warning':
        return '#FF9800'; // Orange
      case 'info':
      default:
        return theme.colors.inverseSurface;
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
      case 'error':
      case 'warning':
        return '#FFFFFF';
      default:
        return theme.colors.inverseOnSurface;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'alert';
      case 'info':
      default:
        return 'information';
    }
  };

  const bgColor = getBackgroundColor();
  const textColor = getTextColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
        style,
      ]}
      pointerEvents="box-none"
    >
      <Surface
        style={[
          styles.content,
          { backgroundColor: bgColor },
        ]}
        elevation={4}
      >
        <MaterialCommunityIcons 
          name={getIcon()} 
          size={20} 
          color={textColor} 
          style={styles.icon} 
        />
        <Text style={[styles.message, { color: textColor }]}>
          {message}
        </Text>
        {action && (
          <TouchableOpacity
            onPress={action.onPress}
            style={styles.actionBtn}
          >
            <Text style={[styles.actionLabel, { color: textColor }]}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 102, // Fixed top position as per css-rule
    left: 16,
    right: 16,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28, // Rounded pill shape
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 120,
    maxWidth: '100%',
  },
  icon: {
    marginRight: 8,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  actionBtn: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
