/* 투자금 회수현황 — S1_36(투자 및 회수 상세정보) 원문 2개 조회기준의 SSOT.
   출처: docs/mockups/01_투자자산관리/S1_36_투자_및_회수_상세정보.html (2026-09-15 파싱 실측)

   ── 출처 확정(2026-09-15 사용자 지시) ──
   정본 매칭표(docs/메뉴구성도_v0.2.md:97)가 이 리프를 `ffms > 투자기업정보 > 투자및회수상세정보`
   (S1_36)로 지목한다. 이전 버전은 이름이 같은 다른 목업 `S1_35_투자금_회수현황.html` 을
   출처로 적고 출자사업연도별 집계 11컬럼을 실었다 — **S1_35 로 대체하지 않는다.**
   (매칭표 46행이 그 불일치를 이미 기록해 뒀다: "같은 이름의 to-be 리프의 매칭이 S1_36 을
   지목하고 있어 [S1_35 는] 연결되지 않음. 스펙을 임의로 덮지 않았다.")

   ── 원본 동일성 확인(2026-09-16) ──
   사용자가 지목한 원본 `~/Downloads/통합 2/01_투자자산관리/S1_36_투자_및_회수_상세정보.html` 과
   저장소 사본은 **바이트 동일**하다(md5 d5d9d0f63f2bf918d513d83dd3dc3209, 37,653 bytes). 그 경로에서 다시 파싱해
   투자및회수 21행 · 전체거래 24행의 **전 필드**와 두 모드의 컬럼 키·라벨 순서를 대조했고 차이 0건이다.
   provenance 는 저장소 상대경로로 적는다 — 절대경로는 다른 기기에서 테스트가 돌지 않는다.

   ── 왜 전용 페이지인가 ──
   원문의 `조회기준` 토글이 **컬럼과 데이터를 함께 바꾼다**:
   · 투자및회수(ir) — 14컬럼 × 21행. 사업자번호·거래처분코드가 있고 거래주수가 없다.
   · 전체거래(all) — 13컬럼 × 24행. 전환·주식변동 세부거래 3행이 더 있고 거래주수가 붙는다.
   `PageSchema` 는 route 당 columns 한 벌이라 두 벌을 담지 못한다.

   ── 하단 합계 4줄 ──
   원문은 투자/회수/수익/회수총액 4줄을 tfoot 에 둔다. **두 모드 모두 DATA_IR 로 계산**한다 —
   원문 주석 그대로: "전체거래엔 전환사채전환·무상증자 등 순현금흐름이 아닌 행이 섞여있어,
   산술 검증이 끝난 투자및회수 데이터로 항상 계산". 이 규칙을 바꾸지 않는다. */
import type { ColumnSpec } from './schemas/types';
import { schema as 투자금회수현황Schema } from './schemas/투자금_회수현황';

export type RecoveryRow = Record<string, string | number> & { id: string };

/** 원문 COLS_IR — 조회기준 `투자및회수`. **스키마가 정본**이라 그대로 가져온다(복사 금지). */
export const COLUMNS_IR: readonly ColumnSpec[] = 투자금회수현황Schema.columns;

/** 원문 COLS_ALL — 조회기준 `전체거래`. 사업자번호·거래처분코드가 빠지고 거래주수가 붙는다. */
export const COLUMNS_ALL: readonly ColumnSpec[] = [
  { key: 'gp',     label: '운용사',   type: 'gp',     align: 'left', pinned: 'left' },
  { key: 'fund',   label: '자펀드',   type: 'text',   align: 'left', pinned: 'left' },
  { key: 'yr',     label: '사업년도', type: 'text',   align: 'center' },
  { key: 'acc',    label: '계정구분', type: 'text',   align: 'center' },
  { key: 'co',     label: '투자기업', type: 'text',   align: 'left', pinned: 'left' },
  { key: 'ag',     label: '약정번호', type: 'code',   align: 'center' },
  { key: 'itype',  label: '투자유형', type: 'text',   align: 'center' },
  { key: 'tdate',  label: '거래일자', type: 'date',   align: 'center' },
  { key: 'tname',  label: '거래명',   type: 'status', align: 'center' },
  { key: 'tgb',    label: '거래구분', type: 'text',   align: 'center' },
  { key: 'prin',   label: '거래원금', type: 'amount', unit: '원', align: 'right' },
  { key: 'prof',   label: '거래수익', type: 'amount', unit: '원', align: 'right' },
  { key: 'shares', label: '거래주수', type: 'number', align: 'center' },
];

