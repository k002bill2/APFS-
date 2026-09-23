/* risk_table_meta.ts — 조기경보 기업정보·자펀드정보·가치평가 읽기전용 표의 **선언 메타**(순수 모듈, React import 금지).

   왜 필요한가: 이 17개 화면은 `PageSchema`(columns 1벌·flat)로 담기지 않는 표가 대부분이다 —
   2단 헤더·합계행·한 화면 여러 표·탭 통합. 그렇다고 페이지마다 ColDef·엑셀 헤더·합계 계산을 손으로 쓰면
   같은 원문을 세 벌(화면·엑셀·테스트)로 옮겨 적게 되고, 한쪽만 고쳐져 원문과 갈라진다.
   그래서 **표 하나 = TableMeta 한 벌**을 SSOT 로 두고, 거기서 AG Grid 컬럼(risk_view_kit.tsx)·엑셀 헤더·
   합계 행·출처 충실성 테스트(risk_pages_17.test.ts)를 모두 파생한다.

   값 계약
   - 금액(kind 'amount') 행 값은 **원(KRW) 단위 숫자**다. 단위 환산은 렌더·엑셀 경계에서만 한다(schemas/unit.ts 계약과 같다).
   - 원문에 값이 없는 칸은 `null` 이다(화면 표시는 `-`). 원문이 문자열로 적은 값('미보고'·'해당없음'·'-')은 그대로 둔다 —
     숫자로 바꾸거나 0 으로 채우지 않는다(창작 금지). */
import type { Tone } from './components';
import { formatUnit, UNIT_DIV } from './schemas/unit';
import type { Unit } from './schemas/unit';

export type Cell = string | number | null;
/** 표 한 행. `id` 는 AG Grid getRowId 용 안정 키(원문 값이 아니다 — 화면·엑셀에 나오지 않는다). */
export type Row = { id: string } & Record<string, Cell>;

/** 셀 종류 — 정렬·서식을 한꺼번에 정한다.
    text=좌측 텍스트 · center=가운데 텍스트 · date=가운데 날짜/년월 · amount=우측 금액(단위 환산 대상)
    number=우측 수치(단위 환산 안 함: 주식수·건수·배수·IRR) · badge=상태 배지 */
export type ColKind = 'text' | 'center' | 'date' | 'amount' | 'number' | 'badge';

/** 합계 행 규칙 — 표마다 원문이 다르다(한 가지 "숫자면 합산" 규칙을 두지 않는다).
    'sum' = null 을 0 으로 보고 합산(원문 `reduce((a,r)=>a+(r[k]||0))`) · 'dash' = '-' 표시 ·
    함수 = 파생값(누적Multiple 처럼 합계끼리 나눈 값) · 미지정 = 빈 칸(원문 colspan 영역). */
export type TotalRule = 'sum' | 'dash' | ((rows: readonly Row[]) => Cell);

export interface ColMeta {
  key: string;
  label: string;
  kind: ColKind;
  /** 2단 헤더의 상위 묶음 이름 — **연속한** 컬럼이 같은 group 이면 한 그룹으로 접힌다 */
  group?: string;
  /** 배지 값 → 톤. 목업 `.tag` 색 클래스(g=success · a=warning · d/r=danger · b=info · n=muted)를 옮긴다 */
  tones?: Record<string, Tone>;
  /** 값과 무관한 고정 톤(원문이 컬럼 단위로 색을 정한 경우 — 정상/주의/경고 기준 칸). tones 가 우선 */
  tone?: Tone;
  /** 원문이 이 칸을 입력칸으로 둔다(모태펀드 가치평가의 미투자자산·기타자산·기타부채) */
  editable?: boolean;
  /** 강조 칸(원문 `.hl` — 총운영성과·수익배수) */
  strong?: boolean;
  /** 숫자를 고정 소수 자릿수로 보인다(원문 `toFixed(2)`) */
  fixed?: number;
  /** 음수를 위험색으로(원문 `.neg` / `color:var(--danger)`) */
  neg?: boolean;
  /** 이 셀이 상세 팝업을 여는 트리거다(IRR 근거) */
  link?: boolean;
  /** 정렬 재지정(원문이 수치를 가운데 정렬한 칸 — 결산월·종업원수·배수 등). 미지정이면 kind 기본값 */
  align?: 'left' | 'center' | 'right';
  /** 좌측 고정 */
  pinned?: boolean;
  /** 최소 폭(px). 미지정이면 kind 기본값 */
  width?: number;
  total?: TotalRule;
  /** 원문이 행 값을 저장하지 않고 렌더 때 계산하는 칸(누적Multiple = 운용성과÷투자금액, 투자잔액 = 총투자−회수).
      값은 같은 식으로 계산해 싣는다 — 출처 충실성 테스트는 이 칸을 원문 리터럴과 대조하지 않는다 */
  derived?: boolean;
  /** 엑셀에서 뺀다 — 값이 아니라 조작 UI 만 있는 칸(원문 `관리` 버튼 묶음). 화면·헤더 대조에는 남는다 */
  noExport?: boolean;
}

