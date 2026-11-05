// @vitest-environment jsdom
/* 배지 변형 렌더 계약(소스 가드는 badge_variants.test.ts — jsdom 에선 test_src 의 import.meta.url 이 file: 이 아니라 분리) — 화면스타일가이드 v1.2 4.2.2(2026-11-05 개정판: "등급 배지 허용 변형").
   ① 기본(색+아이콘+텍스트) · ② 컴팩트(색+텍스트) · ③ 링크형(②+후행 external-link) + TrendBadge · TagBadge.
   ⚠ StatusBadge 의 기본값은 텍스트만(2026-09-24 결정) 그대로다 — 가이드는 ① 이 기본이지만, 아이콘 자동화를
     그리드 밖 ~40개 파일에 퍼뜨리는 건 이번 범위가 아니다(2026-11-05 사용자 선택 "그리드만 이번에").
     ① 은 지금처럼 `icon` 을 명시해서 쓴다.
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { UI } from './components';

afterEach(() => cleanup());

const { StatusBadge, TrendBadge, TagBadge } = UI as any;
const mount = (el: React.ReactElement) => render(el).container.firstElementChild as HTMLElement;

describe('StatusBadge 변형', () => {
  it('기본값은 텍스트만 — icon 을 안 넘기면 svg 가 없다(기존 화면 무변경)', () => {
    const b = mount(React.createElement(StatusBadge, { tone: 'danger', label: '경고' }));
    expect(b.querySelector('svg')).toBeNull();
    expect(b.textContent).toBe('경고');
  });

  it('① 기본 — icon 을 넘기면 라벨 앞에 아이콘', () => {
    const b = mount(React.createElement(StatusBadge, { tone: 'danger', label: '경고', icon: 'shield-alert' }));
    expect(b.firstElementChild?.tagName.toLowerCase()).toBe('svg');
  });

  it('② compact — icon 을 넘겨도 아이콘을 그리지 않는다', () => {
    const b = mount(React.createElement(StatusBadge, { tone: 'danger', label: '경고', icon: 'shield-alert', compact: true }));
    expect(b.querySelector('svg')).toBeNull();
    expect(b.textContent).toBe('경고');
  });

  it('③ link — 선행 아이콘 없이 라벨 뒤 external 아이콘 · hover 밑줄 · pointer', () => {
    const b = mount(React.createElement(StatusBadge, { tone: 'danger', label: '경고', icon: 'shield-alert', link: true, size: 'lg' }));
    const kids = Array.from(b.children);
    expect(kids.map((k) => k.tagName.toLowerCase())).toEqual(['span', 'svg']);   // 라벨 → 후행 아이콘
    expect(kids[0].textContent).toBe('경고');
    expect(kids[0].className).toContain('group-hover:underline');
    expect(b.className.split(' ')).toEqual(expect.arrayContaining(['group', 'cursor-pointer']));
    expect(b.querySelectorAll('svg')).toHaveLength(1);
  });

  it('③ link 아이콘 크기 — sm 11(가이드 규격) · lg 13.5(fund_early_warning 실측값)', () => {
    const sm = mount(React.createElement(StatusBadge, { tone: 'danger', label: '경고', link: true, size: 'sm' }));
    expect(sm.querySelector('svg')?.getAttribute('width')).toBe('11');
    cleanup();
    const lg = mount(React.createElement(StatusBadge, { tone: 'danger', label: '경고', link: true, size: 'lg' }));
    expect(lg.querySelector('svg')?.getAttribute('width')).toBe('13.5');
  });
});

describe('TrendBadge — 등급 변동 전용', () => {
  const cases: [string, string, string, 'glyph' | 'icon'][] = [
    ['same', '지속', 'var(--muted-foreground)', 'glyph'],
    ['worse', '악화', 'var(--danger-text)', 'glyph'],
    ['better', '개선', 'var(--success-text)', 'glyph'],
    ['new', '신규', 'var(--warning-text)', 'icon'],
    ['resolved', '해소', 'var(--info-text)', 'icon'],
  ];
  it.each(cases)('%s → %s (%s)', (kind, label, color, mark) => {
    const b = mount(React.createElement(TrendBadge, { kind }));
    expect(b.style.color).toBe(color);
    if (mark === 'icon') {
      expect(b.firstElementChild?.tagName.toLowerCase()).toBe('svg');
      expect(b.textContent).toBe(label);
    } else {
      const glyph = b.querySelector('[aria-hidden="true"]');
      expect(glyph?.tagName.toLowerCase()).toBe('span');   // 기호(= ▲ ▼)는 낭독하지 않는다
      expect(b.textContent).toBe(`${glyph?.textContent}${label}`);
    }
  });
  it('기호 — 악화 ▲ · 개선 ▼ · 지속 =', () => {
    const g = (kind: string) => { const el = mount(React.createElement(TrendBadge, { kind })).querySelector('[aria-hidden="true"]')?.textContent; cleanup(); return el; };
    expect([g('worse'), g('better'), g('same')]).toEqual(['▲', '▼', '=']);
  });
});

describe('TagBadge — 코드성 분류값', () => {
  it('아이콘 없음 · 600 · radius 6', () => {
    const b = mount(React.createElement(TagBadge, { tone: 'info' }, '등록'));
    expect(b.querySelector('svg')).toBeNull();
    expect(b.className.split(' ')).toEqual(expect.arrayContaining(['font-semibold', 'rounded-[6px]']));
    expect(b.textContent).toBe('등록');
    expect(b.style.color).toBe('var(--info-text)');
  });

  it('primary 라벨은 --primary-text — --primary(#5A5FE8)는 12% soft 위 4.23:1 로 AA 미달(2026-11-05 실측)', () => {
    const b = mount(React.createElement(TagBadge, { tone: 'primary' }, '확정'));
    expect(b.style.color).toBe('var(--primary-text)');
  });
});
