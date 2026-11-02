/* 전표 화면(JournalEntryScreen) 조회 전용 = 회색 비활성 통일(2026-11-02 사용자 결정) — 소스 문자열 가드.
   ① 규칙은 journal_entry_screen.css 한 곳, [data-ro-lock] 스코프 + 기준 토큰(var(--muted)/var(--muted-foreground)) + !important(인라인 흰 배경을 이긴다)
   ② data-ro-lock 은 조회 전용 fieldset(readOnly 전체 · 증빙첨부 LockWhen)에만 — 편집 모드 DOM·모양 불변
   ③ 맨 :disabled·fieldset[disabled] 규칙 금지 — 편집 모드에도 disabled 칸(거래처계좌번호·환율·외화금액)이 있어 그 모양이 바뀐다 */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';

const css = readSrc('journal_entry_screen.css');
const tsx = readSrc('journal_entry_screen.tsx');
/* 주석을 뺀 규칙 본문 */
const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('전표 화면 조회 전용 회색 비활성 통일', () => {
  it('화면이 스코프 CSS 를 import 한다', () => {
    expect(tsx).toMatch(/import '\.\/journal_entry_screen\.css';/);
  });

  it('[data-ro-lock] 아래 disabled 입력·select·textarea·팝오버 트리거를 기준 토큰으로 칠한다(!important)', () => {
    const sel = rules.match(/([^{}]+)\{([^}]*)\}/);
    expect(sel).not.toBeNull();
    const [, selector, body] = sel!;
    expect(selector.trim().startsWith('[data-ro-lock]')).toBe(true);
    for (const t of ['input', 'select', 'textarea', 'button[aria-haspopup]', ':disabled']) expect(selector).toContain(t);
    expect(body).toMatch(/background-color:\s*var\(--muted\)\s*!important/);
    expect(body).toMatch(/color:\s*var\(--muted-foreground\)\s*!important/);
    expect(body).toMatch(/opacity:\s*1\s*!important/);
    /* 하드코딩 색 금지 — 토큰만 */
    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it('모든 규칙이 [data-ro-lock] 스코프 — 맨 :disabled·fieldset[disabled] 규칙 없음', () => {
    const selectors = [...rules.matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim());
    expect(selectors.length).toBeGreaterThan(0);
    for (const s of selectors) for (const part of s.split(/,(?![^(]*\))/)) expect(part.trim().startsWith('[data-ro-lock]')).toBe(true);
    expect(rules).not.toMatch(/fieldset\[disabled\]|fieldset:disabled/);
  });

  it('data-ro-lock 은 조회 전용일 때만 — 본문 fieldset 은 readOnly 조건부, 증빙첨부 LockWhen fieldset 은 on 일 때만 렌더', () => {
    expect(tsx).toContain(`<fieldset disabled={readOnly} data-ro-lock={readOnly ? '' : undefined}`);
    expect(tsx).toMatch(/return on \? <fieldset disabled data-ro-lock="" [^>]*>\{children\}<\/fieldset> : <>\{children\}<\/>;/);
    /* 편집 모드에도 쓰이는 조건부 비활성 fieldset(계정구분 미선택·원화)엔 표지를 달지 않는다 */
    expect(tsx).toMatch(/<fieldset disabled=\{!form\.fundAccount\} className=/);
    expect(tsx).toMatch(/<fieldset disabled=\{!foreign\} className=/);
    expect(tsx.match(/data-ro-lock=/g)).toHaveLength(2);
  });

  it('머리 주석에 사용자 결정 기록', () => {
    expect(tsx).toContain('조회 전용 = 회색 비활성 통일(2026-11-02 사용자 결정)');
  });
});
