// Lucide icons on demand. The kit loads icons from film/assets/icons/<name>.svg;
// when one is missing, the preview and render servers call fetchIcon() and it
// is downloaded from the Lucide package once and kept there, so a scene can
// name any icon at https://lucide.dev/icons and it just works.
//
//   node tools/icons.mjs receipt plane       downloads them by hand
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ICONS = join(here, '..', 'film', 'assets', 'icons');
const SOURCE = name => `https://unpkg.com/lucide-static@latest/icons/${name}.svg`;
const asking = new Map();

// The icon a path under film/ names, or null when the path is not an icon.
export const iconName = file => {
  if (dirname(file) !== ICONS) return null;
  const name = basename(file, '.svg');
  return /^[a-z0-9-]+$/.test(name) && file.endsWith('.svg') ? name : null;
};

// Downloads the icon into film/assets/icons. True when it is there afterwards.
export function fetchIcon(name) {
  if (!/^[a-z0-9-]+$/.test(name)) return Promise.resolve(false);
  const file = join(ICONS, `${name}.svg`);
  if (existsSync(file)) return Promise.resolve(true);
  if (!asking.has(name)) {
    asking.set(name, (async () => {
      try {
        const response = await fetch(SOURCE(name), { signal: AbortSignal.timeout(15000) });
        const text = response.ok ? await response.text() : '';
        if (!/<svg[\s>]/.test(text)) {
          console.warn(`There is no Lucide icon called ${name} (https://lucide.dev/icons).`);
          return false;
        }
        await mkdir(ICONS, { recursive: true });
        await writeFile(file, text);
        console.log(`Downloaded the icon ${name} into film/assets/icons.`);
        return true;
      } catch (error) {
        console.warn(`Could not download the icon ${name}: ${error.message}`);
        return false;
      } finally {
        asking.delete(name);
      }
    })());
  }
  return asking.get(name);
}
