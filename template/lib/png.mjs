// Just enough PNG decoding to blend Edge screenshots: 8 bit RGB or RGBA,
// not interlaced. Returns packed RGB pixels.
import { inflateSync } from 'node:zlib';

export function decodePng(file) {
  let at = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const parts = [];
  while (at < file.length) {
    const length = file.readUInt32BE(at);
    const type = file.toString('latin1', at + 4, at + 8);
    const data = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      channels = { 2: 3, 6: 4 }[data[9]];
      if (data[8] !== 8 || !channels || data[12] !== 0) throw new Error('Only 8 bit, non-interlaced RGB or RGBA PNGs are supported.');
    } else if (type === 'IDAT') {
      parts.push(data);
    } else if (type === 'IEND') {
      break;
    }
    at += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  const rows = Buffer.alloc(stride * height);
  const n = channels;
  for (let y = 0; y < height; y++) {
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const up = dst - stride;
    const filter = raw[src - 1];
    if (filter === 0 || (filter === 2 && y === 0)) {
      raw.copy(rows, dst, src, src + stride);
    } else if (filter === 1) {
      for (let x = 0; x < stride; x++) rows[dst + x] = raw[src + x] + (x >= n ? rows[dst + x - n] : 0);
    } else if (filter === 2) {
      for (let x = 0; x < stride; x++) rows[dst + x] = raw[src + x] + rows[up + x];
    } else if (filter === 3) {
      for (let x = 0; x < stride; x++) {
        const left = x >= n ? rows[dst + x - n] : 0;
        const above = y > 0 ? rows[up + x] : 0;
        rows[dst + x] = raw[src + x] + ((left + above) >> 1);
      }
    } else if (filter === 4) {
      for (let x = 0; x < stride; x++) {
        const a = x >= n ? rows[dst + x - n] : 0;
        const b = y > 0 ? rows[up + x] : 0;
        const c = x >= n && y > 0 ? rows[up + x - n] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        rows[dst + x] = raw[src + x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
    } else {
      throw new Error(`Unknown PNG filter ${filter}.`);
    }
  }

  if (channels === 3) return { width, height, rgb: rows };
  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < rows.length; i += 4, j += 3) {
    rgb[j] = rows[i];
    rgb[j + 1] = rows[i + 1];
    rgb[j + 2] = rows[i + 2];
  }
  return { width, height, rgb };
}
