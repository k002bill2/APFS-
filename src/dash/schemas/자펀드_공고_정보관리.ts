import type { PageSchema } from './types';

// 출처: 공고관리_목업_artifact.html (KRDS TO-BE, 파일럿 공고관리).
// 모태펀드 출자사업 계획공고 조회·등록·수정·삭제. flat CRUD → 스키마 트랙(GenericListPage).
export const schema: PageSchema = {
  route: '자펀드 공고 정보관리',
  title: '자펀드 공고 정보관리',
  kind: 'form',
  entity: '공고',
  columns: [
    { key: 'bizYear',    label: '사업연도',  type: 'text',   align: 'center' },
    { key: 'periodType', label: '정기/수시',  type: 'text',   align: 'center' },
    { key: 'seqNo',      label: '차수',       type: 'number', align: 'center' },
    { key: 'fundAccount',label: '계정구분',   type: 'text',   align: 'center' },
    // 첨부파일은 별도 컬럼을 만들지 않고 제목 뒤 확장자 칩(PDF 등)으로 표현(2026-09-12 사용자 결정).
    { key: 'title',      label: '제목',       type: 'text',   align: 'left', attachFrom: 'attachment' },
  ],
  fields: [
    // 다중모펀드 옵션 ON 가정(목업) → 읽기전용에서 선택형으로 전환
    { key: 'moeFund',    label: '모펀드',    control: 'select', options: ['농식품모태펀드', 'MOAF'] },
    { key: 'bizYear',    label: '사업연도',  control: 'number' },
    { key: 'periodType', label: '정기/수시', control: 'select', options: ['정기', '수시'] },
    { key: 'seqNo',      label: '차수',      control: 'number' },
    // 계정구분 = 모펀드(농식품모태펀드) 구성 계정. 목업 기준 농식품투자·수산투자
    { key: 'fundAccount',label: '계정구분',  control: 'select', options: ['농식품', '수산'] },
    { key: 'title',      label: '제목',      control: 'text', required: true },
    { key: 'content',    label: '공고내용',  control: 'richtext' },
    { key: 'attachment', label: '첨부파일',  control: 'filepond' },
  ],
  // 상세필터 최상단 '검색어' 입력 미노출(2026-09-11 사용자 결정) — searchable을 켜지 않는다(기본 OFF).
  // 이 화면의 필터는 아래 filters 2종뿐. 되살리려면 `searchable: true` 한 줄.
  // 목업 검색바 항목·순서 그대로: 모펀드 · 사업연도 · 정기/수시(2026-09-12 사용자 지적 — 모펀드 누락 보정).
  // '모펀드'는 columns엔 없고 fields+sample에만 있는 키 → filter_field의 sample 시드 인정 경로로 행필터가 성립한다.
  filters: ['모펀드', '사업연도', '정기/수시'],
  // 공고 = 금액·변동률 없는 엔티티 → 제네릭 금액 KPI·카드 금액/상태 숨김
  hideMetrics: true,
  // KPI 배지 행 미포함(2026-09-11 사용자 결정) — 헤더 KPI 슬롯을 비운다. hideMetrics와 별개로 명시.
  hideKpis: true,
  // 카드뷰 미사용(2026-09-11 사용자 결정) — 푸터 리스트/카드뷰 SegTabs를 숨기고 리스트 뷰 고정.
  hideCardView: true,
  // 행 선택 체크박스 제거(2026-09-12 사용자 결정) — 다건 선택/선택삭제가 없는 단건 CRUD 화면.
  // 수정은 행 더블클릭·Enter, 삭제는 우클릭 메뉴/수정 모달로 유지.
  hideRowSelection: true,
  // 목업 하단 DATA[] — 실제 계획공고 4건(합성 더미 대신 그대로 노출). moeFund 채워 수정 시 빈 값 방지
  sample: [
    { moeFund: '농식품모태펀드', bizYear: '2026', periodType: '정기', seqNo: 1, fundAccount: '농식품', title: '농림수산식품모태펀드 2026년 정기 출자사업(농식품 계정) 계획 공고', attachment: "260202(붙임) '26년 정기 출자사업(농식품투자 계정) 계획 공고_홈페이지.pdf" },
    { moeFund: '농식품모태펀드', bizYear: '2026', periodType: '정기', seqNo: 1, fundAccount: '수산',   title: '농림수산식품모태펀드 2026년 정기 출자사업(수산 계정) 계획 공고' },
    { moeFund: '농식품모태펀드', bizYear: '2025', periodType: '수시', seqNo: 2, fundAccount: '농식품', title: '농림수산식품모태펀드 2025년 수시 출자사업(농식품 계정) 계획 공고' },
    { moeFund: '농식품모태펀드', bizYear: '2025', periodType: '정기', seqNo: 1, fundAccount: '수산',   title: '농림수산식품모태펀드 2025년 정기 출자사업(수산 계정) 계획 공고' },
  ],
  provenance: {
    capturedAt: '2026-09-11',
    sourceSystem: 'FFMS',
    captureFile: '공고관리_목업_artifact.html',
  },
};
