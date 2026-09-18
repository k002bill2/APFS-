/* 투자기업정보(통합) — 투자자산관리 > 투자기업정보 > 투자기업정보(통합).

   ⚠ 이 스키마는 더 이상 화면을 그리지 않는다(2026-09-15). 정본 매칭표가 지목하는 원문은
   `S1_30_투자기업정보.html` 인데, 그건 **목록이 아니라 기업 1건의 상세**(기업개요 kv +
   재무제표 + 주주명부)라 PageSchema(columns 한 벌)로 담기지 않는다 →
   전용 페이지 `investee_profile.tsx` 가 렌더한다(데이터 SSOT: `company_profile_data.ts`).
   이 파일은 라우트 레지스트리(없으면 resolveSchema 가 DEFAULT_SCHEMA 로 떨어진다)로 남는다.

   ⚠ provenance 를 S1_30 으로 고쳐 적지 않는다. 아래 21개 등록/수정 필드는 S1_30 이 아니라
   **현행시스템 등록/수정 양식 캡처(clipboard-2026-06-29)** 에서 나왔다 — 출처가 서로 다르므로
   각자 자기 출처를 기록한다(화면 하나 = 출처 하나가 아니다).
   등록/수정 모달은 항목 수(21)가 많아 RowFormModal이 2단 wide로 자동 렌더한다. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자기업정보(통합)',
  title: '투자기업정보(통합)',
  kind: 'form',
  entity: '투자기업',
  columns: [
    { key: 'company',      label: '투자기업',      type: 'text',   align: 'left' },
    { key: 'gp',           label: '운용사',        type: 'gp',     align: 'left' },
    { key: 'bizNo',        label: '사업자번호',    type: 'code',   align: 'center' },
    { key: 'investMethod', label: '투자방식',      type: 'text',   align: 'center' },
    { key: 'preRevenue',   label: '투자전 매출액', type: 'amount', unit: '원', align: 'right' },
    { key: 'baseDate',     label: '기준일',        type: 'date',   align: 'center' },
    { key: 'status',       label: '상태',          type: 'status', align: 'center' },
  ],
  // ── 등록/수정 모달 양식(캡처 실측 순서) ──
  fields: [
    { key: 'gp',               label: '운용사',                   control: 'readonly' },
    { key: 'subFund',          label: '자펀드',                   control: 'readonly' },
    { key: 'baseDate',         label: '기준일',                   control: 'date', required: true },
    { key: 'company',          label: '투자기업',                 control: 'text', long: true, required: true },
    { key: 'overseas',         label: '해외기업',                 control: 'switch', options: ['Y', 'N'] },
    { key: 'bizNo',            label: '사업자번호',               control: 'text' },
    { key: 'mandatoryInvest',  label: '의무투자 (신주·우선주)',    control: 'switch', options: ['Y', 'N'] },
    { key: 'belowScaleInvest', label: '일정규모이하투자 (신주·우선주)', control: 'radio', options: ['Y', 'N', '해당없음'] },
    { key: 'agriBiz',          label: '농식품경영체 여부',         control: 'switch', options: ['Y', 'N'] },
    // 형제 Y/N 필드(overseas·mandatoryInvest·agriBiz)와 같은 'switch' 로 통일(2026-09-18).
    //   구 'checkbox' 는 값 계약이 'true'/'false' 라, 셋이 똑같은 체크박스로 보이는데 저장값 형태만 달랐다
    //   (게다가 등록 모드 첫옵션 시드가 옵션형에만 걸려 followOn 만 '' 로 저장됐다).
    { key: 'followOn',         label: '후속투자여부',             control: 'switch', options: ['Y', 'N'] },
    { key: 'compliance',       label: '컴플라이언스의견',         control: 'select', options: ['적정', '조건부 적정', '부적정', '해당없음'] },
    { key: 'remark',           label: '비고',                     control: 'textarea' },
    { key: 'bizField',         label: '사업분야',                 control: 'select', options: ['전체', '정보통신', '바이오·헬스', '농식품 가공', '스마트팜', '식품제조', '유통·물류', '기타'] },
    { key: 'bizContent',       label: '사업내용',                 control: 'text', long: true },
    { key: 'investMethod',     label: '투자방식 (신주·우선주)',    control: 'select', options: ['RCPS', 'CPS', 'CB', 'BW', '보통주', '우선주', '전환사채', 'SAFE'] },
    { key: 'investPeriod',     label: '투자기간 (신주·우선주)',    control: 'text' },
    { key: 'foundDate',        label: '창업일자',                 control: 'date' },
    { key: 'ventureCert',      label: '벤처인증 여부',            control: 'switch', options: ['Y', 'N'] },
    { key: 'mgmtType',         label: '경영형태',                 control: 'select', options: ['전체', '법인', '개인'] },
    { key: 'preRevenue',       label: '투자전 매출액 (원)',        control: 'number' },
    { key: 'location',         label: '소재지',                   control: 'select', options: ['전체', '서울', '경기', '인천', '강원', '충청', '전라', '경상', '제주'] },
  ],
  filters: ['투자방식', '사업분야', '소재지'],
  statusDomain: [
    { label: '투자완료', tone: 'success' },
    { label: '심사중',   tone: 'warning' },
    { label: '검토중',   tone: 'info' },
    { label: '보류',     tone: 'danger' },
  ],
  provenance: {
    capturedAt: '2026-06-29',
    sourceSystem: 'FFMS',
    captureFile: 'clipboard-2026-06-29-154620.png',
  },
};
