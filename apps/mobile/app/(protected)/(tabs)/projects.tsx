import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiResponseError } from '@/lib/api-errors';
import { deleteProject, listProjects, type Project, projectsQueryKey } from '@/lib/projects';

function ProjectCard({
  onDelete,
  onEdit,
  project,
}: {
  onDelete: () => void;
  onEdit: () => void;
  project: Project;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleColumn}>
          <Text style={styles.status}>{project.status}</Text>
          <Text style={styles.title}>{project.name}</Text>
        </View>
        <Pressable onPress={onEdit} style={styles.inlineButton}>
          <Text style={styles.inlineButtonText}>Edit</Text>
        </Pressable>
      </View>
      <Text style={styles.description}>{project.description ?? 'No description yet.'}</Text>
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Pressable>
    </View>
  );
}

export default function ProjectsTab() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: projectsQueryKey,
    queryFn: async () => listProjects(await getToken()),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteProject(id, await getToken()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
    },
    onError: (error) => {
      const message =
        error instanceof ApiResponseError ? error.message : 'Could not delete project';
      Alert.alert('Delete failed', message);
    },
  });

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Projects</Text>
        <Text style={styles.heroText}>
          Native project management backed by the shared Hono API and validation contracts.
        </Text>
        <Pressable
          onPress={() => router.push('/(protected)/projects/new' as never)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Create project</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={projectsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          projectsQuery.isLoading ? (
            <View style={styles.card}>
              <Text style={styles.description}>Loading projects…</Text>
            </View>
          ) : projectsQuery.isError ? (
            <View style={styles.card}>
              <Text style={styles.title}>Could not load projects</Text>
              <Text style={styles.description}>
                {projectsQuery.error instanceof Error
                  ? projectsQuery.error.message
                  : 'Try again in a moment.'}
              </Text>
              <Pressable onPress={() => void projectsQuery.refetch()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.title}>No projects yet</Text>
              <Text style={styles.description}>Create one to exercise the mobile CRUD flow.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <ProjectCard
            onDelete={() =>
              Alert.alert('Delete project', `Delete "${item.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteMutation.mutate(item.id),
                },
              ])
            }
            onEdit={() =>
              router.push({
                pathname: '/(protected)/projects/[id]' as never,
                params: { id: item.id },
              })
            }
            project={item}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitleColumn: {
    flex: 1,
    gap: 6,
  },
  deleteButton: {
    alignSelf: 'flex-start',
    borderColor: '#fecaca',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    color: '#4b5563',
    fontSize: 14,
    lineHeight: 22,
  },
  hero: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  heroText: {
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 24,
  },
  heroTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  inlineButton: {
    borderColor: '#d4d4d8',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
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
  screen: {
    flex: 1,
    gap: 16,
    padding: 20,
  },
  status: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
});
