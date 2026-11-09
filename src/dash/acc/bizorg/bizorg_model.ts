/* 농식품경영체(ACC-023 경영체 정보 조회 · ACC-024 IR정보 조회) 순수 모델 — 필터·기간 검증·재무비율·주주 합계·운용사→자펀드 연동.
   화면·모달·테스트 공용. 기간 검증 문구는 삭제전표(ACC-004)의 validatePeriod 를 그대로 다시 내보낸다(복사가 아니라 같은 함수). */
import { validatePeriod, PERIOD_ERROR } from '../slip/deleted_journal_model';
import { ALL_FUNDS, GP_FUNDS } from './bizorg_data';
import type { AgriEntity, BizMaterial, Financial, GovSupport, IrEvent, IrParticipant, Shareholder } from './bizorg_data';

export { validatePeriod, PERIOD_ERROR };

const includesCI = (hay: string, needle: string) => {
  const q = needle.trim().toLowerCase();
  return !q || hay.toLowerCase().includes(q);
};

/* ── ACC-023 경영체 필터 — 빈 문자열 = 미적용(select '' = 전체) ── */
export interface EntityFilter {
  name: string;        // 기업명(부분일치)
  corpKind: string;    // 기업구분(정확일치)
  stockKind: string;   // 주식구분
  womenYn: string;     // 여성기업여부
  auditYn: string;     // 외부감사여부
  useYn: string;       // 사용여부
}
export const EMPTY_ENTITY_FILTER: EntityFilter = { name: '', corpKind: '', stockKind: '', womenYn: '', auditYn: '', useYn: '' };

/** 경영체 정렬 — 기업명 가나다순 */
export function sortEntities(rows: readonly AgriEntity[]): AgriEntity[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/** 경영체 필터 — 조건끼리 AND, 결과는 sortEntities 순서 */
export function filterEntities(rows: readonly AgriEntity[], f: EntityFilter): AgriEntity[] {
  return sortEntities(rows.filter((r) =>
    includesCI(r.name, f.name)
    && (!f.corpKind || r.corpKind === f.corpKind)
    && (!f.stockKind || r.stockKind === f.stockKind)
    && (!f.womenYn || r.womenYn === f.womenYn)
    && (!f.auditYn || r.auditYn === f.auditYn)
    && (!f.useYn || r.useYn === f.useYn)));
}

/* ── ACC-024 IR 필터 ── */
export interface IrFilter {
  name: string;    // IR명(부분일치)
  gp: string;      // 운용사(정확일치)
  fund: string;    // 자펀드(정확일치)
  from: string;    // IR일자 시작 'YYYY-MM-DD'(포함)
  to: string;      // IR일자 종료(포함)
  place: string;   // 장소(부분일치)
  useYn: string;   // 사용여부(정확일치)
}
export const EMPTY_IR_FILTER: IrFilter = { name: '', gp: '', fund: '', from: '', to: '', place: '', useYn: '' };

/** IR 정렬 — IR일자 내림차순, 같은 날은 IR명 가나다순 */
export function sortIrs(rows: readonly IrEvent[]): IrEvent[] {
  return [...rows].sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name, 'ko') : a.date < b.date ? 1 : -1));
}

/** IR 필터 — 조건끼리 AND, 결과는 sortIrs 순서. 기간 오류(시작 > 종료) 처리는 화면이 validatePeriod 로 0건을 만든다 */
export function filterIrs(rows: readonly IrEvent[], f: IrFilter): IrEvent[] {
  return sortIrs(rows.filter((r) =>
    includesCI(r.name, f.name)
    && (!f.gp || r.gp === f.gp)
    && (!f.fund || r.fund === f.fund)
    && (!f.from || r.date >= f.from)
    && (!f.to || r.date <= f.to)
    && includesCI(r.place, f.place)
    && (!f.useYn || r.useYn === f.useYn)));
}

/** 자펀드 옵션 — 운용사를 고르면 그 운용사 자펀드만, 아니면 전체 */
export function fundOptions(gp: string): readonly string[] {
  return gp ? GP_FUNDS[gp] ?? [] : ALL_FUNDS;
}

/** 운용사 변경 — 값이 바뀌면(× 해제 포함) 자펀드를 비운다. 같은 값이면 그대로 */
export function withGp(f: IrFilter, gp: string): IrFilter {
  return gp === f.gp ? f : { ...f, gp, fund: '' };
}

