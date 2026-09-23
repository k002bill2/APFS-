/* 조기경보 > 가치평가 > IRR 3리프의 원문 데이터(순수 모듈).
   - 투자기업별(계약별) IRR = S2_87 목록(합계행) + S2_88 근거 팝업(투자기업 셀 클릭)
   - 투자기업별 IRR         = S2_91 목록(합계행) + S2_92 근거 팝업(투자기업 셀 클릭)
   - 자펀드별 IRR           = S2_89 목록         + S2_90 근거 팝업(자펀드 셀 클릭)
   출처: docs/mockups/02_조기경보/*.html `<script>` 를 2026-09-23 파싱 실측으로 옮겼다.

   근거 팝업의 조합·기업명이 목록 행과 다른 것은 오류가 아니다 — 원문 설계메모: "엑셀이 메인 그리드와 팝업 그리드에
   서로 독립된 예시 실데이터를 부여했기 때문(1:1 드릴다운 연결 아님)". 그래서 팝업은 행과 무관하게 원문 1행을 보인다.
   근거 금액은 원문이 양수를 저장하고 앞에 '-' 를 붙여 그린다(`'-'+irrFmt(3000000000)`) — 여기서는 음수로 싣는다. */
import type { TableMeta, Provenance } from './risk_table_meta';
import { src } from './risk_table_meta';

/** 근거 팝업 한 벌 — 제목·맥락(kv 또는 조합명 머리글)·현금흐름 표 */
export interface IrrBasis {
  title: string;
  source: string;
  /** 맥락 kv(원문 `.ctx .ci`) — S2_88·S2_92 */
  ctx?: { label: string; value: string }[];
  /** 조합명 머리글(원문 `.barrow .fn`) — S2_90 */
  heading?: string;
  table: TableMeta;
}

const TX_TONES = { 투자: 'info', 출자: 'muted' } as const;   // 원문 투자=.tag b · 출자=.tag n

/* ═══════════════ S2_87 투자기업별(계약별) IRR ═══════════════ */
export const IRR_CONTRACT_FUNDS = ['2022 원익 스마트 혁신 Agtech투자조합'] as const;
export const IRR_CONTRACT: TableMeta = {
  id: 'irrContract', totalLabel: '합계',
  cols: [
    { key: 'gp', label: '운용사', kind: 'text', width: 160 },
    { key: 'fund', label: '자펀드', kind: 'text', width: 240 },
    { key: 'co', label: '투자기업', kind: 'text', width: 130, link: true },
    { key: 'biz', label: '사업자번호', kind: 'center' },
    { key: 'asset', label: '투자자산종류', kind: 'center' },
    { key: 'proj', label: '프로젝트명', kind: 'text' },
    { key: 'total', label: '총투자금액', kind: 'amount', total: 'sum' },
    { key: 'recover', label: '회수총액', kind: 'amount', total: 'sum' },
    { key: 'balance', label: '투자잔액', kind: 'amount', total: 'sum' },
    { key: 'eval', label: '평가금액', kind: 'amount', total: 'sum' },
    /* 원문 tfoot 은 보유주식수를 합산한다(4,680) — S2_83 과 규칙이 다르다 */
    { key: 'shares', label: '보유주식수', kind: 'number', total: 'sum' },
    { key: 'irr', label: 'IRR(%)', kind: 'number', total: 'dash' },
  ],
  rows: [{ id: 'irrc-1', gp: '원익투자파트너스(주)', fund: '2022 원익 스마트 혁신 Agtech투자조합', co: '셀미트(주)', biz: '637-86-01483',
    asset: '우선주', proj: '-', total: 1000045800, recover: 0, balance: 1000045800, eval: 1000045800, shares: 4680, irr: '0.00' }],
};
export const IRR_CONTRACT_BASIS: IrrBasis = {
  title: '투자기업별(계약별) IRR 근거', source: src('S2_88_투자기업별_계약별__IRR_근거.html'),
  ctx: [{ label: '자펀드', value: 'A&F미래성장투자조합' }, { label: '투자기업', value: '(주)썬리취' }, { label: '투자자산종류', value: 'CB' }],
  table: {
    id: 'irrContractBasis',
    cols: [
      { key: 'fund', label: '자펀드', kind: 'text', width: 180 },
      { key: 'co', label: '투자기업', kind: 'text' },
      { key: 'asset', label: '투자자산종류', kind: 'center' },
      { key: 'dt', label: '거래일자', kind: 'date' },
      { key: 'tx', label: '거래형태', kind: 'badge', tones: TX_TONES },
      { key: 'amt', label: '금액', kind: 'amount', neg: true },
    ],
    rows: [{ id: 'irrcb-1', fund: 'A&F미래성장투자조합', co: '(주)썬리취', asset: 'CB', dt: '2018-10-23', tx: '투자', amt: -3000000000 }],
  },
};
/* S2_88 은 팝업 병합으로 별도 화면이 아니다(원문 "별도 메뉴 화면으로 존재하지 않습니다") — 팝업 UI·데이터는 S2_87 이 소유한다 */
export const IRR_CONTRACT_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS',
  captureFiles: [src('S2_87_투자기업별_계약별__IRR.html'), src('S2_88_투자기업별_계약별__IRR_근거.html')],
};

