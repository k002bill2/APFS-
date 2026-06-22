/* 모태펀드 조성 및 출자현황 — 투자자산관리 > 모태펀드관리
   FFMS 캡처(image10) 실측: 연도별 조성현황(기금 소스별) + 출자현황 집계 매트릭스.
   2단 중첩 헤더 + 합계행, 조회 전용. 공통 양식은 GridFrame(apfs-grid 스킬)로 통일. */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { mn } from './mask';
import { GridFrame, KpiBadge } from './grid_frame';

const { Button, IconBtn } = UI;
const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');

/* FFMS 캡처 실측 — 추측 금지. c=조성현황(억원), u=출자현황(조합수 개 / 출자금액 억원) */
type FundingRow = { y: string; c: number[]; u: number[] };
const FUNDING_ROWS: FundingRow[] = [
  { y: '2010', c: [597.3, 507, 90, 0, 0, 0.3], u: [5, 547] },
  { y: '2011', c: [500, 0, 500, 0, 0, 0], u: [6, 495] },
  { y: '2012', c: [500, 0, 500, 0, 0, 0], u: [7, 540] },
  { y: '2013', c: [500, 0, 500, 0, 0, 0], u: [7, 510] },
  { y: '2014', c: [700, 0, 600, 0, 100, 0], u: [10, 790] },
  { y: '2015', c: [600, 0, 0, 500, 100, 0], u: [8, 700] },
  { y: '2016', c: [400, 0, 0, 300, 100, 0], u: [8, 1040] },
  { y: '2017', c: [300, 0, 0, 200, 100, 0], u: [7, 700] },
  { y: '2018', c: [200, 0, 0, 100, 100, 0], u: [6, 520] },
  { y: '2019', c: [270, 0, 0, 200, 70, 0], u: [8, 622.5] },
  { y: '2020', c: [420, 0, 0, 350, 70, 0], u: [10, 980] },
  { y: '2021', c: [0, 0, 0, 0, 0, 0], u: [12, 1047] },
  { y: '2022', c: [0, 0, 0, 0, 0, 0], u: [17, 1655.9] },
  { y: '2023', c: [0, 0, 0, 0, 0, 0], u: [14, 1314.7] },
  { y: '2024', c: [0, 0, 0, 0, 0, 0], u: [15, 1416] },
  { y: '2025', c: [0, 0, 0, 0, 0, 0], u: [14, 1246] },
];
/* 캡처 합계행 실측값 (열 합·행 합과 일치 검증 완료) */
const TOTAL = { c: [4987.3, 507, 2190, 1650, 640, 0.3], u: [154, 14124.1] };

const CO_COLS = ['합계', '농특회계', '농안기금', 'FTA', '수산발전기금', '농금원'];
const IN_COLS = ['조합수', '출자금액'];

