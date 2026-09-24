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

/* ── 프리미티브 ──
   두 밀도(variant)를 갖는다 — 같은 본문을 페이지와 팝업이 공유하기 때문이다.
   · popup(기본): 880px 명세 팝업(gp_spec_modal 복사 관례) — 11.5/12px 촘촘한 표.
   · page: 전용 페이지 — claude.ai/design「투자기업정보(통합).html」(2026-09-24) 레이아웃·글자 크기.
   팝업을 기본값으로 둬서 기존 호출부(company_profile_modal)는 한 줄도 바뀌지 않는다. */
export type ProfileVariant = 'page' | 'popup';

type Density = { th: string; td: string; thPad: string; tdPad: string; frame: string; rowHover: string };
const DENSITY: Record<ProfileVariant, Density> = {
  popup: {
    th: 'border border-border bg-muted text-[11.5px] font-bold text-muted-foreground whitespace-nowrap',
    td: 'border border-border text-[12px] text-foreground',
    thPad: '7px 8px', tdPad: '7px 8px', frame: 'overflow-x-auto', rowHover: '',
  },
  /* 페이지: 바깥 테두리는 둥근 래퍼가 그리고, 셀은 좌측·하단 선만 긋는다(첫 열 좌선·마지막 행 하단선 제거) */
  page: {
    th: 'border-0 border-b border-l border-solid border-border first:border-l-0 bg-muted text-[12.5px] font-semibold text-muted-foreground whitespace-nowrap text-center',
    td: 'border-0 border-b border-l border-solid border-border first:border-l-0 group-last:border-b-0 text-[13.5px] text-foreground whitespace-nowrap',
    thPad: '9px 12px', tdPad: '10px 12px',
    frame: 'overflow-x-auto border border-solid border-border rounded-[var(--radius-sm)]',
    rowHover: 'group hover:[&>td]:bg-muted',
  },
};

function Section({ title, count, unitNote, variant, children }: { title: string; count?: number; unitNote?: string; variant: ProfileVariant; children: React.ReactNode }) {
  if (variant === 'page') {
    return (
      <section className="mb-7 last:mb-0">
        <div className="mb-[14px] flex items-baseline justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* preflight:false라 h3에 UA 기본 마진이 살아 있다 → margin:0 명시(preflight-off-ua-margin-trap) */}
            <h3 className="t-cardtitle text-foreground" style={{ margin: 0 }}>{title}</h3>
            {/* 건수는 원형 뱃지 대신 "N건" 텍스트 — 뱃지 숫자만으론 무엇의 개수인지 읽히지 않는다(2026-09-24 사용자 피드백) */}
            {count != null && <span className="text-[13px] text-muted-foreground tabular">{count}건</span>}
          </div>
          {unitNote && <span className="text-[12.5px] text-caption">{unitNote}</span>}
        </div>
        {children}
      </section>
    );
  }
  return (
    <section className="mb-7 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-[13.5px] font-bold text-foreground" style={{ margin: 0 }}>{title}</h3>
        {unitNote && <span className="text-[11.5px] text-muted-foreground">{unitNote}</span>}
      </div>
      {children}
    </section>
  );
}