export const DETAIL_ROWS_IR: RecoveryRow[] = [
  { id: 'ir-1', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)제농', biz: '616-81-03591', ag: 'I201600011', itype: 'CB', tdate: '2016-11-07', tname: '투자', tgb: '투자', ccode: '', prin: 3_000_000_000, prof: 0, shares: 0 },
  { id: 'ir-2', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)윈플러스', biz: '127-81-92032', ag: 'I201700011', itype: '우선주(신주)', tdate: '2017-03-09', tname: '투자', tgb: '투자', ccode: '', prin: 1_000_000_000, prof: 0, shares: 0 },
  { id: 'ir-3', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)윈플러스', biz: '127-81-92032', ag: 'I201700011', itype: '우선주(신주)', tdate: '2018-03-27', tname: '청산', tgb: '회수', ccode: 'M&A', prin: 1_000_000_000, prof: 200_000_000, shares: 0 },
  { id: 'ir-4', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '농업회사법인(주)행복한농장', biz: '401-81-27647', ag: 'I201700021', itype: 'CB', tdate: '2017-11-28', tname: '투자', tgb: '투자', ccode: '', prin: 1_000_000_000, prof: 0, shares: 0 },
  { id: 'ir-5', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '농업회사법인(주)행복한농장', biz: '401-81-27647', ag: 'I201700021', itype: 'CB', tdate: '2023-07-31', tname: '상환', tgb: '회수', ccode: '상환', prin: 1_000_000_000, prof: 163_231_925, shares: 0 },
  { id: 'ir-6', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '농업회사법인(주)행복한농장', biz: '401-81-27647', ag: 'I201700031', itype: '우선주(신주)', tdate: '2017-11-28', tname: '투자', tgb: '투자', ccode: '', prin: 1_000_008_000, prof: 0, shares: 0 },
  { id: 'ir-7', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '농업회사법인(주)행복한농장', biz: '401-81-27647', ag: 'I201700031', itype: '우선주(신주)', tdate: '2024-03-28', tname: '상환', tgb: '회수', ccode: '상환', prin: 1_000_008_000, prof: 227_162_382, shares: 0 },
  { id: 'ir-8', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '127-81-35614', ag: 'I201800021', itype: 'CB', tdate: '2018-01-04', tname: '투자', tgb: '투자', ccode: '', prin: 1_999_992_141, prof: 0, shares: 0 },
  { id: 'ir-9', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '127-81-35614', ag: 'I201800021', itype: 'CB', tdate: '2021-04-12', tname: '청산', tgb: '회수', ccode: '장외매각', prin: 1_999_992_141, prof: 1_058_992_564, shares: 0 },
  { id: 'ir-10', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '127-81-35614', ag: 'I201800011', itype: '우선주(신주)', tdate: '2018-01-04', tname: '투자', tgb: '투자', ccode: '', prin: 1_999_992_141, prof: 0, shares: 0 },
  { id: 'ir-11', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '127-81-35614', ag: 'I201800011', itype: '우선주(신주)', tdate: '2021-04-12', tname: '청산', tgb: '회수', ccode: '장외매각', prin: 1_999_992_141, prof: 1_059_051_294, shares: 0 },
  { id: 'ir-12', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '409-81-85980', ag: 'I201800051', itype: 'CB', tdate: '2018-09-14', tname: '투자', tgb: '투자', ccode: '', prin: 500_000_000, prof: 0, shares: 0 },
  { id: 'ir-13', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '409-81-85980', ag: 'I201800051', itype: 'CB', tdate: '2023-09-13', tname: '상환', tgb: '회수', ccode: '상환', prin: 100_000_000, prof: 26_603_221, shares: 0 },
  { id: 'ir-14', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '409-81-85980', ag: 'I201800051', itype: 'CB', tdate: '2023-12-13', tname: '상환', tgb: '회수', ccode: '상환', prin: 400_000_000, prof: 113_823_977, shares: 0 },
  { id: 'ir-15', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '409-81-85980', ag: 'I201800041', itype: '우선주(신주)', tdate: '2018-09-14', tname: '투자', tgb: '투자', ccode: '', prin: 1_499_520_000, prof: 0, shares: 0 },
  { id: 'ir-16', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '409-81-85980', ag: 'I201800041', itype: '우선주(신주)', tdate: '2024-10-11', tname: '상환', tgb: '회수', ccode: '상환', prin: 136_320_000, prof: 57_885_590, shares: 0 },
  { id: 'ir-17', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '409-81-85980', ag: 'I201800041', itype: '우선주(신주)', tdate: '2025-04-30', tname: '상환', tgb: '회수', ccode: '상환', prin: 127_680_000, prof: 60_131_561, shares: 0 },
  { id: 'ir-18', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '127-81-35614', ag: 'I201900011', itype: '우선주(신주)', tdate: '2019-03-11', tname: '투자', tgb: '투자', ccode: '', prin: 999_991_182, prof: 0, shares: 0 },
  { id: 'ir-19', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '127-81-35614', ag: 'I201900011', itype: '우선주(신주)', tdate: '2021-04-12', tname: '청산', tgb: '회수', ccode: '장외매각', prin: 999_991_182, prof: 233_580_133, shares: 0 },
  { id: 'ir-20', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)프레시지', biz: '880-86-00259', ag: 'I201900081', itype: '우선주(신주)', tdate: '2019-08-12', tname: '투자', tgb: '투자', ccode: '', prin: 3_000_620_000, prof: 0, shares: 0 },
  { id: 'ir-21', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)프레시지', biz: '880-86-00259', ag: 'I201900081', itype: '우선주(신주)', tdate: '2021-12-28', tname: '청산', tgb: '회수', ccode: '기타', prin: 3_000_620_000, prof: 1_097_404_000, shares: 0 },
];
export const DETAIL_ROWS_ALL: RecoveryRow[] = [
  { id: 'all-1', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)제농', biz: '', ag: 'I201600011', itype: 'CB', tdate: '2016-11-07', tname: '투자', tgb: '투자', ccode: '', prin: 3_000_000_000, prof: 0, shares: 0 },
  { id: 'all-2', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)제농', biz: '', ag: 'I201600011', itype: 'CB', tdate: '2018-11-06', tname: '전환사채전환(-)', tgb: '전환거래', ccode: '', prin: 1_300_000_000, prof: 0, shares: 0 },
  { id: 'all-3', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)제농', biz: '', ag: 'I201600012', itype: '보통주(신주)', tdate: '2018-11-06', tname: '전환사채전환(+)', tgb: '전환거래', ccode: '', prin: 1_300_000_000, prof: 0, shares: 6_500 },
  { id: 'all-4', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)제농', biz: '', ag: 'I201600012', itype: '보통주(신주)', tdate: '2023-05-11', tname: '무상증자', tgb: '주식변동', ccode: '', prin: 0, prof: 0, shares: 188_500 },
  { id: 'all-5', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)윈플러스', biz: '', ag: 'I201700011', itype: '우선주(신주)', tdate: '2017-03-09', tname: '투자', tgb: '투자', ccode: '', prin: 1_000_000_000, prof: 0, shares: 200_000 },
  { id: 'all-6', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)윈플러스', biz: '', ag: 'I201700011', itype: '우선주(신주)', tdate: '2018-03-27', tname: '청산', tgb: '회수', ccode: '', prin: 1_000_000_000, prof: 200_000_000, shares: 200_000 },
  { id: 'all-7', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '농업회사법인(주)행복한농장', biz: '', ag: 'I201700021', itype: 'CB', tdate: '2017-11-28', tname: '투자', tgb: '투자', ccode: '', prin: 1_000_000_000, prof: 0, shares: 0 },
  { id: 'all-8', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '농업회사법인(주)행복한농장', biz: '', ag: 'I201700021', itype: 'CB', tdate: '2023-07-31', tname: '상환', tgb: '회수', ccode: '', prin: 1_000_000_000, prof: 163_231_925, shares: 0 },
  { id: 'all-9', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '농업회사법인(주)행복한농장', biz: '', ag: 'I201700031', itype: '우선주(신주)', tdate: '2017-11-28', tname: '투자', tgb: '투자', ccode: '', prin: 1_000_008_000, prof: 0, shares: 83_334 },
  { id: 'all-10', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '농업회사법인(주)행복한농장', biz: '', ag: 'I201700031', itype: '우선주(신주)', tdate: '2024-03-28', tname: '상환', tgb: '회수', ccode: '', prin: 1_000_008_000, prof: 227_162_382, shares: 83_334 },
  { id: 'all-11', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '', ag: 'I201800021', itype: 'CB', tdate: '2018-01-04', tname: '투자', tgb: '투자', ccode: '', prin: 1_999_992_141, prof: 0, shares: 0 },
  { id: 'all-12', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '', ag: 'I201800021', itype: 'CB', tdate: '2021-04-12', tname: '청산', tgb: '회수', ccode: '', prin: 1_999_992_141, prof: 1_058_992_564, shares: 0 },
  { id: 'all-13', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '', ag: 'I201800011', itype: '우선주(신주)', tdate: '2018-01-04', tname: '투자', tgb: '투자', ccode: '', prin: 1_999_992_141, prof: 0, shares: 171_423 },
  { id: 'all-14', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '', ag: 'I201800011', itype: '우선주(신주)', tdate: '2021-04-12', tname: '청산', tgb: '회수', ccode: '', prin: 1_999_992_141, prof: 1_059_051_294, shares: 171_423 },
  { id: 'all-15', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '', ag: 'I201800051', itype: 'CB', tdate: '2018-09-14', tname: '투자', tgb: '투자', ccode: '', prin: 500_000_000, prof: 0, shares: 0 },
  { id: 'all-16', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '', ag: 'I201800051', itype: 'CB', tdate: '2023-09-13', tname: '상환', tgb: '회수', ccode: '', prin: 100_000_000, prof: 26_603_221, shares: 0 },
  { id: 'all-17', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '', ag: 'I201800051', itype: 'CB', tdate: '2023-12-13', tname: '상환', tgb: '회수', ccode: '', prin: 400_000_000, prof: 113_823_977, shares: 0 },
  { id: 'all-18', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '', ag: 'I201800041', itype: '우선주(신주)', tdate: '2018-09-14', tname: '투자', tgb: '투자', ccode: '', prin: 1_499_520_000, prof: 0, shares: 1_562 },
  { id: 'all-19', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '', ag: 'I201800041', itype: '우선주(신주)', tdate: '2024-10-11', tname: '상환', tgb: '회수', ccode: '', prin: 136_320_000, prof: 57_885_590, shares: 142 },
  { id: 'all-20', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)산들촌', biz: '', ag: 'I201800041', itype: '우선주(신주)', tdate: '2025-04-30', tname: '상환', tgb: '회수', ccode: '', prin: 127_680_000, prof: 60_131_561, shares: 133 },
  { id: 'all-21', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '', ag: 'I201900011', itype: '우선주(신주)', tdate: '2019-03-11', tname: '투자', tgb: '투자', ccode: '', prin: 999_991_182, prof: 0, shares: 69_127 },
  { id: 'all-22', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)네추럴웨이', biz: '', ag: 'I201900011', itype: '우선주(신주)', tdate: '2021-04-12', tname: '청산', tgb: '회수', ccode: '', prin: 999_991_182, prof: 233_580_133, shares: 69_127 },
  { id: 'all-23', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)프레시지', biz: '', ag: 'I201900081', itype: '우선주(신주)', tdate: '2019-08-12', tname: '투자', tgb: '투자', ccode: '', prin: 3_000_620_000, prof: 0, shares: 28_000 },
  { id: 'all-24', gp: 'NH투자증권', fund: '엔에이치애그리비즈밸류크리에이티브제일호 사모투자합자회사', yr: '2015', acc: '농식품', co: '(주)프레시지', biz: '', ag: 'I201900081', itype: '우선주(신주)', tdate: '2021-12-28', tname: '청산', tgb: '회수', ccode: '', prin: 3_000_620_000, prof: 1_097_404_000, shares: 28_000 },
];

