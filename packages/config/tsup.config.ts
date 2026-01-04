import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/chains.ts', 'src/contracts.ts', 'src/abis.ts'],
  format: ['esm'],
  dts: false, // Use tsc for declarations (better subpath resolution)
  clean: true,
  sourcemap: true,
})
