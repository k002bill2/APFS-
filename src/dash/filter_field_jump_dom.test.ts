// @vitest-environment jsdom
/* 적용 칩 → 상세필터 항목 이동의 DOM 계약(2026-11-03 전수 점검 — 116 route · 칩 222개 실측에서 나온 결함 2종).
   1. 드로어 설명 문구(aria-describedby)는 캡션이 아니다 — 칩 '조회 대상'이 설명 "조회 대상 투자기업을…"에 앞부분 일치해
      초점이 [닫기] 버튼으로 갔다(investee-profile). 못 찾으면 드로어만 여는 게 맞다.
   2. 캡션 없이 aria-label 만 있는 입력칸도 정확히 같은 이름이면 그 칸으로 간다 — '검색기준' 칸 안의 검색어 input(program-manage).
   화면 모양은 GridFrame([data-grid-frame]) 안 '상세필터' 버튼 → 누르면 Radix 드로어처럼 열린 dialog 를 body 에 붙인다. */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { jumpToFilterField } from './filter_field_jump';

beforeAll(() => {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
  if (!globalThis.requestAnimationFrame) globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number;
});
afterEach(() => { document.body.replaceChildren(); });

const HEAD = '<h2>상세필터</h2><p id="drawer-desc">조회 대상 투자기업을 고르는 상세 필터</p><button type="button" aria-label="닫기">x</button>';

function mount(fields: string): Element {
  const frame = document.createElement('div');
  frame.setAttribute('data-grid-frame', '');
  frame.innerHTML = '<button type="button">상세필터</button><div data-chips></div>';
  frame.querySelector('button')!.addEventListener('click', () => {
    if (document.querySelector('[role="dialog"]')) return;
    const d = document.createElement('div');
    d.setAttribute('role', 'dialog'); d.setAttribute('data-state', 'open'); d.setAttribute('aria-describedby', 'drawer-desc');
    d.innerHTML = HEAD + fields;
    document.body.appendChild(d);
  });
  document.body.appendChild(frame);
  return frame.querySelector('[data-chips]')!;
}

const active = () => document.activeElement as HTMLElement | null;

describe('jumpToFilterField — 드로어 DOM', () => {
  it('설명 문구에만 맞는 칩 항목명은 고르지 않는다(닫기 버튼으로 가지 않고 드로어만 연다)', async () => {
    const chips = mount('<label><span>모펀드</span><select id="mf"><option>전체</option></select></label>');
    expect(await jumpToFilterField(chips, '조회 대상')).toBe(false);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(active()?.getAttribute('aria-label')).not.toBe('닫기');
  });

  it('캡션과 정확일치하면 그 칸의 첫 컨트롤에 초점', async () => {
    const chips = mount('<label><span>모펀드</span><select id="mf"><option>전체</option></select></label><label><span>운용사</span><select id="gp"><option>전체</option></select></label>');
    expect(await jumpToFilterField(chips, '운용사')).toBe(true);
    expect(active()?.id).toBe('gp');
  });

  it('캡션이 없는 입력칸은 aria-label 이 정확히 같을 때 그 칸으로 간다', async () => {
    const chips = mount('<div><span>검색기준</span><div><select id="field" aria-label="검색기준"><option>프로그램명</option></select><input id="kw" type="text" aria-label="검색어"></div></div><label><span>구분</span><select id="gubun"><option>전체</option></select></label>');
    expect(await jumpToFilterField(chips, '검색어')).toBe(true);
    expect(active()?.id).toBe('kw');
  });

  it('aria-label 은 부분일치로 잡지 않는다', async () => {
    const chips = mount('<div><span>검색기준</span><div><input id="kw" type="text" aria-label="검색어 입력"></div></div>');
    expect(await jumpToFilterField(chips, '검색어')).toBe(false);
  });
});
