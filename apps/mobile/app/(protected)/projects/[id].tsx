import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ProjectFormScreen } from '@/components/project-form-screen';
import { getProject, projectQueryKey } from '@/lib/projects';

export default function EditProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();

  const projectQuery = useQuery({
    enabled: Boolean(id),
    queryKey: projectQueryKey(id ?? ''),
    queryFn: async () => {
      if (!id) {
        throw new Error('Project ID is required');
      }

      return getProject(id, await getToken());
    },
  });

  if (projectQuery.isError) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateTitle}>Could not load project</Text>
        <Text style={styles.stateMessage}>
          {projectQuery.error instanceof Error
            ? projectQuery.error.message
            : 'Try again in a moment.'}
        </Text>
        <View style={styles.actions}>
          <Pressable onPress={() => void projectQuery.refetch()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (projectQuery.isLoading || !projectQuery.data) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <ProjectFormScreen mode="edit" project={projectQuery.data} />;
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#d1d5db',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },
  stateCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    margin: 20,
    padding: 20,
  },
  stateMessage: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 22,
  },
  stateTitle: {
    color: '#7f1d1d',
    fontSize: 22,
    fontWeight: '700',
  },
});
