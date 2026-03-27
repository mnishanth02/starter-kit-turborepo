import { useAuth } from '@clerk/clerk-expo';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function SignOutButton() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    queryClient.clear();
    await signOut();
  };

  return (
    <TouchableOpacity onPress={() => void handleSignOut()} style={styles.signOut}>
      <Text style={styles.signOutText}>Sign Out</Text>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme === 'dark' ? 'dark' : 'light'].tint,
        headerShown: true,
        tabBarButton: HapticTab,
        headerRight: () => <SignOutButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="uploads"
        options={{
          title: 'Uploads',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="square.and.arrow.up.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  signOut: {
    marginRight: 16,
    padding: 4,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
