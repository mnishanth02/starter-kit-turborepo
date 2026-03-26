import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

interface NetworkErrorBoundaryProps {
  children: React.ReactNode;
}

export function NetworkErrorBoundary({ children }: NetworkErrorBoundaryProps) {
  const [isApiReachable, setIsApiReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const queryClient = useQueryClient();

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const iconColor = useThemeColor({}, 'icon');

  const checkApiHealth = async (): Promise<boolean> => {
    setIsChecking(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (!baseUrl) {
        setIsApiReachable(false);
        return false;
      }
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      const reachable = response.ok || response.status < 500;
      setIsApiReachable(reachable);
      return reachable;
    } catch {
      setIsApiReachable(false);
      return false;
    } finally {
      clearTimeout(timeout);
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkApiHealth();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkApiHealth();
    });

    return () => subscription.remove();
  }, []);

  const handleRetry = async () => {
    const reachable = await checkApiHealth();
    if (reachable) {
      queryClient.invalidateQueries();
    }
  };

  if (!isApiReachable) {
    const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    const isMissingUrl = !baseUrl;

    return (
      <View style={[styles.container, { backgroundColor }]}>
        <Text style={styles.icon}>📡</Text>
        <Text style={[styles.title, { color: textColor }]}>
          {isMissingUrl ? 'API Not Configured' : 'Cannot Reach Server'}
        </Text>
        <Text style={[styles.message, { color: iconColor }]}>
          {isMissingUrl
            ? 'The API base URL is not set. Configure EXPO_PUBLIC_API_BASE_URL in your environment.'
            : 'Unable to connect to the server. Please check your connection and try again.'}
        </Text>
        {__DEV__ && (
          <View style={[styles.debugContainer, { borderColor: iconColor }]}>
            <Text style={[styles.debugLabel, { color: iconColor }]}>
              EXPO_PUBLIC_API_BASE_URL
            </Text>
            <Text style={[styles.debugValue, { color: textColor }]}>
              {baseUrl ?? 'NOT SET'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: tintColor }]}
          onPress={handleRetry}
          disabled={isChecking}
          activeOpacity={0.7}
        >
          <Text style={styles.retryText}>
            {isChecking ? 'Checking…' : 'Retry'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  debugContainer: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    width: '100%',
    maxWidth: 340,
  },
  debugLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  debugValue: {
    fontSize: 13,
    fontFamily: 'monospace',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