/* 정수는 천단위 콤마, 소수는 1자리까지 — 캡처 표기 재현 */
function fmt(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/* 숫자 셀 — 0은 muted, 합계열(첫 컬럼)은 강조. 숫자는 mn 마스킹 */
function NumCell({ v, strong }: { v: number; strong?: boolean }) {
  return (
    <td
      className="px-3 py-2.5 text-right tabular text-[13px] whitespace-nowrap"
      style={{ color: v === 0 ? 'var(--muted-foreground)' : 'var(--foreground)', fontWeight: strong ? 700 : 500 }}>
      {mn(fmt(v))}
    </td>
  );
}

function AssetFunding({ onNav }: { onNav?: (r: string) => void }) {
  const headBg = { background: 'color-mix(in srgb,var(--muted) 60%,transparent)' };

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '모태펀드관리', '모태펀드 조성 및 출자현황']}
      title="모태펀드 조성 및 출자현황"
      sub="연도별 조성현황(기금 소스별)·출자현황 집계 — 단위: 금액 억원(추정) / 조합수 개"
      cardTitle="모태펀드 조성·출자 현황표"
      headerActions={<>
        <Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>
        <Button variant="primary" size="sm" leadingIcon="download">내보내기</Button>
      </>}
      kpis={<>
        <KpiBadge icon="landmark" color="var(--primary)" label="누적 조성총액" value={mn(fmt(TOTAL.c[0])) + ' 억원'} />
        <KpiBadge icon="wallet" color="var(--accent)" label="누적 출자금액" value={mn(fmt(TOTAL.u[1])) + ' 억원'} />
        <KpiBadge icon="layers" color="var(--chart-1)" label="누적 조합수" value={mn(fmt(TOTAL.u[0])) + ' 개'} />
      </>}
      toolbarLeft={<>
        <Icon name="file" size={16} style={{ color: 'var(--caption)' }} />
        <span className="text-caption" style={{ fontSize: 12.5 }}>기금 소스별(농특회계·농안기금·FTA·수산발전기금·농금원) 조성액 · 결성 조합수/출자금액 집계</span>
      </>}
      toolbarRight={<IconBtn icon="refresh" label="새로고침" size={34} />}
      footerLeft={<span>{'2010 ~ 2025년 · 총 ' + mn(String(FUNDING_ROWS.length)) + '개 연도'}</span>}>

      {/* 매트릭스 본체 — Card(overflow:hidden) 내부이므로 가로 스크롤은 이 래퍼가 책임 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[880px]">
          <thead>
            {/* 1단: 그룹 헤더 (구분 rowSpan · 조성현황 colSpan6 · 출자현황 colSpan2) */}
            <tr style={headBg}>
              <th rowSpan={2} className="t-label font-semibold px-4 py-3 text-left align-middle whitespace-nowrap pl-5 border-b border-border">구분</th>
              <th colSpan={6} className="t-label font-bold px-3 py-2.5 text-center whitespace-nowrap border-b border-l border-border" style={{ color: 'var(--primary)' }}>조성현황</th>
              <th colSpan={2} className="t-label font-bold px-3 py-2.5 text-center whitespace-nowrap border-b border-l border-border" style={{ color: 'var(--accent)' }}>출자현황</th>
            </tr>
            {/* 2단: 세부 컬럼 */}
            <tr style={headBg}>
              {CO_COLS.map((c, i) => (
                <th key={c} className={cx('t-label font-semibold px-3 py-2.5 text-right whitespace-nowrap border-b border-border', i === 0 && 'border-l')}>{c}</th>
              ))}
              {IN_COLS.map((c, i) => (
                <th key={c} className={cx('t-label font-semibold px-3 py-2.5 text-right whitespace-nowrap border-b border-border', i === 0 && 'border-l')}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FUNDING_ROWS.map((row) => (
              <tr
                key={row.y}
                className="border-t border-border transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb,var(--muted) 45%,transparent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <td className="px-4 pl-5 py-2.5 whitespace-nowrap tabular text-[13px] font-semibold text-foreground">{row.y}</td>
                {row.c.map((v, i) => <NumCell key={i} v={v} strong={i === 0} />)}
                {row.u.map((v, i) => <NumCell key={i} v={v} />)}
              </tr>
            ))}
            {/* 합계행 — 캡처 연녹색 강조 재현 */}
            <tr className="border-t-2 border-primary" style={{ background: 'color-mix(in srgb,var(--primary) 9%,transparent)' }}>
              <td className="px-4 pl-5 py-3 whitespace-nowrap text-[13px] font-extrabold text-primary">합 계</td>
              {TOTAL.c.map((v, i) => (
                <td key={i} className="px-3 py-3 text-right tabular text-[13px] font-extrabold whitespace-nowrap text-foreground">{mn(fmt(v))}</td>
              ))}
              {TOTAL.u.map((v, i) => (
                <td key={i} className="px-3 py-3 text-right tabular text-[13px] font-extrabold whitespace-nowrap text-foreground">{mn(fmt(v))}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </GridFrame>
  );
}

export { AssetFunding };
