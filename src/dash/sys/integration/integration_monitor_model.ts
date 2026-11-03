/* 연동 모니터링(ADM-005) — 순수 모델(UI 없음). 출처: `연동 모니터링.html` 스크립트의 `filteredT`·`filteredP`·`openDetail`·
   `fileSize`·`cdTag`·`sttsTag`. 페이지·상세 팝업은 이 함수들만 배선한다.
   ⚠ 실제 외부연동 모니터링이 아니다 — 데모 행을 화면 로컬로 조회만 한다. 재처리(Retry) 트리거는 없다(페이지 머리 주석). */
import { TRSM, PRCS, ATTACH } from './integration_monitor_data';
import type { TrsmRow, PrcsRow, AttachRow, PrcsStatus, Direction } from './integration_monitor_data';

/* ──────────────────────────────
   응답코드 — 목업 `cdTag`: '0' = 성공, 그 외 = 오류(코드 문자열 그대로)
────────────────────────────── */
/** 응답코드 칩 값 — '' 전체 · ok 성공 · err 오류(목업 `t-f-cd` option value 그대로) */
export const CD_FILTERS = ['ok', 'err'] as const;
export type CdFilter = typeof CD_FILTERS[number];
export const CD_LABEL: Readonly<Record<CdFilter, string>> = Object.freeze({ ok: '성공', err: '오류' });

export const isOk = (cd: string): boolean => cd === '0';
/** 응답코드 표시 문자열 — 목업 `cdTag`('0 · 성공' / 코드) */
export const cdText = (cd: string): string => (isOk(cd) ? '0 · 성공' : cd);

/* ──────────────────────────────
   배지 톤 — 목업 tag 색(g 초록·b 파랑·a 호박·d 빨강·n 회색)을 StatusBadge tone 으로 1:1 대응
────────────────────────────── */
type Tone = 'success' | 'info' | 'warning' | 'danger' | 'muted' | 'primary';
/** 처리상태 — 목업 `sttsTag`: 반영완료 g · 반영대기 b · 검증오류 a · 반영실패 d · 제외 n */
export const STTS_TONE: Readonly<Record<PrcsStatus, Tone>> = Object.freeze({
  '반영완료': 'success', '반영대기': 'info', '검증오류': 'warning', '반영실패': 'danger', '제외': 'muted',
});
/** 응답코드 — 목업 `cdTag`: 성공 g · 오류 d */
export const cdTone = (cd: string): Tone => (isOk(cd) ? 'success' : 'danger');
/** 송수신 — 목업 `trrcTag` 는 수신 b(파랑)·송신 g(초록)이지만 초록이 '성공'과 겹쳐 송신은 primary 로 둔다(결정 기록: 페이지 머리 주석) */
export const TRRC_TONE: Readonly<Record<Direction, Tone>> = Object.freeze({ '수신': 'info', '송신': 'primary' });

/* ──────────────────────────────
   필터 — 목업 `filteredT`·`filteredP`. 기간은 일시 앞 10자리(YYYY-MM-DD) 문자열 비교, 빈 경계는 열어 둔다
────────────────────────────── */
const inRange = (ts: string, from?: string, to?: string): boolean => {
  const d = ts.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

export interface TrsmFilter { inst?: string; mth?: string; trrc?: string; cd?: CdFilter | ''; from?: string; to?: string }
/** 송수신이력 — 연계기관·연계방식·송수신 정확일치 + 응답코드(성공/오류) + 요청기간(요청일시 기준) */
export function filterTrsm(rows: readonly TrsmRow[], f: TrsmFilter): TrsmRow[] {
  return rows.filter((r) => {
    if (f.inst && r.inst !== f.inst) return false;
    if (f.mth && r.mth !== f.mth) return false;
    if (f.trrc && r.trrc !== f.trrc) return false;
    if (f.cd === 'ok' && !isOk(r.cd)) return false;
    if (f.cd === 'err' && isOk(r.cd)) return false;
    return inRange(r.req, f.from, f.to);
  });
}

export interface PrcsFilter { tbl?: string; stts?: string; from?: string; to?: string }
/** 연계처리이력 — 대상테이블 정확일치 + 처리상태(변경후 상태) + 발생기간(발생일시 기준) */
export function filterPrcs(rows: readonly PrcsRow[], f: PrcsFilter): PrcsRow[] {
  return rows.filter((r) => {
    if (f.tbl && r.tbl !== f.tbl) return false;
    if (f.stts && r.aft !== f.stts) return false;
    return inRange(r.dt, f.from, f.to);
  });
}

/** 응답코드 칩 건수(facet — 호출부가 응답코드만 뺀 모집단을 넘긴다) */
export function cdCounts(rows: readonly TrsmRow[]): Record<CdFilter, number> {
  const ok = rows.filter((r) => isOk(r.cd)).length;
  return { ok, err: rows.length - ok };
}

/** 처리상태 칩 건수(facet — 호출부가 처리상태만 뺀 모집단을 넘긴다) */
export function sttsCounts(rows: readonly PrcsRow[]): Record<PrcsStatus, number> {
  const c: Record<PrcsStatus, number> = { '반영대기': 0, '반영완료': 0, '검증오류': 0, '반영실패': 0, '제외': 0 };
  for (const r of rows) c[r.aft]++;
  return c;
}

/* ──────────────────────────────
   상세 조회 — 목업 `openDetail(sn)`: 연계일련번호 → 송수신 1건 + 그 건의 처리이력·첨부파일
────────────────────────────── */
export const trsmBySn = (sn: number, rows: readonly TrsmRow[] = TRSM): TrsmRow | null => rows.find((r) => r.sn === sn) ?? null;
export const prcsOf = (sn: number, rows: readonly PrcsRow[] = PRCS): PrcsRow[] => rows.filter((r) => r.linkSn === sn);
export const attachOf = (sn: number, rows: readonly AttachRow[] = ATTACH): AttachRow[] => rows.filter((r) => r.linkSn === sn);
/** 재전송 건의 원연계 건(최초 건). 원연계일련번호가 없거나 데이터에 없으면 null */
export const originOf = (r: TrsmRow, rows: readonly TrsmRow[] = TRSM): TrsmRow | null => (r.orgnlSn == null ? null : trsmBySn(r.orgnlSn, rows));

/* ──────────────────────────────
   표시 문자열
────────────────────────────── */
/** 파일 크기 — 목업 `fileSize`: 1MB 이상 'x.x MB', 그 외 'n KB' */
export const fileSize = (n: number): string => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1024).toFixed(0) + ' KB');
/** 변경전→후 — 그리드 정렬·엑셀 공용 문자열(변경전 없음 = '-') */
export const transitionText = (r: PrcsRow): string => `${r.bef ?? '-'} → ${r.aft}`;
/** 재처리 횟수 — 목업 `(r.retry||0)+'회'` */
export const retryText = (n: number): string => `${n || 0}회`;
