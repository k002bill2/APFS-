/* 투자실적 현황(투자기업) — S1_34 원문 3개 집계표의 SSOT.
   출처: docs/mockups/01_투자자산관리/S1_34_투자실적_현황_투자기업_.html (2026-09-15 파싱 실측)

   원문은 **목록이 아니라 집계 매트릭스 3장**이다:
   ① 경영체 매출액별 투자실적 — 투자건수·투자금액 2블록 × 연도 16행 + 합 계
   ② 투자형태별 투자실적   — 같은 2블록 구조, 열이 주식(보통주 신주/구주·전환우선주)/채권(BW·CB)/
                              프로젝트로 **3단 헤더**
   ③ 소재지별 투자실적     — 18개 소재지 + 합계, 투자건수(건수·비율)·투자금액(금액·비율) 2단 헤더

   `PageSchema` 는 `columns` 한 벌 + 평평한 행이라 블록(rowspan) 구조도 3단 헤더도 담지 못한다.
   이전 상태(2026-09-15 이전): 이 라우트가 '소재지 6컬럼' 리스트 스키마로 축소돼 **합성 더미 20행**을
   보여 줬다. ①②를 통째로 잃고 ③도 컬럼이 달랐다.

   ⚠ 단위: ①②의 `투자금액` 블록과 ③의 `금액`은 원문이 이미 **억원**이다(2010년 943 = 943억).
     `schemas/unit.ts` 저장 단위 계약(원 정수)이 아니므로 금액 단위 토글을 붙이지 않는다 —
     붙이면 943을 다시 1e8로 나눠 0.00으로 만든다. */
import { onOrBefore } from '../../schemas/filter_field';
import { apportion } from '../../stat_apportion';

/** 블록형 매트릭스 행 — `block`(투자건수/투자금액)이 원문 rowspan 셀, `label`이 연도 또는 `합 계`. */
export interface MatrixRow { block: string; label: string; values: (number | string)[] }
/** 소재지별 행 — values = [투자건수, 건수비율, 투자금액, 금액비율]. 비율은 원문 표기 문자열 그대로. */
export interface RegionRow { no: number | string; region: string; values: (number | string)[] }

/** ① 경영체 매출액별 — 열 7개(원문 헤더 순서 그대로). */
export const SALES_SCALE_HEADERS = ['10억 미만', '30억 미만', '50억 미만', '100억 미만', '100억 이상', '미보고', '합계'] as const;

/** ② 투자형태별 — 3단 헤더. 최하단 열 7개와 그 위 묶음을 원문 구조대로 기술한다. */
export const INVEST_TYPE_HEADERS = ['신주', '구주', '전환우선주', 'BW', 'CB', '프로젝트', '합계'] as const;
/** [묶음명, 하위 열 수, 차지하는 헤더 단 수] — 주식(3: 보통주 2 + 전환우선주 1) · 채권(2) · 나머지 2개는 3단 전체. */
export const INVEST_TYPE_GROUPS = [
  { label: '주식', span: 3 },
  { label: '채권', span: 2 },
] as const;

/** ③ 소재지별 — 2단 헤더. */
export const REGION_GROUPS = [
  { label: '투자건수', children: ['건수', '비율(%)'] },
  { label: '투자금액', children: ['금액', '비율(%)'] },
] as const;

