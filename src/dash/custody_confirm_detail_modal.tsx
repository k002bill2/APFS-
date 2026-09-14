/* 자펀드수탁관리(확정) 상세 — 읽기전용 팝업 (출처: S1_27_자펀드수탁관리_확정_.html의 `detailHTML`)
   → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - modal-head(제목 + ctx 한 줄)  → `DialogHeader` 제목 + 부제(운용사 · 자펀드 · 기준일자) + ⚠검토필요 마커 1건
   - 섹션1 투자자산                → 2단 헤더 수제 표(운용사 5 · 수탁기관 3 · 일치여부 2 = 10열) + tfoot 합계
   - 섹션2 미투자자산 거래         → 2단 헤더 수제 표(3·3·2 = 8열), 본문은 목업 그대로 "조회된 내역이 없습니다."
   - 섹션3 미투자자산              → 2단 헤더 수제 표(2·2·1 = 5열) + tfoot 합계
   - modal-foot                    → 푸터 `닫기` 하나(목업 동일)

   한계·가정:
   - ⚠ 목업 상세는 **원 구조도(엑셀) 상세 예시 1건 고정**이다 — 목록 24행 각각의 실제 대사 내역이 아니다.
     이 사실은 헤더의 ⚠검토필요 마커(목업 `data-rec`/`data-dat` 원문 그대로)가 화면에 싣는다.
   - ⚠ 목업 tfoot 합계(투자자산 보유주수 96,783 · 미투자자산 잔액 132,681,103)는 본문 행 값(7,142 · 1)과
     맞지 않는다. **출처 값을 그대로 둔다**(apfs-spec-popup 규약 7 — 실데이터 연동 시 계산식 확인 항목).
   - 금액 단위 토글 없음: 목업에 단위 선택이 없고 수치가 전부 원 단위 단일이다(apfs-spec-popup 규약 2는 단위가
     여럿일 때의 규약). 엑셀도 두지 않는다 — 목업 푸터도 닫기 하나다(골드 `general_meeting_detail_modal` 동일 결정).

   골격·크롬(Dialog · `px-[46px]` 인셋 정렬 · Section · TH/TD/CELL 표 헬퍼)은 골드
   `general_meeting_detail_modal.tsx` 복사 관례. ⚠검토필요 마커 1건 이식. */
import React from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { fmt } from './aggrid_theme';   // 숫자 표기 SSOT(정수=콤마) — 자체 포매터 재구현 금지
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { ReviewMarker } from './review_marker';
import type { ReviewNote } from './review_marker';
import type { CustodyConfirmRow } from './custody_confirm_manage';

const { Button, StatusBadge } = UI;

/* ⚠검토필요 메모 — 목업 `S1_27_자펀드수탁관리_확정_.html`의 `data-rec`/`data-dat` 원문 그대로(전수 1건).
   설계 메모라 마스킹·엑셀 대상이 아니다. */
const DETAIL_NOTE: ReviewNote = {
  rec: '선택 자펀드별 대사 상세(투자기업·보유주수·원금·감액금액 등)',
  dat: '화면 캡처엔 요약 그리드까지만 있고 상세 팝업 데이터는 없음 — 아래 3개 섹션은 원 구조도(엑셀) 상세 예시 1건을 그대로 표시, 이 자펀드 고유 값 아님',
};

/* ── 프리미티브(골드 복사 — 공유 export 아님) ── */
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
/* 목업 `.grpline` — 운용사/수탁기관/일치여부 묶음 경계선. 축(구조)이라 상시 표시, 색은 토큰 */
const GRP: React.CSSProperties = { borderLeft: '2px solid var(--border-strong)' };
/* 목업 `tfoot td{font-weight:800;background:surface-3;border-top:2px solid ink}` → 합계행 공용 표기(aggrid_shared 동형) */
const FOOT: React.CSSProperties = { ...CELL, borderTop: '2px solid var(--border-strong)' };

/* 일치여부 표식 — 목업 `<span class="tag g">일치</span>`. 상태 배지라 비마스킹("축은 두고 데이터는 가린다") */
function MatchTag({ label }: { label: string }) {
  return <StatusBadge tone="success" label={label} size="md" dot={false} />;
}

/* ── 섹션 데이터 — 목업 `detailHTML` 표 값 그대로(원 단위) ──────────────────────
   ⚠ 목업이 상세 예시 1건만 담고 있어 행 배열도 1건이다(없는 값을 만들지 않는다). */
