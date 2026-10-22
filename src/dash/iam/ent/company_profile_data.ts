/* 투자기업 기업개요 — S1_30 원문 **데이터**(SSOT). 순수 .ts — React/UI 의존 없음.
   출처: docs/mockups/01_투자자산관리/S1_30_투자기업정보.html (2026-09-15 파싱 실측)

   뷰(`company_profile_model.tsx`)와 분리한 이유는 둘이다:
   ① 같은 원문을 페이지(investee_profile.tsx)와 팝업(company_profile_modal.tsx)이 함께 쓴다.
   ② 테스트(vitest `environment: 'node'`)가 원문 건수를 붙잡으려면 이 모듈을 import 해야 하는데,
      .tsx 를 물면 `@/lib/utils` 별칭까지 딸려 와 node 환경에서 해석되지 않는다.

   행을 늘리지 않는다: 원문 실데이터가 (주)선양 1건뿐이고, 채우려고 만든 행은 전부 위조다.
   ⚠ 기업개요는 **33항목**이다. 원문 `<th scope="row">` 는 34개지만 마지막 하나는
     `여성기업여부` 행을 4칸으로 맞추는 **빈 채움 셀**이라 항목이 아니다. */

/* ── 출처 데이터(S1_30 원문, (주)선양) ── */
export const CO_NAME = '(주)선양';

export type OvItem = { l: string; v: string | null; full?: boolean };
export const OVERVIEW: OvItem[] = [
  { l: '기업명', v: CO_NAME }, { l: '기업명(영문)', v: null },
  { l: '대표자1', v: '윤영욱' }, { l: '대표자1 생년월일', v: '491212-1' },
  { l: '대표자2', v: null }, { l: '대표자2 생년월일', v: '0' },
  { l: '사업자번호', v: '123-81-11041' }, { l: '법인등록번호', v: null },
  { l: '표준산업분류코드', v: '기타 인쇄업(18119)', full: true },
  { l: '우편번호', v: '445843', full: true },
  { l: '주소', v: '경기도 화성시 푸른들판로1153번길', full: true },
  { l: '나머지주소', v: '25', full: true },
  { l: 'TEL', v: '031-451-1501' }, { l: '홈페이지주소', v: null },
  { l: '설립일자', v: '1983-01-14' }, { l: '종업원수', v: '68 (명)' },
  { l: '벤처유형', v: null }, { l: '벤처기간', v: '~' },
  { l: '벤처기업확인번호', v: null, full: true },
  { l: '기업구분', v: null }, { l: '기업유형기간', v: '~' },
  { l: '결산월', v: '12' }, { l: '회계감사기관(회계사)', v: null },
  { l: '부도일자', v: null }, { l: '폐업일자', v: null },
  { l: '주식구분', v: '비상장' }, { l: '상장(등록)일', v: null },
  { l: '주요제품', v: '상업인쇄업 및 플라스틱 제품 제조 및 판매를 주요사업으로 영위', full: true },
  { l: '보통주 총발행주수', v: '187,054' }, { l: '우선주 총발행주수', v: '0' },
  { l: '보통주 주식액면가', v: '0 (원)' }, { l: '우선주 주식액면가', v: '0 (원)' },
  { l: '여성기업여부', v: 'NO' },
];

/* 재무제표 — [No, 운용사, 자펀드, 기준년월, 자산총계, 부채총계, 자본총계, 매출액, 영업이익, 당기순이익, 종업원수] */
export type FinRow = { no: number; gp: string; fund: string; ym: string; amounts: number[]; emp: number };
export const FIN_ROWS: FinRow[] = [
  { no: 1, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', ym: '2012-12',
    amounts: [17_792_580_021, 17_707_857_826, 84_722_195, 21_735_896_522, 384_486_356, -3_411_871_602], emp: 68 },
  { no: 2, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', ym: '2013-12',
    amounts: [18_308_114_744, 7_913_028_476, 10_395_086_268, 20_591_706_670, 192_982_569, 12_060_466_043], emp: 68 },
];
export const FIN_AMT_HEADERS = ['자산총계', '부채총계', '자본총계', '매출액', '영업이익', '당기순이익'];

