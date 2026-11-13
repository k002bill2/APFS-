// @vitest-environment jsdom
/* 적용 칩 → 상세필터 항목 이동의 DOM 계약(2026-11-03 전수 점검 — 116 route · 칩 222개 실측에서 나온 결함 2종).
   1. 드로어 설명 문구(aria-describedby)는 캡션이 아니다 — 칩 '조회 대상'이 설명 "조회 대상 투자기업을…"에 앞부분 일치해
      초점이 [닫기] 버튼으로 갔다(investee-profile). 못 찾으면 드로어만 여는 게 맞다.
   2. 캡션 없이 aria-label 만 있는 입력칸도 정확히 같은 이름이면 그 칸으로 간다 — '검색기준' 칸 안의 검색어 input(program-manage).
   화면 모양은 GridFrame([data-grid-frame]) 안 '상세필터' 버튼 → 누르면 Radix 드로어처럼 열린 dialog 를 body 에 붙인다. */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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

  /* 2026-11-13 사용자 "응" — 인라인 패널(아래 describe)과 같은 이유: 칩을 마우스로 누른 뒤 스크립트로 옮긴 초점은
     버튼형 컨트롤(PeriodPicker·DrawerMultiSelect 트리거)에 :focus-visible 이 안 붙는다(Chrome) → focusVisible:true */
  it('초점을 옮길 때 focusVisible 을 요청한다 — 버튼형 칸도 초점 링이 보이게', async () => {
    const chips = mount('<div><span>기준년월</span><button id="ym" type="button">2026-11</button></div>');
    const spy = vi.spyOn(HTMLElement.prototype, 'focus');
    try {
      expect(await jumpToFilterField(chips, '기준년월')).toBe(true);
      expect(active()?.id).toBe('ym');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ focusVisible: true }));
    } finally {
      spy.mockRestore();
    }
  });
});

/* 드로어 없이 칸을 펼쳐 둔 화면(GridFrame filterPanel → [data-filter-panel], 자펀드정보관리 2026-11-09) —
   [상세필터] 버튼이 없으면 같은 프레임 패널에서 aria-label 이 정확히 같은 칸으로 초점을 옮긴다 */
describe('jumpToFilterField — 인라인 필터 패널', () => {
  function mountInline(panel: string | null): Element {
    const frame = document.createElement('div');
    frame.setAttribute('data-grid-frame', '');
    frame.innerHTML = (panel == null ? '' : `<div data-filter-panel="">${panel}</div>`) + '<div data-chips></div>';
    document.body.appendChild(frame);
    return frame.querySelector('[data-chips]')!;
  }

  it('패널의 같은 이름 칸으로 초점', async () => {
    const chips = mountInline('<input id="kw" aria-label="검색어"><select id="fund" aria-label="자펀드"><option value="">자펀드</option></select><button id="yr" type="button" aria-label="사업연도">사업연도</button>');
    expect(await jumpToFilterField(chips, '자펀드')).toBe(true);
    expect(active()?.id).toBe('fund');
    expect(await jumpToFilterField(chips, '사업연도')).toBe(true);
    expect(active()?.id).toBe('yr');
  });

  /* 2026-11-10 사용자 "사업연도는 칩 클릭시 해당 컴포넌트에 focus 표시가 안된다" — 마우스 클릭 뒤 스크립트로 옮긴 초점은
     버튼에 :focus-visible 이 안 붙는다(select 는 붙는다, Chrome 실측) → focusVisible:true 로 같은 초점 링을 요청한다 */
  it('초점을 옮길 때 focusVisible 을 요청한다 — 버튼 칸(사업연도)도 초점 링이 보이게', async () => {
    const chips = mountInline('<button id="yr" type="button" aria-label="사업연도">사업연도</button>');
    const spy = vi.spyOn(HTMLElement.prototype, 'focus');
    try {
      expect(await jumpToFilterField(chips, '사업연도')).toBe(true);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ focusVisible: true }));
    } finally {
      spy.mockRestore();
    }
  });

  it('이름이 정확히 같지 않으면 움직이지 않는다', async () => {
    const chips = mountInline('<select id="fund" aria-label="자펀드구분"><option value="">자펀드구분</option></select>');
    expect(await jumpToFilterField(chips, '자펀드')).toBe(false);
  });

  it('패널 밖(같은 프레임의 다른 버튼)은 고르지 않는다', async () => {
    const chips = mountInline(null);
    chips.parentElement!.insertAdjacentHTML('afterbegin', '<button type="button" aria-label="자펀드">x</button>');
    expect(await jumpToFilterField(chips, '자펀드')).toBe(false);
  });
});
