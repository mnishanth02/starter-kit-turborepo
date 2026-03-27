import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';

let isLoaded = false;

export function loadDbEnv(): void {
  if (isLoaded) {
    return;
  }

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const packageDir = resolve(currentDir, '..');
  const workspaceRootDir = resolve(currentDir, '../../..');
  const candidateEnvFiles = [
    resolve(packageDir, '.env.local'),
    resolve(packageDir, '.env'),
    resolve(workspaceRootDir, 'apps/web/.env.local'),
    resolve(workspaceRootDir, '.env.local'),
    resolve(workspaceRootDir, '.env'),
  ];

  for (const envFilePath of candidateEnvFiles) {
    if (existsSync(envFilePath)) {
      loadDotenv({ path: envFilePath });
    }
  }

  isLoaded = true;
}