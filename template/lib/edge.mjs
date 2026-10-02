// Minimal Chrome DevTools Protocol driver for the installed Microsoft Edge:
// no browser dependency, a throwaway profile, and a private debugging port.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function until(condition, description, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await condition();
    if (value) return value;
    await delay(40);
  }
  throw new Error(`Timed out: ${description}`);
}

async function findEdge() {
  const candidates = [
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  throw new Error('Microsoft Edge is required to render the film.');
}

function connect(url) {
  const socket = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      clearTimeout(request.timer);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(`${request.method}: ${message.error.message}`));
      else request.resolve(message.result);
    } else {
      for (const listener of listeners) listener(message);
    }
  });
  const send = (method, params = {}, timeout = 60000) => new Promise((resolve, reject) => {
    if (socket.readyState !== WebSocket.OPEN) { reject(new Error(`Socket closed before ${method}`)); return; }
    const requestId = ++id;
    const timer = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error(`Browser command timed out: ${method}`));
    }, timeout);
    pending.set(requestId, { resolve, reject, timer, method });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  const evaluate = async (expression, timeout) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeout);
    if (response.exceptionDetails) {
      const { exception, text } = response.exceptionDetails;
      throw new Error(exception?.description || (exception?.value !== undefined ? String(exception.value) : text));
    }
    return response.result.value;
  };
  return once(socket, 'open').then(() => ({
    send,
    evaluate,
    on: listener => listeners.add(listener),
    close: () => socket.close(),
  }));
}

export async function launchEdge(extraArgs = []) {
  const executable = await findEdge();
  const profile = await mkdtemp(join(tmpdir(), `promo-film-${process.pid}-`));
  const child = spawn(executable, [
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-extensions', '--disable-sync',
    '--hide-scrollbars', '--mute-audio', '--force-color-profile=srgb',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...extraArgs, 'about:blank',
  ], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', data => { stderr = (stderr + data).slice(-4000); });
  // Edge writes this file in place, so it can be missing, locked or half written.
  let port;
  try {
    port = await until(async () => {
      try {
        const text = await readFile(join(profile, 'DevToolsActivePort'), 'utf8');
        return text.includes('\n') && text.split('\n')[0];
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'EBUSY') return false;
        throw error;
      }
    }, 'start an isolated Edge profile');
  } catch (error) {
    child.kill();
    await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 });
    throw new Error(`${error.message}\n${stderr}`.trim());
  }
  const base = `http://127.0.0.1:${port}`;
  const pages = [];
  return {
    async newPage() {
      const target = await (await fetch(`${base}/json/new?about:blank`, { method: 'PUT' })).json();
      const page = await connect(target.webSocketDebuggerUrl);
      pages.push(page);
      return page;
    },
    stderr: () => stderr,
    async close() {
      const version = await fetch(`${base}/json/version`).then(response => response.json()).catch(() => null);
      if (version?.webSocketDebuggerUrl) {
        try {
          const browser = await connect(version.webSocketDebuggerUrl);
          await browser.send('Browser.close', {}, 5000).catch(() => {});
          browser.close();
        } catch { /* The browser may already be closing. */ }
      }
      for (const page of pages) page.close();
      if (child.exitCode === null) {
        const exited = await Promise.race([once(child, 'exit').then(() => true), delay(5000).then(() => false)]);
        if (!exited) { child.kill(); await once(child, 'exit'); }
      }
      await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 300 });
    },
  };
}
