import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import CleanCSS from 'clean-css';
import { defineConfig } from 'tsup';

const minifier = new CleanCSS({ level: 2, returnPromise: false });

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  outExtension: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.js' }),
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
  async onSuccess() {
    const src = readFileSync(resolve('src/styles.css'), 'utf8');
    const result = minifier.minify(src);
    if (result.errors.length > 0) {
      throw new Error(`CSS minify failed: ${result.errors.join(', ')}`);
    }
    // Emit to package root so consumers can `import 'react-easy-dropzone/style.css'`
    // without depending on bundlers respecting the `exports` map for CSS subpaths
    // (Parcel 2 has known issues there).
    writeFileSync(resolve('style.css'), result.styles);
  },
});
