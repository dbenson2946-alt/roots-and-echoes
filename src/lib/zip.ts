// A small ZIP writer that runs in the browser. Files are stored without
// compression (photos and recordings are already compressed, and the text is
// small), which keeps this to a few dozen lines and needs no extra package.
// One archive stays well under 4 GB and 65,000 files, so the plain ZIP format
// is enough (callers split a large collection into several archives).

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { time: number; day: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

interface Entry {
  name: Uint8Array;
  size: number;
  crc: number;
  offset: number;
  time: number;
  day: number;
}

export class ZipBuilder {
  private parts: Uint8Array<ArrayBuffer>[] = [];
  private entries: Entry[] = [];
  private offset = 0;
  private names = new Set<string>();

  /** Bytes added so far (file contents only). */
  contentBytes = 0;

  get fileCount(): number {
    return this.entries.length;
  }

  add(name: string, data: Uint8Array, when: Date = new Date()): void {
    if (this.names.has(name)) throw new Error(`Duplicate file name in zip: ${name}`);
    this.names.add(name);
    const nameBytes = new TextEncoder().encode(name);
    const { time, day } = dosDateTime(when);
    const crc = crc32(data);

    const header = new Uint8Array(30 + nameBytes.length);
    const v = new DataView(header.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true); // version needed
    v.setUint16(6, 0x0800, true); // flags: names are UTF-8
    v.setUint16(8, 0, true); // method: stored
    v.setUint16(10, time, true);
    v.setUint16(12, day, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, data.length, true);
    v.setUint32(22, data.length, true);
    v.setUint16(26, nameBytes.length, true);
    v.setUint16(28, 0, true);
    header.set(nameBytes, 30);

    this.entries.push({ name: nameBytes, size: data.length, crc, offset: this.offset, time, day });
    this.parts.push(header, data as Uint8Array<ArrayBuffer>);
    this.offset += header.length + data.length;
    this.contentBytes += data.length;
  }

  build(): Blob {
    const centralStart = this.offset;
    const central: Uint8Array<ArrayBuffer>[] = [];
    let centralSize = 0;
    for (const e of this.entries) {
      const rec = new Uint8Array(46 + e.name.length);
      const v = new DataView(rec.buffer);
      v.setUint32(0, 0x02014b50, true);
      v.setUint16(4, 20, true); // made by
      v.setUint16(6, 20, true); // version needed
      v.setUint16(8, 0x0800, true);
      v.setUint16(10, 0, true);
      v.setUint16(12, e.time, true);
      v.setUint16(14, e.day, true);
      v.setUint32(16, e.crc, true);
      v.setUint32(20, e.size, true);
      v.setUint32(24, e.size, true);
      v.setUint16(28, e.name.length, true);
      v.setUint32(42, e.offset, true);
      rec.set(e.name, 46);
      central.push(rec);
      centralSize += rec.length;
    }
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, this.entries.length, true);
    ev.setUint16(10, this.entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralStart, true);
    return new Blob([...this.parts, ...central, end], { type: "application/zip" });
  }
}
