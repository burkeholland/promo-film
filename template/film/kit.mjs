// What every scene shares: the desktop's size, the app's colors, the models in
// the picker, and small helpers that build and place DOM nodes. Every number
// is in CSS px of a 1536 x 864 desktop (1920 x 1080 at 125%).
import { lerp } from './motion.mjs';

const query = new URLSearchParams(location.search);
// index.html?desktop=1280 shows the app alone at the reference screenshot's size.
export const COMPARE = query.get('desktop') === '1280';
export const SCENE_NAME = query.get('scene') || 'demo';
export const DW = COMPARE ? 1280 : 1536;
export const DH = COMPARE ? 720 : 864;
export const WIN = COMPARE ? { x: 67.2, y: 53.1, w: 1143, h: 615.7 } : { x: 82, y: 62.5, w: 1372, h: 739 };
export const W = WIN.w;
export const H = WIN.h;
export const ICON = { x: 512, y: 419 }; // center of the desktop icon's picture
export const FG = '#1f2328';
export const MUTED = '#59636e';
export const ICON_INK = '#4e5965';
export const HINT = '#a4aab1';
export const NS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------- models
// Fable and the last three cards are placeholder numbers.
export const OPUS = { name: 'Claude Opus 5.5', logo: 'anthropic', context: '328K · 1.1M', reasoning: '5 levels', input: '400', cached: '20', output: '2,000' };
export const FABLE = { name: 'Fable 5.1', logo: 'anthropic', context: '1M', reasoning: '5 levels', input: '600', cached: '60', output: '3,000' };
export const SONNET = { name: 'Claude Sonnet 5.5', logo: 'anthropic', context: '328K · 1.1M', reasoning: '5 levels', input: '200', cached: '20', output: '1,000' };
export const SOL = { name: 'GPT-6.1 Sol', logo: 'openai', context: '400K · 1.1M', reasoning: '6 levels', input: '200', cached: '10', output: '1,000' };
export const ASTRA = { name: 'GPT-6 Astra', logo: 'openai', context: '400K · 1.2M', reasoning: '5 levels', input: '1,000', cached: '100', output: '5,000' };
export const GEMINI = { name: 'Gemini 3.8 Flash', logo: 'google', context: '1M', reasoning: '4 levels', input: '50', cached: '5', output: '300' };
export const GROK = { name: 'Grok 4.7', logo: 'xai', context: '256K · 2M', reasoning: '3 levels', input: '300', cached: '75', output: '1,500' };
export const KIMI = { name: 'Kimi K3', logo: 'moonshot', context: '256K', reasoning: '2 levels', input: '60', cached: '15', output: '250' };
// The order of the picker: the four the opening names, in the order it names
// them, then the rest.
export const MODELS = [OPUS, ASTRA, FABLE, SOL, SONNET, GEMINI, GROK, KIMI];

// HydraFusion and Aion Flash aren't in the app yet, so their rows follow the
// user's description. A local model costs no AI credits.
export const HYDRA = { name: 'HydraFusion (Research Preview)', logo: 'github' };
export const AION = { name: 'MAI-Code-1.1-Flash', logo: 'microsoft', context: '128K', reasoning: '3 levels', input: '0', cached: '0', output: '0' };
export const LOCAL = [
  { name: 'gemma4:26b', suffix: '(Ollama (local))', logo: 'ollama', context: '128K', reasoning: 'None', input: '0', cached: '0', output: '0' },
  { name: 'qwen3.6:35b-a3b', suffix: '(Ollama (local))', logo: 'ollama', context: '256K', reasoning: '2 levels', input: '0', cached: '0', output: '0' },
  // A Foundry Local model, since the voiceover names Ollama and Foundry Local.
  { name: 'phi-4-mini', suffix: '(Foundry Local)', logo: 'foundry-local', context: '128K', reasoning: 'None', input: '0', cached: '0', output: '0' },
];
export const COPILOT = 'GitHub Copilot';
export const OTHERS = 'Other providers';

