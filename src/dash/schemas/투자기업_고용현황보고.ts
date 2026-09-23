/* 투자기업 고용현황보고 (메뉴 라벨: 투자기업고용현황(통합)) — 투자자산관리 > 투자기업정보.
   출처: docs/mockups/01_투자자산관리/S1_32_투자기업_고용현황보고.html (2026-09-15 파싱 실측)

   원문 3행을 그대로 싣는다. 원문 tfoot 의 `합계`(총고용 155 · 청년 62)는 행이 아니라 집계라
   sample 에 넣지 않는다 — 넣으면 건수가 4건이 되고 합계가 데이터로 위조된다.
   대신 `totals`(opt-in)로 pinned 합계 행을 그린다(S1_32:255-263): `합계`(colspan 7 = No~기준년월) ·
   매출액 = 원문 `TOTAL_SALES`(DATA sales 합) · 총고용·청년고용 = 원문 리터럴 155·62(= 3행 합) · 끝 3칸 `-`. */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '투자기업 고용현황보고',
  title: '투자기업 고용현황보고',
  kind: 'list',
  entity: '고용현황',
  columns: [
    { key: 'no',            label: 'No',          type: 'number', align: 'center' },
    { key: 'gp',            label: '운용사',      type: 'gp',     align: 'left' },
    { key: 'subFund',       label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'bizNo',         label: '사업자번호',  type: 'pii',    align: 'center' },
    { key: 'firstInvestDate', label: '최초투자(전환)일자', type: 'date', align: 'center' },
    { key: 'investee',      label: '투자기업',    type: 'text',   align: 'left' },
    { key: 'baseYm',        label: '기준년월',    type: 'text',   align: 'center' },
    { key: 'salesAmt',      label: '매출액*',     type: 'amount', unit: '원', align: 'right' },
    { key: 'totalEmployees', label: '총고용인수',  type: 'number', align: 'right' },
    { key: 'youthEmployees', label: '청년고용인수', type: 'number', align: 'right' },
    { key: 'attachment',    label: '첨부파일',    type: 'text',   align: 'center' },
    { key: 'updatedAt',     label: '수정일시',    type: 'date',   align: 'center' },
    { key: 'isUploaded',    label: '업로드여부',  type: 'status', align: 'center' },
  ],
  fields: [
    { key: 'investee',      label: '투자기업',    control: 'text', long: true, required: true },
    { key: 'baseYm',        label: '기준년월',    control: 'text', required: true },
    { key: 'salesAmt',      label: '매출액',      control: 'number' },
    { key: 'totalEmployees', label: '총고용인수', control: 'number', required: true },
    { key: 'youthEmployees', label: '청년고용인수', control: 'number' },
    { key: 'attachment',    label: '첨부파일',    control: 'filepond' },
  ],
  filters: ['운용사', '자펀드', '계정구분', '기준년월'],
  statusDomain: [
    // 원문 `upTag()` 실값 — 완료(.tag g) / 미완료(.tag n).
    { label: '완료',   tone: 'success' },
    { label: '미완료', tone: 'danger' },
  ],
  hideCardView: true,
  totals: {
    label: '합계',
    rules: { salesAmt: 'sum', totalEmployees: 'sum', youthEmployees: 'sum', attachment: 'dash', updatedAt: 'dash', isUploaded: 'dash' },
  },
  sample: [
    { no: 1, gp: 'NH투자증권', subFund: 'NH농식품밸류업투자조합', bizNo: '214-88-12345', firstInvestDate: '2024-03-15', investee: '(주)그린팜테크', baseYm: '2026-06', salesAmt: 12500000000, totalEmployees: 85, youthEmployees: 32, attachment: '고용현황_그린팜_202606.xlsx', updatedAt: '2026-07-10 14:22', isUploaded: '완료' },
    { no: 2, gp: 'NH투자증권', subFund: 'NH농식품밸류업투자조합', bizNo: '305-81-54321', firstInvestDate: '2023-11-20', investee: '(주)오션프레시', baseYm: '2026-06', salesAmt: 8300000000, totalEmployees: 47, youthEmployees: 19, attachment: '고용현황_오션_202606.xlsx', updatedAt: '2026-07-09 10:05', isUploaded: '완료' },
    { no: 3, gp: 'NH투자증권', subFund: 'NH농식품밸류업투자조합', bizNo: '128-86-99001', firstInvestDate: '2025-01-10', investee: '팜커넥트(주)', baseYm: '2026-06', salesAmt: 3150000000, totalEmployees: 23, youthEmployees: 11, attachment: '', updatedAt: '2026-07-11 09:41', isUploaded: '미완료' },
  ],
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_32_투자기업_고용현황보고.html',
  },
};