/* 주주명부 — [No, 운용사, 자펀드, 기준일자, 총자본금, 총발행주수, 보통주 자본금, 보통주 총발행주수,
   보통주 액면가, 우선주 자본금, 우선주 총발행주수, 우선주 액면가]. 주수는 금액이 아니라 단위 환산 제외. */
export type ShareRow = { no: number; gp: string; fund: string; date: string; totalCapital: number; totalShares: number; comCapital: number; comShares: number; comPar: number; prfCapital: number; prfShares: number; prfPar: number };
/* 주주명부 헤더 — 원문 S1_30:351-356 은 **단일 헤더 12열**이다(보통주·우선주를 2단으로 묶지 않는다).
   소비처(ShareTable)는 이 배열을 그대로 그린다 — 라벨을 표 마크업에 다시 적지 않는다. */
export const SHARE_HEADERS = ['No', '운용사', '자펀드', '기준일자', '총자본금', '총발행주수',
  '보통주 자본금', '보통주 총발행주수', '보통주 액면가', '우선주 자본금', '우선주 총발행주수', '우선주 액면가'] as const;
export const SHARE_ROWS: ShareRow[] = [
  { no: 1, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', date: '2012-12-31', totalCapital: 3_234_180_000, totalShares: 323_418, comCapital: 1_416_000_000, comShares: 141_600, comPar: 10_000, prfCapital: 1_818_180_000, prfShares: 181_818, prfPar: 10_000 },
  { no: 2, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', date: '2013-07-01', totalCapital: 1_416_000_000, totalShares: 141_600, comCapital: 1_416_000_000, comShares: 141_600, comPar: 10_000, prfCapital: 0, prfShares: 0, prfPar: 10_000 },
  { no: 3, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', date: '2013-07-23', totalCapital: 1_870_540_000, totalShares: 187_054, comCapital: 1_870_540_000, comShares: 187_054, comPar: 10_000, prfCapital: 0, prfShares: 0, prfPar: 10_000 },
  { no: 4, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', date: '2014-01-23', totalCapital: 1_416_000_000, totalShares: 141_600, comCapital: 1_416_000_000, comShares: 141_600, comPar: 10_000, prfCapital: 0, prfShares: 0, prfPar: 10_000 },
];

/** 테스트·화면이 원문 건수를 확인할 수 있게 노출한다(창작 행이 끼면 즉시 깨지도록). */
export const SOURCE_COUNTS = { overview: OVERVIEW.length, financial: FIN_ROWS.length, shareholder: SHARE_ROWS.length } as const;

/* 이 전용 페이지가 **어느 목업에서 왔는가** — 스키마의 provenance 와 같은 역할을 하는 기록.
   라우트는 전용 페이지가 그리므로 출처도 여기에 둔다(테스트가 이 값으로 출처 바꿔치기를 잡는다). */
export const PROVENANCE = {
  capturedAt: '2026-09-15',
  sourceSystem: 'FFMS',
  captureFile: 'docs/mockups/01_투자자산관리/S1_30_투자기업정보.html',
} as const;

/* 단위 환산 — 원문 `fmt(n,u)` 의 자릿수를 그대로 쓴다(2026-09-16 Codex 7R P2):
     원 = 정수 · **백만원 = Math.round(정수)** · **억원 = 1자리**.
   공용 `schemas/unit.ts` 의 formatUnit 은 백만원·억원 모두 2자리라 이 화면에서 값이 달라진다
   (17,792,580,021 → 원문 백만원 17,793 / 억원 177.9, 공용은 17,792.58 / 177.93).
   저장 base(원)는 같아도 **표기 규칙이 화면마다 다르다** — 목업이 정본이다(S1_36 도 같은 이유로 자체 포맷터). */
export function formatProfileUnit(won: number, unit: string): string {
  if (unit === '억원') return (won / 1e8).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (unit === '백만원') return Math.round(won / 1e6).toLocaleString('ko-KR');
  return Math.round(won).toLocaleString('ko-KR');
}