// ---------------------------------------------------------------- DOM
export const px = v => `${Math.round(v * 1000) / 1000}px`;
export const r3 = v => Math.round(v * 1000) / 1000;
export const inside = ([x, y], r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export function h(tag, cls, parent, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
}
export function place(node, x, y, w, height) {
  node.style.left = px(x);
  node.style.top = px(y);
  if (w != null) node.style.width = px(w);
  if (height != null) node.style.height = px(height);
  return node;
}
export function label(parent, text, x, y, { size = 13, line = 20, color = FG, weight } = {}) {
  const node = h('div', 'txt', parent, text);
  node.style.fontSize = px(size);
  node.style.lineHeight = px(line);
  node.style.color = color;
  if (weight) node.style.fontWeight = weight;
  return place(node, x, y);
}
// Right aligned text that ends at x.
export function value(parent, text, right, y, width, options) {
  const node = label(parent, text, 0, y, options);
  node.style.left = 'auto';
  node.style.right = px(width - right);
  return node;
}
export function mix(a, b, u) {
  const c = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [x, y] = [c(a), c(b)];
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], u))).join(', ')})`;
}
// A node's box in desktop px. Only true while the stage has no camera move on
// it, which is how scenes call it: once, after building.
export function rect(node, origin = { x: 0, y: 0 }) {
  const r = node.getBoundingClientRect();
  return { x: r.left - origin.x, y: r.top - origin.y, w: r.width, h: r.height };
}

// ---------------------------------------------------------------- assets
export const sources = {};
const BASE_ICONS = ['search', 'chevron-left', 'chevron-right', 'plus', 'git-pull-request', 'circle-dot', 'calendar-check-2', 'workflow', 'blocks', 'ellipsis', 'filter-list', 'message-circle', 'folder-open', 'folder', 'message-circle-heart', 'settings', 'file-text', 'shield-check', 'zap', 'mic', 'arrow-up', 'git-branch', 'split', 'check'];
const fetchText = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}`);
  return response.text();
};
export async function loadAssets(extraIcons = [], pictures = []) {
  const names = [...new Set([...BASE_ICONS, ...extraIcons])];
  await Promise.all(names.map(async name => { sources[name] = await fetchText(`assets/icons/${name}.svg`); }));
  sources.mark = (await fetchText('assets/github.svg')).match(/ d="([^"]+)"/)[1];
  sources.invertocat = (await fetchText('assets/invertocat.svg')).match(/ d="([^"]+)"/)[1];
  await Promise.all(['assets/wallpaper.jpg', 'assets/app-icon.png', ...pictures].map(src => {
    const picture = new Image();
    picture.src = src;
    return picture.decode();
  }));
  await document.fonts.ready;
}
// A Lucide icon, drawn inline so it takes the color of its parent.
export function icon(parent, name, x, y, size = 16, color) {
  if (!sources[name]) throw new Error(`The icon ${name} was not loaded`);
  const doc = new DOMParser().parseFromString(sources[name], 'image/svg+xml');
  const svg = document.importNode(doc.documentElement, true);
  svg.removeAttribute('class');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.classList.add('ic');
  if (color) svg.style.color = color;
  parent.appendChild(svg);
  return place(svg, x, y);
}
// The small GitHub mark (16 x 16) or, with invertocat, the big one (98 x 96).
export function mark(parent, x, y, size, color, invertocat = false) {
  const [vw, vh] = invertocat ? [98, 96] : [16, 16];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size * vh / vw);
  svg.classList.add('ic');
  svg.innerHTML = `<path d="${invertocat ? sources.invertocat : sources.mark}" fill="${color}"/>`;
  parent.appendChild(svg);
  return place(svg, x, y);
}
// The sidebar toggle: a rounded box split a little left of center.
export function panelIcon(parent, x, y, color) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 15.36);
  svg.setAttribute('height', 14.72);
  svg.classList.add('ic');
  svg.style.color = color;
  svg.innerHTML = '<g fill="none" stroke="currentColor" stroke-width="1.3"><rect x=".65" y=".65" width="14.06" height="13.42" rx="2.5"/><path d="M6.08 .65V14.07"/></g>';
  parent.appendChild(svg);
  return place(svg, x, y);
}
export const images = [];
export function image(parent, cls, src, x, y, w, height) {
  const node = place(h('img', cls, parent), x, y, w, height);
  node.src = src;
  images.push(node);
  return node;
}
export const logo = (parent, name, x, y, size = 14) => image(parent, 'logo', `assets/${name}.svg`, x, y, size, size);
export const imagesDecoded = () => Promise.all(images.map(node => node.decode()));
