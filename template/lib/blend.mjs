// Runs in a worker thread: decodes screenshots of the same frame taken at
// different moments and averages them into one motion blurred RGB frame.
import { parentPort } from 'node:worker_threads';
import { decodePng } from './png.mjs';

const view = bytes => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

parentPort.on('message', ({ id, shots }) => {
  try {
    const first = decodePng(view(shots[0])).rgb;
    let rgb = first;
    if (shots.length > 1) {
      const sum = new Uint16Array(first.length);
      sum.set(first);
      for (let s = 1; s < shots.length; s++) {
        const next = decodePng(view(shots[s])).rgb;
        for (let i = 0; i < sum.length; i++) sum[i] += next[i];
      }
      const count = shots.length;
      const half = count >> 1;
      rgb = Buffer.alloc(first.length);
      for (let i = 0; i < sum.length; i++) rgb[i] = (sum[i] + half) / count;
    }
    const out = new Uint8Array(rgb.buffer, rgb.byteOffset, rgb.byteLength).slice();
    parentPort.postMessage({ id, rgb: out }, [out.buffer]);
  } catch (error) {
    parentPort.postMessage({ id, error: error.stack || String(error) });
  }
});
