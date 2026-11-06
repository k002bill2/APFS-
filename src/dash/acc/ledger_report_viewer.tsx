/* 장부조회 출력 미리보기 「리포트 뷰어」 — ACC-012·013·014 출력(인쇄) 장(slide 14·22) 공용.
   설계서 → 우리 규약
   - 뷰어 도구: SAVE · PRINT · 처음/이전/[페이지 번호]/전체/다음/마지막 · 배율(기본 100%) · INFO · ✕.
   - 양식 = A4 세로(794×1123px @96dpi). 본문은 화면이 `pages`(쪽마다 ReactNode)로 넘긴다 — 쪽 나누기는 화면 책임
     (`paginate` 헬퍼). 설계서 "다페이지 헤더 반복(확인 필요)" 은 화면이 쪽마다 표 머리를 다시 그리는 것으로 대응.
   - PRINT·⌘P = printArea(전 페이지 묶음) — 그리드 인쇄(printGrid)와 같은 경로(print_grid.ts: 경로 밖 숨김·폭 맞춤·라이트 테마).
     인쇄 영역 = 페이지 묶음만(도구 막대는 영역 밖). 배율은 영역의 **조상** transform 이라 인쇄 때 풀린다.
   - SAVE = 화면이 넘긴 onSave(데모: 같은 내용을 xlsx 로 저장 — 설계서 "파일 형식 확인 필요"). 없으면 버튼 비활성.
   ⚠ 설계서는 "새 창" — 프로젝트 팝업 규약(전체 화면 Dialog)으로 연다.

   사용:
     <LedgerReportViewer title="재무상태표" fileName="재무상태표_전체_2026-12-31"
       pages={paginate(rows, 34).map((chunk, i) => <MyPage key={i} rows={chunk} first={i === 0} />)}
       info={[['계정구분', '전체'], ['당기기준일', '2026-12-31']]} onSave={saveXlsx} onClose={() => setViewer(false)} /> */
import './ledger_report_viewer.css';
import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { UI } from '../components';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, type DialogHandle } from '../ui/dialog';
import { useHotkey, HOTKEYS } from '../use-hotkey';
import { printArea } from '../print_grid';

const { Button, IconBtn } = UI;

export const A4 = { width: 794, height: 1123 } as const;
const ZOOMS = [50, 75, 100, 125, 150] as const;

/** 쪽 나누기 — perPage 개씩. 빈 배열도 1쪽(머리만 있는 빈 양식) */
export function paginate<T>(items: readonly T[], perPage: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) out.push(items.slice(i, i + perPage));
  return out.length ? out : [[]];
}

export interface LedgerReportViewerProps {
  title: string;                         // 문서명(다이얼로그 제목 = `${title} 출력`)
  pages: ReactNode[];                    // 쪽마다 본문(A4 세로 한 장)
  fileName: string;                      // SAVE 파일명(확장자 제외) — 설계서: 문서명_계정구분명_기준일
  info?: readonly (readonly [string, string])[];   // INFO 문서 정보(조회조건 등)
  onSave?: (fileName: string) => void;
  onClose: () => void;
}

