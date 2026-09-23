/* 일자별출자배분관리 — 읽기전용 상세 팝업 ((운용사)출자배분관리 그리드의 기준일자 링크로 진입).
   출처: S1_14__운용사_출자배분관리.html의 `openDetail(r)` 모달 → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - `.modal` 720px        → Radix `Dialog` `max-w-[720px] max-h-[88vh]`(골격은 골드 `general_meeting_detail_modal.tsx` 복사)
   - 기본정보 `dl.kv`      → `KvGrid`(한글 가로 라벨 150px — apfs-form-modal "읽기전용 명세(kv) 그리드" 규약)
   - 상세정보 `table.mini` → 수제 표(TH/TD/CELL 헬퍼 복사) + tfoot 합계
   - 첨부파일 `dl.kv`      → KvGrid 1항목 + 라벨 옆 ⚠검토필요 마커(목업 `data-rec`/`data-dat` 원문 그대로)
   - 푸터 `닫기` 하나      → 목업 동일(업로드 UI·저장·엑셀 없음)
   목업의 스크림·포커스 트랩·scroll lock은 Radix Dialog가 소유하므로 이식하지 않는다.

   한계·가정(결정 기록)
   - **금액 단위 토글 없음** — 목업 설계메모 [확인 필요]가 "토글을 다시 붙여야 하는지 확인 필요"로 미확정이라
     원문 상태(토글 없음)를 유지했다(apfs-spec-popup 규약 2는 토글이 있을 때의 규약).
   - **상세정보 표는 선택 행에서 파생**한다 — 목업은 1행 값이 고정 리터럴(785,000,000 / 합계 1,600,000,000 =
     목록 1행 값)이라 다른 행을 열어도 같은 숫자가 나오는데, 그건 명백한 오표시다. 우리는 선택 행의
     `payM`(조합원 납입금액·모태수탁 납입금액)·`pay`(합계)를 쓴다. 배분 행은 원문대로 0이 표시된다(값 창작 금지).
   - '농식품부 등록일'·'업로드 여부'는 원문에 값이 없어 `-`(임의 값 생성 안 함).
   ⚠검토필요 마커 1건 이식: 업로드 여부(목업 첨부파일 섹션). 설계 메모라 마스킹·엑셀 대상이 아니다. */
import React from 'react';
import { UI } from './components';
import { fmt } from './aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import type { GpContribRow } from './gp_contribution_manage';

const { Button } = UI;

/* ── 프리미티브(골드 `general_meeting_detail_modal.tsx` 복사 — 공유 export 아님) ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mt-0 mb-3">{title}</h3>
      {children}
    </section>
  );
}

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-center';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '7px 9px' };
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };

/* kv 항목 — `numeric`(날짜·금액)이면 mn(숫자 마스킹), 아니면 <MT>. 값 없음은 '-'(muted).
   `note`는 라벨(dt) 옆 ⚠마커 — 값(dd)이 아니라 라벨에만 붙인다(apfs-grid "검토필요 마커" 규약). */
type KvItem = { l: string; v: string; full?: boolean; numeric?: boolean; };

/* 기본정보 — 목업 kv 5항목 순서 그대로. '농식품부 등록일'은 원문 '-' */
const buildBasic = (r: GpContribRow): KvItem[] => [
  { l: '운용사', v: r.gp },
  { l: '자펀드', v: r.fn, full: true },
  { l: '납입일자', v: r.bd, numeric: true },
  { l: '농식품부 등록일', v: '' },
  { l: '납입금액', v: fmt(r.pay) + ' 원', numeric: true },
];

/* 첨부파일 — 목업은 업로드 UI를 제거하고(설계메모 2026-09-04) 읽기전용 '업로드 여부'만 남겼다 */
const FILE_ITEMS: KvItem[] = [{ l: '업로드 여부', v: '', full: true }];

function KvGrid({ items }: { items: KvItem[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map((o) => (
        <div key={o.l} className={`grid bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>
            {o.l}
          </dt>
          <dd className={`m-0 flex items-center min-w-0 ${o.v ? '' : 'text-caption'}`}
            style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
            {!o.v ? '-' : o.numeric ? String(o.v) : <>{o.v}</>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* 상세정보 — 조합원별 납입 상세(목업 `table.mini`). 값은 선택 행에서 파생(파일 상단 '한계').
   ⚠ No는 축(순번)이라 마스킹하지 않는다 — "축은 두고 데이터는 가린다". */
function DetailTable({ row }: { row: GpContribRow }) {
  const money = (v: number) => String(fmt(v));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 520 }}>
        <caption className="sr-only">조합원별 납입 상세 — No·조합원·납입금액·모태수탁 납입금액·비고</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={{ ...CELL, width: 56 }}>No</th>
            <th scope="col" className={TH} style={CELL}>조합원</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 140 }}>납입금액</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 160 }}>모태수탁 납입금액</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 96 }}>비고</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${TD} text-center tabular`} style={CELL}>1</td>
            <td className={TD} style={CELL}><>농식품모태펀드</></td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(row.payM)}</td>
            <td className={`${TD} text-right tabular`} style={CELL}>{money(row.payM)}</td>
            <td className={`${TD} text-caption`} style={CELL}>-</td>
          </tr>
        </tbody>
        {/* 합계행 — 목업 tfoot(합계=납입총액, 모태수탁·비고는 '-'). 톤은 그리드 합계행과 같은 muted + 굵은 윗선 */}
        <tfoot>
          <tr className="bg-muted font-bold">
            <td className={`${TD} text-center`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }} colSpan={2}>합계</td>
            <td className={`${TD} text-right tabular`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>{money(row.pay)}</td>
            <td className={`${TD} text-center text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
            <td className={`${TD} text-caption font-normal`} style={{ ...CELL, borderTop: '2px solid var(--border-strong)' }}>-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function GpContributionDetailModal({ row, onClose }: { row: GpContribRow; onClose: () => void }) {
  const dlgRef = React.useRef<DialogHandle>(null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[720px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 묶는다 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">일자별출자배분관리</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{row.fn} · {String(row.bd)}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Section title="기본정보"><KvGrid items={buildBasic(row)} /></Section>
          <Section title="상세정보"><DetailTable row={row} /></Section>
          <Section title="첨부파일"><KvGrid items={FILE_ITEMS} /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
