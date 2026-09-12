/* 조합 운용현황 수시보고서 — 읽기전용 보고서 원문 팝업 (출처: S1_04_수시보고.html의 제목 클릭 팝업, 원 S1_05 화면)
   구성: ① 보고 메타(상황발생·운용사·자펀드·투자기업) ② 가. 수시보고사항 체크리스트(4대 구분 23항목)
        ③ 나. 수시보고사항 요약(제목·내용) ④ 서명부(작성일자·대표펀드매니저·준법감시인)
        ⑤ 첨부파일 표 ⑥ 푸터: 닫기
   골격·크롬(Dialog · px-[46px] 정렬 · Section 헬퍼)은 `subfund_spec_modal.tsx`(골드) 복사 관례.

   금액 항목이 없으므로 **단위 토글은 두지 않는다**(apfs-spec-popup 규약 2는 금액이 있을 때의 규약).
   엑셀도 두지 않는다 — 렌더 소스가 5개(메타·체크리스트·요약·서명부·첨부)라 "화면=엑셀 불변식"
   (규약 6)을 지키기 어렵고, 목업 푸터도 닫기 하나다.

   ⚠ 한계(목업 원문 주석 그대로): 보고서 실데이터가 1건(마그나인베스트먼트(주)/마그나 GREEN 펀드/쿠엔즈버킷)뿐이라
      어느 행의 보고서를 열어도 같은 내용이 표시된다. 실데이터 연동 시 `row`로 조회하도록 바꾼다. */
import React from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';

const { Button, StatusBadge } = UI;

/* ── 출처 데이터(S1_04 원문) ── */
const RPT_TITLE = '쿠엔즈버킷 조건부 합의서 및 주주간계약 체결 보고';
const RPT_META: [string, string, boolean][] = [   // [라벨, 값, 날짜여부]
  ['상황발생', '2026-08-03', true],
  ['운용사', '마그나인베스트먼트(주)', false],
  ['자펀드', '마그나 GREEN 펀드', false],
  ['투자기업', '(주)쿠엔즈버킷', false],
];
const RPT_SIGN: [string, string, boolean][] = [
  ['작성일자', '2026-08-13', true],
  ['대표펀드매니저', '송진호', false],
  ['준법감시인', '정유숙', false],
];
const RPT_BODY = `마그나 GREEN 펀드 기투자기업인 쿠엔즈버킷 20260730 진행된 수시보고 후속 보고의 건 입니다.

1.투자내역
2021.12.23, 상환전환우선주 신주 1,000,145,360원 투자 (2024.12.31, 전액상환)

2.보고사유
경영권 목적 지분변경 및 유상증자를 통한 신규 최대주주 유치 관련하여 조건부 합의서 및 주주간계약서를 체결함.

3.계약 체결일: 2026.08.03

4.주요 내용
가) 기존조합의 경영권 목적 지분매각계획과 관련하여, 지분양수에 관한 조건부 합의서와 주주간계약서를 체결함.
거래에 따라 기존 대주주 보유주식의 50%(MHD)이 약 2.5%의 유효기존의 상환우선주주에 참여하여 최대주주가 될 예정임.
향후 대주주 변경 및 유상증자가 완료 시 결과보고를 추가로 진행할 예정임.`;

const RPT_FILES: { name: string; at: string }[] = [
  { name: '쿠엔즈버킷_조건부 합의서_20260803.pdf_(NEW)', at: '2026-08-11 오전 10:23:51' },
  { name: '쿠엔즈버킷_주주간계약서_20260803.pdf_(NEW)', at: '2026-08-11 오전 10:23:51' },
];

/* 체크리스트 — 중첩 배열이 SSOT. rowSpan은 렌더 시 항목 수에서 파생한다(수기 rowspan 관리 금지) */
type ChkSub = { g2: string; items: { t: string; y?: boolean }[] };
type ChkGroup = { g1: string; subs: ChkSub[] };
const CHECKLIST: ChkGroup[] = [
  { g1: '운용사관련', subs: [
    { g2: '경영진', items: [
      { t: '운용사 대주주 또는 경영진 변동 (대표이사 변경 등)' },
      { t: '경영진, 대주주에 대한 제재, 피소 및 법령 판결 결과' },
      { t: '대주주에 대한 감사위원 비위행위관련(횡령, 부적절 언행 등) 발생' },
    ] },
    { g2: '운용사', items: [
      { t: '운용사에 대한 제재, 피소 및 법령 판결 결과' },
      { t: '펀드 준법감시인 변경' },
      { t: '본건 펀드 관련 규약, 법규 위반 사항 발생' },
      { t: '재무상황변경(증자, 감자, 부도, 파산, 회사청산, 개시결정 등)' },
      { t: '감사위원 비위행위관련(횡령, 부적절 언행 등) 발생' },
      { t: '신규펀드 및 추가결성 설립' },
    ] },
  ] },
  { g1: '조합운영관련', subs: [
    { g2: '운용 인력', items: [
      { t: '대표펀드매니저에 대한 제재, 피소 및 법령 판결 결과' },
      { t: '대표펀드매니저, 핵심운용인력 타조합 참여 여부 결과사유 발생' },
      { t: '운용인력의 회사 등 변경' },
    ] },
    { g2: '조합원', items: [
      { t: '출자금 직접납입일 위반, 불응 발생' },
      { t: '관리보수 환입 이슈 발생' },
    ] },
    { g2: '투자집행', items: [
      { t: '조합간 또는 조합원간 이해상충** 발생 가능성이 있을 경우' },
    ] },
  ] },
  { g1: '투자기업관련', subs: [
    { g2: '법적분쟁', items: [{ t: '조합 또는 제3자와의 법적분쟁' }] },
    { g2: '계약', items: [
      { t: '투자조건 변경', y: true },
      { t: '투자계약위반 (투자금 사용용도 변경 등)' },
    ] },
    { g2: '기업일반', items: [
      { t: '합병, 분할, 영업양수도(매각), 결과 등' },
      { t: '상장, 상장폐지, 관리종목지정 등' },
      { t: '재무상황 변경(감자, 감액, 파산 등)' },
      { t: '투자금 회수 관련 보고(이자 수령 및 부분 회수 제외)' },
    ] },
  ] },
  { g1: '기타', subs: [
    { g2: '기타', items: [{ t: '상기 사항 이외의 펀드 규약 등에 보고사항으로 명시된 사항 발생' }] },
  ] },
];
const groupRows = (g: ChkGroup) => g.subs.reduce((a, s) => a + s.items.length, 0);

