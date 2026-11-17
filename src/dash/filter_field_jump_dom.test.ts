// @vitest-environment jsdom
/* 적용 칩 → 필터 패널 칸 이동의 DOM 계약. 2026-11-17 상세필터 드로어 폐기 — 칸은 전 화면 GridFrame filterPanel(`[data-filter-panel]`)에
   펼쳐져 있고, 칩은 같은 프레임 패널에서 aria-label 이 **정확히** 같은 칸(범위는 같은 이름 role=group 의 첫 칸)으로 초점을 옮긴다.
   (구 드로어 경로 — [상세필터] 클릭·캡션 앞부분/포함 일치·설명 문구 제외 — 는 코드와 함께 걷었다.) */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { jumpToFilterField } from './filter_field_jump';

beforeAll(() => {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
});
afterEach(() => { document.body.replaceChildren(); });

const active = () => document.activeElement as HTMLElement | null;

/* 드로어 없이 칸을 펼쳐 둔 화면(GridFrame filterPanel → [data-filter-panel], 자펀드정보관리 2026-11-09) —
   같은 프레임 패널에서 aria-label 이 정확히 같은 칸으로 초점을 옮긴다 */
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

  /* 범위(시작~종료)는 칩 하나가 두 칸을 대표한다 — 칩 label = 그룹 aria-label, 초점은 첫 칸(filter_panel PanelRange) */
  it('범위 칩은 같은 이름 그룹의 첫 칸으로 간다', async () => {
    const chips = mountInline('<div role="group" aria-label="기간"><button id="from" type="button" aria-label="기간 시작">기간 시작</button><button id="to" type="button" aria-label="기간 종료">기간 종료</button></div>');
    expect(await jumpToFilterField(chips, '기간')).toBe(true);
    expect(active()?.id).toBe('from');
  });

  it('[상세필터] 버튼이 남아 있어도 드로어를 열지 않고 패널로 간다', async () => {
    const chips = mountInline('<select id="fund" aria-label="자펀드"><option value="">자펀드</option></select>');
    const btn = document.createElement('button'); btn.textContent = '상세필터';
    const click = vi.fn(); btn.addEventListener('click', click);
    chips.parentElement!.prepend(btn);
    expect(await jumpToFilterField(chips, '자펀드')).toBe(true);
    expect(active()?.id).toBe('fund');
    expect(click).not.toHaveBeenCalled();
  });

  it('패널 밖(같은 프레임의 다른 버튼)은 고르지 않는다', async () => {
    const chips = mountInline(null);
    chips.parentElement!.insertAdjacentHTML('afterbegin', '<button type="button" aria-label="자펀드">x</button>');
    expect(await jumpToFilterField(chips, '자펀드')).toBe(false);
  });
});
