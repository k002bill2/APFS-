/* risk_tables_page.tsx — "검색박스 → (금액 단위) → 표 1~4장" 조회 전용 화면의 공용 골격.
   자펀드 수익률정보 비교 조회 · 투자조합/피투자회사 가치평가 결과조회 · 자펀드 투자자산 및 거래내역 조회 ·
   예외사항레포트 · Portfolio Report 가 이 골격을 설정(risk_table_pages.tsx)으로 나눠 쓴다.

   규약
   - 표가 1장이면 섹션 헤더 없이 표만, 2장 이상이면 원문 섹션 제목(`.sectitle`/`.cap`/`.sechead`)으로 **한 GridFrame 안에 세로로 쌓는다**
     (기준 화면: 예외사항레포트). 섹션 제목엔 번호 칩·건수를 달지 않는다 — 건수는 푸터에만(risk_grid.tsx SectionHead).
   - 검색조건은 `key` 가 있으면 **그 키를 가진 표의 행만** 거른다(eq = 같은 값 · prefix = '2012' 로 '2012년도' 매칭 ·
     dayRange 필터는 기간 안 · text 필터는 부분일치). "그 키를 가진 표" = 컬럼이 있거나 **행에 그 키가 시드된** 표다 —
     원문이 화면에 그리지 않는 분류 키로 목록을 바꾸는 화면(공통코드 `LISTS[코드구분]`)을 숨은 키로 재현한다
     (filter_field.ts 의 columnKey 불변식 "행에 실제로 시드될 때만"과 같은 기준).
     key 가 없거나 어떤 표에도 그 컬럼이 없으면 `· 데이터 연동 후 적용`(조회 기준 컨텍스트 — 푸터·칩에만 싣는다).
   - 엑셀 = 화면의 표 전부(표 N장 → 시트 N장), 화면 단위·필터 결과 그대로(risk_excel.ts). */
import React, { useMemo, useState } from 'react';
import { toast } from './ui/sonner';
import { DEFAULT_UNIT } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { RiskPage, splitRange } from './risk_page_kit';
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
  /** 행 필터 키 — 이 컬럼(또는 시드된 행 키)을 가진 표에만 적용 */
  key?: string;
  mode?: 'eq' | 'prefix';
}

export interface TablesPageConfig {
  system?: RiskPageProps['system'];
  group: RiskPageProps['group'];
  label: string;
  route: string;
  tables: TableMeta[];
  filters: FilterDef[];
  /** 금액 단위 토글(원문 seg 가 있는 화면) */
  unit?: boolean;
  unitNote?: string;
  /** 표 위 머리 줄(원문 툴바의 제목·태그 — 예: 실물검증 `대사 결과`) */
  intro?: React.ReactNode;
}

const matches = (f: FilterDef, v: string, r: Row) => {
  const cell = r[f.key!];
  if (cell == null) return false;
  if (f.kind === 'dayRange') {
    const [a, b] = splitRange(v);
    const d = String(cell);
    return (!a || d >= a) && (!b || d <= b);
  }
  if (f.kind === 'text') return String(cell).includes(v.trim());
  return f.mode === 'prefix' ? String(cell).startsWith(v) : String(cell) === v;
};

/** 이 표가 키를 갖는가 — 컬럼이 있거나 행에 시드됐거나 */
const hasKey = (t: TableMeta, k: string) => t.cols.some((c) => c.key === k) || t.rows.some((r) => r[k] !== undefined);

export function TablesPage({ cfg, onNav }: { cfg: TablesPageConfig; onNav?: (r: string) => void }) {
  const init = () => Object.fromEntries(cfg.filters.map((f) => [f.label, f.def]));
  const [vals, setVals] = useState<Record<string, string>>(init);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const reset = () => { setVals(init()); setUnit(DEFAULT_UNIT); };

  /* 컬럼이 실제로 있는 검색조건만 행을 거른다 */
  const live = (f: FilterDef) => !!f.key && cfg.tables.some((t) => hasKey(t, f.key!));
  const filtered = useMemo(() => cfg.tables.map((t) => t.rows.filter((r) => cfg.filters.every((f) => {
    const v = vals[f.label];
    if (!v || !f.key || !hasKey(t, f.key)) return true;
    return matches(f, v, r);
  }))), [cfg, vals]);

  const filters: FilterSpec[] = cfg.filters.map((f) => ({
    label: f.label, kind: f.kind, value: vals[f.label] ?? '', options: f.options, allLabel: f.allLabel,
    onChange: (v: string) => setVals((p) => ({ ...p, [f.label]: v })), noop: !live(f),
  }));

  /* 푸터 — 조회 기준(첫 날짜형 조건) + 표별 건수 */
  const when = cfg.filters.find((f) => f.kind === 'day' || f.kind === 'month' || f.kind === 'year' || f.kind === 'dayRange');
  const whenVal = when ? (when.kind === 'dayRange' ? splitRange(vals[when.label] ?? '').join(' ~ ') : vals[when.label]) : '';
  const whenText = when && vals[when.label] ? `${when.label} ${String(whenVal)} · ` : '';
  const counts = cfg.tables.length === 1
    ? `총 ${String(filtered[0].length)}건`
    : cfg.tables.map((t, i) => `${t.title ?? `표 ${i + 1}`} ${String(filtered[i].length)}건`).join(' · ');

  const unitOrNull = cfg.unit ? unit : null;
  const exportExcel = () => {
    exportTables(cfg.label, cfg.tables.map((t, i) => ({ name: t.title ?? `표 ${i + 1}`, table: t, rows: filtered[i] })), unitOrNull);
    toast.success('Excel로 내보냈습니다');
  };

  const hasAmount = cfg.tables.some((t) => t.cols.some((c) => c.kind === 'amount'));
  return (
    <RiskPage system={cfg.system} group={cfg.group} label={cfg.label} route={cfg.route} onNav={onNav}
      filters={filters} onReset={reset}
      unit={cfg.unit ? unit : undefined} onUnit={cfg.unit ? setUnit : undefined} unitNote={cfg.unitNote}
      unitCaption={!cfg.unit && hasAmount ? '단위: 원' : undefined}
      footerLeft={<span>{whenText + counts}</span>}
      onExport={exportExcel}>
      {cfg.intro}
      {cfg.tables.map((t, i) => (
        <React.Fragment key={t.id}>
          {/* 원문 섹션 제목이 있으면 섹션 헤더, 없으면(원문이 제목을 지운 표) 구분선만 */}
          {cfg.tables.length > 1 && (t.title
            ? <SectionHead title={t.title} />
            : i > 0 && <div aria-hidden style={{ height: 16, borderTop: '1px solid var(--border)' }} />)}
          <ReadGrid table={t} rows={filtered[i]} unit={unitOrNull} ariaLabel={t.title ?? cfg.label} />
        </React.Fragment>
      ))}
    </RiskPage>
  );
}