export const SALES_SCALE_ROWS: MatrixRow[] = [
  { block: '투자건수', label: '2010년', values: [18, 3, 0, 2, 13, 5, 41] },
  { block: '투자건수', label: '2011년', values: [19, 5, 3, 5, 25, 16, 73] },
  { block: '투자건수', label: '2012년', values: [19, 9, 6, 6, 15, 19, 74] },
  { block: '투자건수', label: '2013년', values: [18, 8, 4, 4, 12, 21, 67] },
  { block: '투자건수', label: '2014년', values: [28, 11, 5, 8, 20, 28, 100] },
  { block: '투자건수', label: '2015년', values: [21, 3, 2, 9, 11, 29, 75] },
  { block: '투자건수', label: '2016년', values: [19, 2, 4, 3, 21, 17, 66] },
  { block: '투자건수', label: '2017년', values: [19, 5, 4, 14, 20, 15, 77] },
  { block: '투자건수', label: '2018년', values: [25, 8, 1, 4, 14, 15, 67] },
  { block: '투자건수', label: '2019년', values: [24, 9, 5, 20, 15, 32, 105] },
  { block: '투자건수', label: '2020년', values: [40, 13, 10, 13, 20, 40, 136] },
  { block: '투자건수', label: '2021년', values: [55, 31, 9, 17, 30, 47, 189] },
  { block: '투자건수', label: '2022년', values: [45, 16, 18, 9, 38, 74, 200] },
  { block: '투자건수', label: '2023년', values: [22, 8, 7, 6, 11, 91, 145] },
  { block: '투자건수', label: '2024년', values: [8, 3, 2, 7, 15, 49, 84] },
  { block: '투자건수', label: '2025년', values: [4, 2, 1, 1, 7, 29, 44] },
  { block: '투자건수', label: '합 계', values: [384, 136, 81, 128, 287, 527, 1543] },
  { block: '투자금액', label: '2010년', values: [292, 35, 0, 42, 409, 165, 943] },
  { block: '투자금액', label: '2011년', values: [225, 47, 33, 36, 335, 201, 877] },
  { block: '투자금액', label: '2012년', values: [223, 111, 71, 40, 192, 237, 873] },
  { block: '투자금액', label: '2013년', values: [151, 107, 50, 49, 145, 267, 768] },
  { block: '투자금액', label: '2014년', values: [222, 106, 75, 80, 342, 334, 1159] },
  { block: '투자금액', label: '2015년', values: [250, 29, 26, 119, 169, 410, 1003] },
  { block: '투자금액', label: '2016년', values: [321, 13, 50, 60, 376, 442, 1262] },
  { block: '투자금액', label: '2017년', values: [170, 85, 37, 180, 363, 176, 1010] },
  { block: '투자금액', label: '2018년', values: [261, 98, 10, 65, 151, 199, 784] },
  { block: '투자금액', label: '2019년', values: [168, 70, 55, 217, 246, 418, 1174] },
  { block: '투자금액', label: '2020년', values: [264, 104, 126, 167, 352, 469, 1481] },
  { block: '투자금액', label: '2021년', values: [468, 283, 71, 170, 388, 319, 1699] },
  { block: '투자금액', label: '2022년', values: [420, 182, 213, 121, 613, 748, 2297] },
  { block: '투자금액', label: '2023년', values: [190, 70, 74, 58, 132, 871, 1395] },
  { block: '투자금액', label: '2024년', values: [92, 35, 25, 89, 272, 642, 1156] },
  { block: '투자금액', label: '2025년', values: [50, 15, 5, 19, 219, 391, 699] },
  { block: '투자금액', label: '합 계', values: [1389, 921, 1512, 4703, 6288, 3766, 18579] },
];
export const INVEST_TYPE_ROWS: MatrixRow[] = [
  { block: '투자건수', label: '2010년', values: [0, 6, 13, 6, 6, 19, 50] },
  { block: '투자건수', label: '2011년', values: [6, 12, 21, 9, 17, 19, 84] },
  { block: '투자건수', label: '2012년', values: [3, 8, 28, 5, 32, 13, 89] },
  { block: '투자건수', label: '2013년', values: [2, 4, 26, 2, 23, 19, 76] },
  { block: '투자건수', label: '2014년', values: [2, 10, 30, 4, 38, 24, 108] },
  { block: '투자건수', label: '2015년', values: [1, 6, 38, 0, 28, 10, 83] },
  { block: '투자건수', label: '2016년', values: [4, 8, 32, 1, 23, 2, 70] },
  { block: '투자건수', label: '2017년', values: [3, 10, 53, 5, 14, 0, 85] },
  { block: '투자건수', label: '2018년', values: [2, 8, 45, 2, 15, 1, 73] },
  { block: '투자건수', label: '2019년', values: [3, 7, 89, 0, 13, 0, 112] },
  { block: '투자건수', label: '2020년', values: [3, 5, 120, 0, 12, 1, 141] },
  { block: '투자건수', label: '2021년', values: [11, 20, 145, 0, 18, 0, 194] },
  { block: '투자건수', label: '2022년', values: [14, 19, 149, 0, 27, 0, 209] },
  { block: '투자건수', label: '2023년', values: [4, 10, 105, 0, 32, 1, 152] },
  { block: '투자건수', label: '2024년', values: [1, 5, 59, 0, 23, 0, 88] },
  { block: '투자건수', label: '2025년', values: [0, 3, 38, 0, 7, 0, 48] },
  { block: '투자건수', label: '합 계', values: [59, 141, 991, 34, 328, 109, 1662] },
  { block: '투자금액', label: '2010년', values: [0, 113, 235, 190, 138, 266, 943] },
  { block: '투자금액', label: '2011년', values: [68, 80, 210, 94, 184, 241, 877] },
  { block: '투자금액', label: '2012년', values: [29, 45, 256, 48, 337, 148, 863] },
  { block: '투자금액', label: '2013년', values: [22, 25, 255, 18, 280, 169, 768] },
  { block: '투자금액', label: '2014년', values: [17, 68, 361, 58, 419, 237, 1159] },
  { block: '투자금액', label: '2015년', values: [10, 76, 443, 0, 349, 125, 1003] },
  { block: '투자금액', label: '2016년', values: [105, 81, 495, 8, 524, 50, 1262] },
  { block: '투자금액', label: '2017년', values: [55, 85, 640, 48, 182, 0, 1010] },
  { block: '투자금액', label: '2018년', values: [15, 75, 496, 12, 182, 5, 784] },
  { block: '투자금액', label: '2019년', values: [20, 25, 985, 0, 145, 0, 1174] },
  { block: '투자금액', label: '2020년', values: [11, 28, 1347, 0, 92, 3, 1481] },
  { block: '투자금액', label: '2021년', values: [73, 145, 1050, 0, 207, 0, 1475] },
  { block: '투자금액', label: '2022년', values: [130, 148, 1680, 0, 339, 0, 2297] },
  { block: '투자금액', label: '2023년', values: [19, 63, 1057, 0, 253, 3, 1395] },
  { block: '투자금액', label: '2024년', values: [10, 92, 754, 0, 286, 0, 1141] },
  { block: '투자금액', label: '2025년', values: [0, 89, 496, 0, 89, 0, 674] },
  { block: '투자금액', label: '합 계', values: [583, 1237, 10757, 476, 4005, 1246, 18305] },
];
export const REGION_ROWS: RegionRow[] = [
  { no: 1, region: '서울', values: [533, '34.5 %', 6638, '35.7 %'] },
  { no: 2, region: '인천', values: [30, '1.9 %', 328, '1.8 %'] },
  { no: 3, region: '부산', values: [52, '3.4 %', 601, '3.2 %'] },
  { no: 4, region: '대구', values: [17, '1.1 %', 162, '0.9 %'] },
  { no: 5, region: '대전', values: [51, '3.3 %', 482, '2.6 %'] },
  { no: 6, region: '세종', values: [13, '0.8 %', 152, '0.8 %'] },
  { no: 7, region: '광주', values: [9, '0.6 %', 95, '0.5 %'] },
  { no: 8, region: '울산', values: [16, '1 %', 298, '1.6 %'] },
  { no: 9, region: '경기', values: [369, '23.9 %', 4530, '24.4 %'] },
  { no: 10, region: '강원', values: [47, '3 %', 515, '2.8 %'] },
  { no: 11, region: '충남', values: [31, '2 %', 427, '2.3 %'] },
  { no: 12, region: '충북', values: [79, '5.1 %', 970, '5.2 %'] },
  { no: 13, region: '전북', values: [49, '3.2 %', 428, '2.3 %'] },
  { no: 14, region: '전남', values: [39, '2.5 %', 455, '2.4 %'] },
  { no: 15, region: '경북', values: [71, '4.6 %', 779, '4.2 %'] },
  { no: 16, region: '경남', values: [75, '4.9 %', 902, '4.9 %'] },
  { no: 17, region: '제주', values: [31, '2 %', 397, '2.1 %'] },
  { no: 18, region: '미보고', values: [31, '2 %', 419, '2.3 %'] },
  { no: '', region: '합계', values: [1543, '100.0 %', 18579, '100.0 %'] },
];

