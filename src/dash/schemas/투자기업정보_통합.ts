/* 투자기업정보(통합) — 투자기업정보 > 투자기업정보(통합).
   현행시스템 투자기업 등록/수정 양식 캡처(clipboard) 실측 매핑. 등록/수정 모달은
   항목 수(21)가 많아 RowFormModal이 2단 wide로 자동 렌더한다. */
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
    { key: 'company',          label: '투자기업',                 control: 'text', required: true },
    { key: 'overseas',         label: '해외기업',                 control: 'radio', options: ['Y', 'N'] },
    { key: 'bizNo',            label: '사업자번호',               control: 'text' },
    { key: 'mandatoryInvest',  label: '의무투자 (신주·우선주)',    control: 'radio', options: ['Y', 'N'] },
    { key: 'belowScaleInvest', label: '일정규모이하투자 (신주·우선주)', control: 'radio', options: ['Y', 'N', '해당없음'] },
    { key: 'agriBiz',          label: '농식품경영체 여부',         control: 'radio', options: ['Y', 'N'] },
    { key: 'followOn',         label: '후속투자여부',             control: 'checkbox' },
    { key: 'compliance',       label: '컴플라이언스의견',         control: 'select', options: ['적정', '조건부 적정', '부적정', '해당없음'] },
    { key: 'remark',           label: '비고',                     control: 'textarea' },
    { key: 'bizField',         label: '사업분야',                 control: 'select', options: ['전체', '정보통신', '바이오·헬스', '농식품 가공', '스마트팜', '식품제조', '유통·물류', '기타'] },
    { key: 'bizContent',       label: '사업내용',                 control: 'text' },
    { key: 'investMethod',     label: '투자방식 (신주·우선주)',    control: 'select', options: ['RCPS', 'CPS', 'CB', 'BW', '보통주', '우선주', '전환사채', 'SAFE'] },
    { key: 'investPeriod',     label: '투자기간 (신주·우선주)',    control: 'text' },
    { key: 'foundDate',        label: '창업일자',                 control: 'date' },
    { key: 'ventureCert',      label: '벤처인증 여부',            control: 'radio', options: ['Y', 'N'] },
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
