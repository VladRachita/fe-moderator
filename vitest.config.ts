import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        // Default Vitest pool is 'forks' (one process per test file). The
        // integration tests in src/app/api/auth/{login,refresh}/route.test.ts
        // and src/lib/auth/rate-limit.test.ts rely on per-file isolation of
        // the module-level Map in src/lib/auth/rate-limit.ts. If you switch
        // to pool: 'threads' (or singleThread), the rate-limit Map becomes
        // shared and the unique-IP entropy in those tests is the only
        // collision barrier (~15.6M slots — still safe, but coupling
        // assumption must be re-documented).
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
