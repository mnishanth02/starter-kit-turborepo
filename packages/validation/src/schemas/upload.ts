import { z } from 'zod';

export const uploadSessionRequest = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  sizeBytes: z.number().int().positive('File size must be positive'),
});

export type UploadSessionRequest = z.infer<typeof uploadSessionRequest>;

export const uploadConfirmInput = z.object({
  objectKey: z.string().min(1, 'Object key is required'),
});

export type UploadConfirmInput = z.infer<typeof uploadConfirmInput>;
