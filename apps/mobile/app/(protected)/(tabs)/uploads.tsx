import { useAuth } from '@clerk/clerk-expo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiResponseError } from '@/lib/api-errors';
import {
  confirmUpload,
  createUploadSession,
  deleteUpload,
  listUploads,
  type UploadRecord,
  uploadsQueryKey,
} from '@/lib/uploads';

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadCard({ onDelete, upload }: { onDelete: () => void; upload: UploadRecord }) {
  return (
    <View style={styles.card}>
      <Text style={styles.status}>{upload.status}</Text>
      <Text style={styles.title}>{upload.filename}</Text>
      <Text style={styles.description}>
        {upload.contentType} · {formatFileSize(upload.sizeBytes)}
      </Text>
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Pressable>
    </View>
  );
}

export default function UploadsTab() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const uploadsQuery = useQuery({
    queryKey: uploadsQueryKey,
    queryFn: async () => (await listUploads(await getToken())).uploads,
  });

  const uploadMutation = useMutation({
    mutationFn: async (asset: DocumentPicker.DocumentPickerAsset) => {
      const token = await getToken();
      const fileResponse = await fetch(asset.uri);
      const body = await fileResponse.blob();
      const contentType = asset.mimeType || body.type || 'application/octet-stream';
      const sizeBytes = asset.size ?? body.size;

      if (!sizeBytes || sizeBytes <= 0) {
        throw new Error('Could not determine the selected file size. Please choose another file.');
      }

      const session = await createUploadSession(
        {
          filename: asset.name,
          contentType,
          sizeBytes,
        },
        token,
      );

      const uploadResponse = await fetch(session.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body,
      });

      if (!uploadResponse.ok) {
        throw new Error('Direct upload failed');
      }

      try {
        await confirmUpload(session.id, { objectKey: session.objectKey }, token);
      } catch (error) {
        try {
          await deleteUpload(session.id, token);
        } catch (cleanupError) {
          throw new Error(
            'Upload confirmation failed and cleanup could not be completed. Please try again later.',
            { cause: cleanupError },
          );
        }

        throw new Error(
          'Upload confirmation failed after the file reached storage. The temporary upload was cleaned up, so you can safely try again.',
          { cause: error },
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: uploadsQueryKey });
      Alert.alert('Upload complete', 'The file was uploaded and confirmed successfully.');
    },
    onError: (error) => {
      const message =
        error instanceof ApiResponseError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not upload file';
      Alert.alert('Upload failed', message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteUpload(id, await getToken()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: uploadsQueryKey });
    },
    onError: (error) => {
      const message = error instanceof ApiResponseError ? error.message : 'Could not delete upload';
      Alert.alert('Delete failed', message);
    },
  });

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Uploads</Text>
        <Text style={styles.heroText}>
          Pick a file with Expo DocumentPicker, upload it to the signed URL, then confirm it through
          the API.
        </Text>
        <Pressable
          onPress={async () => {
            if (uploadMutation.isPending) {
              return;
            }

            const result = await DocumentPicker.getDocumentAsync({
              copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets[0]) {
              return;
            }

            uploadMutation.mutate(result.assets[0]);
          }}
          disabled={uploadMutation.isPending}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {uploadMutation.isPending ? 'Uploading…' : 'Choose file'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={uploadsQuery.data ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          uploadsQuery.isLoading ? (
            <View style={styles.card}>
              <Text style={styles.description}>Loading uploads…</Text>
            </View>
          ) : uploadsQuery.isError ? (
            <View style={styles.card}>
              <Text style={styles.title}>Could not load uploads</Text>
              <Text style={styles.description}>
                {uploadsQuery.error instanceof Error
                  ? uploadsQuery.error.message
                  : 'Try again in a moment.'}
              </Text>
              <Pressable onPress={() => void uploadsQuery.refetch()} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.title}>No uploads yet</Text>
              <Text style={styles.description}>Pick a file above to run the upload flow.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <UploadCard
            onDelete={() =>
              Alert.alert('Delete upload', `Delete "${item.filename}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => deleteMutation.mutate(item.id),
                },
              ])
            }
            upload={item}
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
    gap: 10,
    padding: 18,
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
