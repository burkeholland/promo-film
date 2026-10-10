import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

const template = dirname(dirname(fileURLToPath(import.meta.url)));

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForPreview(child, url) {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Preview exited with code ${child.exitCode}.`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await delay(100);
  }
  throw new Error(`Preview did not start in time${lastError ? `: ${lastError.message}` : '.'}`);
}

async function stopPreview(child) {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}

test('download link serves the MP4 directly and keeps native browser downloads', async () => {
  const root = await mkdtemp(join(tmpdir(), 'promo-film-download-'));
  const port = await unusedPort();
  const expected = Buffer.from('mp4 test fixture');
  let child;

  try {
    await mkdir(join(root, 'lib'), { recursive: true });
    await mkdir(join(root, 'film', 'scenes'), { recursive: true });
    await mkdir(join(root, 'build'), { recursive: true });
    await cp(join(template, 'preview.mjs'), join(root, 'preview.mjs'));
    await cp(join(template, 'lib', 'icons.mjs'), join(root, 'lib', 'icons.mjs'));
    await cp(join(template, 'lib', 'preview.html'), join(root, 'lib', 'preview.html'));
    await writeFile(join(root, 'film', 'edit.mjs'), "export const NAME = 'download-test';\n");
    await writeFile(join(root, 'build', 'download-test.mp4'), expected);

    child = spawn(process.execPath, [join(root, 'preview.mjs'), '--port', String(port)], {
      cwd: root,
      stdio: 'ignore',
      windowsHide: true,
    });
    const preview = `http://127.0.0.1:${port}/download-test/`;
    await waitForPreview(child, preview);

    const page = await fetch(preview, { signal: AbortSignal.timeout(5000) });
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /link\.href = `build\/\$\{encodeURIComponent\(file\.file\)\}`;/);
    assert.match(html, /link\.download = file\.file;/);
    assert.doesNotMatch(html, /download\?draft=/);

    const response = await fetch(new URL('build/download-test.mp4', preview), { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'video/mp4');
    assert.equal(response.headers.get('content-disposition'), null);
    assert.equal(response.headers.get('accept-ranges'), 'bytes');
    assert.equal(response.headers.get('content-length'), String(expected.length));
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected);

    const range = await fetch(new URL('build/download-test.mp4', preview), {
      headers: { range: 'bytes=0-3' },
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-range'), `bytes 0-3/${expected.length}`);
    assert.deepEqual(Buffer.from(await range.arrayBuffer()), expected.subarray(0, 4));
  } finally {
    await stopPreview(child);
    await rm(root, { recursive: true, force: true });
  }
});