/** 원문 `.tag` 도메인 — 거래명 배지 톤. 원문이 투자=기본, 회수/청산=강조로 칠한다. */
export const RECOVERY_TONES = [
  { label: '투자', tone: 'info' as const },
  { label: '청산', tone: 'success' as const },
  { label: '회수', tone: 'success' as const },
  { label: '전환사채전환(-)', tone: 'warning' as const },
  { label: '전환사채전환(+)', tone: 'warning' as const },
  { label: '무상증자', tone: 'warning' as const },
];

export interface RecoveryMode {
  key: 'ir' | 'all';
  label: string;
  sheet: string;
  columns: readonly ColumnSpec[];
  rows: readonly RecoveryRow[];
}

export const RECOVERY_MODES: readonly RecoveryMode[] = [
  { key: 'ir',  label: '투자및회수', sheet: '투자및회수', columns: COLUMNS_IR,  rows: DETAIL_ROWS_IR },
  { key: 'all', label: '전체거래',   sheet: '전체거래',   columns: COLUMNS_ALL, rows: DETAIL_ROWS_ALL },
];

export const findMode = (key: string): RecoveryMode => RECOVERY_MODES.find((m) => m.key === key) ?? RECOVERY_MODES[0];

/* 합계 4줄 — 원문 renderFoot() 의 계산을 그대로 옮긴다. **두 모드 모두 DATA_IR 기준**(위 주석 참조).
   prin/prof 가 null 인 칸은 원문에서도 빈 셀이다(투자 행의 수익, 수익 행의 원금). */
