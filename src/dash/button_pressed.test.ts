/* UI.Button `pressed` — 표시 옵션 토글(Σ 소계·합계 등)용 on/off 상태(2026-11-09 사용자 결정 (a)).
   aria-pressed 로 상태를 알리고, 켜짐은 primary 테두리 + primary 12% 배경(토큰만). pressed 를 안 넘기면 aria-pressed 자체가 없다
   (일반 버튼이 토글로 읽히지 않게). */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UI } from './components';

const html = (props: Record<string, unknown>) => renderToStaticMarkup(React.createElement(UI.Button, { variant: 'outline', size: 'sm', ...props }, '합계'));

describe('UI.Button pressed', () => {
  it('pressed=true → aria-pressed="true" + primary 테두리', () => {
    const h = html({ pressed: true });
    expect(h).toContain('aria-pressed="true"');
    expect(h).toContain('border-color:var(--primary)');
  });
  it('pressed=false → aria-pressed="false", 켜짐 스타일 없음', () => {
    const h = html({ pressed: false });
    expect(h).toContain('aria-pressed="false"');
    expect(h).not.toContain('border-color:var(--primary)');
  });
  it('pressed 미지정 → aria-pressed 없음', () => {
    expect(html({})).not.toContain('aria-pressed');
  });
});
