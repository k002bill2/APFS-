/* risk_tables_page.tsx — "검색박스 → (금액 단위) → 표 1~4장" 조회 전용 화면의 공용 골격.
   자펀드 수익률정보 비교 조회 · 투자조합/피투자회사 가치평가 결과조회 · 자펀드 투자자산 및 거래내역 조회 ·
   예외사항레포트 · Portfolio Report 가 이 골격을 설정(risk_table_pages.tsx)으로 나눠 쓴다.

   규약
   - 표가 1장이면 섹션 헤더 없이 표만, 2장 이상이면 원문 섹션 제목(`.sectitle`/`.cap`/`.sechead`)으로 **한 GridFrame 안에 세로로 쌓는다**
     (골드 ew_result_manage.tsx). 원문이 번호 칩을 둔 화면(Portfolio Report `.sechead .num`)만 번호를 단다.
   - 검색조건은 `key` 가 있으면 **그 키를 가진 표의 행만** 거른다(eq = 같은 값 · prefix = '2012' 로 '2012년도' 매칭).
     key 가 없거나 어떤 표에도 그 컬럼이 없으면 `· 데이터 연동 후 적용`(조회 기준 컨텍스트 — 푸터·칩에만 싣는다).
   - 엑셀 = 화면의 표 전부(표 N장 → 시트 N장), 화면 단위·필터 결과 그대로(risk_excel.ts). */
import React, { useMemo, useState } from 'react';
import { mn, useMask } from './mask';
import { toast } from './ui/sonner';
import { DEFAULT_UNIT } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec, RiskPageProps } from './risk_page_kit';
import { ReadGrid, SectionHead } from './risk_grid';
import { exportTables } from './risk_excel';
import type { TableMeta, Row } from './risk_table_meta';

export interface FilterDef {
  label: string;
  kind: FilterSpec['kind'];
  /** 원문 기본값 */
  def: string;
  options?: readonly string[];
  allLabel?: string | null;
  /** 행 필터 키 — 이 컬럼을 가진 표에만 적용 */
  key?: string;
  mode?: 'eq' | 'prefix';
}

export interface TablesPageConfig {
  group: RiskPageProps['group'];
  label: string;
  route: string;
  tables: TableMeta[];
  filters: FilterDef[];
  /** 금액 단위 토글(원문 seg 가 있는 화면) */
  unit?: boolean;
  unitNote?: string;
  /** 원문 섹션 번호 칩(`.sechead .num`) */
  numbered?: boolean;
}

const matches = (f: FilterDef, v: string, r: Row) => {
  const cell = r[f.key!];
  if (cell == null) return false;
  return f.mode === 'prefix' ? String(cell).startsWith(v) : String(cell) === v;
};

export function TablesPage({ cfg, onNav }: { cfg: TablesPageConfig; onNav?: (r: string) => void }) {
  const masked = useMask();
  const init = () => Object.fromEntries(cfg.filters.map((f) => [f.label, f.def]));
  const [vals, setVals] = useState<Record<string, string>>(init);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const reset = () => { setVals(init()); setUnit(DEFAULT_UNIT); };

  /* 컬럼이 실제로 있는 검색조건만 행을 거른다 */
  const live = (f: FilterDef) => !!f.key && cfg.tables.some((t) => t.cols.some((c) => c.key === f.key));
  const filtered = useMemo(() => cfg.tables.map((t) => t.rows.filter((r) => cfg.filters.every((f) => {
    const v = vals[f.label];
    if (!v || !f.key || !t.cols.some((c) => c.key === f.key)) return true;
    return matches(f, v, r);
  }))), [cfg, vals]);

  const filters: FilterSpec[] = cfg.filters.map((f) => ({
    label: f.label, kind: f.kind, value: vals[f.label] ?? '', options: f.options, allLabel: f.allLabel,
    onChange: (v: string) => setVals((p) => ({ ...p, [f.label]: v })), noop: !live(f),
  }));

  /* 푸터 — 조회 기준(첫 날짜형 조건) + 표별 건수 */
  const when = cfg.filters.find((f) => f.kind !== 'select');
  const whenText = when && vals[when.label] ? `${when.label} ${mn(vals[when.label])} · ` : '';
  const counts = cfg.tables.length === 1
    ? `총 ${mn(String(filtered[0].length))}건`
    : cfg.tables.map((t, i) => `${t.title ?? `표 ${i + 1}`} ${mn(String(filtered[i].length))}건`).join(' · ');

  const unitOrNull = cfg.unit ? unit : null;
  const exportExcel = () => {
    exportTables(cfg.label, cfg.tables.map((t, i) => ({ name: t.title ?? `표 ${i + 1}`, table: t, rows: filtered[i] })), unitOrNull, masked);
    toast.success('Excel로 내보냈습니다');
  };

  const hasAmount = cfg.tables.some((t) => t.cols.some((c) => c.kind === 'amount'));
  return (
    <RiskPage group={cfg.group} label={cfg.label} route={cfg.route} onNav={onNav}
      filters={filters} onReset={reset}
      unit={cfg.unit ? unit : undefined} onUnit={cfg.unit ? setUnit : undefined} unitNote={cfg.unitNote}
      unitCaption={!cfg.unit && hasAmount ? '단위: 원' : undefined}
      footerLeft={<span>{whenText + counts}</span>}
      onExport={exportExcel}>
      {cfg.tables.map((t, i) => (
        <React.Fragment key={t.id}>
          {/* 원문 섹션 제목이 있으면 섹션 헤더, 없으면(원문이 제목을 지운 표) 구분선만 */}
          {cfg.tables.length > 1 && (t.title
            ? <SectionHead n={cfg.numbered ? i + 1 : undefined} title={t.title} cap={<>총 {mn(String(filtered[i].length))}건</>} />
            : i > 0 && <div aria-hidden style={{ height: 16, borderTop: '1px solid var(--border)' }} />)}
          <ReadGrid table={t} rows={filtered[i]} unit={unitOrNull} ariaLabel={t.title ?? cfg.label} />
        </React.Fragment>
      ))}
    </RiskPage>
  );
}
