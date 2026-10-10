import { FG, MUTED, W, h, icon, place, px } from './kit.mjs';
import { navRect } from './app.mjs';
import { spinner } from './session.mjs';
import { span } from './motion.mjs';

export const RUN_ICONS = [
  'cloud', 'pencil', 'chevron-down', 'arrow-up-right', 'circle-slash', 'circle-check',
  'file-code', 'terminal', 'git-pull-request', 'message-circle-question-mark',
];

function inline(parent, name, color = MUTED, size = 14) {
  const host = h('span', 'ad-icon', parent);
  Object.assign(host.style, { width: px(size), height: px(size) });
  icon(host, name, 0, 0, size, color);
  return host;
}

// DRAWN: source-informed cloud run view with the current breadcrumb, 80px timeline lane, read-only conversation, revision label, and "Open in GitHub" action.
export function buildAutomationRun(ui, { automation, run, prompt }) {
  const page = h('div', 'layer', ui);
  page.dataset.screen = 'cloud-run';
  const header = place(h('div', 'ar-header', page), 279, 14, W - 279, 44);
  h('span', 'ar-back', header, 'Automations');
  h('span', 'ar-separator', header, '/');
  h('strong', null, header, automation.name);
  const trigger = h('span', 'ag-badge', header);
  inline(trigger, 'cloud', '#0969da', 12);
  h('span', null, trigger, automation.trigger);
  h('span', 'ar-head-status', header, `Succeeded · Updated ${run.age}`);
  const actions = h('div', 'ar-actions', header);
  const edit = h('div', 'ar-edit', actions);
  inline(edit, 'pencil');
  h('span', null, edit, 'Edit');
  const more = h('div', 'ar-more', actions);
  inline(more, 'chevron-down', MUTED, 12);
  const rail = place(h('div', 'ar-rail', page), 279, 58, 80, 681);
  for (let i = 0; i < run.dates.length; i++) h('i', `ar-tick${i === 0 ? ' selected' : ''}`, rail);
  const revision = place(h('div', 'ar-revision', page), 383, 74, W - 407, 20);
  h('span', null, revision, 'Automation revision: ');
  h('span', null, revision, run.revision);
  const thread = place(h('div', 'ar-thread', page), 459, 122, 797);
  const user = h('div', 'ar-user', thread);
  h('div', 'ar-bubble', user, prompt);
  const tools = h('div', 'ar-tool-list', thread);
  const rows = run.steps.map(({ icon: glyph, label: text, detail }) => {
    const row = h('div', 'ar-tool', tools);
    inline(row, glyph);
    h('span', null, row, text);
    if (detail) h('span', 'ar-detail', row, detail);
    return row;
  });
  const reply = h('div', 'ar-reply', thread);
  for (const line of run.reply.split('\n')) h('p', null, reply, line);
  const finished = h('div', 'ar-finished', thread);
  inline(finished, 'circle-check', '#1a7f37');
  h('span', null, finished, `Succeeded · ${run.duration}`);
  return {
    page, header, revision, more, thread, rows, reply, finished,
    pose(t, opened = -Infinity) {
      page.style.opacity = span(t, opened, opened + .14);
      page.style.visibility = t >= opened ? 'inherit' : 'hidden';
    },
  };
}

// DRAWN: source-informed sidebar icons and tooltip text; callers provide the illustrative counts.
export function buildAutomationNavBadge(ui, { succeeded, failures }) {
  const nav = navRect(3);
  const holder = place(h('div', 'ar-nav-badges', ui), 218, nav.y + 6, 44, 20);
  const working = h('span', 'ar-working', holder);
  const spin = spinner(working, 10, 10);
  const waiting = h('span', 'ar-nav-badge attention', holder);
  inline(waiting, 'message-circle-question-mark', '#9a6700', 12);
  const success = h('span', 'ar-nav-badge success', holder);
  inline(success, 'check', '#1a7f37', 10);
  h('span', null, success, String(succeeded));
  const failed = h('span', 'ar-nav-badge danger', holder);
  inline(failed, 'circle-slash', '#d1242f', 10);
  h('span', null, failed, String(failures));
  const tooltip = place(h('div', 'ar-tooltip', ui), 285, nav.y + 3);
  return {
    holder, tooltip,
    pose(t, state, showTooltip) {
      working.style.display = state === 'running' ? '' : 'none';
      waiting.style.display = state === 'input' ? '' : 'none';
      success.style.display = state === 'success' || state === 'failed' ? '' : 'none';
      failed.style.display = state === 'failed' ? '' : 'none';
      tooltip.textContent = {
        running: 'Automation is running', input: 'Automation needs your input',
        success: `${succeeded} succeeded since last opened`, failed: `${succeeded} succeeded and ${failures} failed since last opened`,
      }[state];
      tooltip.style.visibility = showTooltip ? 'inherit' : 'hidden';
      spin(t);
    },
  };
}
