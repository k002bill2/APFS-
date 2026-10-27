/* 에디터 URL 입력 = UrlDialog 하나(2026-10-27 사용자 요청: 링크 URL 입력을 "이미지 삽입" 다이얼로그 모양으로 통일).
   링크는 툴바 아래 인라인 바, 이미지 링크·교체는 이미지 위 인라인 바였다 — 새 URL 입력이 다시 인라인으로
   생기지 않게 fields/*.tsx 의 type="url" 입력 위치를 고정한다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { readSrc, walkDash } from '../test_src';

describe('에디터 URL 입력은 UrlDialog 로만', () => {
  it('fields/*.tsx 중 type="url" 입력은 RichTextUrlDialog.tsx 에만 있다', () => {
    const owners = walkDash()
      .filter((p) => /[\\/]fields[\\/][^\\/]+\.tsx$/.test(p) && /type="url"/.test(readFileSync(p, 'utf8')))
      .map((p) => basename(p));
    expect(owners).toEqual(['RichTextUrlDialog.tsx']);
  });
});

// 업로드 거부(용량 초과) 알림도 툴바 아래 인라인 바였다 → 같은 날 사용자 요청으로 중앙 모달(2026-10-27).
describe('에디터 알림은 툴바 아래 인라인 바가 아니라 모달', () => {
  it('RichTextField 에 인라인 role="alert" 바가 없다', () => {
    expect(readSrc('RichTextField.tsx')).not.toMatch(/role="alert"/);
  });
  // 수식 입력도 같은 날 모달로(블록 수식 아래 입력칸·인라인 수식 팝오버 → EquationDialog).
  it('수식 요소 안에 인라인 LaTeX 입력칸·팝오버가 없다', () => {
    expect(readSrc('RichTextElements.tsx')).not.toMatch(/apfs-rt-eqinput|apfs-rt-ieq__pop/);
  });
});
