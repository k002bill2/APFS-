/* 투자심의 상세 — 읽기전용 팝업 (출처: S1_01_투자심의관리.html의 행 셀 더블클릭 팝업 `openDetailPopup`)
   → APFS 디자인시스템으로 변형. 2026-10-08 사용자 요청으로 포함(명세 팝업 opt-in).

   구성(목업 → 우리 규약):
   - `.modal` 820px              → Radix `Dialog` `max-w-[880px] max-h-[88vh]`(골격은 `general_meeting_detail_modal.tsx`,
                                    헤더 블록은 `member_info_detail_modal.tsx` 판 — DialogDescription `m-0`)
   - 제목 `투자심의 상세 — <co>`  → 제목 "투자심의 상세" + 대상명(투자기업 `row.co`)을 나란히
   - `.dsec` + `.infogrid` ×3    → `Section` + `KvGrid`(한글 가로 라벨 150px — apfs-form-modal "읽기전용 명세(kv)" 규약).
                                    라벨·순서는 목업 `infoCell` 호출 순서 그대로(일반사항 9 · 투자기업일반 11 · 투자일반 8).
                                    목업의 2열 채움용 빈 `.cell`은 이식하지 않는다 — `withKvFill`이 홀수 칸을 메운다.
                                    목업 `num` 표시 항목(자본금·총투자금액·투자금액·전환지분율·취득단가)은 우측 tabular.
                                    투자유형·신주/구주는 목업 `splitInvType`(아래 이식)으로 `inv.type`을 분리.
   - 체크리스트 `table.filetab`  → 수제 표(파일명[PDF 배지]·수정일시·업로드 여부) + 구분(gb)별 그룹행.
                                    목업은 수정일시·업로드 여부를 가운데 정렬했으나 표 정렬 규약(2026-10-02 — 날짜·여부=좌측)으로 좌측.
                                    파일 없으면 "등록된 첨부파일이 없습니다."(목업 문구, UI.EmptyRow)
   - 드롭존 `#ck-dz`(끌어다 놓기 + 파일 선택) → 프로젝트 통일 파일존 `DocumentsField`(FilePond, trust_upload 선례 —
                                    자체 `<input type=file>` 드롭존을 만들지 않는다). 실제 업로드 없음 — 파일명만 로컬 표시.
                                    안내 "PDF, HWP, DOCX · 최대 20MB"는 목업 문구 그대로 캡션(describedBy).
   - 푸터 `닫기`                  → `닫기` 하나(목업 동일). 금액 단위 토글·엑셀은 목업에 없어 두지 않는다.
   목업의 스크림·포커스 트랩·scroll lock은 Radix Dialog가 소유하므로 이식하지 않는다.

   한계·가정(결정 기록)
   - 값은 `investment_review_data.ts`의 `detail`(원문 문자열 그대로). 빈 문자열·미존재 키는 '-'(muted).
     문자열 '0'(ir-2 자본금)은 값이다 — '-'로 바꾸지 않는다.
   - ⚠ 목업 내부 불일치: 2번 행(에스티리테일) 상세의 투자심의일자 2026-02-20·투자금납입예정일자 2026-02-27은
     목록 값(투심일자 2026-06-10·납입 예정일 2026-06-15)과 다르다. **출처 값을 그대로 둔다**
     (`custody_confirm_detail_modal.tsx` 선례 — 실데이터 연동 시 확인 항목). */
import React, { useCallback, useId } from 'react';
import { UI } from './components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { toast } from './ui/sonner';
import { DocumentsField } from './fields/DocumentsField';
import type { InvReviewRow, InvReviewDetail } from './investment_review_data';   // ⚠ type-only — 런타임 순환 방지
import { withKvFill } from './kv_fill';

const { Button } = UI;

/* ── 프리미티브(골드 복사 — 공유 export 아님) ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mt-0 mb-3">{title}</h3>
      {children}
    </section>
  );
}

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-left';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '7px 9px' };
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };

/* 목업 `splitInvType` 그대로 — '신주-우선주' → { iv:'우선주', ns:'신주' }, 그 외는 iv에 원문 */
function splitInvType(s: string): { iv: string; ns: string } {
  if (!s) return { iv: '', ns: '' };
  const m = s.split('-');
  if (m.length === 2 && (m[0] === '신주' || m[0] === '구주')) return { iv: m[1], ns: m[0] };
  return { iv: s, ns: '' };
}

/* kv 항목 — v 없음(''·undefined) = '-'(muted). num = 목업 `infoCell(..., true)` 수치(우측 tabular) */
type KvItem = { l: string; v?: string; num?: boolean };

