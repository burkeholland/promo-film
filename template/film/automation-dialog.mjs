import { DEFAULT_CHIP, FG, H, MUTED, W, WIN, h, icon, label, place, px, rect } from './kit.mjs';
import { buildField, popInOut, showText } from './app.mjs';
import { inside, mix } from './kit.mjs';
import { out, span } from './motion.mjs';

export const DIALOG_ICONS = ['x', 'chevron-down', 'cloud', 'monitor', 'git-branch', 'arrow-up-right', 'circle-slash', 'pencil', 'play'];
// DRAWN: current-source dialog fields and 640px width, with a taller prompt area for the demo. This is source-informed, not screenshot-matched.
export const AUTOMATION_DIALOG = { x: (W - 640) / 2, y: (H - 690) / 2 + 7, w: 640, h: 690 };

function inline(parent, name, size = 14, color = MUTED) {
  const host = h('span', 'ad-icon', parent);
  Object.assign(host.style, { width: px(size), height: px(size) });
  icon(host, name, 0, 0, size, color);
  return host;
}

function select(parent, name, value) {
  const group = h('div', 'ad-control', parent);
  h('div', 'ad-label', group, name);
  const node = h('div', 'ad-select', group);
  const text = h('span', null, node, value);
  inline(node, 'chevron-down');
  return { group, node, text };
}

export function buildAutomationDialog(win) {
  const modal = h('div', 'layer', win);
  const backdrop = place(h('div', 'backdrop', modal), 0, 14, W, H - 14);
  const dialog = place(h('div', 'dialog ad-dialog', modal), AUTOMATION_DIALOG.x, AUTOMATION_DIALOG.y, AUTOMATION_DIALOG.w, AUTOMATION_DIALOG.h);
  const header = h('div', 'ad-header', dialog);
  h('strong', null, header, 'New automation');
  const unsaved = h('span', 'ad-unsaved', header, 'Unsaved changes');
  inline(header, 'x', 16);
  const body = h('div', 'ad-body', dialog);
  const nameGroup = h('div', 'ad-control', body);
  h('div', 'ad-label', nameGroup, 'Name');
  const nameInput = h('div', 'ad-name input', nameGroup);
  const name = buildField(nameInput, 'e.g., Daily code review', '', { x: 12, y: 6, size: 13, line: 20 });
  const schedule = h('div', 'ad-schedule', body);
  const trigger = select(schedule, 'Trigger', 'Daily');
  const hours = select(schedule, 'Hours', '09:00');
  const minute = select(schedule, 'Minute', ':00');
  const additional = h('div', 'ad-extra ad-add-trigger', body, '+  Add another trigger');
  const cloudRow = h('div', 'ad-cloud', body);
  const cloudWords = h('div', null, cloudRow);
  h('div', 'ad-label', cloudWords, 'Run in the cloud');
  h('p', null, cloudWords, 'Run even when your computer is off, triggered by events or on a schedule.');
  const cloudSwitch = h('div', 'ad-switch', cloudRow);
  const thumb = h('i', null, cloudSwitch);
  const tools = h('div', 'ad-extra ad-tools', body);
  h('div', 'ad-label', tools, 'Tools');
  h('p', null, tools, 'Select which tools the agent can use. Built-in tools are always available.');
  const toolButton = h('div', 'ad-tool-button', tools);
  h('span', null, toolButton, '4 tools selected');
  inline(toolButton, 'chevron-down', 12);
  const promptGroup = h('div', 'ad-prompt-group', body);
  h('div', 'ad-label', promptGroup, 'Prompt');
  const composer = h('div', 'ad-composer', promptGroup);
  const viewport = h('div', 'ad-text-viewport', composer);
  // The real composer scrolls when the cloud controls reduce the available height.
  viewport.dataset.clip = '';
  const prompt = buildField(viewport, 'Describe what this automation should do. Type / for skills...', '', { x: 12, y: 10, size: 14, line: 21, width: 570 });
  const bar = h('div', 'ad-model-bar', composer);
  h('div', 'cbtn', bar, 'Autopilot');
  const chip = h('div', 'cbtn', bar, DEFAULT_CHIP);
  const tray = h('div', 'ad-repo-bar', composer);
  const repo = h('div', 'ad-repo-choice', tray);
  inline(repo, 'folder', 12);
  const repoText = h('span', null, repo, 'Select repository');
  inline(repo, 'chevron-down', 12);
  const environment = h('div', 'ad-repo-choice', tray);
  inline(environment, 'monitor', 12);
  h('span', null, environment, 'Local');
  const workspace = h('div', 'ad-repo-choice', tray);
  inline(workspace, 'git-branch', 12);
  h('span', null, workspace, 'Worktree');
  const footer = h('div', 'ad-footer', dialog);
  h('p', null, footer, 'Use Create and run from the menu to test your prompt right away.');
  const cancel = h('div', 'ad-button', footer, 'Cancel');
  const create = h('div', 'ad-create', footer);
  h('div', 'ad-create-label', create, 'Create');
  const split = h('div', 'ad-create-split', create);
  inline(split, 'chevron-down', 12, '#fff');
  return {
    modal, backdrop, dialog, input: nameInput, name, trigger, hours, minute, cloudRow, cloudSwitch,
    composer, viewport, prompt, chip, repo, create, split, cancel,
    pose(t, { visible = true, name: nameText = '', prompt: promptText = '', project = '', hour = '09:00',
      model = DEFAULT_CHIP, cloud = false, cloudAt = -Infinity, focus = null, caret = false, ready = false } = {}) {
      modal.style.visibility = visible ? 'inherit' : 'hidden';
      nameInput.classList.toggle('focus', focus === 'name');
      composer.classList.toggle('focus', focus === 'prompt');
      showText(name, nameText, focus === 'name' && caret);
      showText(prompt, promptText, focus === 'prompt' && caret);
      unsaved.style.visibility = nameText || promptText || project ? 'inherit' : 'hidden';
      repoText.textContent = project || 'Select repository';
      hours.text.textContent = hour;
      chip.textContent = model;
      additional.style.display = tools.style.display = cloud ? '' : 'none';
      environment.style.display = workspace.style.display = cloud ? 'none' : '';
      const on = cloud ? out(span(t, cloudAt, cloudAt + .22)) : 0;
      cloudSwitch.style.background = mix('#e6eaef', '#0969da', on);
      thumb.style.transform = `translateX(${px(18 * on)})`;
      create.classList.toggle('disabled', !ready);
      dialog.dataset.cloud = String(cloud);
    },
  };
}