export function LedgerReportViewer({ title, pages, fileName, info = [], onSave, onClose }: LedgerReportViewerProps) {
  const dlgRef = useRef<DialogHandle>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState<number>(100);
  const [showInfo, setShowInfo] = useState(false);
  const total = Math.max(pages.length, 1);
  const go = (n: number) => { const p = Math.min(Math.max(n, 0), total - 1); setPage(p); setPageInput(String(p + 1)); };
  const print = () => { if (areaRef.current) void printArea(areaRef.current); };
  /* 뷰어가 열린 동안 ⌘P = 뷰어 PRINT(페이지 ⌘P 는 skipInDialog 로 비켜 준다) */
  useHotkey(HOTKEYS.print.combo, () => { if (areaRef.current) void printArea(areaRef.current); });
  const created = useMemo(() => new Date().toLocaleString('ko-KR'), []);
  const scale = zoom / 100;

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent hideClose className="w-[98vw] max-w-[1100px] h-[94vh] max-h-[94vh]">
        <DialogHeader className="px-[18px]" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <DialogTitle className="sr-only">{`${title} 출력`}</DialogTitle>
          <DialogDescription className="sr-only">A4 세로 출력 미리보기 — 인쇄·저장·페이지 이동</DialogDescription>
          <div role="toolbar" aria-label="리포트 뷰어 도구" className="flex flex-1 flex-wrap items-center gap-1.5 min-w-0">
            <Button variant="outline" size="sm" leadingIcon="download" onClick={() => onSave?.(fileName)} disabled={!onSave}>SAVE</Button>
            <Button variant="primary" size="sm" leadingIcon="printer" onClick={print}>PRINT</Button>
            <span aria-hidden className="mx-1 h-5 border-l border-border" />
            <Button variant="ghost" size="sm" onClick={() => go(0)} disabled={page === 0}>처음</Button>
            <IconBtn icon="chevron-left" label="이전 페이지" size={32} onClick={() => go(page - 1)} />
            <input aria-label="페이지 번호" inputMode="numeric" value={pageInput}
              onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') go(Number(pageInput || '1') - 1); }}
              onBlur={() => go(Number(pageInput || '1') - 1)}
              className="tabular-nums rounded-card-sm border border-border bg-card text-foreground"
              style={{ width: 44, height: 30, padding: '0 6px', fontSize: 13, fontFamily: 'inherit' }} />
            <span className="tabular-nums text-muted-foreground" style={{ fontSize: 13 }}>{`/ ${String(total)}`}</span>
            <IconBtn icon="chevron-right" label="다음 페이지" size={32} onClick={() => go(page + 1)} />
            <Button variant="ghost" size="sm" onClick={() => go(total - 1)} disabled={page === total - 1}>마지막</Button>
            <span aria-hidden className="mx-1 h-5 border-l border-border" />
            <select aria-label="배율" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
              className="rounded-card-sm border border-border bg-card text-foreground"
              style={{ height: 30, lineHeight: '20px', minHeight: 30, padding: '0 6px', fontSize: 13, fontFamily: 'inherit' }}>
              {ZOOMS.map((z) => <option key={z} value={z}>{`${String(z)}%`}</option>)}
            </select>
            <Button variant={showInfo ? 'secondary' : 'ghost'} size="sm" leadingIcon="info" onClick={() => setShowInfo((v) => !v)}>INFO</Button>
          </div>
          <IconBtn icon="x" label="닫기" size={34} onClick={() => dlgRef.current?.close()} />
        </DialogHeader>
        {showInfo && (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border px-[18px] py-2.5 text-muted-foreground" style={{ fontSize: 12.5, margin: 0 }}>
            {[['문서', title] as const, ['페이지', `${String(total)}쪽 · A4 세로`] as const, ['생성', created] as const, ...info].map(([k, v]) => (
              <div key={k} className="flex gap-1.5"><dt className="font-semibold" style={{ margin: 0 }}>{k}</dt><dd className="text-foreground" style={{ margin: 0 }}>{v}</dd></div>
            ))}
          </dl>
        )}
        <div className="flex-1 overflow-auto bg-muted" style={{ padding: 24 }}>
          {/* 크기 상자(배율 반영 폭·높이) > 배율 래퍼(transform — 인쇄 때 print_grid.css 가 푼다) > 인쇄 영역 */}
          <div style={{ width: A4.width * scale, minHeight: A4.height * scale, margin: '0 auto' }}>
            <div className="ledger-zoom" style={{ width: A4.width, transform: `scale(${String(scale)})`, transformOrigin: 'top left' }}>
              <div ref={areaRef} data-print-area="" style={{ display: 'contents' }}>
                {(pages.length ? pages : [null]).map((p, i) => (
                  <section key={i} className="ledger-report-page" data-current={i === page ? '' : undefined} aria-label={`${String(i + 1)}쪽`}>{p}</section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
