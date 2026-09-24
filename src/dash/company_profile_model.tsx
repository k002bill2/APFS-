/* 투자기업 기업개요 — S1_30 원문 데이터 + 섹션 렌더 (SSOT).
   출처: docs/mockups/01_투자자산관리/S1_30_투자기업정보.html (2026-09-15 파싱 실측)

   왜 별도 모듈인가: 같은 원문을 **두 곳**이 쓴다 —
   ① 페이지 `investee_profile.tsx`(route `투자기업정보(통합)`, 메뉴 리프 진입)
   ② 팝업 `company_profile_modal.tsx`(다른 목록에서 행 상세로 열 때)
   데이터·표 마크업을 양쪽에 복사하면 한쪽만 고쳐져 원문과 갈라진다.

   S1_30 은 **목록이 아니라 기업 1건의 상세 화면**이다(기업개요 kv 33항목 + 재무제표 2행 +
   주주명부 4행). `PageSchema` 는 columns 가 한 벌이라 이 3섹션을 담지 못한다 — 그래서 전용 모듈이다.
   행을 늘리지 않는다: 원문 실데이터가 (주)선양 1건뿐이고, 채우려고 만든 행은 전부 위조다. */
import React from 'react';
import { UI } from './components';
import { fmt } from './aggrid_theme';
import { UNITS } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { OVERVIEW, FIN_ROWS, FIN_AMT_HEADERS, SHARE_HEADERS, SHARE_ROWS, formatProfileUnit } from './company_profile_data';
import type { OvItem } from './company_profile_data';

const { SegTabs } = UI;

/* 금액 → 단위 환산 문자열. null은 '-' */
const money = (won: number | null, unit: Unit): string =>
  won == null ? '-' : String(formatProfileUnit(won, unit));

/* ── 프리미티브(gp_spec_modal 복사) ── */
const TH = 'border border-border bg-muted text-[11.5px] font-bold text-muted-foreground whitespace-nowrap';
const TD = 'border border-border text-[12px] text-foreground';

function Section({ title, unitNote, children }: { title: string; unitNote?: string; children: React.ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        {/* preflight:false라 h3에 UA 기본 마진이 살아 있다 → margin:0 명시(preflight-off-ua-margin-trap) */}
        <h3 className="text-[13.5px] font-bold text-foreground" style={{ margin: 0 }}>{title}</h3>
        {unitNote && <span className="text-[11.5px] text-muted-foreground">{unitNote}</span>}
      </div>
      {children}
    </section>
  );
}

/* 개요 kv — 한글 라벨이라 가로 배열(라벨 좌 / 값 우). full이면 한 줄 전체 폭. */
function KvGrid({ items }: { items: OvItem[] }) {
  return (
    <div className="grid gap-px border border-border bg-border" style={{ gridTemplateColumns: 'minmax(96px,auto) 1fr minmax(96px,auto) 1fr' }}>
      {items.map((it) => (
        <React.Fragment key={it.l}>
          <div className="bg-muted px-2.5 py-[7px] text-[11.5px] font-bold text-muted-foreground">{it.l}</div>
          <div className="bg-card px-2.5 py-[7px] text-[12px] text-foreground min-w-0 break-words" style={it.full ? { gridColumn: 'span 3' } : undefined}>
            {it.v == null ? <span className="text-muted-foreground">-</span> : it.v}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function FinTable({ unit }: { unit: Unit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: 860 }}>
        <thead>
          <tr>
            {['No', '운용사', '자펀드', '기준년월', ...FIN_AMT_HEADERS, '종업원수'].map((h) => (
              <th key={h} scope="col" className={TH} style={{ padding: '7px 8px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIN_ROWS.map((r) => (
            <tr key={r.no}>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{r.no}</td>
              <td className={TD} style={{ padding: '7px 8px' }}>{r.gp}</td>
              <td className={TD} style={{ padding: '7px 8px' }}>{r.fund}</td>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{String(r.ym)}</td>
              {r.amounts.map((v, i) => (
                // 음수(적자)는 색 단독으로 알리지 않는다 — 값 자체에 '-' 부호가 남아 텍스트로도 읽힌다(A11Y 원칙 2)
                <td key={FIN_AMT_HEADERS[i]} className={`${TD} text-right tabular`}
                  style={{ padding: '7px 8px', ...(v < 0 ? { color: 'var(--danger-text)' } : {}) }}>{money(v, unit)}</td>
              ))}
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{String(r.emp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShareTable({ unit }: { unit: Unit }) {
  // 단일 헤더 12열 — 원문 S1_30:351-356 그대로(보통주·우선주를 2단으로 묶지 않는다). 라벨 정본 = SHARE_HEADERS.
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: 980 }}>
        <thead>
          <tr>
            {SHARE_HEADERS.map((h) => (
              <th key={h} scope="col" className={TH} style={{ padding: '7px 8px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHARE_ROWS.map((r) => (
            <tr key={r.no}>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{r.no}</td>
              <td className={TD} style={{ padding: '7px 8px' }}>{r.gp}</td>
              <td className={TD} style={{ padding: '7px 8px' }}>{r.fund}</td>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{String(r.date)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.totalCapital, unit)}</td>
              {/* 주수는 금액이 아니다 — 단위 토글 대상에서 제외(축이 무너지지 않도록) */}
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{fmt(r.totalShares)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.comCapital, unit)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{fmt(r.comShares)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.comPar, unit)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.prfCapital, unit)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{fmt(r.prfShares)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.prfPar, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnitSeg({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="mb-5 flex items-center justify-end gap-2">
      <span className="text-[11.5px] font-semibold text-muted-foreground">금액단위</span>
      <SegTabs size="sm" value={unit} onChange={(v: string) => onChange(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
    </div>
  );
}


/** 3섹션 본문 — 페이지와 팝업이 공유한다(래퍼만 다르다: GridFrame vs Dialog). */
export function CompanyProfileBody({ unit }: { unit: Unit }) {
  return (
    <>
      <Section title="기업개요"><KvGrid items={OVERVIEW} /></Section>
      <Section title="재무제표" unitNote={`(단위: ${unit})`}><FinTable unit={unit} /></Section>
      <Section title="주주명부" unitNote={`(금액 단위: ${unit} · 주수는 주)`}><ShareTable unit={unit} /></Section>
    </>
  );
}

/* 데이터는 `company_profile_data.ts` 가 SSOT — 여기서는 재노출만 한다(소비처 import 경로 단일화). */
export { UnitSeg };
export { CO_NAME, OVERVIEW, FIN_ROWS, SHARE_ROWS, SOURCE_COUNTS } from './company_profile_data';
