import { Link } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.hero}>
        <ThemedText type="title">Starter Kit dashboard</ThemedText>
        <ThemedText style={styles.heroText}>
          Phase 4 brings concrete projects and uploads flows to the mobile app, backed by the same
          API contracts as web.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Projects</ThemedText>
        <ThemedText style={styles.cardText}>
          Browse your projects, create new ones, edit status, and delete with confirmation.
        </ThemedText>
        <Link href={'/(protected)/(tabs)/projects' as never} style={styles.link}>
          <ThemedText type="link">Open projects</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Uploads</ThemedText>
        <ThemedText style={styles.cardText}>
          Pick a document, request a signed URL, upload directly, and manage completed records.
        </ThemedText>
        <Link href={'/(protected)/(tabs)/uploads' as never} style={styles.link}>
          <ThemedText type="link">Open uploads</ThemedText>
        </Link>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Phase 5 placeholder</ThemedText>
        <ThemedText style={styles.cardText}>
          The shared protected shell is ready for the upcoming rate-limit demo surface.
        </ThemedText>
        <Link href="/modal" style={styles.link}>
          <ThemedText type="link">View placeholder modal</ThemedText>
        </Link>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: '#e5e7eb',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  cardText: {
    lineHeight: 22,
  },
  container: {
    flex: 1,
    gap: 16,
    padding: 20,
  },
  hero: {
    borderRadius: 28,
    gap: 12,
    paddingVertical: 8,
  },
  heroText: {
    lineHeight: 24,
  },
  link: {
    paddingTop: 8,
  },
});
