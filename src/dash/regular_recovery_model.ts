/* 정기보고회수내역(S1_29) — 정기보고(regular-report) 리프의 두 번째 탭 표 선언(순수 모듈, React import 금지).
   출처: docs/mockups/01_투자자산관리/S1_29_정기보고회수내역.html `var DATA`(회수거래 11건) + `build()`(투자기업 단위 소계 · 합계).

   왜 스키마(GenericListPage)가 아닌가: 원문 표는 **본문 인라인 소계 6행**(투자기업 grp 끝마다) + tfoot 합계를 갖는다.
   PageSchema 는 데이터 행 1벌 + (opt-in) 합계 1행까지라 인라인 소계를 담지 못한다 → typed 표(TableMeta → ReadGrid).
   종전 `schemas/정기보고회수내역.ts` 는 메뉴에서 도달 불가한 고아였고(sample 없음 = 합성 더미), 이 파일로 대체해 삭제했다.

   값 규약(원문 build() 그대로)
   - 행 순서 = 원문 DATA 순서, 각 grp 끝에 소계 1행. 정렬하지 않는다(소계가 흩어진다).
   - 수익금액(B-A) = b − a(원문이 렌더 때 계산 — derived) · 감액금액 = 0(원문 `ded=0`).
   - 소계 투자금액 = grp 첫 행 inv **1번**(거래마다 반복되는 값이라 중복 합산 금지 — 원문 주석).
   - 합계 = 소계들의 합(원문 gInv+=sInv …). 그래서 합계 규칙은 **소계 행만** 더한다 — 본문 전체를 'sum' 하면 이중 합산.
   - 회수 상태·비고 빈 값은 '-'(원문 `r.status||'-'`). 소계·합계의 회수완료 여부·회수일자·회수 상태·비고 = '-'.
   - 금액 단위 토글: 원 0자리 · 백만원 1자리 · 억원 2자리 고정(원문 UNITS dec). 푸터 건수 = 회수거래 11건(원문 `cnt`). */
import type { ColMeta, Row, TableMeta, Cell } from './risk_table_meta';

export const RECOVERY_SOURCE = 'docs/mockups/01_투자자산관리/S1_29_정기보고회수내역.html';

/** 원문 고정 운용사·자펀드(캡처 실데이터 — 전 행 동일) */
export const RECOVERY_GP = 'NH투자증권';
export const RECOVERY_FUND = '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사';

/** 원문 `var DATA` 11건 — 필드명·값 그대로 */
export const RECOVERY_DATA = [
  { grp: 1, co: '(주)원플러스',              t: '2017-03-09', inv: 1000000000, done: true,  rd: '2018-03-27', a: 1000000000, b: 1200000000, status: '회수 완료', memo: 'M&A' },
  { grp: 2, co: '농업회사법인(주)행복한농장', t: '2017-11-28', inv: 2000008000, done: true,  rd: '2023-07-31', a: 1000000000, b: 1163231925, status: '',        memo: '상환' },
  { grp: 2, co: '농업회사법인(주)행복한농장', t: '2017-11-28', inv: 2000008000, done: true,  rd: '2024-03-28', a: 1000008000, b: 1227170382, status: '회수 완료', memo: '상환' },
  { grp: 3, co: '(주)네추럴웨이',            t: '2018-01-04', inv: 3999984282, done: true,  rd: '2021-04-12', a: 1999992141, b: 3058984705, status: '회수 완료', memo: '장외매각' },
  { grp: 3, co: '(주)네추럴웨이',            t: '2018-01-04', inv: 3999984282, done: true,  rd: '2021-04-12', a: 1999992141, b: 3059043435, status: '',        memo: '장외매각' },
  { grp: 4, co: '(주)산들촌',                t: '2018-09-14', inv: 1999520000, done: false, rd: '2023-09-13', a: 100000000,  b: 126603221,  status: '',        memo: '상환' },
  { grp: 4, co: '(주)산들촌',                t: '2018-09-14', inv: 1999520000, done: false, rd: '2023-12-13', a: 400000000,  b: 513823977,  status: '',        memo: '상환' },
  { grp: 4, co: '(주)산들촌',                t: '2018-09-14', inv: 1999520000, done: false, rd: '2024-10-11', a: 136320000,  b: 194205590,  status: '',        memo: '상환' },
  { grp: 4, co: '(주)산들촌',                t: '2018-09-14', inv: 1999520000, done: false, rd: '2025-04-30', a: 127680000,  b: 187811561,  status: '',        memo: '상환' },
  { grp: 5, co: '(주)네추럴웨이',            t: '2019-03-11', inv: 999991182,  done: true,  rd: '2021-04-12', a: 999991182,  b: 1233571315, status: '회수 완료', memo: '장외매각' },
  { grp: 6, co: '(주)프레시지',              t: '2019-08-12', inv: 3000620000, done: true,  rd: '2021-12-28', a: 3000620000, b: 4098024000, status: '회수 완료', memo: '기타' },
] as const;