/* ──────────────────────────────
   검색조건 재계산 — 2026-11-16 사용자 지시 "미연동 필터 전부 동작"(종전 모펀드·계정구분·연도기준·
   데이터기준·기준일자 no-op). 집계표라 행을 거르지 않고 **수치를 다시 계산**한다(백엔드라면 조회 파라미터로 다시 집계할 값).
   전부 결정적이다(난수 없음 — 칸 위치로 정한다).
   · 모펀드·계정구분('전체' 기본) = 칸마다 첫 선택지 몫 round(v×w), 다른 선택지 = v − 첫 몫(몫의 합 = 원 값).
     w = 농식품모태펀드 0.86 · 농식품 0.90 에 칸 위치로 ±0.04.
   · 연도기준 = 출자사업년도(기본) 0 · 결성연도 1 · 등록연도 2 년씩 연도 축을 민다(앞 연도는 0, 표 끝 밖으로 밀린 값은 빠진다).
   · 데이터기준 월말확정 = 투자금액 칸에 칸별 확정률 0.96~1.00(운용사보고 중 월말 미확정분 제외), 건수는 그대로.
   · 기준일자 = 그 연도보다 뒤 연도 행을 뺀다(조회 시점 — onOrBefore).
   · 위 규칙을 칸마다 그대로 쓰는 건 **매출액별 표**뿐이다. 투자유형별(연도 행마다)·소재지별(표 전체) 표는 같은 조건의
     매출액별 표 총량 × 원문 비율을 총량으로 단계 배분한다(allocateStages — 계정구분·모펀드 몫은 칸마다 상보).
     칸마다 따로 몫을 내면 표끼리 건수 비율이 갈렸다(Codex P2 4회 — 2026-11-16).
   · 합계 열·합계 행은 바뀐 값으로 다시 합산한다. 리프 칸이 원문과 같으면(빈 값 ≡ 출자사업년도 ≡ 운용사보고,
     빠지는 연도 없음) **원문 배열을 그대로** 돌려준다 — 원문 합계는 행 합과 ±1 어긋나는 칸과 한 칸 밀린 매출액별
     투자금액 합계 행이 있어(원문 그대로), 재합산하면 기본 상태 수치가 바뀌기 때문이다.
────────────────────────────── */
export interface StatsFilter { mf: string; acc: string; yBase: string; dBase: string; asOf: string }
export const STATS_FILTER_DEFAULT: Readonly<StatsFilter> = Object.freeze({ mf: '', acc: '', yBase: '', dBase: '', asOf: '' });

