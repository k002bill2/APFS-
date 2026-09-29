import { describe, it, expect } from 'vitest';
import { emptyMessage, emptyOverlaySelector, centerInsets } from './grid_empty_overlay';

const api = (opts: Record<string, unknown>) => ({ getGridOption: (k: string) => opts[k] }) as any;

describe('grid_empty_overlay', () => {
  it('noRows: 템플릿 텍스트 우선(HTML 제거)', () => {
    expect(emptyMessage({ api: api({ overlayNoRowsTemplate: '<span style="padding:40px 0">조건에 맞는 자펀드가 없습니다.</span>' }), overlayType: 'noRows' })).toBe('조건에 맞는 자펀드가 없습니다.');
  });
  it('noMatchingRows: localeText 우선, 없으면 템플릿', () => {
    expect(emptyMessage({ api: api({ localeText: { noMatchingRows: 'A' }, overlayNoRowsTemplate: '<span>B</span>' }), overlayType: 'noMatchingRows' })).toBe('A');
    expect(emptyMessage({ api: api({ overlayNoRowsTemplate: '<span>B</span>' }), overlayType: 'noMatchingRows' })).toBe('B');
  });
  it('선언이 없으면 한글 기본 문구(영문 No Rows 누출 방지)', () => {
    expect(emptyMessage({ api: api({}), overlayType: 'noRows' })).toBe('표시할 데이터가 없습니다.');
    expect(emptyMessage({ api: api({}), overlayType: 'noMatchingRows' })).toBe('조건에 맞는 데이터가 없습니다.');
  });
  it('selector: noRows·noMatchingRows 만 가로채고 loading·exporting 은 기본', () => {
    expect(emptyOverlaySelector({ overlayType: 'noRows' } as any)?.component).toBeTruthy();
    expect(emptyOverlaySelector({ overlayType: 'noMatchingRows' } as any)?.component).toBeTruthy();
    expect(emptyOverlaySelector({ overlayType: 'loading' } as any)).toBeUndefined();
    expect(emptyOverlaySelector({ overlayType: 'exporting' } as any)).toBeUndefined();
  });
  it('centerInsets: 본문 뷰포트 밖 여분을 위/아래 margin 으로 — 합계행·스크롤바만큼 아래 여분', () => {
    // 오버레이 콘텐츠 영역 745~938, 본문 746~896 (헤더 테두리 1px 위 · 합계행 42px 아래)
    expect(centerInsets(745, 938, 746, 896)).toEqual({ top: 1, bottom: 42 });
    // 본문 = 영역이면 margin 0 (변화 없음)
    expect(centerInsets(100, 250, 100, 250)).toEqual({ top: 0, bottom: 0 });
    // 음수로 가지 않는다(본문이 영역보다 크게 잡혀도)
    expect(centerInsets(100, 250, 90, 260)).toEqual({ top: 0, bottom: 0 });
  });
});
