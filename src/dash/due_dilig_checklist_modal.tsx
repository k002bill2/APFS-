/* 투자금실사보고서 체크리스트 조회 — 읽기전용 상세 팝업 (투자금 실사보고 그리드의 `실사일자` 링크로 진입).
   출처: docs/mockups/01_투자자산관리/S1_40_투자금실사보고.html `openChecklist(r)` (2026-09-16 파싱 실측)

   ── 왜 모델 파일이 없는가 ──
   팝업 8항목이 **전부 목록 컬럼에서 온다**(투자조합명·투자기업·투자일자·투자형태·실사일·보고서 파일명).
   `투자금액`·`실사회계법인` 2건만 원문이 리터럴 `-` 다. 팝업 전용 데이터가 0건이라
   `mgmt_fee_detail_model.ts` 같은 분리가 필요 없다 — 행을 그대로 그린다.

   ── 진입 조건이 값의 '형식'이다 ──
   원문 `dueCell` 은 `/^\d{4}-\d{2}-\d{2}$/` 를 통과한 실사일자만 버튼으로 만든다.
   `''`(미실사)·`'X'`(보고 대상 제외)는 평상 셀이다 → 스키마가 `detailPattern` 으로 그 형식을 싣고
   판정은 `schemas/detail_link.ts` 의 linksDetail 하나가 한다(원문 7행 중 3행만 링크).

   구성(목업 → 우리 규약): `.modal` → Radix Dialog · `dl.dl` → KvGrid(골드 복사) · 푸터 `닫기` 하나.
   원문의 `.doclink` 는 클릭 시 토스트만 띄우는 목업 링크라, 우리는 **다운로드 동작 없는 파일 칩**으로
   옮긴다 — 열리지 않는 링크를 만들면 죽은 버튼이 된다. */
import React from 'react';
import { UI } from './components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { glyphFor } from './ui/attachment';

const { Button } = UI;

const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };
const DD_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' };

/* 값 없음의 원문 표기는 빈칸이 아니라 `-` 다(원문 `dash()`). 스키마 sample 도 이미 `-` 로 정규화돼 있다. */
const isBlank = (v: string) => v === '' || v === '-';

type KvItem = { l: string; v: string; numeric?: boolean; node?: React.ReactNode };

/* 원문 `dl.dl` 8항목 — 라벨·순서 그대로. 투자금액·실사회계법인은 원문 리터럴 `-`(`dd.empty`). */
const buildItems = (r: Record<string, unknown>): KvItem[] => [
  { l: '투자조합명',   v: String(r.subFund ?? '') },
  { l: '투자기업',     v: String(r.investee ?? '') },
  { l: '투자일자',     v: String(r.investDate ?? ''), numeric: true },
  { l: '투자금액',     v: '' },
  { l: '투자형태',     v: String(r.investType ?? '') },
  { l: '실사일',       v: String(r.dueDiligDate ?? ''), numeric: true },
  { l: '실사회계법인', v: '' },
  { l: '체크리스트',   v: String(r.reportFile ?? ''), node: <DocCell file={String(r.reportFile ?? '')} /> },
];

/* 원문 `docCell` — 파일이 있으면 문서 아이콘 + 파일명, 없으면 `- (체크리스트 없음)`.
   아이콘·색은 확장자에서 파생(ui/attachment.tsx glyphFor SSOT) — PDF 칩을 따로 만들지 않는다. */
function DocCell({ file }: { file: string }) {
  if (isBlank(file)) return <span className="text-caption">- (체크리스트 없음)</span>;
  const { Icon, cls } = glyphFor(file);
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <Icon size={16} className={`${cls} shrink-0`} aria-hidden />
      <span className="min-w-0">{file}</span>
    </span>
  );
}

export function DueDiligChecklistModal({ row, onClose }: { row: Record<string, unknown>; onClose: () => void }) {
  const items = buildItems(row);
  const dlgRef = React.useRef<DialogHandle>(null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[720px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">투자금실사보고서 체크리스트 조회</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{String(row.investee ?? '')}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <dl className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
            {items.map((o) => (
              <div key={o.l} className="grid bg-card" style={KV_COLS}>
                <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>
                  {o.l}
                </dt>
                <dd className={`m-0 flex items-center min-w-0 ${isBlank(o.v) && !o.node ? 'text-caption' : ''}`} style={DD_STYLE}>
                  {o.node ? o.node : isBlank(o.v) ? '-' : o.numeric ? String(o.v) : o.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
