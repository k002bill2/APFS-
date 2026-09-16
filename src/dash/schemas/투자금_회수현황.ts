/* 투자금 회수현황 — 투자자산관리 > 투자기업정보 > 투자금 회수현황.
   출처: docs/mockups/01_투자자산관리/S1_36_투자_및_회수_상세정보.html (2026-09-15 파싱 실측)

   ── 출처 정정(2026-09-15) ──
   이전 버전은 **이름이 같은 다른 목업** `S1_35_투자금_회수현황.html`(출자사업연도별 집계 11컬럼)을
   출처로 적었다. 정본 매칭표(docs/메뉴구성도_v0.2.md:97)는 이 리프를
   `ffms > 투자기업정보 > 투자및회수상세정보`(S1_36)로 지목하며, 같은 문서 46행이 S1_35 가 어느
   메뉴에도 연결되지 않았음을 이미 기록해 뒀다("스펙을 임의로 덮지 않았다"). S1_35 로 대체하지 않는다.

   ── 원본 동일성 확인(2026-09-16) ──
   사용자가 지목한 원본 `~/Downloads/통합 2/01_투자자산관리/S1_36_투자_및_회수_상세정보.html` 과
   저장소 사본은 **바이트 동일**하다(md5 d5d9d0f63f2bf918d513d83dd3dc3209, 37,653 bytes). 그 경로에서 다시 파싱해
   투자및회수 21행 · 전체거래 24행의 **전 필드**와 두 모드의 컬럼 키·라벨 순서를 대조했고 차이 0건이다.
   provenance 는 저장소 상대경로로 적는다 — 절대경로는 다른 기기에서 테스트가 돌지 않는다.

   ── 이 파일의 역할 ──
   화면은 전용 페이지 `invest_recovery_detail.tsx` 가 그린다(원문 `조회기준` 토글이 컬럼과 데이터를
   함께 바꾸는데 PageSchema 는 route 당 columns 가 한 벌뿐이다). 이 파일은 남겨 둔다:
   ① 라우트 레지스트리 — 없으면 resolveSchema 가 DEFAULT_SCHEMA(영문 5컬럼)로 떨어진다.
   ② 출처 기록.
   ③ 아래 columns 는 원문 `투자및회수` 모드의 14컬럼 정본이고, 모델이 그대로 가져다 쓴다(복사 금지).
   행 데이터는 모델이 갖는다 — 전용 페이지가 소비하므로 여기 sample 을 두면 두 벌이 된다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자금 회수현황',
  title: '투자금 회수현황',
  kind: 'list',
  entity: '투자회수내역',
  // 원문 COLS_IR — 순서·라벨·정렬 모두 원문 그대로.
  columns: [
    { key: 'gp',    label: '운용사',       type: 'gp',     align: 'left', pinned: 'left' },
    { key: 'fund',  label: '자펀드',       type: 'text',   align: 'left', pinned: 'left' },
    { key: 'yr',    label: '사업년도',     type: 'text',   align: 'center' },
    { key: 'acc',   label: '계정구분',     type: 'text',   align: 'center' },
    { key: 'co',    label: '투자기업',     type: 'text',   align: 'left', pinned: 'left' },
    { key: 'biz',   label: '사업자번호',   type: 'pii',    align: 'center' },
    { key: 'ag',    label: '약정번호',     type: 'code',   align: 'center' },
    { key: 'itype', label: '투자유형',     type: 'text',   align: 'center' },
    { key: 'tdate', label: '거래일자',     type: 'date',   align: 'center' },
    { key: 'tname', label: '거래명',       type: 'status', align: 'center' },
    { key: 'tgb',   label: '거래구분',     type: 'text',   align: 'center' },
    { key: 'ccode', label: '거래처분코드', type: 'text',   align: 'center' },
    { key: 'prin',  label: '거래원금',     type: 'amount', unit: '원', align: 'right' },
    { key: 'prof',  label: '거래수익',     type: 'amount', unit: '원', align: 'right' },
  ],
  fields: [],
  filters: ['운용사', '자펀드', '계정구분', '조회기준', '기준일자'],
  hideCardView: true,
  hideKpis: true,
  hideMetrics: true,
  unitToggle: true,
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_36_투자_및_회수_상세정보.html',
  },
};