const buildGen = (g: InvReviewDetail['gen']): KvItem[] => [
  { l: '투자심의일자', v: g.dt }, { l: '투자심의시간', v: g.time },
  { l: '투자심의장소', v: g.place }, { l: '자펀드', v: g.fund },
  { l: '심사담당자', v: g.mgr }, { l: '발굴담당자', v: g.src },
  { l: '플랫폼 assist 가입여부', v: g.assist }, { l: '발굴유형', v: g.srctype },
  { l: '투자금납입예정일자', v: g.pay },
];
const buildCo = (c: InvReviewDetail['co']): KvItem[] => [
  { l: '투자기업', v: c.name }, { l: '업종', v: c.biz },
  { l: '대표이사1', v: c.ceo1 }, { l: '대표이사1 생년월일', v: c.ceo1b },
  { l: '대표이사2', v: c.ceo2 }, { l: '대표이사2 생년월일', v: c.ceo2b },
  { l: '여성기업여부', v: c.female }, { l: '청년기업여부', v: c.youth },
  { l: '자본금', v: c.cap, num: true }, { l: '설립일자', v: c.setup },
  { l: '사업자번호', v: c.bizno },
];
const buildInv = (i: InvReviewDetail['inv']): KvItem[] => {
  const sp = splitInvType(i.type);
  return [
    { l: '총투자금액', v: i.total, num: true }, { l: '투자금액', v: i.amt, num: true },
    { l: '의무투자여부', v: i.ob }, { l: '일정규모이하 투자여부', v: i.sm },
    { l: '투자유형', v: sp.iv }, { l: '신주/구주', v: sp.ns },
    { l: '전환지분율', v: i.ratio, num: true }, { l: '취득단가', v: i.price, num: true },
  ];
};

function KvGrid({ items }: { items: KvItem[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {withKvFill(items, (o) => {
        const has = o.v != null && o.v !== '';
        return (
          <div key={o.l} className="grid bg-card" style={KV_COLS}>
            <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
            <dd className={`m-0 flex items-center min-w-0 ${o.num ? 'justify-end tabular font-semibold' : ''} ${has ? '' : 'text-caption'}`}
              style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
              {has ? o.v : '-'}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* PDF 배지 — 골드 `subfund_spec_modal.tsx` 첨부 칩 동형 */
function PdfBadge() {
  return <span className="font-extrabold shrink-0" style={{ padding: '1px 6px', borderRadius: 4, background: 'var(--danger)', color: 'var(--destructive-foreground)', fontSize: 10 }}>PDF</span>;
}

/* 체크리스트 첨부파일 — 구분(gb)이 바뀔 때마다 그룹행(목업 `tr.grp`). 그룹행은 `th scope=rowgroup`, 파일행은 data-file */
function FileTable({ list }: { list: InvReviewDetail['files'] }) {
  const body: React.ReactNode[] = [];
  let lastGb: string | null = null;
  list.forEach((f, i) => {
    if (f.gb !== lastGb) {
      body.push(
        <tr key={`grp-${f.gb}-${i}`} className="bg-muted">
          <th scope="rowgroup" colSpan={3} className={`${TD} text-left font-bold`} style={CELL}>{f.gb}</th>
        </tr>,
      );
      lastGb = f.gb;
    }
    body.push(
      <tr key={`f-${i}`} data-file="">
        <td className={TD} style={CELL}>
          <span className="flex items-center gap-2 min-w-0"><PdfBadge /><span style={{ overflowWrap: 'anywhere' }}>{f.name}</span></span>
        </td>
        <td className={`${TD} tabular`} style={CELL}>{f.mod}</td>
        <td className={TD} style={CELL}><UI.StatusBadge tone="success" label="O" size="md" /></td>
      </tr>,
    );
  });
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 640 }}>
        <caption className="sr-only">체크리스트 첨부파일 목록</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={CELL}>파일명</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 190 }}>수정일시</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 110 }}>업로드 여부</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0
            ? <UI.EmptyRow span={3} msg="등록된 첨부파일이 없습니다." className={TD} style={{ ...CELL, padding: '18px 9px' }} />
            : body}
        </tbody>
      </table>
    </div>
  );
}

/* 드롭존 — 통일 파일존(DocumentsField). 실제 업로드 없음: 추가·제거 시 토스트만(목업 '첨부파일 추가됨'/'첨부파일 제거됨') */
function ChecklistDrop() {
  const hintId = useId();
  const prev = React.useRef(0);
  const change = useCallback((csv: string) => {
    const n = csv.split(',').map((s) => s.trim()).filter(Boolean).length;
    if (n > prev.current) toast('첨부파일 추가됨');
    else if (n < prev.current) toast('첨부파일 제거됨');
    prev.current = n;
  }, []);
  return (
    <div className="mt-3.5">
      <DocumentsField value="" onChange={change} label="체크리스트 첨부파일" maxSize="20MB" describedBy={hintId} />
      <p id={hintId} className="m-0 mt-2 text-caption" style={{ fontSize: 12 }}>PDF, HWP, DOCX · 최대 20MB</p>
    </div>
  );
}

export function InvestmentReviewDetailModal({ row, onClose }: { row: InvReviewRow; onClose: () => void }) {
  const d = row.detail;
  const dlgRef = React.useRef<DialogHandle>(null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 묶는다 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">투자심의 상세</DialogTitle>
            {/* Radix Description은 <p> — preflight:false라 UA 기본 마진이 살아 있어 m-0을 명시한다 */}
            <DialogDescription className="m-0 text-caption truncate min-w-0">{row.co}</DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          {d ? <>
            <Section title="일반사항"><KvGrid items={buildGen(d.gen)} /></Section>
            <Section title="투자기업일반"><KvGrid items={buildCo(d.co)} /></Section>
            <Section title="투자일반"><KvGrid items={buildInv(d.inv)} /></Section>
            <Section title="체크리스트 관리 · 첨부파일">
              <FileTable list={d.files} />
              <ChecklistDrop />
            </Section>
          </> : <p className="m-0 text-caption">상세 정보가 없습니다.</p>}
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