export interface TableMeta {
  /** 표 식별자(엑셀 시트명·테스트 키) */
  id: string;
  /** 섹션 제목 — 목업 `.sectitle`/`.cap`/`.sechead` 원문. 단일 표 화면은 비운다 */
  title?: string;
  cols: ColMeta[];
  rows: Row[];
  /** 합계 행 라벨(원문 `합계`). 있으면 pinned bottom 행을 만든다 */
  totalLabel?: string;
  /** 0행일 때 문구 — 원문 그대로 */
  empty?: string;
  /** 금액 칸의 단위별 소수 자릿수(화면 표시) — 원문이 공용 규칙(백만원·억원 최대 2자리)과 다르게 적은 표만 선언한다
      (연도별투자현황: 억원 최대 1자리 · 상세 억원 항상 1자리). 저장값·엑셀 숫자는 그대로다 */
  unitDigits?: Partial<Record<'원' | '백만원' | '억원', { min: number; max: number }>>;
}

/** 출처 — 화면을 그린 목업 파일(저장소 상대경로). 통합 화면은 여러 개다. */
export interface Provenance { capturedAt: string; sourceSystem: string; captureFiles: string[] }

export const MOCKUP_DIR = 'docs/mockups/02_조기경보';
export const src = (file: string): string => `${MOCKUP_DIR}/${file}`;

/* ──────────────────────────────
   파생 — 헤더 행·합계 행
────────────────────────────── */

/** 헤더를 **목업 `<thead>` 의 `<th>` 등장 순서** 그대로 편다.
    1행 = 그룹이 없는 컬럼(rowspan) + 그룹 이름(첫 등장에서 1번), 2행 = 그룹에 속한 리프.
    테스트가 이 순서를 원문 `<th>` 열과 그대로 대조한다. */
export function headerSequence(cols: readonly ColMeta[]): string[] {
  const row1: string[] = [];
  const row2: string[] = [];
  let prevGroup: string | undefined;
  for (const c of cols) {
    if (!c.group) { row1.push(c.label); prevGroup = undefined; continue; }
    if (c.group !== prevGroup) row1.push(c.group);
    row2.push(c.label);
    prevGroup = c.group;
  }
  return [...row1, ...row2];
}

/** 연속 그룹 묶음 — [{ group?, cols }] (ColGroupDef·엑셀 병합 공용) */
export function groupRuns(cols: readonly ColMeta[]): { group?: string; cols: ColMeta[] }[] {
  const out: { group?: string; cols: ColMeta[] }[] = [];
  for (const c of cols) {
    const last = out[out.length - 1];
    if (c.group && last && last.group === c.group) last.cols.push(c);
    else out.push({ group: c.group, cols: [c] });
  }
  return out;
}

const num = (v: Cell): number => (typeof v === 'number' ? v : 0);

/** 합계 행 1개 — 컬럼 규칙대로. 라벨은 첫 컬럼에 싣는다(원문 colspan 영역의 시작). */
export function computeTotal(table: TableMeta): Row | null {
  if (!table.totalLabel) return null;
  const out: Row = { id: `${table.id}-total` };
  table.cols.forEach((c, i) => {
    const rule = c.total;
    if (i === 0 && !rule) { out[c.key] = table.totalLabel!; return; }
    if (rule === 'sum') out[c.key] = table.rows.reduce((a, r) => a + num(r[c.key]), 0);
    else if (rule === 'dash') out[c.key] = '-';
    else if (typeof rule === 'function') out[c.key] = rule(table.rows);
    else out[c.key] = '';
  });
  return out;
}

/** 두 합계의 비(원문 `(td/tc).toFixed(2)`) — 분모 0 이면 '-' */
export const ratioOf = (numKey: string, denKey: string, digits = 2) => (rows: readonly Row[]): Cell => {
  const n = rows.reduce((a, r) => a + num(r[numKey]), 0);
  const d = rows.reduce((a, r) => a + num(r[denKey]), 0);
  return d ? (n / d).toFixed(digits) : '-';
};

/** 금액 표시 문자열 — 표가 단위별 소수 자릿수를 선언했으면 그대로, 아니면 공용 formatUnit(schemas/unit.ts) */
export function amountText(won: number, unit: Unit, digits?: TableMeta['unitDigits']): string {
  const d = digits?.[unit];
  if (!d) return formatUnit(won, unit);
  return (won / UNIT_DIV[unit]).toLocaleString('en-US', { minimumFractionDigits: d.min, maximumFractionDigits: d.max });
}
