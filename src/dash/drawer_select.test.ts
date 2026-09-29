/* 검색형 select 가드(2026-09-29) — ① 분기 임계값 ② 드로어 select 로컬 복제본 재발 금지.
   복제본이 다시 생기면 그 페이지만 긴 목록 검색이 빠진다(32벌 복제 시절의 문제 그대로). */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { shouldSearch, SEARCHABLE_SELECT_MIN } from './ui/searchable-select';
import { SchemaField } from './schemas/renderers';
import { DrawerSelect } from './drawer_select';

const ROOT = new URL('..', import.meta.url).pathname;   // src/
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\.ts$/.test(f) ? [p] : [];
  });
}

describe('shouldSearch', () => {
  it('임계값 미만은 네이티브', () => expect(shouldSearch(SEARCHABLE_SELECT_MIN - 1)).toBe(false));
  it('임계값 이상은 검색형', () => expect(shouldSearch(SEARCHABLE_SELECT_MIN)).toBe(true));
  it('명시 플래그가 개수보다 우선', () => {
    expect(shouldSearch(3, true)).toBe(true);
    expect(shouldSearch(50, false)).toBe(false);
  });
});

// 실제 분기 렌더 — 현재 10개 이상 옵션을 가진 폼 모달이 없어 브라우저로 재현되지 않는 SchemaField 경로를 SSR 로 고정한다.
describe('렌더 분기', () => {
  const many = Array.from({ length: SEARCHABLE_SELECT_MIN }, (_, i) => `운용사${i + 1}`);
  const html = (el: React.ReactElement) => renderToStaticMarkup(el);
  it('SchemaField: 옵션 많으면 combobox 버튼, 적으면 네이티브 select', () => {
    const f = { key: 'gp', label: '운용사', control: 'select' as const, options: many };
    const big = html(React.createElement(SchemaField, { field: f, value: many[2], onChange: () => {} }));
    expect(big).toMatch(/role="combobox"/);
    expect(big).not.toMatch(/<select/);
    expect(big).toContain('운용사3');
    const small = html(React.createElement(SchemaField, { field: { ...f, options: many.slice(0, 3) }, value: '', onChange: () => {} }));
    expect(small).toMatch(/<select/);
  });
  it('SchemaField: searchable:false 면 옵션이 많아도 네이티브', () => {
    const out = html(React.createElement(SchemaField, { field: { key: 'gp', label: '운용사', control: 'select', options: many, searchable: false }, value: '', onChange: () => {} }));
    expect(out).toMatch(/<select/);
  });
  it('DrawerSelect: 옵션 많으면 combobox, 빈 값은 전체 라벨', () => {
    const out = html(React.createElement(DrawerSelect, { value: '', onChange: () => {}, options: many, ariaLabel: '운용사' }));
    expect(out).toMatch(/role="combobox"/);
    expect(out).toContain('전체');
  });
  it('DrawerSelect: {value,label} 옵션은 라벨로 표시', () => {
    const opts = many.map((l, i) => ({ value: `v${i}`, label: l }));
    const out = html(React.createElement(DrawerSelect, { value: 'v4', onChange: () => {}, options: opts, all: null }));
    expect(out).toContain('운용사5');
  });
});

describe('드로어 select 공용본 단일화', () => {
  it('로컬 DrawerSelect 구현(네이티브 <select> 를 직접 그리는 복제본)이 없다', () => {
    const hits = walk(ROOT).filter((f) => {
      if (f.endsWith('drawer_select.tsx')) return false;
      const src = readFileSync(f, 'utf8');
      const m = src.match(/function DrawerSelect\([\s\S]*?\n}\n/);
      return !!m && /<select\b/.test(m[0]);
    });
    expect(hits).toEqual([]);
  });
});
