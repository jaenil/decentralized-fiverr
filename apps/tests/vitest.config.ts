import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    sequence: {
      shuffle: false  // Ensures tests run top-to-bottom within a file
    }
  }
});
