// Downloads Lucide icons into film/assets/icons. The preview and render.mjs do
// this by themselves when a scene asks for an icon that is missing; this is for
// getting them ahead of time, or offline later.
//
//   node tools/icons.mjs receipt plane-takeoff
import { fetchIcon } from '../lib/icons.mjs';

const names = process.argv.slice(2);
if (!names.length) throw new Error('Name the icons, as https://lucide.dev/icons spells them: node tools/icons.mjs receipt plane');
const results = await Promise.all(names.map(fetchIcon));
if (results.includes(false)) process.exitCode = 1;
