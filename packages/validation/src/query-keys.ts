export const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
  },
  uploads: {
    all: ['uploads'] as const,
    list: () => [...queryKeys.uploads.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.uploads.all, 'detail', id] as const,
  },
} as const;
