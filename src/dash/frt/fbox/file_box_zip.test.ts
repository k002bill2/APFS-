import { describe, expect, it } from 'vitest';
import { crc32, zipStore } from './file_box_zip';

const enc = new TextEncoder();
const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

/* 테스트 전용 최소 리더 — 중앙 디렉터리를 따라 이름·CRC·본문을 되읽는다 */
function readZip(b: Uint8Array) {
  const eocd = b.length - 22;
  expect(u32(b, eocd)).toBe(0x06054b50);
  const count = u16(b, eocd + 10);
  let p = u32(b, eocd + 16);
  const out: { name: string; flags: number; crc: number; text: string }[] = [];
  for (let i = 0; i < count; i++) {
    expect(u32(b, p)).toBe(0x02014b50);
    const flags = u16(b, p + 8), crc = u32(b, p + 16), size = u32(b, p + 24), nameLen = u16(b, p + 28), local = u32(b, p + 42);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
    expect(u32(b, local)).toBe(0x04034b50);
    const dataAt = local + 30 + u16(b, local + 26) + u16(b, local + 28);
    out.push({ name, flags, crc, text: new TextDecoder().decode(b.subarray(dataAt, dataAt + size)) });
    p += 46 + nameLen;
  }
  return out;
}

describe('crc32', () => {
  it('표준 검사값("123456789" = CBF43926)', () => expect(crc32(enc.encode('123456789'))).toBe(0xcbf43926));
  it('빈 입력 = 0', () => expect(crc32(new Uint8Array())).toBe(0));
});

describe('zipStore — 무압축(STORE) ZIP', () => {
  const entries = [
    { name: '운용사/조합/정기보고서.xlsx.txt', data: enc.encode('목업 파일 1') },
    { name: 'b.pdf.txt', data: enc.encode('second') },
  ];
  const zip = zipStore(entries, new Date(2026, 10, 13, 9, 30, 0));
  it('로컬 헤더로 시작하고 EOCD 로 끝난다', () => {
    expect(u32(zip, 0)).toBe(0x04034b50);
    expect(u16(zip, zip.length - 22 + 10)).toBe(2);
  });
  it('한글 경로·본문·CRC 가 그대로 되읽히고 UTF-8 플래그(0x0800)가 선다', () => {
    const back = readZip(zip);
    expect(back.map((e) => e.name)).toEqual(entries.map((e) => e.name));
    expect(back.map((e) => e.text)).toEqual(['목업 파일 1', 'second']);
    expect(back.map((e) => e.crc)).toEqual(entries.map((e) => crc32(e.data)));
    expect(back.every((e) => (e.flags & 0x0800) !== 0)).toBe(true);
  });
  it('빈 목록도 유효한 ZIP(EOCD 22바이트)', () => expect(zipStore([]).length).toBe(22));
});
