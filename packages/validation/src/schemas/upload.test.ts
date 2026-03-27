import { describe, expect, it } from 'vitest';

import { uploadConfirmInput, uploadSessionRequest } from './upload';

const expectFieldErrors = (result: ReturnType<typeof uploadSessionRequest.safeParse>) => {
  expect(result.success).toBe(false);

  if (result.success) {
    throw new Error('Expected schema validation to fail');
  }

  return result.error.flatten().fieldErrors;
};

describe('uploadSessionRequest', () => {
  it('accepts valid upload metadata', () => {
    const result = uploadSessionRequest.safeParse({
      filename: 'brief.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      filename: 'brief.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
    });
  });

  it('accepts the minimum positive integer size', () => {
    const result = uploadSessionRequest.safeParse({
      filename: 'tiny.txt',
      contentType: 'text/plain',
      sizeBytes: 1,
    });

    expect(result.success).toBe(true);
    expect(result.data?.sizeBytes).toBe(1);
  });

  it('returns field-level messages for required fields and zero-byte uploads', () => {
    const result = uploadSessionRequest.safeParse({
      filename: '',
      contentType: '',
      sizeBytes: 0,
    });

    expect(expectFieldErrors(result)).toEqual({
      filename: ['Filename is required'],
      contentType: ['Content type is required'],
      sizeBytes: ['File size must be positive'],
    });
  });

  it('rejects non-integer file sizes', () => {
    const result = uploadSessionRequest.safeParse({
      filename: 'video.mp4',
      contentType: 'video/mp4',
      sizeBytes: 1.5,
    });

    const fieldErrors = expectFieldErrors(result);

    expect(fieldErrors.sizeBytes).toEqual(['Invalid input: expected int, received number']);
  });
});

describe('uploadConfirmInput', () => {
  it('accepts a valid object key', () => {
    const result = uploadConfirmInput.safeParse({
      objectKey: 'uploads/user-123/brief.pdf',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      objectKey: 'uploads/user-123/brief.pdf',
    });
  });

  it('returns a field-level message for a missing object key', () => {
    const result = uploadConfirmInput.safeParse({
      objectKey: '',
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error('Expected schema validation to fail');
    }

    expect(result.error.flatten().fieldErrors).toEqual({
      objectKey: ['Object key is required'],
    });
  });
});
