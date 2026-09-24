/* 운용사 재무정보 비교 조회 — 조기경보 > 자펀드정보 > 운용사 재무정보 비교 조회.
   출처: docs/mockups/02_조기경보/S2_76_운용사_재무정보_비교조회.html (2026-09-23 파싱 실측)

   트랙: 스키마(단일 1단 헤더 27컬럼 · 합계행/팝업/다중 표 없음) — 원문 설계메모가 "재무상태표·손익계산서·재무비율
   3그룹 2단 헤더는 원문에 없는 임의 구성"이라 단일 헤더로 재구성했다고 명시한다. 그 1단 헤더를 그대로 옮긴다.
   원문 `DATA` 는 확정 실데이터 **1건**(마이다스동아인베스트먼트(주), 재무상태표 8항목)뿐이다 — 행을 늘리지 않는다.
   손익계산서·재무비율 16항목은 원문 P열 공란이라 원문 화면과 같이 '-' 로 싣는다(0 으로 채우지 않는다).
   ⚠ 재무비율(%) 11컬럼은 type 'rate' 가 아니라 'text' 다 — 'rate' 면 Cell 이 DeltaBadge 로 보내 빈 값('-')이
     "0" 배지로 그려진다(전체_투자실적.ts 와 같은 판단).
   검색조건 `기준년월`(원문 기본 2026-06)은 컬럼 라벨과 정확일치해 상세필터가 실제로 행을 거른다.
   조회 전용 — fields 없음(등록/수정 폼 없음), 행 선택 없음. KPI: 미포함(브리프 규칙 5, 2026-09-23). */
import type { PageSchema } from './types';

const amt = (key: string, label: string) => ({ key, label, type: 'amount' as const, unit: '원', align: 'right' as const });
const pct = (key: string, label: string) => ({ key, label, type: 'text' as const, align: 'right' as const });

export const schema: PageSchema = {
  route: '운용사 재무정보 비교 조회',
  title: '운용사 재무정보 비교 조회',
  kind: 'list',
  entity: '재무정보',
  columns: [
    { key: 'nm', label: '운용사명', type: 'gp', align: 'left' },
    { key: 'cat', label: '운용사구분', type: 'text', align: 'center' },
    { key: 'ym', label: '기준년월', type: 'text', align: 'center' },
    amt('ca', '유동자산'), amt('nca', '비유동자산'), amt('ta', '자산총계'),
    amt('cl', '유동부채'), amt('ncl', '비유동부채'), amt('tl', '부채총계'),
    amt('cap', '자본금'), amt('te', '자본총계'),
    amt('sales', '매출액'), amt('cogs', '매출원가'), amt('ga', '일반관리비'), amt('oi', '경상이익'), amt('ni', '당기순이익'),
    pct('ncr', '영업용순자본비율'), pct('lr', '유동성비율'), pct('acar', '조정자기자본비율'), pct('ear', '자기자본비율'),
    pct('bis', 'BIS자기자본비율'), pct('rbc', '지급여력비율'), pct('lcr', '유동성커버리지비율'), pct('cad', '자본충실도'),
    pct('dr', '부채비율'), pct('roa', '총자산수익률'), pct('roe', '자기자본이익률'),
  ],
  fields: [],
  filters: ['기준년월'],
  /* 상세필터 명세 — 원문 검색박스 컨트롤 그대로(select·칩→select·범위) — 행이 합성값이라 key 없음(no-op + 캡션) (2026-09-24 전수조사) */
  filterSpecs: {
    기준년월: { kind: 'month', key: 'ym' },
  },
  hideCardView: true,
  hideRowSelection: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  sample: [
    { nm: '마이다스동아인베스트먼트(주)', cat: '벤처투자회사', ym: '2026-06',
      ca: 1780411717, nca: 9900039754, ta: 11680451471, cl: 23183888, ncl: 0, tl: 23183888, cap: 7000000000, te: 11657267583,
      sales: '-', cogs: '-', ga: '-', oi: '-', ni: '-',
      ncr: '-', lr: '-', acar: '-', ear: '-', bis: '-', rbc: '-', lcr: '-', cad: '-', dr: '-', roa: '-', roe: '-' },
  ],
  provenance: {
    capturedAt: '2026-09-23',
    sourceSystem: 'EWS',
    captureFile: 'docs/mockups/02_조기경보/S2_76_운용사_재무정보_비교조회.html',
  },
};
