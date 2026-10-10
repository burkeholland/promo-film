import { MUTED, W, h, icon, place, px } from './kit.mjs';
import { spinner } from './session.mjs';

export const AUTOMATION_ICONS = ['cloud', 'play', 'square', 'circle-check'];

// DRAWN: source-informed gallery geometry, not a screenshot-matched capture.
// WorkflowGallery: max-w-4xl, p-6, three columns, gap-3. Header: min-h-11.
export const GALLERY = { sidebar: 279, headerTop: 14, headerHeight: 44, maxWidth: 896, padding: 24, gap: 12 };

function inlineIcon(parent, name, color = MUTED, size = 12) {
  const host = h('span', 'ag-icon', parent);
  Object.assign(host.style, { width: px(size), height: px(size) });
  const svg = icon(host, name, 0, 0, size, color);
  return { host, svg };
}

function successIcon(parent) {
  const { host, svg } = inlineIcon(parent, 'circle-check', '#1a7f37');
  const circle = svg.querySelector('circle');
  const check = svg.querySelector('path');
  if (!circle || !check) throw new Error('The circle-check icon must contain a circle and check path.');
  circle.setAttribute('fill', '#1a7f37');
  check.setAttribute('stroke', '#fff');
  return host;
}

function buildAutomationCard(parent, item) {
  const card = h('div', 'ag-card', parent);
  const top = h('div', 'ag-card-top', card);
  h('div', 'ag-card-title', top, item.name).dataset.clip = '';
  const badge = h('div', 'ag-badge', top);
  if (item.source === 'cloud') inlineIcon(badge, 'cloud', '#0969da');
  h('span', null, badge, item.trigger);
  h('p', 'ag-description', card, item.description);
  const footer = h('div', 'ag-card-footer', card);
  h('span', 'ag-footer-label', footer, [item.project, item.environment].filter(Boolean).join(' \u00b7 ')).dataset.clip = '';
  const status = h('div', 'ag-status', footer);
  const check = successIcon(status);
  const age = h('span', null, status, item.age);
  const action = h('div', 'ag-action', footer);
  const play = inlineIcon(action, 'play');
  const stop = inlineIcon(action, 'square');
  return {
    node: card,
    id: item.id,
    pose(t, running, hovered) {
      card.classList.toggle('over', hovered);
      check.style.display = running ? 'none' : '';
      age.textContent = running ? 'Running' : item.age;
      age.classList.toggle('ag-shimmer', running);
      age.style.backgroundPosition = `${-100 + (t % 1.6) / 1.6 * 300}% 0`;
      play.host.style.display = running ? 'none' : '';
      stop.host.style.display = running ? '' : 'none';
    },
  };
}

function buildRunRow(parent, item) {
  const row = h('div', 'ag-run', parent);
  const top = h('div', 'ag-run-top', row);
  h('span', 'ag-run-name', top, item.name);
  const location = h('span', 'ag-run-location', top);
  if (item.source === 'cloud') inlineIcon(location, 'cloud');
  h('span', null, location, [item.environment, item.project].filter(Boolean).join(' \u00b7 '));
  const status = h('div', 'ag-run-status', row);
  const check = successIcon(status);
  const working = h('span', 'ag-icon', status);
  const spin = spinner(working, 6, 6);
  const text = h('span', null, status);
  return {
    node: row,
    id: item.id,
    pose(t, running) {
      check.style.display = running ? 'none' : '';
      working.style.display = running ? '' : 'none';
      text.textContent = running ? 'Running \u00b7 just now' : `${item.age} \u00b7 ${item.duration}`;
      spin(t);
    },
  };
}

export function buildAutomationGallery(ui, { automations, runs = automations }) {
  const page = h('div', 'layer', ui);
  page.dataset.screen = 'automations';
  const header = place(h('div', 'ag-header', page), GALLERY.sidebar, GALLERY.headerTop, W - GALLERY.sidebar, GALLERY.headerHeight);
  const tabs = h('div', 'ag-tabs', header);
  for (const [index, title] of ['All', 'Local', 'Cloud'].entries()) h('div', `ag-tab${index === 0 ? ' selected' : ''}`, tabs, title);
  const search = h('div', 'ag-search', header);
  inlineIcon(search, 'search', MUTED, 14);
  h('span', null, search, 'Search automations...');
  inlineIcon(search, 'filter-list');
  h('div', 'ag-button secondary', header, 'Templates');
  const create = h('div', 'ag-button primary', header, 'New automation');

  const outerWidth = Math.min(GALLERY.maxWidth, W - GALLERY.sidebar);
  const bodyX = GALLERY.sidebar + (W - GALLERY.sidebar - outerWidth) / 2 + GALLERY.padding;
  const bodyWidth = outerWidth - 2 * GALLERY.padding;
  const body = place(h('div', 'ag-body', page), bodyX, GALLERY.headerTop + GALLERY.headerHeight + GALLERY.padding, bodyWidth);
  h('h2', null, body, 'Your automations');
  h('p', 'ag-about', body, 'Use agents to handle recurring work on a cadence you choose or triggered by events.');
  const grid = h('div', 'ag-grid', body);
  const cards = automations.map(item => buildAutomationCard(grid, item));
  const history = h('div', 'ag-history', body);
  h('h2', null, history, 'Recent runs');
  h('h3', null, history, 'Today');
  const list = h('div', 'ag-runs', history);
  const activeRows = automations.map(item => buildRunRow(list, item));
  const rows = runs.map(item => buildRunRow(list, item));
  return {
    page, header, body, create, cards, rows, activeRows,
    pose(t, { runningIds = [], hoverId = null } = {}) {
      for (const card of cards) card.pose(t, runningIds.includes(card.id), hoverId === card.id);
      for (const row of activeRows) {
        row.node.style.display = runningIds.includes(row.id) ? 'flex' : 'none';
        row.pose(t, true);
      }
      for (const row of rows) row.pose(t, false);
      const visibleRows = [...activeRows.filter(row => runningIds.includes(row.id)), ...rows];
      visibleRows.forEach((row, index) => {
        const first = index === 0, last = index === visibleRows.length - 1;
        row.node.style.borderRadius = `${first ? '12px 12px' : '0 0'} ${last ? '12px 12px' : '0 0'}`;
        row.node.style.borderBottomWidth = last ? '1px' : '0';
      });
    },
  };
}