export function buildAutomationMenu(parent, items, { width = 224, search, description } = {}) {
  const menu = h('div', 'pop ad-menu', parent);
  menu.style.width = px(width);
  if (search) h('div', 'ad-menu-search', menu, search);
  const rows = items.map(item => {
    const data = typeof item === 'string' ? { label: item } : item;
    const node = h('div', 'ad-menu-row', menu);
    const checkNode = data.checkbox ? inline(node, 'check', 12, FG) : null;
    if (checkNode) checkNode.style.opacity = data.check ? '1' : '0';
    if (data.icon) inline(node, data.icon);
    h('span', null, node, data.label);
    if (data.check && !data.checkbox) inline(node, 'check', 12, FG);
    return { ...data, node, checkNode };
  });
  if (description) h('p', 'ad-menu-description', menu, description);
  return {
    menu, rows,
    position(x, y) {
      place(menu, x, y);
      const box = rect(menu, WIN);
      const boxes = rows.map(row => rect(row.node, WIN));
      return { box, boxes, aim: i => [WIN.x + boxes[i].x + boxes[i].w - 28, WIN.y + boxes[i].y + boxes[i].h / 2] };
    },
    pose(t, start, end, pointer) {
      popInOut(menu, t, start, end, .16);
      const local = [pointer[0] - WIN.x, pointer[1] - WIN.y];
      for (const row of rows) row.node.classList.toggle('over', t >= start && t < end && inside(local, row.box));
    },
    measure() {
      for (const row of rows) row.box = rect(row.node, WIN);
    },
  };
}
