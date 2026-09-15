/* 우수투자기업 관리 — 투자자산관리 > 투자기업정보 > 우수투자기업 관리.

   ⚠⚠ 이 화면은 **현행시스템 복원이 아니다. 신규 제안(프로토타입)이다.** ⚠⚠
   `~/Downloads/통합 2` 전체에 대응 목업 HTML이 없다(2026-09-15 확인). 그래서
   `provenance.sourceSystem = 'NEW'` · `captureFile = ''` 로 **원천 없음을 스키마에 기록**한다
   — 그럴듯한 파일명을 적으면 이후 누구도 이 화면이 창작물임을 알 수 없게 된다.

   같은 이유로 `sample`(리터럴 행)을 쓰지 않는다. `sample` 은 "목업의 실제 값"이라는 의미를 갖는
   슬롯이라(types.ts SampleRow 주석), 원천 없는 화면에 넣으면 합성 더미가 실데이터로 읽힌다.
   행은 generic_list 의 makeRows 결정적 더미가 만든다.

   ── 명시적 가정(확정 아님 · 발주처 확인 필요) ──
   A1 "우수투자기업"은 성과 우수 기업을 선정·관리하는 내부 제도다.
      → 단순 조회 필터라면 이 화면은 투자기업정보(통합)의 저장된 필터로 축소된다.
   A2 1행 = 투자기업 × 선정연도 1건(같은 기업이 연도별 재선정 가능).
      → 1행=1기업이면 선정연도는 컬럼이 아니라 이력 팝업이 된다.
   A3 선정등급 값(`최우수`/`우수`/`후보`)은 **임의 제안**이다. 실제 등급 체계가 확인되면
      공통코드(코드관리)로 분리한다.
   A4 선정 근거 지표는 고용·매출(S1_32)과 투자·회수 실적(S1_33)에서 가져왔다 — 창작 최소화.
      선정등급·선정사유·사후관리상태 3개를 뺀 나머지 컬럼은 전부 S1_31/S1_32/S1_33 실재 필드다.
   A5 등록/수정/삭제 CRUD가 있다(선정·해제가 업무). 배치 산출이면 조회 전용으로 바뀐다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '우수투자기업 관리',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키, NFC)
  title: '우수투자기업 관리',
  kind: 'list',
  entity: '우수투자기업',
  columns: [
    { key: 'no',              label: 'No',          type: 'number', align: 'center' },
    { key: 'selectYear',      label: '선정연도',    type: 'text',   align: 'center' },
    // 등급은 type:'text' 로 둔다 — 'status' 로 두면 아래 statusDomain(사후관리상태 도메인)에서
    // 톤을 찾다 실패해 전부 info 색으로 칠해진다(두 축은 서로 다른 값 도메인이다).
    { key: 'grade',           label: '선정등급',    type: 'text',   align: 'center' },
    { key: 'gp',              label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',         label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'investee',        label: '투자기업',    type: 'text',   align: 'left' },
    { key: 'bizNo',           label: '사업자번호',  type: 'pii',    align: 'center' },
    { key: 'bizField',        label: '사업분야',    type: 'text',   align: 'center' },
    { key: 'firstInvestDate', label: '최초투자일자', type: 'date',  align: 'center' },
    { key: 'investAmt',       label: '투자금액',    type: 'amount', unit: '원', align: 'right' },
    { key: 'salesAmt',        label: '매출액',      type: 'amount', unit: '원', align: 'right' },
    { key: 'totalEmployees',  label: '총고용인수',  type: 'number', align: 'right' },
    { key: 'youthEmployees',  label: '청년고용인수', type: 'number', align: 'right' },
    { key: 'selectReason',    label: '선정사유',    type: 'text',   align: 'left' },
    { key: 'status',          label: '사후관리상태', type: 'status', align: 'center' },
  ],
  // 항목 7개 > 6 → RowFormModal이 2단 wide로 자동 렌더한다(schema-form-modal-2col).
  fields: [
    { key: 'selectYear',   label: '선정연도',     control: 'select', required: true, options: ['2026', '2025', '2024', '2023', '2022'] },
    { key: 'grade',        label: '선정등급',     control: 'radio',  required: true, options: ['최우수', '우수', '후보'] },
    { key: 'investee',     label: '투자기업',     control: 'text',   required: true, long: true },
    { key: 'bizField',     label: '사업분야',     control: 'select', options: ['정보통신', '바이오·헬스', '농식품 가공', '스마트팜', '식품제조', '유통·물류', '기타'] },
    { key: 'selectReason', label: '선정사유',     control: 'textarea', long: true },
    { key: 'status',       label: '사후관리상태', control: 'select', required: true, options: ['선정', '후보', '해제', '보류'] },
    { key: 'remark',       label: '비고',         control: 'textarea', long: true },
  ],
  filters: ['선정연도', '선정등급', '운용사', '자펀드', '사업분야', '사후관리상태'],
  statusDomain: [
    { label: '선정', tone: 'success' },
    { label: '후보', tone: 'info' },
    { label: '해제', tone: 'danger' },
    { label: '보류', tone: 'warning' },
  ],
  // 금액 합계 KPI 대신 등급별 건수 — 신규 제도라 "얼마"보다 "몇 건 선정됐나"가 화면의 질문이다.
  countKpis: [
    { label: '최우수', icon: 'target',     color: 'var(--chart-1)', column: 'grade', value: '최우수' },
    { label: '우수',   icon: 'chart-bar',  color: 'var(--chart-3)', column: 'grade', value: '우수' },
    { label: '후보',   icon: 'layers',     color: 'var(--chart-4)', column: 'grade', value: '후보' },
  ],
  searchable: true,
  hideCardView: true,
  unitToggle: true,
  provenance: {
    capturedAt: '',
    sourceSystem: 'NEW',   // 원천 없음 — 신규 제안 화면(위 주석 참조). 가짜 출처를 적지 않는다.
    captureFile: '',
  },
};
