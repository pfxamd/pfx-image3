import type { ConversionResult } from '../../src/index.js';

// ZIP method 0 stores the original encoded bytes without recompression.
export function createDownloadArchive(results: readonly ConversionResult[]): Blob {
  if (results.length > 65535) throw new Error('Too many images for one archive.');
  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const directory: Uint8Array<ArrayBuffer>[] = [];
  const used = new Set<string>();
  let offset = 0;
  let directorySize = 0;

  for (const result of results) {
    const original = (result.outputName ?? `converted.${result.extension}`)
      .replace(/[\\/\x00-\x1f]/g, '_');
    const safe = original === '.' || original === '..' || !original ? `converted.${result.extension}` : original;
    let name = safe;
    let suffix = 2;
    const dot = safe.lastIndexOf('.');
    const stem = dot > 0 ? safe.slice(0, dot) : safe;
    const extension = dot > 0 ? safe.slice(dot) : '';
    while (used.has(name.toLowerCase())) name = `${stem} (${suffix++})${extension}`;
    used.add(name.toLowerCase());
    const filename = encoder.encode(name);
    const data = new Uint8Array(result.buffer);
    if (filename.length > 65535 || data.length >= 0xffffffff) throw new Error('Image exceeds archive limits.');
    const crc = crc32(data);
    const local = new Uint8Array(30 + filename.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(12, 33, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, filename.length, true);
    local.set(filename, 30);

    const central = new Uint8Array(46 + filename.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(14, 33, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, filename.length, true);
    cv.setUint32(42, offset, true);
    central.set(filename, 46);
    parts.push(local, result.buffer);
    directory.push(central);
    offset += local.length + data.length;
    directorySize += central.length;
    if (offset + directorySize + 22 >= 0xffffffff) throw new Error('Archive exceeds 4 GB.');
  }

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, results.length, true);
  ev.setUint16(10, results.length, true);
  ev.setUint32(12, directorySize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], { type: 'application/zip' });
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  return crc >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]!;
  return (crc ^ 0xffffffff) >>> 0;
}
