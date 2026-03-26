import { z } from 'zod';

export const createProjectInput = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectInput>;

export const updateProjectInput = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .nullable()
    .optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectInput>;
