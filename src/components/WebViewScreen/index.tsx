
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, useTheme, ProgressBar } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';

type WebViewScreenRouteProp = RouteProp<RootStackParamList, 'WebViewScreen'>;

export default function WebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<WebViewScreenRouteProp>();
  const theme = useTheme();
  const { url, title } = route.params;
  const [progress, setProgress] = React.useState(0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title || '详情'} />
      </Appbar.Header>
      {progress > 0 && progress < 1 && (
        <ProgressBar progress={progress} color={theme.colors.primary} />
      )}
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
