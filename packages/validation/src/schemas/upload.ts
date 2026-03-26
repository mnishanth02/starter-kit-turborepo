import { z } from 'zod';

export const uploadSessionRequest = z.object({
  filename: z.string().min(1, { error: 'Filename is required' }),
  contentType: z.string().min(1, { error: 'Content type is required' }),
  sizeBytes: z.number().int().positive({ error: 'File size must be positive' }),
});

export type UploadSessionRequest = z.infer<typeof uploadSessionRequest>;

export const uploadConfirmInput = z.object({
  objectKey: z.string().min(1, { error: 'Object key is required' }),
});

export type UploadConfirmInput = z.infer<typeof uploadConfirmInput>;