/* ═══════════════ S2_91 투자기업별 IRR ═══════════════ */
export const IRR_INVESTEE_FUNDS = ['2022 원익 스마트 혁신 Agtech투자조합'] as const;
/** 원문 `f-fund` 기본 선택값 */
export const IRR_INVESTEE_DEFAULT_FUND = '2022 원익 스마트 혁신 Agtech투자조합';
export const IRR_INVESTEE_COMPANIES = ['셀미트(주)'] as const;
const invTi = 1000045800, invRec = 0;
export const IRR_INVESTEE: TableMeta = {
  id: 'irrInvestee', totalLabel: '합계',
  cols: [
    { key: 'gp', label: '운용사', kind: 'text', width: 160 },
    { key: 'fund', label: '자펀드', kind: 'text', width: 240 },
    { key: 'co', label: '투자기업', kind: 'text', width: 130, link: true },
    { key: 'biz', label: '사업자번호', kind: 'center' },
    { key: 'ti', label: '총투자금액', kind: 'amount', total: 'sum' },
    { key: 'rec', label: '회수총액', kind: 'amount', total: 'sum' },
    /* 원문 render: bal = ti − rec (저장값 아님) */
    { key: 'bal', label: '투자잔액', kind: 'amount', derived: true, total: 'sum' },
    { key: 'ev', label: '평가금액', kind: 'amount', total: 'sum' },
    /* 원문 irrCell: toFixed(2) + 음수 .neg / 양수 .pos */
    { key: 'irr', label: 'IRR(%)', kind: 'number', fixed: 2, neg: true, total: 'dash' },
  ],
  rows: [{ id: 'irri-1', gp: '원익투자파트너스(주)', fund: '2022 원익 스마트 혁신 Agtech투자조합', co: '셀미트(주)', biz: '637-86-01483',
    ti: invTi, rec: invRec, bal: invTi - invRec, ev: 1000045800, irr: 0 }],
};
export const IRR_INVESTEE_BASIS: IrrBasis = {
  title: '투자기업별 IRR 근거', source: src('S2_92_투자기업별_IRR_근거.html'),
  ctx: [{ label: '자펀드', value: 'AJ-ISU경기도애그리푸드투자조합' }, { label: '투자기업', value: '(주)프레시지' }, { label: '투자자산종류', value: '우선주' }],
  table: {
    id: 'irrInvesteeBasis',
    cols: [
      { key: 'fund', label: '자펀드', kind: 'text', width: 220 },
      { key: 'co', label: '투자기업', kind: 'text' },
      { key: 'asset', label: '투자자산종류', kind: 'center' },
      { key: 'dt', label: '거래일자', kind: 'date' },
      { key: 'tx', label: '거래형태', kind: 'badge', tones: TX_TONES },
      { key: 'amt', label: '금액', kind: 'amount', neg: true },
    ],
    rows: [{ id: 'irrib-1', fund: 'AJ-ISU경기도애그리푸드투자조합', co: '(주)프레시지', asset: '우선주', dt: '2020-07-30', tx: '투자', amt: -1499957210 }],
  },
};
export const IRR_INVESTEE_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS',
  captureFiles: [src('S2_91_투자기업별_IRR.html'), src('S2_92_투자기업별_IRR_근거.html')],
};

/* ═══════════════ S2_89 자펀드별 IRR ═══════════════ */
export const IRR_FUND_FUNDS = ['2022 원익 스마트 혁신 Agtech투자조합'] as const;
export const IRR_FUND: TableMeta = {
  id: 'irrFund',
  cols: [
    { key: 'mgr', label: '운용사', kind: 'text', width: 160 },
    { key: 'fund', label: '자펀드', kind: 'text', width: 240, link: true },
    { key: 'yr', label: '결성년도', kind: 'center' },
    { key: 'commit', label: '약정총액', kind: 'amount' },
    { key: 'paid', label: '납입총액', kind: 'amount' },
    { key: 'dist', label: '배분금액', kind: 'amount' },
    { key: 'invest', label: '총투자금액', kind: 'amount' },
    { key: 'recover', label: '회수총액', kind: 'amount' },
    { key: 'balance', label: '투자잔액', kind: 'amount' },
    /* 원문 샘플 '0.52' — 비율 형태라 금액 환산하지 않고 원문 문자열 그대로(⚠검토필요 원문 이식) */
    { key: 'uninvest', label: '미투자자산', kind: 'number', align: 'center', width: 130 },
    { key: 'nav', label: '평가금액', kind: 'amount' },
    { key: 'irr', label: 'IRR', kind: 'number', align: 'center', width: 100 },
  ],
  rows: [{ id: 'irrf-1', mgr: '원익투자파트너스(주)', fund: '2022 원익 스마트 혁신 Agtech투자조합', yr: '2022년도',
    commit: 21000000000, paid: 21000000000, dist: 4851000000, invest: 19302262939, recover: 5847282719, balance: 15112427939,
    uninvest: '0.52', nav: 15210548039, irr: '0.52' }],
};
export const IRR_FUND_BASIS: IrrBasis = {
  title: '자펀드별 IRR 근거', source: src('S2_90_자펀드별_IRR_근거.html'),
  heading: 'NHC-DTNI 농식품 ABC 투자조합1호',
  table: {
    id: 'irrFundBasis',
    cols: [
      { key: 'fund', label: '자펀드', kind: 'text', width: 240 },
      { key: 'dt', label: '거래일자', kind: 'date' },
      { key: 'tx', label: '거래형태', kind: 'badge', tones: TX_TONES },
      { key: 'amt', label: '금액', kind: 'amount', neg: true },
    ],
    rows: [{ id: 'irrfb-1', fund: 'NHC-DTNI 농식품 ABC 투자조합1호', dt: '2017-07-24', tx: '출자', amt: -4400000000 }],
  },
};
export const IRR_FUND_PROVENANCE: Provenance = {
  capturedAt: '2026-09-23', sourceSystem: 'EWS',
  captureFiles: [src('S2_89_자펀드별_IRR.html'), src('S2_90_자펀드별_IRR_근거.html')],
};