/* ── 프리미티브(골드 복사) ── */
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

/* 라벨 : 값 메타 행 — 보고서 원문의 머리글/서명부 공통 */
function MetaList({ items }: { items: [string, string, boolean][] }) {
  return (
    <dl className="m-0 grid gap-y-1.5" style={{ gridTemplateColumns: 'max-content max-content minmax(0,1fr)', columnGap: 8, fontSize: 14 }}>
      {items.map(([k, v, isDate]) => (
        <React.Fragment key={k}>
          <dt className="m-0 font-bold text-muted-foreground" style={{ minWidth: 92 }}>{k}</dt>
          <dd className="m-0 text-caption">:</dd>
          <dd className="m-0 min-w-0" style={{ overflowWrap: 'anywhere' }}>{isDate ? mn(v) : <MT>{v}</MT>}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

// 서명란: 박스 없이 한 줄(우측 정렬). 좁은 폭에서만 줄바꿈 — dl>div 그룹은 HTML 스펙 허용
function MetaInline({ items }: { items: [string, string, boolean][] }) {
  return (
    <dl className="m-0 mb-5 flex flex-wrap justify-end gap-x-5 gap-y-1" style={{ fontSize: 14 }}>
      {items.map(([k, v, isDate]) => (
        <div key={k} className="flex items-baseline gap-1.5">
          <dt className="m-0 font-bold text-muted-foreground">{k}</dt>
          <dd className="m-0 text-caption">:</dd>
          <dd className="m-0">{isDate ? mn(v) : <MT>{v}</MT>}</dd>
        </div>
      ))}
    </dl>
  );
}

function CheckTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 720 }}>
        <caption className="sr-only">수시보고사항 체크리스트 — 구분·항목·내용·Check</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={{ ...CELL, width: 120 }}>구분</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 110 }}>항목</th>
            <th scope="col" className={TH} style={CELL}>내용</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 72 }}>Check</th>
          </tr>
        </thead>
        <tbody>
          {CHECKLIST.map((g) => g.subs.map((s, si) => s.items.map((it, ii) => (
            <tr key={`${g.g1}-${s.g2}-${it.t}`}>
              {si === 0 && ii === 0 && (
                <th scope="rowgroup" rowSpan={groupRows(g)} className={`${TD} bg-[color:var(--grid-header)] font-bold text-center align-middle`} style={CELL}>{g.g1}</th>
              )}
              {ii === 0 && (
                <th scope="rowgroup" rowSpan={s.items.length} className={`${TD} bg-[color:var(--grid-header)] font-bold text-center align-middle`} style={CELL}>{s.g2}</th>
              )}
              <td className={TD} style={CELL}>{it.t}</td>
              <td className={`${TD} text-center`} style={CELL}>
                <StatusBadge tone={it.y ? 'primary' : 'info'} label={it.y ? 'Y' : 'N'} size="sm" dot={false} />
              </td>
            </tr>
          ))))}
        </tbody>
      </table>
    </div>
  );
}

function SummaryTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 14, minWidth: 520 }}>
        <caption className="sr-only">수시보고사항 요약 — 제목 및 내용</caption>
        <tbody>
          <tr>
            <th scope="row" className={`${TD} bg-[color:var(--grid-header)] font-bold text-center align-middle`} style={{ ...CELL, width: 92 }}>제목</th>
            <td className={TD} style={CELL}><MT>{RPT_TITLE}</MT></td>
          </tr>
          <tr>
            <th scope="row" className={`${TD} bg-[color:var(--grid-header)] font-bold text-center align-middle`} style={CELL}>내용</th>
            <td className={TD} style={{ ...CELL, whiteSpace: 'pre-wrap', lineHeight: 1.85 }}><MT>{RPT_BODY}</MT></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function FileTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 620 }}>
        <caption className="sr-only">첨부파일 목록 — 첨부파일명·수정일시·업로드 여부</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={CELL}>첨부파일</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 200 }}>수정일시</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 120 }}>업로드 여부</th>
          </tr>
        </thead>
        <tbody>
          {RPT_FILES.map((f) => (
            <tr key={f.name}>
              <td className={TD} style={CELL}><MT>{f.name}</MT></td>
              <td className={`${TD} text-center tabular`} style={CELL}>{mn(f.at)}</td>
              <td className={`${TD} text-center`} style={CELL}>O</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OccasionalReportModal({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 묶는다 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">조합 운용현황 수시보고서</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{RPT_TITLE}</MT></DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <div className="border border-border bg-muted mb-5" style={{ borderRadius: 8, padding: '14px 16px' }}>
            <MetaList items={RPT_META} />
          </div>
          <Section title="가. 수시보고사항"><CheckTable /></Section>
          <Section title="나. 수시보고사항에 대한 요약"><SummaryTable /></Section>
          <MetaInline items={RPT_SIGN} />
          <Section title="첨부파일"><FileTable /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