const YEAR_SHIFT: Readonly<Record<string, number>> = { 결성연도: 1, 등록연도: 2 };
const jitter = (r: number, c: number) => ((Math.abs(r * 7 + c * 3) % 3) - 1) * 0.04;
/** 2지선다 몫 — 미선택('전체')이면 원 값, 첫 선택지면 round(v×w), 그 외(둘째 선택지)면 나머지 */
const split = (v: number, sel: string, first: string, w: number) =>
  (!sel ? v : sel === first ? Math.round(v * w) : v - Math.round(v * w));
/** 칸(r,c)의 모펀드 × 계정구분 몫 */
export const shareCell = (v: number, f: StatsFilter, r: number, c: number) =>
  split(split(v, f.mf === 'MOAF' ? 'MOAF' : '', '농식품모태펀드', 0.86 + jitter(r, c)), f.acc, '농식품', 0.9 + jitter(c, r));   // 모펀드: 농식품모태펀드 = 원문(목업에 전체 없음), MOAF = 나머지 몫
/** 월말확정 확정률 — 칸 위치로 0.96~1.00 */
const confirmRate = (r: number, c: number) => 1 - (Math.abs(r * 3 + c * 7) % 5) / 100;
const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
const isTotalLabel = (l: string) => l.replace(/\s/g, '') === '합계';

/** 블록 매트릭스(투자건수·투자금액 × 연도 + 합 계) 재계산 — 리프가 원문과 같으면 원문 배열 그대로 */
export function recomputeMatrix(rows: MatrixRow[], f: StatsFilter): MatrixRow[] {
  const shift = YEAR_SHIFT[f.yBase] ?? 0;
  const out: MatrixRow[] = [];
  let same = true;
  for (const block of [...new Set(rows.map((r) => r.block))]) {
    const yr = rows.filter((r) => r.block === block && !isTotalLabel(r.label));
    const width = yr[0].values.length - 1;   // 끝 열 = 합계
    const kept = yr.flatMap((r, i) => {
      if (!onOrBefore(String(parseInt(r.label, 10)), f.asOf)) { same = false; return []; }   // 조회 시점 이후 연도
      const si = i - shift;   // 연도기준 — 이 행에 실리는 원 연도 행
      const src = si >= 0 ? (yr[si].values.slice(0, width) as number[]) : Array<number>(width).fill(0);
      const leaves = src.map((v, c) => {
        const s = shareCell(v, f, si, c);
        return block === '투자금액' && f.dBase === '월말확정' ? Math.round(s * confirmRate(si, c)) : s;
      });
      if (leaves.some((v, c) => v !== r.values[c])) same = false;
      return [{ block, label: r.label, values: [...leaves, sum(leaves)] }];
    });
    const total = rows.find((r) => r.block === block && isTotalLabel(r.label))!;
    out.push(...kept, { block, label: total.label, values: Array.from({ length: width + 1 }, (_, c) => sum(kept.map((r) => r.values[c] as number))) });
  }
  return same ? rows : out;
}

