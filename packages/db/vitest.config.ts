import { defineConfig, mergeConfig } from 'vitest/config';

import sharedConfig from '../../vitest.shared';

export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      name: 'db',
      include: ['src/**/*.test.ts'],
      setupFiles: ['./src/test/setup.ts'],
    },
  }),
);
