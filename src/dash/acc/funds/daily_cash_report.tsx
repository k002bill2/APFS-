/* 자금일보 출력 양식(A4 세로 한 장) — ACC-021 slide 13. LedgerReportViewer 의 pages 로 넘긴다(E03 인쇄 · 상신 PDF 와 같은 내용).
   구성: 제목 '자 금 일 보' / '일 일 자 금 시 재 표' · 결재란(담당·팀장·부장·본부장) · '기준일자 … · 작성 자금관리팀 홍길동' · '단위 : 원'
        → 계정구분별 '<계정구분> 일일 자금시재표'(설계서의 섹션 순번 1·2·3 포함 — 출력 문서 목차 번호) + 소계 + 총 예금잔액(마감시재 칸)
        → 맨 아래 '농식품모태펀드 미출자자산 합계 N 원'(계정구분 전체 조회일 때만).
   표 정렬: 금액·이율 우측, 나머지 좌측. 스타일은 ledger_report_viewer.css(.ledger-report-page table) 를 따른다. */
import type { CSSProperties } from 'react';
import { DRAFTER } from './daily_cash_data';
import { TOTAL_TITLE } from './daily_cash_model';
import type { CashRow, DailyCashReport } from './daily_cash_model';

const won = (n: number): string => n.toLocaleString('ko-KR');
const rate = (n: number): string => n.toFixed(2);
const left: CSSProperties = { textAlign: 'left' };
const num: CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const tableStyle: CSSProperties = { fontSize: 10, marginBottom: 6 };
const SIGNERS = ['담당', '팀장', '부장', '본부장'];

function Row({ r }: { r: CashRow }) {
  return (
    <tr>
      <td>{r.subject}</td><td>{r.bank}</td><td style={num}>{rate(r.rate)}</td><td>{r.product}</td>
      <td style={{ whiteSpace: 'nowrap' }}>{r.openDate}</td><td style={{ whiteSpace: 'nowrap' }}>{r.maturityDate ?? '-'}</td>
      <td style={{ whiteSpace: 'nowrap' }}>{r.accountNo}</td>
      <td style={num}>{won(r.opening)}</td><td style={num}>{won(r.increase)}</td><td style={num}>{won(r.decrease)}</td><td style={num}>{won(r.closing)}</td>
    </tr>
  );
}

export function DailyCashReportPage({ report, showTotal }: { report: DailyCashReport; showTotal: boolean }) {
  return (
    <>
      <header style={{ marginBottom: 14 }}>
        <div className="flex items-start justify-between gap-4">
          <div style={{ flex: 1 }}>
            <div className="font-bold" style={{ fontSize: 22 }}>자 금 일 보</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>일 일 자 금 시 재 표</div>
          </div>
          <table aria-label="결재란" style={{ width: 'auto', fontSize: 11 }}>
            <thead><tr>{SIGNERS.map((s) => <th key={s} style={{ ...left, width: 60 }}>{s}</th>)}</tr></thead>
            <tbody><tr>{SIGNERS.map((s) => <td key={s} style={{ height: 40 }} />)}</tr></tbody>
          </table>
        </div>
        <div className="flex justify-between" style={{ marginTop: 12, fontSize: 12 }}>
          <span>{`기준일자  ${report.date}  ·  작성 ${DRAFTER.dept} ${DRAFTER.name}`}</span>
          <span>단위 : 원</span>
        </div>
      </header>

      {report.sections.map((s, i) => (
        <section key={s.type} style={{ marginTop: 12 }}>
          <div className="font-bold" style={{ fontSize: 12.5, marginBottom: 4 }}>{`${String(i + 1)}. ${s.type} 일일 자금시재표`}</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th rowSpan={2} style={left}>구분</th>
                <th colSpan={6} style={left}>거래은행</th>
                <th rowSpan={2} style={num}>기초시재</th><th rowSpan={2} style={num}>입금</th><th rowSpan={2} style={num}>출금</th><th rowSpan={2} style={num}>마감시재</th>
              </tr>
              <tr>
                <th style={left}>은행</th><th style={num}>이율</th><th style={left}>상품명</th><th style={left}>개시일</th><th style={left}>만기일</th><th style={left}>계좌번호</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.length === 0 && <tr><td colSpan={11} style={left}>조회된 데이터가 없습니다</td></tr>}
              {s.rows.map((r) => <Row key={r.id} r={r} />)}
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={7}>소계</td>
                <td style={num}>{won(s.subtotal.opening)}</td><td style={num}>{won(s.subtotal.increase)}</td>
                <td style={num}>{won(s.subtotal.decrease)}</td><td style={num}>{won(s.subtotal.closing)}</td>
              </tr>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan={10}>총 예금잔액</td><td style={num}>{won(s.subtotal.closing)}</td>
              </tr>
            </tbody>
          </table>
        </section>
      ))}

      {showTotal && (
        <div className="flex justify-between font-bold border-t border-border" style={{ marginTop: 16, paddingTop: 10, fontSize: 13.5 }}>
          <span>{TOTAL_TITLE}</span>
          <span className="tabular">{`${won(report.total.closing)} 원`}</span>
        </div>
      )}
    </>
  );
}
