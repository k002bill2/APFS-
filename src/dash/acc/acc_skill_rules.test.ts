/* 회계 화면 스킬 규약 가드 — 2026-10-30 점검에서 빠져 있던 3종(회계 대분류 루트: 대상이 baseinfo·slip 두 중분류).
   ① 목록 단축키(⌘P·⌥D·⌘⏎)는 상세필터(Sheet)가 열린 동안 끈다 — apfs-grid "단축키". 드로어가 덮은 뒤 그리드가 인쇄됐다(실측).
   ② AUTO_SIZE_CONTENT 그리드는 잔여폭 흡수 컬럼 1개(flex:1 + minWidth = width + suppressAutoSize, maxWidth 없음)
      — apfs-aggrid PR #362. 없으면 프레임이 컬럼 합보다 넓을 때 행이 마지막 컬럼에서 끝나 우측이 빈다(2560 실측 139px).
   ③ 삭제전표 거래처 칸 = 말줄임 렌더러 — display:flex 셀은 AG Grid 기본 말줄임이 안 걸려 글자가 '…' 없이 잘렸다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sep } from 'node:path';
import { readSrc, walkDash } from '../test_src';

const LIST_PAGES = [
  'account_code_manage.tsx', 'closing_form_manage.tsx',
  'general_journal_manage.tsx', 'deleted_journal_manage.tsx', 'suspense_manage.tsx',
];

describe('① 회계 목록 단축키 — 상세필터가 열린 동안 끔', () => {
  it.each(LIST_PAGES)('%s', (f) => {
    const src = readSrc(f);
    const calls = src.match(/useHotkey\(HOTKEYS\.(print|export|register)\.combo[^;]*;/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      /* enabled 가 식이면 그대로, 이름 하나(listKeys 등)면 그 const 정의를 본다 */
      const expr = c.match(/enabled: ([^,}]*)/)?.[1].trim() ?? '';   // 쉼표 뒤 skipInDialog 등 다른 옵션은 제외
      const named = /^\w+$/.test(expr) ? src.match(new RegExp(`const ${expr} = ([^;]*);`))?.[1] ?? '' : expr;
      expect(named, c).toMatch(/!filterOpen/);
    }
  });
});

describe('② AUTO_SIZE_CONTENT 회계 그리드 — 잔여폭 흡수 컬럼 1개', () => {
  const autoSized = walkDash()
    .filter((p) => p.includes(`${sep}acc${sep}`) && p.endsWith('.tsx'))
    .filter((p) => readFileSync(p, 'utf8').includes('autoSizeStrategy={AUTO_SIZE_CONTENT}'));

  it('대상이 있다(경로가 바뀌어 0건 통과하지 않게)', () => { expect(autoSized.length).toBeGreaterThan(0); });

  it.each(autoSized)('%s', (p) => {
    const stretch = readFileSync(p, 'utf8').split('\n').filter((l) => l.includes('headerName:') && l.includes('suppressAutoSize: true'));
    expect(stretch).toHaveLength(1);
    expect(stretch[0]).toMatch(/flex: 1, minWidth: (\d+), width: \1, suppressAutoSize: true/);
    expect(stretch[0]).not.toMatch(/maxWidth/);
  });
});

describe('③ 삭제전표 긴 텍스트 칸 — 말줄임 렌더러', () => {
  const src = readSrc('deleted_journal_manage.tsx');
  it('textCell = truncate span', () => { expect(src).toMatch(/const textCell = [^\n]*className="min-w-0 truncate"/); });
  /* 거래처(140 고정) · 적요(flex, 1280 에선 minWidth 180 에 묶여 잘렸다) */
  it.each(['partner', 'memo'])('%s 컬럼이 textCell 을 쓴다', (k) => {
    expect(src.split('\n').find((l) => l.includes(`field: '${k}'`))).toMatch(/cellRenderer: textCell/);
  });
});
