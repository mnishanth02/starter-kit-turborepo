import { useAuth } from '@clerk/clerk-expo';
import { createProjectInput, updateProjectInput } from '@starter/validation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiResponseError } from '@/lib/api-errors';
import {
  createProject,
  type Project,
  projectQueryKey,
  projectsQueryKey,
  updateProject,
} from '@/lib/projects';

type ProjectFieldErrors = Partial<Record<'name' | 'description' | 'status' | 'body', string>>;

function mapZodIssues(issues: { path: PropertyKey[]; message: string }[]): ProjectFieldErrors {
  const nextErrors: ProjectFieldErrors = {};

  for (const issue of issues) {
    const field = String(issue.path[0] ?? 'body') as keyof ProjectFieldErrors;
    nextErrors[field] = issue.message;
  }

  return nextErrors;
}

function mapApiErrors(error: ApiResponseError): ProjectFieldErrors {
  const nextErrors: ProjectFieldErrors = {};

  for (const fieldError of error.errors) {
    const field = fieldError.field as keyof ProjectFieldErrors;
    nextErrors[field] = fieldError.message;
  }

  if (!error.errors.length) {
    nextErrors.body = error.message;
  }

  return nextErrors;
}

export function ProjectFormScreen({
  mode,
  project,
}: {
  mode: 'create' | 'edit';
  project?: Project;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [status, setStatus] = useState<'active' | 'archived'>(project?.status ?? 'active');
  const [fieldErrors, setFieldErrors] = useState<ProjectFieldErrors>({});

  const title = useMemo(
    () => (mode === 'create' ? 'Create project' : `Edit ${project?.name ?? 'project'}`),
    [mode, project?.name],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const normalizedDescription = description.trim();

      if (mode === 'create') {
        const parsed = createProjectInput.safeParse({
          name: name.trim(),
          description: normalizedDescription ? normalizedDescription : undefined,
        });

        if (!parsed.success) {
          const errors = mapZodIssues(parsed.error.issues);
          const validationError = new ApiResponseError(
            'Validation failed',
            422,
            'VALIDATION_ERROR',
            [],
          );
          (validationError as { mobileFieldErrors?: ProjectFieldErrors }).mobileFieldErrors =
            errors;
          throw validationError;
        }

        return createProject(parsed.data, token);
      }

      const parsed = updateProjectInput.safeParse({
        name: name.trim(),
        description: normalizedDescription ? normalizedDescription : null,
        status,
      });

      if (!parsed.success) {
        const errors = mapZodIssues(parsed.error.issues);
        const validationError = new ApiResponseError(
          'Validation failed',
          422,
          'VALIDATION_ERROR',
          [],
        );
        (validationError as { mobileFieldErrors?: ProjectFieldErrors }).mobileFieldErrors = errors;
        throw validationError;
      }

      if (!project) {
        throw new Error('Project is required for edit mode');
      }

      return updateProject(project.id, parsed.data, token);
    },
    onSuccess: async (savedProject) => {
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      await queryClient.invalidateQueries({ queryKey: projectQueryKey(savedProject.id) });
      router.replace('/(protected)/(tabs)/projects' as never);
    },
    onError: (error) => {
      if (error instanceof ApiResponseError) {
        const mobileFieldErrors =
          (error as { mobileFieldErrors?: ProjectFieldErrors }).mobileFieldErrors ??
          mapApiErrors(error);
        setFieldErrors(mobileFieldErrors);
        return;
      }

      setFieldErrors({ body: 'Something went wrong. Please try again.' });
    },
  });

  const submit = () => {
    setFieldErrors({});

    if (mode === 'create') {
      const parsed = createProjectInput.safeParse({
        name: name.trim(),
        description: description.trim() ? description.trim() : undefined,
      });

      if (!parsed.success) {
        setFieldErrors(mapZodIssues(parsed.error.issues));
        return;
      }
    } else {
      const parsed = updateProjectInput.safeParse({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        status,
      });

      if (!parsed.success) {
        setFieldErrors(mapZodIssues(parsed.error.issues));
        return;
      }
    }

    mutation.mutate();
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{mode === 'create' ? 'Create' : 'Edit'}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Shared Zod validation runs before the request, and backend field errors map back into the
          native inputs.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Project name</Text>
          <TextInput
            autoCapitalize="sentences"
            editable={!mutation.isPending}
            onChangeText={setName}
            placeholder="Acme launch site"
            style={styles.input}
            value={name}
          />
          {fieldErrors.name ? <Text style={styles.error}>{fieldErrors.name}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            editable={!mutation.isPending}
            multiline
            numberOfLines={5}
            onChangeText={setDescription}
            placeholder="What is this project for?"
            style={[styles.input, styles.textarea]}
            textAlignVertical="top"
            value={description}
          />
          {fieldErrors.description ? (
            <Text style={styles.error}>{fieldErrors.description}</Text>
          ) : null}
        </View>

        {mode === 'edit' ? (
          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {(['active', 'archived'] as const).map((option) => {
                const selected = option === status;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setStatus(option)}
                    style={[styles.statusChip, selected ? styles.statusChipSelected : null]}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        selected ? styles.statusChipTextSelected : null,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {fieldErrors.status ? <Text style={styles.error}>{fieldErrors.status}</Text> : null}
          </View>
        ) : null}

        {fieldErrors.body ? <Text style={styles.error}>{fieldErrors.body}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            disabled={mutation.isPending}
            onPress={submit}
            style={[styles.primaryButton, mutation.isPending ? styles.buttonDisabled : null]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'create' ? 'Create project' : 'Save changes'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 8,
  },
  bodyError: {
    color: '#dc2626',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  content: {
    gap: 16,
    padding: 20,
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
  },
  eyebrow: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  field: {
    gap: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d4d4d8',
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#d4d4d8',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  statusChip: {
    borderColor: '#d4d4d8',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusChipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  statusChipText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusChipTextSelected: {
    color: '#ffffff',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  textarea: {
    minHeight: 120,
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 6,
  },
});