const SUB_PREFIX = 'sub-';
/** 본문 인라인 소계 행 판정 — ReadGrid isSubtotal(모듈 상수라 참조 안정) */
export const isRecoverySubtotal = (r: Row): boolean => r.id.startsWith(SUB_PREFIX);

/** 합계 = 소계 행들의 합(원문 gInv+=sInv …) */
const sumSubtotals = (key: string) => (rows: readonly Row[]): Cell =>
  rows.filter(isRecoverySubtotal).reduce((a, r) => a + (typeof r[key] === 'number' ? (r[key] as number) : 0), 0);

/** 원문 `<thead>` 14칸 순서 그대로 */
export const RECOVERY_COLS: ColMeta[] = [
  { key: 'no', label: 'NO', kind: 'center' },
  { key: 'gp', label: '운용사', kind: 'text' },
  { key: 'fund', label: '자펀드', kind: 'text' },
  { key: 'co', label: '투자기업', kind: 'text' },
  { key: 't', label: '투자시점', kind: 'date' },   // 운용사~투자시점 = 원문 tfoot colspan 5 라벨 영역(빈 칸)
  { key: 'inv', label: '투자금액', kind: 'amount', total: sumSubtotals('inv') },
  /* 원문 doneTag — O = `.tag g`(success) · X = `.tag n`(muted) */
  { key: 'done', label: '회수완료 여부', kind: 'badge', tones: { O: 'success', X: 'muted' }, total: 'dash' },
  { key: 'rd', label: '회수일자', kind: 'date', total: 'dash' },
  { key: 'a', label: '회수원금(A)', kind: 'amount', total: sumSubtotals('a') },
  { key: 'b', label: '회수금액(B)', kind: 'amount', total: sumSubtotals('b') },
  { key: 'p', label: '수익금액(B-A)', kind: 'amount', derived: true, total: sumSubtotals('p') },
  { key: 'd', label: '감액금액', kind: 'amount', total: sumSubtotals('d') },
  { key: 'status', label: '회수 상태', kind: 'center', total: 'dash' },
  { key: 'memo', label: '비고', kind: 'center', total: 'dash' },
];

/** 원문 build() — 거래 행(No 1..11) + grp 끝 소계. 소계의 운용사~투자시점은 원문 colspan 5 라벨 영역이라 빈 칸 */
function buildRows(): Row[] {
  const out: Row[] = [];
  let no = 0;
  let i = 0;
  while (i < RECOVERY_DATA.length) {
    const grp = RECOVERY_DATA[i].grp;
    const sInv = RECOVERY_DATA[i].inv;
    let sA = 0, sB = 0, sP = 0;
    const sD = 0;
    while (i < RECOVERY_DATA.length && RECOVERY_DATA[i].grp === grp) {
      const r = RECOVERY_DATA[i];
      no += 1;
      const profit = r.b - r.a;
      sA += r.a; sB += r.b; sP += profit;
      out.push({
        id: `tx-${no}`, no: String(no), gp: RECOVERY_GP, fund: RECOVERY_FUND, co: r.co, t: r.t, inv: r.inv,
        done: r.done ? 'O' : 'X', rd: r.rd, a: r.a, b: r.b, p: profit, d: 0,
        status: r.status || '-', memo: r.memo || '-',
      });
      i += 1;
    }
    out.push({
      id: `${SUB_PREFIX}${grp}`, no: '소계', gp: '', fund: '', co: '', t: '', inv: sInv,
      done: '-', rd: '-', a: sA, b: sB, p: sP, d: sD, status: '-', memo: '-',
    });
  }
  return out;
}

export const RECOVERY_TABLE: TableMeta = {
  id: 'regular-recovery',
  cols: RECOVERY_COLS,
  rows: buildRows(),
  totalLabel: '합계',
  /* 원문 UNITS — 백만원 1자리 · 억원 2자리 고정(ko-KR min=max) */
  unitDigits: { 백만원: { min: 1, max: 1 }, 억원: { min: 2, max: 2 } },
};

/** 회수거래(데이터 행) 수 — 푸터 건수(원문 `cnt` = 11, 소계 제외) */
export const recoveryTxCount = (rows: readonly Row[]): number => rows.filter((r) => !isRecoverySubtotal(r)).length;