const INV_ROWS = [{
  gpName: '(주)요즘주방', gpShares: 7142, principal: 499940000, reduce: 499939000, gpBal: 1000,
  tsName: '(주)지에프케이 우선주', tsShares: 7142, tsBal: 1000, mShares: '일치', mBal: '일치',
}];
/* 목업 tfoot: 합계 / 96,783 / '-'(colSpan 8). 행 합(7,142)과 다르지만 출처 값 그대로 */
const INV_TOTAL_SHARES = 96783;

const NI_ROWS = [{
  gpAcct: '00211252481(신한금융투자)', gpBal: 1,
  tsAcct: '00211252481(신한금투 AJ-ISU경기도애그리푸드투자조합)', tsBal: 1, mBal: '일치',
}];
/* 목업 tfoot: 합계 / 132,681,103 / '-'(colSpan 3). 행 합(1)과 다르지만 출처 값 그대로 */
const NI_TOTAL_BAL = 132681103;

/* ① 투자자산 — 운용사[투자기업·보유주수·원금(A)·감액금액(B)·잔액(A-B)] · 수탁기관[투자기업·보유주수·잔액] · 일치여부[보유주수·잔액] */
function InvestTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 920 }}>
        <caption className="sr-only">투자자산 대사 — 운용사·수탁기관 보유내역 비교</caption>
        <thead>
          <tr>
            <th scope="colgroup" colSpan={5} className={TH} style={CELL}>운용사</th>
            <th scope="colgroup" colSpan={3} className={TH} style={{ ...CELL, ...GRP }}>수탁기관</th>
            <th scope="colgroup" colSpan={2} className={TH} style={{ ...CELL, ...GRP }}>일치여부</th>
          </tr>
          <tr>
            <th scope="col" className={TH} style={CELL}>투자기업</th>
            <th scope="col" className={TH} style={CELL}>보유주수</th>
            <th scope="col" className={TH} style={CELL}>원금(A)</th>
            <th scope="col" className={TH} style={CELL}>감액금액(B)</th>
            <th scope="col" className={TH} style={CELL}>잔액(A-B)</th>
            <th scope="col" className={TH} style={{ ...CELL, ...GRP }}>투자기업</th>
            <th scope="col" className={TH} style={CELL}>보유주수</th>
            <th scope="col" className={TH} style={CELL}>잔액</th>
            <th scope="col" className={TH} style={{ ...CELL, ...GRP }}>보유주수</th>
            <th scope="col" className={TH} style={CELL}>잔액</th>
          </tr>
        </thead>
        <tbody>
          {INV_ROWS.map((r) => (
            <tr key={r.gpName}>
              <td className={TD} style={CELL}><MT>{r.gpName}</MT></td>
              <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(r.gpShares))}</td>
              <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(r.principal))}</td>
              <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(r.reduce))}</td>
              <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(r.gpBal))}</td>
              <td className={TD} style={{ ...CELL, ...GRP }}><MT>{r.tsName}</MT></td>
              <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(r.tsShares))}</td>
              <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(r.tsBal))}</td>
              <td className={`${TD} text-center`} style={{ ...CELL, ...GRP }}><MatchTag label={r.mShares} /></td>
              <td className={`${TD} text-center`} style={CELL}><MatchTag label={r.mBal} /></td>
            </tr>
          ))}
        </tbody>
        {/* 합계 — 목업 tfoot 그대로(라벨·'-'는 축이라 비마스킹) */}
        <tfoot>
          <tr className="bg-muted font-bold">
            <td className={TD} style={FOOT}>합계</td>
            <td className={`${TD} text-right tabular`} style={FOOT}>{mn(fmt(INV_TOTAL_SHARES))}</td>
            <td className={`${TD} text-center`} colSpan={8} style={FOOT}>-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ② 미투자자산 거래 — 운용사[종목·보유주수·잔액] · 수탁기관[종목·보유주수·잔액] · 일치여부[보유주수·잔액].
   목업 본문은 빈 상태 한 줄뿐이다(행 데이터 없음 — 만들어 넣지 않는다). */
function NonInvestTradeTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 820 }}>
        <caption className="sr-only">미투자자산 거래 대사 — 운용사·수탁기관 비교</caption>
        <thead>
          <tr>
            <th scope="colgroup" colSpan={3} className={TH} style={CELL}>운용사</th>
            <th scope="colgroup" colSpan={3} className={TH} style={{ ...CELL, ...GRP }}>수탁기관</th>
            <th scope="colgroup" colSpan={2} className={TH} style={{ ...CELL, ...GRP }}>일치여부</th>
          </tr>
          <tr>
            <th scope="col" className={TH} style={CELL}>종목</th>
            <th scope="col" className={TH} style={CELL}>보유주수</th>
            <th scope="col" className={TH} style={CELL}>잔액</th>
            <th scope="col" className={TH} style={{ ...CELL, ...GRP }}>종목</th>
            <th scope="col" className={TH} style={CELL}>보유주수</th>
            <th scope="col" className={TH} style={CELL}>잔액</th>
            <th scope="col" className={TH} style={{ ...CELL, ...GRP }}>보유주수</th>
            <th scope="col" className={TH} style={CELL}>잔액</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`${TD} text-center text-caption`} colSpan={8} style={{ ...CELL, padding: '18px 9px' }}>조회된 내역이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ③ 미투자자산 — 운용사[계좌번호·잔액] · 수탁기관[계좌번호·잔액] · 일치여부[잔액] */
function NonInvestTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 820 }}>
        <caption className="sr-only">미투자자산(예치금) 대사 — 운용사·수탁기관 계좌 비교</caption>
        <thead>
          <tr>
            <th scope="colgroup" colSpan={2} className={TH} style={CELL}>운용사</th>
            <th scope="colgroup" colSpan={2} className={TH} style={{ ...CELL, ...GRP }}>수탁기관</th>
            <th scope="colgroup" colSpan={1} className={TH} style={{ ...CELL, ...GRP }}>일치여부</th>
          </tr>
          <tr>
            <th scope="col" className={TH} style={CELL}>계좌번호</th>
            <th scope="col" className={TH} style={CELL}>잔액</th>
            <th scope="col" className={TH} style={{ ...CELL, ...GRP }}>계좌번호</th>
            <th scope="col" className={TH} style={CELL}>잔액</th>
            <th scope="col" className={TH} style={{ ...CELL, ...GRP }}>잔액</th>
          </tr>
        </thead>
        <tbody>
          {NI_ROWS.map((r) => (
            <tr key={r.gpAcct}>
              <td className={TD} style={{ ...CELL, overflowWrap: 'anywhere' }}><MT>{r.gpAcct}</MT></td>
              <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(r.gpBal))}</td>
              <td className={TD} style={{ ...CELL, ...GRP, overflowWrap: 'anywhere' }}><MT>{r.tsAcct}</MT></td>
              <td className={`${TD} text-right tabular`} style={CELL}>{mn(fmt(r.tsBal))}</td>
              <td className={`${TD} text-center`} style={{ ...CELL, ...GRP }}><MatchTag label={r.mBal} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-muted font-bold">
            <td className={TD} style={FOOT}>합계</td>
            <td className={`${TD} text-right tabular`} style={FOOT}>{mn(fmt(NI_TOTAL_BAL))}</td>
            <td className={`${TD} text-center`} colSpan={3} style={FOOT}>-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function CustodyConfirmDetailModal({ row, baseDate, onClose }: { row: CustodyConfirmRow; baseDate: string; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1000px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+부제는 한 래퍼로 묶는다 — DialogHeader가 justify-between이라 안 묶으면 부제가 우측 끝으로 밀린다.
              ⚠ 마커는 부제 **바깥**(형제)에 둔다: 부제는 truncate(overflow:hidden)라 안에 넣으면 잘리고,
                 Radix aria-describedby 대상이라 설명 문구에 메모가 섞인다. */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">자펀드수탁관리(확정) 상세</DialogTitle>
            {/* Radix Description은 <p> — preflight:false라 UA 기본 마진이 살아 있어 m-0을 명시한다(공용 dialog.tsx는 불변) */}
            <DialogDescription className="m-0 text-caption truncate min-w-0">
              <MT>{row.gp}</MT> · <MT>{row.fn}</MT> · 기준일자 {mn(baseDate)}
            </DialogDescription>
            <span className="shrink-0 inline-flex"><ReviewMarker {...DETAIL_NOTE} label="대사 상세" /></span>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Section title="투자자산"><InvestTable /></Section>
          <Section title="미투자자산 거래"><NonInvestTradeTable /></Section>
          <Section title="미투자자산"><NonInvestTable /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
