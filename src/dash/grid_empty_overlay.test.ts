import { describe, it, expect } from 'vitest';
import { emptyMessage, emptyOverlaySelector, pinnedInset } from './grid_empty_overlay';

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
  it('고정행(합계) 수만큼 행 높이 inset — 본문 영역 가운데 정렬, 0행이면 margin 없음', () => {
    expect(pinnedInset(0)).toBeUndefined();
    expect(pinnedInset(1)).toBe('calc(var(--ag-row-height) * 1)');
    expect(pinnedInset(2)).toBe('calc(var(--ag-row-height) * 2)');
  });
});