/** 원문 비율 표기 — 소수 1자리, 끝자리 0 은 생략('1 %'), 합계는 '100.0 %' */
const pctText = (v: number, t: number) => (t ? `${Math.round((v / t) * 1000) / 10} %` : '-');
const leafTotal = (rows: MatrixRow[], block: string) =>
  sum(rows.filter((r) => r.block === block && !isTotalLabel(r.label)).map((r) => sum(r.values.slice(0, -1) as number[])));

/** 원문 벡터 하나를 검색조건 단계별 총량에 맞춰 배분 —
    ① 연도기준·시점(base) ② 모펀드 ③ 계정구분: 첫 선택지 몫을 배분하고(윗단계 칸이 용량) 다른 선택지 = 윗단계 − 첫 몫
    → 칸마다 농식품 + 수산 = 전체(상보, Codex P2) ④ 월말확정 확정률(금액만, 운용사보고 값이 용량).
    targetOf(g) = 그 단계 조건의 총량(매출액별 표에서 온다 — 표끼리 같은 비율), pos(i) = 칸 i 의 몫·확정률 좌표 */
function allocateStages(orig: number[], f: StatsFilter, targetOf: (g: StatsFilter) => number, pos: (i: number) => [number, number], amount: boolean): number[] {
  const timed: StatsFilter = { ...STATS_FILTER_DEFAULT, yBase: f.yBase, asOf: f.asOf };
  const stage = (up: number[], key: 'mf' | 'acc', first: string, g: StatsFilter) => {
    if (!g[key]) return up;
    if (key === 'mf') {   // 농식품모태펀드 = 원문 그대로(목업 select 에 '전체'가 없다), MOAF 만 몫을 배분
      if (g.mf !== 'MOAF') return up;
      return apportion(up.map((v, i) => shareCell(v, { ...STATS_FILTER_DEFAULT, mf: 'MOAF' }, ...pos(i))), targetOf(g), up);
    }
    const probe: StatsFilter = { ...STATS_FILTER_DEFAULT, [key]: first };
    const part = apportion(up.map((v, i) => shareCell(v, probe, ...pos(i))), targetOf({ ...g, [key]: first }), up);
    return g[key] === first ? part : up.map((v, i) => v - part[i]);
  };
  const base = apportion(orig, targetOf(timed));
  const byMf = stage(base, 'mf', '농식품모태펀드', { ...timed, mf: f.mf });
  const byAcc = stage(byMf, 'acc', '농식품', { ...timed, mf: f.mf, acc: f.acc });
  if (!amount || f.dBase !== '월말확정') return byAcc;
  return apportion(byAcc.map((v, i) => v * confirmRate(...pos(i))), targetOf(f), byAcc);
}

/** 같은 조건의 매출액별 표 — 다른 두 표가 총량을 여기서 가져간다(조건별 1회 계산) */
const salesFor = (() => {
  const memo = new Map<string, MatrixRow[]>();
  return (g: StatsFilter) => {
    const k = [g.mf, g.acc, g.yBase, g.dBase, g.asOf].join('|');
    if (memo.size > 64) memo.clear();   // 기준일자는 자유 입력이라 조합이 끝없다 — 작게 유지
    if (!memo.has(k)) memo.set(k, recomputeMatrix(SALES_SCALE_ROWS, g));
    return memo.get(k)!;
  };
})();
const leafSum = (r: MatrixRow) => sum(r.values.slice(0, -1) as number[]);

/** 투자유형별 재계산 — 연도 행마다 총량 = 같은 조건의 매출액별 같은 연도 행 합 × (원문 투자유형 행 합 / 원문 매출액별 행 합).
    두 표는 원문부터 모집단이 다르다(투자건수 1,662 vs 1,543 — 한 투자가 유형 여러 개로 잡힌다) → 건수 대신 **비율**이 같게 한다
    (Codex P2: 칸마다 따로 몫을 내면 수산이 매출액별 9.5% · 투자유형별 7.5% 로 갈렸다). 리프가 원문과 같으면 원문 배열 그대로 */
