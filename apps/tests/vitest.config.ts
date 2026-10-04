import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env into process.env before test runner initializes
config({ path: '.env' });

export default defineConfig({
  test: {
    sequence: {
      shuffle: false, // Guarantees top-to-bottom test execution within each file
    },
    fileParallelism: false, // Runs test files sequentially
  },
});
