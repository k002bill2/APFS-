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
   · 세로 가운데: AG Grid 오버레이는 그리드 전체를 덮고 위쪽만 헤더 높이(테마값)만큼 비운다. 본문 아래의 고정행(합계
     pinned bottom)·가로 스크롤바 영역, 헤더 테두리 1px 은 빼지 않아 문구가 본문 가운데보다 아래로 처졌다
     (2026-09-29 사용자 지적 — 실물검증 결과 보고 미투자자산 거래 표 21px, 합계행 없는 목록 5px).
     개수×행높이 계산은 그리드별 rowHeight(generic_list 합계 44px 등)·스크롤바를 놓친다(Codex P2) →
     실제 본문 뷰포트(.ag-center-cols-viewport) 위치를 재서 위/아래 margin 으로 flex 가운데를 본문 기준으로 맞춘다.
     .apfs-grid-min 은 오버레이가 뜬 **뒤** CSS(:has)로 본문 높이가 바뀌므로 ResizeObserver 로 다시 잰다. */
import React, { useLayoutEffect, useRef, useState } from 'react';
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

/* 오버레이 콘텐츠 영역(래퍼 top+paddingTop ~ bottom)에서 본문 뷰포트(vpTop~vpBottom) 가운데에 오도록 줄 위/아래 margin.
   flex 가운데 정렬에서 자식 중심 = (영역top + mt + 영역bottom − mb)/2 → mt·mb 를 본문 밖 여분으로 두면 본문 중심이 된다. */
export function centerInsets(areaTop: number, areaBottom: number, vpTop: number, vpBottom: number): { top: number; bottom: number } {
  return { top: Math.max(0, Math.round(vpTop - areaTop)), bottom: Math.max(0, Math.round(areaBottom - vpBottom)) };
}

/* role=status — 오버레이가 뜰 때 SR 에 문구를 알린다(AG Grid 기본 오버레이의 ariaAnnounce 대체). */
export function GridEmptyOverlay(params: IOverlayParams) {
  const ref = useRef<HTMLDivElement>(null);
  const [inset, setInset] = useState({ top: 0, bottom: 0 });
  useLayoutEffect(() => {
    /* AG Grid 는 React 오버레이를 렌더한 **뒤** 그리드 DOM 에 붙인다 — 첫 effect 시점엔 closest() 가 null 일 수 있어
       붙을 때까지 프레임마다 다시 찾는다(최대 ~0.5s). */
    let ro: ResizeObserver | null = null;
    let raf = 0;
    let tries = 0;
    const attach = () => {
      const el = ref.current;
      const wrap = el?.closest('.ag-overlay-wrapper') as HTMLElement | null;
      const vp = el?.closest('.ag-root-wrapper')?.querySelector('.ag-center-cols-viewport') as HTMLElement | null;
      if (!wrap || !vp) { if (tries++ < 30) raf = requestAnimationFrame(attach); return; }
      const measure = () => {
        const w = wrap.getBoundingClientRect();
        const v = vp.getBoundingClientRect();
        const next = centerInsets(w.top + (parseFloat(getComputedStyle(wrap).paddingTop) || 0), w.bottom, v.top, v.bottom);
        setInset((cur) => (cur.top === next.top && cur.bottom === next.bottom ? cur : next));
      };
      measure();
      if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(vp); ro.observe(wrap); }
    };
    attach();
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, []);
  return (
    <div ref={ref} role="status" style={{ padding: '8px 16px', marginTop: inset.top, marginBottom: inset.bottom }}>
      <UI.EmptyState msg={emptyMessage(params)} height={120} />
    </div>
  );
}

export const emptyOverlaySelector: OverlaySelectorFunc = (params) =>
  params.overlayType === 'noRows' || params.overlayType === 'noMatchingRows' ? { component: GridEmptyOverlay } : undefined;