const catSum = (rows: readonly RecoveryRow[], tgb: string, field: 'prin' | 'prof') =>
  rows.filter((r) => r.tgb === tgb).reduce((a, r) => a + (Number(r[field]) || 0), 0);

export interface RecoverySummary { label: string; prin: number | null; prof: number | null }

/** 기본 대상은 투자및회수 전체(원문 renderFoot 과 동일). 화면이 필터를 걸면 걸러진 IR 행을 넘긴다 —
 *  계산식은 원문 것 그대로라 값을 지어내지 않고, 전체를 넘기면 원문 캡처 합계와 정확히 일치한다. */
export function recoverySummary(source: readonly RecoveryRow[] = DETAIL_ROWS_IR): RecoverySummary[] {
  const recPrin = catSum(source, '회수', 'prin'), recProf = catSum(source, '회수', 'prof');
  const proPrin = catSum(source, '수익', 'prin'), proProf = catSum(source, '수익', 'prof');
  return [
    { label: '투자',     prin: catSum(source, '투자', 'prin'), prof: null },
    { label: '회수',     prin: recPrin,                prof: recProf },
    { label: '수익',     prin: null,                   prof: proProf },
    { label: '회수총액', prin: recPrin + proPrin,      prof: recProf + proProf },
  ];
}

