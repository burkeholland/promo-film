// Settings, while the phone stays on screen. The scene opens on the page
// already (Connection: the PC's name and the pairing code). The hand goes
// across the tabs, to Picture & sound and to App, opens Theme, picks Dark,
// and the whole window changes as a preview. Save changes keeps it, and the
// app says so.
import { clamp } from '../motion.mjs';
import { clock } from '../timeline.mjs';
import { imagesDecoded, loadAssets, r3 } from '../kit.mjs';
import { buildCursor, buildStage, film, pointAt } from '../app.mjs';
import { makePath } from '../input.mjs';
import { buildCaptions } from '../graphics.mjs';
import { appState, arrive, buildApp, buildSelectMenu, buildVideoWindow, inBox, mid, touch } from '../mirrorme.mjs';
import { BOTH, swiped } from '../shots.mjs';

const T = clock('settings');
const DURATION = T.duration;
const THEMES = ['Follow Windows', 'Light', 'Dark'];

// Five clicks. Each move is timed back from its click.
const PICTURE = 1.0;
const APP = PICTURE + 1.9;
const OPEN = APP + 1.15;
const DARK = OPEN + .95;
const SAVE = DARK + 1.7;
const CUE = {
  toPicture: [PICTURE - .6, PICTURE - .06],
  picture: PICTURE,
  toApp: [APP - .55, APP - .06],
  app: APP,
  toTheme: [OPEN - .7, OPEN - .06],
  open: OPEN,
  toDark: [DARK - .5, DARK - .08],
  dark: DARK,
  toSave: [SAVE - .85, SAVE - .08],
  save: SAVE,
  saved: SAVE + .12,
  away: [SAVE + .45, SAVE + 1.05],
  swipes: [[2.0, 1], [5.3, 2]],
};
const CAPTIONS = [
  { from: .25, to: APP + .25, parts: ['Add a pairing code. ', ['Cap the resolution and frame rate.', PICTURE + .1]] },
  { from: APP + .6, to: DURATION - .3, parts: ['Light or dark. ', ['Your phone stays on screen.', DARK + .5]] },
];

export default async function settings() {
  await loadAssets();
  const stage = buildStage();
  const app = buildApp(stage);
  const on = { status: 'mirroring', route: 'settings' };
  const connection = await app.view(appState({ ...on, section: 'connection' }));
  const picture = await app.view(appState({ ...on, section: 'picture' }));
  const appPage = await app.view(appState({ ...on, section: 'app' }));
  const preview = await app.view(appState({ ...on, section: 'app', draft: { theme: 'dark' } }), { mode: 'dark' });
  const saved = await app.view(appState({ ...on, section: 'app', settings: { theme: 'dark' }, toast: 'Settings saved' }), { mode: 'dark' });
  const video = buildVideoWindow(stage);
  const box = {
    picture: connection.box('#tab-picture'), app: picture.box('#tab-app'), theme: appPage.box('#field-theme'),
    save: preview.box('#action-save-settings'), nav: connection.box('#nav-settings'),
  };
  const menu = buildSelectMenu(stage, box.theme, THEMES, 0);
  const cursor = buildCursor(stage);
  const caption = buildCaptions(CAPTIONS);
  await imagesDecoded();

  const tabs = [[connection, '#tab-picture', box.picture], [picture, '#tab-app', box.app]].map(([view, id, r]) => [view.q(id), r]);
  const save = preview.q('#action-save-settings');
  const toast = saved.q('.toast');

  // The pointer is where it clicked to get here: on Settings, in the sidebar.
  const path = makePath(mid(box.nav, .62, .6));
  path.move(mid(box.picture, .55, .5), CUE.toPicture[0], CUE.toPicture[1] - CUE.toPicture[0], -8);
  path.click(CUE.picture);
  path.move(mid(box.app, .5, .5), CUE.toApp[0], CUE.toApp[1] - CUE.toApp[0], 6);
  path.click(CUE.app);
  path.reach(mid(box.theme, .62, .55), CUE.toTheme[0], CUE.toTheme[1] - CUE.toTheme[0], 16);
  path.click(CUE.open);
  path.move(mid(menu.box(2), .45, .55), CUE.toDark[0], CUE.toDark[1] - CUE.toDark[0], -6);
  path.click(CUE.dark);
  path.reach(mid(box.save, .5, .55), CUE.toSave[0], CUE.toSave[1] - CUE.toSave[0], 20);
  path.click(CUE.save);
  path.move([box.save.x - 220, box.save.y - 30], CUE.away[0], CUE.away[1] - CUE.away[0], -10);
  path.check();

  const pose = t => {
    t = clamp(t, 0, DURATION);
    film(stage, BOTH);
    app.play(t, [[0, connection], [CUE.picture, picture], [CUE.app, appPage], [CUE.dark, preview], [CUE.saved, saved]]);
    const p = path.pointer(t);
    for (const [node, r] of tabs) touch(node, inBox(p, r));
    touch(save, inBox(p, box.save), path.down(t));
    menu.pose(t, CUE.open, CUE.dark, menu.rowAt(p));
    arrive(toast, t, CUE.saved + .05);
    video.open(t, -1);
    video.phone.swipe(swiped(t, 0, CUE.swipes));
    caption(t);
    pointAt(cursor, p);
  };

  return {
    pose,
    duration: DURATION,
    info: { cue: Object.fromEntries(Object.entries(CUE).map(([k, v]) => [k, [v].flat(2).map(r3)])), box },
  };
}
