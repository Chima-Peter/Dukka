import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@app/common': path.join(root, 'libs/common/src/index.ts'),
      '@app/queues': path.join(root, 'libs/queues/src/index.ts'),
      '@app/utils': path.join(root, 'libs/utils/src/index.ts'),
    },
  },
  test: {
    globals: true,
    root: './',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.spec.ts'],
  },
});
