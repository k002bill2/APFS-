/* AG Grid 빈 상태 오버레이 — 전 그리드 기본(2026-09-29 사용자 지시 "리스트에 데이터 없을 때 empty 표시를 기본으로 모두 적용").
   aggrid_theme.ts 가 provideGlobalGridOptions 의 overlayComponentSelector 로 전역 등록한다 → 그리드마다 배선 불필요.

   · 적용 대상: noRows(rowData 자체가 빔) + noMatchingRows(필터로 0행 — v35 는 별도 오버레이라 기본 영문 "No Matching Rows" 가 뜨던 경로).
     loading·exporting 은 selector 가 undefined 를 돌려 AG Grid 기본을 그대로 쓴다.
   · 표시 = UI.EmptyState(아이콘 + 문구) — 대시보드 카드의 빈 상태와 같은 모양.
   · 문구는 그리드별 기존 선언을 그대로 읽는다(44곳 파일 수정 없이 보존):
       noRows         → overlayNoRowsTemplate 의 텍스트 → localeText.noRowsToShow → 기본 문구
       noMatchingRows → localeText.noMatchingRows → overlayNoRowsTemplate 의 텍스트 → 기본 문구
     ⚠ 전역 selector 가 있으면 AG Grid 기본 NoRows 컴포넌트가 안 쓰이므로 overlayNoRowsTemplate 의 HTML/스타일은 무시되고 텍스트만 쓴다.
   · 높이: .apfs-grid-min(본문 최소 42px) 그리드는 오버레이가 뜬 동안만 150px 로 되돌린다(aggrid_shared.css).
   · 세로 가운데: AG Grid 오버레이는 그리드 전체를 덮고 위쪽만 헤더 높이만큼 비운다 — 고정행(합계 pinned bottom/top)은
     빼지 않아 문구가 본문보다 행 높이의 절반만큼 아래로 처졌다(2026-09-29 사용자 지적, 실물검증 결과 보고 미투자자산 거래 표).
     고정행 수 × --ag-row-height 만큼 위/아래 margin 을 줘서 flex 가운데 정렬이 본문 영역 기준이 되게 한다. */
import React from 'react';
import type { IOverlayParams, OverlaySelectorFunc } from 'ag-grid-community';
import { UI } from './components';

const DEFAULT_NO_ROWS = '표시할 데이터가 없습니다.';
const DEFAULT_NO_MATCH = '조건에 맞는 데이터가 없습니다.';

/* overlayNoRowsTemplate('<span style=…>문구</span>') → '문구' */
function templateText(tpl: unknown): string | undefined {
  if (typeof tpl !== 'string') return undefined;
  const t = tpl.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return t || undefined;
}

export function emptyMessage(params: Pick<IOverlayParams, 'api' | 'overlayType'>): string {
  const locale = (params.api.getGridOption('localeText') || {}) as Record<string, string | undefined>;
  const tpl = templateText(params.api.getGridOption('overlayNoRowsTemplate'));
  return params.overlayType === 'noMatchingRows'
    ? locale.noMatchingRows || tpl || DEFAULT_NO_MATCH
    : tpl || locale.noRowsToShow || DEFAULT_NO_ROWS;
}

/* role=status — 오버레이가 뜰 때 SR 에 문구를 알린다(AG Grid 기본 오버레이의 ariaAnnounce 대체). */
/* 고정행 n 개 높이 — 테마 행 높이 변수(apfsTheme rowHeight)를 그대로 쓴다. 0 이면 margin 없음 */
export const pinnedInset = (n: number): string | undefined => (n > 0 ? `calc(var(--ag-row-height) * ${n})` : undefined);

export function GridEmptyOverlay(params: IOverlayParams) {
  const top = pinnedInset(params.api.getPinnedTopRowCount());
  const bottom = pinnedInset(params.api.getPinnedBottomRowCount());
  return (
    <div role="status" style={{ padding: '8px 16px', marginTop: top, marginBottom: bottom }}>
      <UI.EmptyState msg={emptyMessage(params)} height={120} />
    </div>
  );
}

export const emptyOverlaySelector: OverlaySelectorFunc = (params) =>
  params.overlayType === 'noRows' || params.overlayType === 'noMatchingRows' ? { component: GridEmptyOverlay } : undefined;