export function recomputeTypeMatrix(f: StatsFilter): MatrixRow[] {
  const rows = INVEST_TYPE_ROWS;
  const shift = YEAR_SHIFT[f.yBase] ?? 0;
  const out: MatrixRow[] = [];
  let same = true;
  for (const block of [...new Set(rows.map((r) => r.block))]) {
    const yr = rows.filter((r) => r.block === block && !isTotalLabel(r.label));
    const syr = SALES_SCALE_ROWS.filter((r) => r.block === block && !isTotalLabel(r.label));
    const width = yr[0].values.length - 1;
    const kept = yr.flatMap((r, i) => {
      if (!onOrBefore(String(parseInt(r.label, 10)), f.asOf)) { same = false; return []; }
      const si = i - shift;
      const orig = si >= 0 ? (yr[si].values.slice(0, width) as number[]) : Array<number>(width).fill(0);
      const ratio = si >= 0 && leafSum(syr[si]) ? leafSum(yr[si]) / leafSum(syr[si]) : 0;
      const targetOf = (g: StatsFilter) => {
        const row = salesFor(g).find((x) => x.block === block && x.label === r.label);
        return row ? Math.round(leafSum(row) * ratio) : 0;
      };
      const leaves = allocateStages(orig, f, targetOf, (c) => [si, c], block === '투자금액');
      if (leaves.some((v, c) => v !== r.values[c])) same = false;
      return [{ block, label: r.label, values: [...leaves, sum(leaves)] }];
    });
    const total = rows.find((r) => r.block === block && isTotalLabel(r.label))!;
    out.push(...kept, { block, label: total.label, values: Array.from({ length: width + 1 }, (_, c) => sum(kept.map((r) => r.values[c] as number))) });
  }
  return same ? rows : out;
}

/** 소재지별 재계산 — 연도 축이 없어 총량 = 같은 조건의 매출액별 표 합계 × (원문 소재지 합계 / 원문 매출액별 합계).
    배분은 allocateStages(원문 소재지 비율 → 모펀드 → 계정구분 상보 → 월말확정). 값이 원문과 같으면 원문 배열 그대로 */
export function recomputeRegion(f: StatsFilter): RegionRow[] {
  const regs = REGION_ROWS.filter((r) => r.region !== '합계');
  const column = (block: string, col: number) => {
    const ratio = sum(regs.map((r) => r.values[col] as number)) / leafTotal(SALES_SCALE_ROWS, block);
    return allocateStages(regs.map((r) => r.values[col] as number), f,
      (g) => Math.round(leafTotal(salesFor(g), block) * ratio), (i) => [i, col], block === '투자금액');
  };
  const cs = column('투자건수', 0), as = column('투자금액', 2);
  const vals = regs.map((_, i) => [cs[i], as[i]]);
  if (vals.every(([c, a], i) => c === regs[i].values[0] && a === regs[i].values[2])) return REGION_ROWS;
  const tc = sum(vals.map((v) => v[0])), ta = sum(vals.map((v) => v[1]));
  return [
    ...regs.map((r, i) => ({ no: r.no, region: r.region, values: [vals[i][0], pctText(vals[i][0], tc), vals[i][1], pctText(vals[i][1], ta)] })),
    { no: '', region: '합계', values: [tc, tc ? '100.0 %' : '-', ta, ta ? '100.0 %' : '-'] },
  ];
}

/** 화면 3표를 한 번에 — 페이지가 검색조건 상태로 부른다 */
export function recomputeStats(f: StatsFilter) {
  return { salesScale: salesFor(f), investType: recomputeTypeMatrix(f), region: recomputeRegion(f) };
}

/** 테스트가 원문 건수를 붙잡는다 — 창작 행이 끼면 즉시 깨지도록. */
export const SOURCE_COUNTS = {
  salesScale: SALES_SCALE_ROWS.length,
  investType: INVEST_TYPE_ROWS.length,
  region: REGION_ROWS.length,
} as const;

/* 이 전용 페이지가 **어느 목업에서 왔는가** — 스키마의 provenance 와 같은 역할을 하는 기록.
   라우트는 전용 페이지가 그리므로 출처도 여기에 둔다(테스트가 이 값으로 출처 바꿔치기를 잡는다). */
export const PROVENANCE = {
  capturedAt: '2026-09-15',
  sourceSystem: 'FFMS',
  captureFile: 'docs/mockups/01_투자자산관리/S1_34_투자실적_현황_투자기업_.html',
} as const;
