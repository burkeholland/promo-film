// Bundles MirrorMe's real frontend (render.js, state.js and its two style
// sheets, read from the repository) into film/ui/, so the film draws the app
// with the app's own markup and CSS. Run again after the frontend changes:
//   node tools/build-ui.mjs <path to the mirror-me checkout>
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(process.argv[2] || '.');
const frontend = join(repo, 'frontend').replaceAll('\\', '/');
const out = join(here, '..', 'film', 'ui');
const { build } = await import(pathToFileURL(join(frontend, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);
const entry = join(out, 'entry.js');
await writeFile(entry, `import '${frontend}/src/vendor/postrboard.css';
import '${frontend}/src/style.css';
import { state } from '${frontend}/src/state.js';
import { renderApp } from '${frontend}/src/render.js';
window.ui = { state, renderApp };
`);
await build({
  root: frontend,
  configFile: false,
  logLevel: 'warn',
  build: {
    outDir: out, emptyOutDir: false, minify: false, cssCodeSplit: false, modulePreload: false,
    rollupOptions: { input: entry, output: { entryFileNames: 'ui.js', assetFileNames: 'ui.[ext]' } },
  },
});
console.log(`Built ${out}`);
