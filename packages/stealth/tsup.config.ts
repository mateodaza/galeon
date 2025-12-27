import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: false, // Use tsc for declarations (better subpath resolution)
  clean: true,
  sourcemap: true,
})
