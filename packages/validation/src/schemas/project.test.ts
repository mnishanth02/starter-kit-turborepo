import { describe, expect, it } from 'vitest';

import { createProjectInput, updateProjectInput } from './project';

const expectFieldErrors = (result: {
  success: boolean;
  error?: {
    flatten: () => { fieldErrors: Record<string, string[] | undefined> };
  };
}) => {
  expect(result.success).toBe(false);

  if (result.success || !result.error) {
    throw new Error('Expected schema validation to fail');
  }

  return result.error.flatten().fieldErrors;
};

describe('createProjectInput', () => {
  it('accepts valid input', () => {
    const result = createProjectInput.safeParse({
      name: 'Starter Kit',
      description: 'Shared validation schema coverage',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Starter Kit',
      description: 'Shared validation schema coverage',
    });
  });

  it('allows omitted description', () => {
    const result = createProjectInput.safeParse({
      name: 'No Description Project',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'No Description Project',
    });
  });

  it('accepts boundary lengths', () => {
    const result = createProjectInput.safeParse({
      name: 'n'.repeat(100),
      description: 'd'.repeat(500),
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'n'.repeat(100),
      description: 'd'.repeat(500),
    });
  });

  it('returns field-level messages for invalid input', () => {
    const result = createProjectInput.safeParse({
      name: '',
      description: 'd'.repeat(501),
    });

    expect(expectFieldErrors(result)).toEqual({
      name: ['Name is required'],
      description: ['Description must be 500 characters or less'],
    });
  });
});

describe('updateProjectInput', () => {
  it('accepts partial updates and nullable description', () => {
    const result = updateProjectInput.safeParse({
      status: 'archived',
      description: null,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      status: 'archived',
      description: null,
    });
  });

  it('accepts boundary name length', () => {
    const result = updateProjectInput.safeParse({
      name: 'n'.repeat(100),
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'n'.repeat(100),
    });
  });

  it('returns field-level messages for invalid values', () => {
    const result = updateProjectInput.safeParse({
      name: '',
      description: 'd'.repeat(501),
      status: 'paused',
    });

    const fieldErrors = expectFieldErrors(result);

    expect(fieldErrors.name).toEqual(['Name is required']);
    expect(fieldErrors.description).toEqual(['Description must be 500 characters or less']);
    expect(fieldErrors.status).toEqual(['Invalid option: expected one of "active"|"archived"']);
  });
});