/** 테스트가 원문 건수를 붙잡는다 — 창작 행이 끼면 즉시 깨지도록. */
export const SOURCE_COUNTS = { ir: DETAIL_ROWS_IR.length, all: DETAIL_ROWS_ALL.length } as const;

/* 이 전용 페이지가 **어느 목업에서 왔는가** — 스키마의 provenance 와 같은 역할을 하는 기록.
   라우트는 전용 페이지가 그리므로 출처도 여기에 둔다(테스트가 이 값으로 출처 바꿔치기를 잡는다).
   ⚠ S1_35_투자금_회수현황.html 이 아니다 — 정본 매칭표가 S1_36 을 지목한다(파일 머리말 참조). */
export const PROVENANCE = {
  capturedAt: '2026-09-15',
  sourceSystem: 'FFMS',
  captureFile: 'docs/mockups/01_투자자산관리/S1_36_투자_및_회수_상세정보.html',
} as const;

/* 단위 환산 — 원문 `applyUnit` 의 자릿수를 그대로 쓴다(2026-09-16 Codex 4R P2):
     원 = 0자리 · **백만원 = 1자리** · 억원 = 2자리.
   공용 `schemas/unit.ts` 의 formatUnit 은 백만원·억원 모두 2자리라 이 화면에서는 값이 달라진다
   (예: 1,000,008,000 → 공용 1,000.01 / 원문 1,000.0). 저장 base(원)는 같지만 **표기 규칙이 화면마다
   다르다** — 목업이 정본이므로 여기 화면 전용 포맷터를 둔다. */
const UNIT_DIGITS: Record<string, number> = { 원: 0, 백만원: 1, 억원: 2 };
const UNIT_DIV: Record<string, number> = { 원: 1, 백만원: 1e6, 억원: 1e8 };

export function formatRecoveryUnit(won: number, unit: string): string {
  const d = UNIT_DIGITS[unit] ?? 0;
  const v = won / (UNIT_DIV[unit] ?? 1);
  return v.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
