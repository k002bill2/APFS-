/* 에디터 URL 입력 = UrlDialog 하나(2026-10-27 사용자 요청: 링크 URL 입력을 "이미지 삽입" 다이얼로그 모양으로 통일).
   링크는 툴바 아래 인라인 바, 이미지 링크·교체는 이미지 위 인라인 바였다 — 새 URL 입력이 다시 인라인으로
   생기지 않게 fields/*.tsx 의 type="url" 입력 위치를 고정한다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { walkDash } from '../test_src';

describe('에디터 URL 입력은 UrlDialog 로만', () => {
  it('fields/*.tsx 중 type="url" 입력은 RichTextUrlDialog.tsx 에만 있다', () => {
    const owners = walkDash()
      .filter((p) => /[\\/]fields[\\/][^\\/]+\.tsx$/.test(p) && /type="url"/.test(readFileSync(p, 'utf8')))
      .map((p) => basename(p));
    expect(owners).toEqual(['RichTextUrlDialog.tsx']);
  });
});
