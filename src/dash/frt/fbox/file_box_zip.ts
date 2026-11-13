/* 무압축(STORE) ZIP 작성기 — 파일BOX 다중 다운로드용. 의존성 없이 순수 함수로 바이트를 만든다(읽기 기능 없음).
   항목 이름은 UTF-8 플래그(일반 목적 비트 11)를 세워 한글 경로가 Windows 탐색기·macOS 에서 깨지지 않게 한다.
   형식: [로컬 헤더 + 이름 + 본문]… [중앙 디렉터리]… [EOCD]. ZIP64·암호화·압축은 다루지 않는다(목업 텍스트만 담는다). */

export type ZipEntry = Readonly<{ name: string; data: Uint8Array }>;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const UTF8_FLAG = 0x0800;
const dosTime = (d: Date) => (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
const dosDate = (d: Date) => ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();

/** 리틀엔디언 필드 [바이트 수, 값] 나열 → 바이트 */
function fields(spec: readonly (readonly [2 | 4, number])[]): Uint8Array {
  const out = new Uint8Array(spec.reduce((s, [n]) => s + n, 0));
  const view = new DataView(out.buffer);
  let o = 0;
  for (const [n, v] of spec) { if (n === 2) view.setUint16(o, v, true); else view.setUint32(o, v >>> 0, true); o += n; }
  return out;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export function zipStore(entries: readonly ZipEntry[], when: Date = new Date()): Uint8Array {
  const enc = new TextEncoder();
  const time = dosTime(when), date = dosDate(when);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data), size = e.data.length;
    const local = concat([fields([[4, 0x04034b50], [2, 20], [2, UTF8_FLAG], [2, 0], [2, time], [2, date], [4, crc], [4, size], [4, size], [2, name.length], [2, 0]]), name, e.data]);
    centrals.push(concat([fields([[4, 0x02014b50], [2, 20], [2, 20], [2, UTF8_FLAG], [2, 0], [2, time], [2, date], [4, crc], [4, size], [4, size],
      [2, name.length], [2, 0], [2, 0], [2, 0], [2, 0], [4, 0], [4, offset]]), name]));
    locals.push(local);
    offset += local.length;
  }
  const central = concat(centrals);
  const eocd = fields([[4, 0x06054b50], [2, 0], [2, 0], [2, entries.length], [2, entries.length], [4, central.length], [4, offset], [2, 0]]);
  return concat([...locals, central, eocd]);
}