/* 개요 kv — 한글 라벨이라 가로 배열(라벨 좌 / 값 우). full이면 한 줄 전체 폭. */
function KvGrid({ items, variant }: { items: OvItem[]; variant: ProfileVariant }) {
  if (variant === 'page') return <KvGridPage items={items} />;
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

/* 페이지 kv — 라벨 트랙을 120~160px 로 고정해 1·3열 라벨 폭을 맞춘다(auto 면 행마다 흔들린다).
   ≤860px 에선 2열(라벨|값)로 접는다 — full 은 `2 / -1` 이라 접혀도 암묵 트랙을 만들지 않는다.
   홀수 번째로 끝나는 마지막 항목(여성기업여부) 뒤엔 빈 채움 셀을 뷰에서만 그린다 —
   OVERVIEW 에 넣으면 원문 33항목 건수(SOURCE_COUNTS)가 깨진다. */
const KV_CELL = 'border-0 border-b border-solid border-border px-[14px] py-[10px] leading-5 min-h-5';
const KV_K = `${KV_CELL} bg-muted text-[12.5px] font-semibold text-muted-foreground`;
const KV_V = `${KV_CELL} text-[13.5px] text-foreground min-w-0 [overflow-wrap:anywhere]`;

function KvGridPage({ items }: { items: OvItem[] }) {
  const cells: React.ReactNode[] = [];
  let col = 0; // 현재 행에서 채운 (라벨,값) 쌍 수: 0 또는 1
  items.forEach((it) => {
    cells.push(<div key={it.l + ':k'} className={KV_K}>{it.l}</div>);
    cells.push(
      <div key={it.l + ':v'} className={KV_V + (it.full ? ' col-[2/-1]' : '')}>
        {it.v == null ? <span className="text-caption">-</span> : it.v}
      </div>,
    );
    col = it.full ? 0 : (col + 1) % 2;
  });
  if (col === 1) cells.push(<div key="blank" className={`${KV_CELL} col-[3/-1] max-[860px]:hidden`} aria-hidden="true" />);
  return (
    <div className="grid border-0 border-t border-solid border-border grid-cols-[minmax(120px,160px)_minmax(0,1fr)_minmax(120px,160px)_minmax(0,1fr)] max-[860px]:grid-cols-[minmax(110px,140px)_minmax(0,1fr)]">
      {cells}
    </div>
  );
}

function FinTable({ unit, variant }: { unit: Unit; variant: ProfileVariant }) {
  const d = DENSITY[variant];
  return (
    <div className={d.frame}>
      <table className="w-full border-collapse" style={{ minWidth: 860 }}>
        <thead>
          <tr>
            {['No', '운용사', '자펀드', '기준년월', ...FIN_AMT_HEADERS, '종업원수'].map((h) => (
              <th key={h} scope="col" className={d.th} style={{ padding: d.thPad }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIN_ROWS.map((r) => (
            <tr key={r.no} className={d.rowHover}>
              <td className={`${d.td} text-center tabular`} style={{ padding: d.tdPad }}>{r.no}</td>
              <td className={d.td} style={{ padding: d.tdPad }}>{r.gp}</td>
              <td className={d.td} style={{ padding: d.tdPad }}>{r.fund}</td>
              <td className={`${d.td} text-center tabular`} style={{ padding: d.tdPad }}>{String(r.ym)}</td>
              {r.amounts.map((v, i) => (
                // 음수(적자)는 색 단독으로 알리지 않는다 — 값 자체에 '-' 부호가 남아 텍스트로도 읽힌다(A11Y 원칙 2)
                <td key={FIN_AMT_HEADERS[i]} className={`${d.td} text-right tabular`}
                  style={{ padding: d.tdPad, ...(v < 0 ? { color: 'var(--danger-text)' } : {}) }}>{money(v, unit)}</td>
              ))}
              <td className={`${d.td} text-center tabular`} style={{ padding: d.tdPad }}>{String(r.emp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShareTable({ unit, variant }: { unit: Unit; variant: ProfileVariant }) {
  // 단일 헤더 12열 — 원문 S1_30:351-356 그대로(보통주·우선주를 2단으로 묶지 않는다). 라벨 정본 = SHARE_HEADERS.
  // (디자인 시안은 2단 헤더지만 원문 충실도 규약을 우선해 채택하지 않았다 — 2026-09-24)
  const d = DENSITY[variant];
  const td = (extra: string, v: React.ReactNode) => <td className={`${d.td} ${extra}`} style={{ padding: d.tdPad }}>{v}</td>;
  return (
    <div className={d.frame}>
      <table className="w-full border-collapse" style={{ minWidth: 980 }}>
        <thead>
          <tr>
            {SHARE_HEADERS.map((h) => (
              <th key={h} scope="col" className={d.th} style={{ padding: d.thPad }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHARE_ROWS.map((r) => (
            <tr key={r.no} className={d.rowHover}>
              {td('text-center tabular', r.no)}
              {td('', r.gp)}
              {td('', r.fund)}
              {td('text-center tabular', String(r.date))}
              {td('text-right tabular', money(r.totalCapital, unit))}
              {/* 주수는 금액이 아니다 — 단위 토글 대상에서 제외(축이 무너지지 않도록) */}
              {td('text-right tabular', fmt(r.totalShares))}
              {td('text-right tabular', money(r.comCapital, unit))}
              {td('text-right tabular', fmt(r.comShares))}
              {td('text-right tabular', money(r.comPar, unit))}
              {td('text-right tabular', money(r.prfCapital, unit))}
              {td('text-right tabular', fmt(r.prfShares))}
              {td('text-right tabular', money(r.prfPar, unit))}
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


/** 3섹션 본문 — 페이지와 팝업이 공유한다(래퍼만 다르다: GridFrame vs Dialog). variant 는 밀도만 바꾼다. */
export function CompanyProfileBody({ unit, variant = 'popup' }: { unit: Unit; variant?: ProfileVariant }) {
  const page = variant === 'page';
  return (
    <>
      <Section variant={variant} title="기업개요"><KvGrid variant={variant} items={OVERVIEW} /></Section>
      <Section variant={variant} title="재무제표" count={page ? FIN_ROWS.length : undefined} unitNote={`(단위: ${unit})`}><FinTable variant={variant} unit={unit} /></Section>
      <Section variant={variant} title="주주명부" count={page ? SHARE_ROWS.length : undefined} unitNote={`(금액 단위: ${unit} · 주수는 주)`}><ShareTable variant={variant} unit={unit} /></Section>
    </>
  );
}

/* 데이터는 `company_profile_data.ts` 가 SSOT — 여기서는 재노출만 한다(소비처 import 경로 단일화). */
export { UnitSeg };
export { CO_NAME, OVERVIEW, FIN_ROWS, SHARE_ROWS, SOURCE_COUNTS } from './company_profile_data';