/** 참가수 = 참가경영체 배열 길이 */
export const participantCount = (ir: IrEvent) => ir.participants.length;

/* ── 재무비율 ── */
const round1 = (x: number) => Math.round(x * 10) / 10;

/** 비율(%) 소수 1자리 — 분모 ≤ 0 이면 null(N/A). 자본잠식(자본 음수)·매출 0 이하는 비율이 의미 없다 */
export function ratioPct(num: number, den: number): number | null {
  return den <= 0 ? null : round1((num / den) * 100);
}
/** 부채비율 = 부채총계 / 자본총계 × 100 — 자본 ≤ 0(자본잠식)이면 null */
export const debtRatio = (f: Financial) => ratioPct(f.liabilities, f.equity);
/** 영업이익률 = 영업이익 / 매출액 × 100 — 매출 ≤ 0 이면 null */
export const opMargin = (f: Financial) => ratioPct(f.opIncome, f.revenue);

/* ── 주주현황 ── */
export interface HolderSummary {
  rows: Shareholder[];    // 지분율 내림차순(같으면 주주명)
  totalShares: number;    // 보유주식수 합
  totalRatio: number;     // 지분율 합(소수 1자리)
  ratioOk: boolean;       // 합계 = 100.0 이면 true — 아니면 화면이 경고
}
export function summarizeHolders(list: readonly Shareholder[]): HolderSummary {
  const rows = [...list].sort((a, b) => (b.ratio === a.ratio ? a.name.localeCompare(b.name, 'ko') : b.ratio - a.ratio));
  const totalShares = rows.reduce((s, r) => s + r.shares, 0);
  /* 부동소수 누적 오차(33.3+33.3+33.4) 때문에 소수 1자리로 반올림한 뒤 비교한다 */
  const totalRatio = round1(rows.reduce((s, r) => s + r.ratio, 0));
  return { rows, totalShares, totalRatio, ratioOk: totalRatio === 100 };
}

/* ── IR 참가경영체 — 경영체 정보를 붙이고 상담일자 → 기업명 순 ── */
export interface ParticipantRow extends IrParticipant {
  entity: AgriEntity | null;   // id 를 못 찾으면 null(화면은 '-')
  name: string;                // 기업명(정렬·표시용)
}
export function participantRows(ir: IrEvent, entities: readonly AgriEntity[]): ParticipantRow[] {
  return ir.participants
    .map((x) => {
      const entity = entities.find((e) => e.id === x.entityId) ?? null;
      return { ...x, entity, name: entity?.name ?? '-' };
    })
    .sort((a, b) => (a.consultDate === b.consultDate ? a.name.localeCompare(b.name, 'ko') : a.consultDate < b.consultDate ? -1 : 1));
}

/* ── 정부지원사업(설계서 v1.1 슬라이드 15) — 사업연도 내림차순(같은 해는 지원기간 내림차순 → 사업명) + 지원금액 합계 ── */
export function sortGovSupports(list: readonly GovSupport[]): GovSupport[] {
  return [...list].sort((a, b) => (a.year !== b.year ? (a.year < b.year ? 1 : -1)
    : a.period !== b.period ? (a.period < b.period ? 1 : -1)
      : a.name.localeCompare(b.name, 'ko')));
}
/** 지원금액 합계(백만원) — 진행상태 '취소' 건은 제외한다(지원이 실제로 이뤄지지 않음, 2026-11-06 사용자 지시) */
export const govSupportTotal = (list: readonly GovSupport[]) => list.reduce((s, r) => (r.status === '취소' ? s : s + r.amount), 0);
/** 합계 행 라벨 — 제외 기준을 드러낸다 */
export const GOV_TOTAL_LABEL = '합계(취소 제외)';

/* ── 사업계획서·홍보자료(슬라이드 16) — 수정일자 내림차순('YYYY.MM.DD' 0-패딩이라 문자열 비교 = 시간순), 같은 날은 자료명 ── */
export function sortMaterials(list: readonly BizMaterial[]): BizMaterial[] {
  return [...list].sort((a, b) => (a.updatedAt === b.updatedAt ? a.title.localeCompare(b.title, 'ko') : a.updatedAt < b.updatedAt ? 1 : -1));
}
