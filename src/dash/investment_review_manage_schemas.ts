/* 투자심의관리 — 투자준법감시내역 등록/수정 팝업 폼 스키마 (단일폼 2모드).
   RowFormModal(apfs-form-modal)이 fields로 폼을 자동 생성한다(22필드 flat → 2단 wide 자동).
   필드 순서·옵션은 목업(S1_01_투자심의관리.html) 하단 <script>의 MODE/openModal 실측 그대로.

   ⚠️ schemas/index.ts ALL에 등록하지 않는다 — 라우트 페이지가 아니라 이 화면 전용 모달 스키마다.
   대신 모듈 스코프에서 parsePageSchema로 zod 검증해, 없는 control을 쓰면 import 시점에 즉시 실패한다.
   (골드: subfund_manage_schemas.ts) */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

/* 공통코드 옵션 — 목업 openModal의 fdivOpts/mmOpts/ivOpts/소재지/컴플라이언스 그대로.
   '선택'을 첫 옵션으로 두면 RowFormModal의 첫-옵션 시드 규약상 기본값이 '선택'(=미선택)이 된다. */
export const OPT_FDIV = ['선택', '농업', '농업관련산업', '축산업', '축산관련산업', '수산업', '수산관련산업', '식품업', '식품관련산업', '비농업'];
export const OPT_MM = ['선택', '영농조합법인', '영어조합법인', '농업회사법인', '어업회사법인', '일반기업', '개인 및 기타'];
export const OPT_IV = ['BW', 'CB', 'RPS', 'CPS', 'RCPS', '보통주', '지분투자', '프로젝트', '기타'];
export const OPT_REGION = ['선택', '서울', '인천', '부산', '대구', '대전', '세종', '광주', '울산', '경기', '강원', '충남', '충북', '전북', '전남', '경북', '경남', '제주', '해외'];
export const OPT_COMPLIANCE = ['선택', '적격', '부적격', '조건부적격'];
export const OPT_YN = ['예', '아니오'];
export const OPT_YN3 = ['예', '아니오', '해당없음'];

const PROVENANCE = { capturedAt: '2026-09-11', sourceSystem: 'FFMS(S1) 사후보고관리', captureFile: 'S1_01_투자심의관리.html' };

/* 리스트 컬럼은 페이지(investment_review_manage.tsx)가 AG Grid ColDef로 직접 소유한다.
   PageSchemaZ가 columns를 필수로 요구해 모달 스키마에도 대표 컬럼만 선언한다(렌더엔 미사용). */
const REP_COLUMNS: PageSchema['columns'] = [
  { key: 'co', label: '투자기업', type: 'text' },
  { key: 'inv', label: '투자금액', type: 'amount' },
  { key: 'confirm', label: '투심일정 확정여부', type: 'status' },
];

/* 투자준법감시내역 등록/수정 — 행 선택 후 [준법감시 등록](신규) · [준법감시 수정](기존)에서 호출.
   제목은 호출 시점에 RowFormModal title prop으로 바꾼다. 운용사/자펀드는 선택 행에서 온 readonly. */
export const COMPLIANCE_SCHEMA: PageSchema = parsePageSchema({
  route: '투자심의관리/준법감시', title: '투자준법감시내역', kind: 'form', entity: '투자준법감시내역',
  columns: REP_COLUMNS,
  fields: [
    { key: 'gp', label: '운용사', control: 'readonly' },
    { key: 'fn', label: '자펀드', control: 'readonly' },
    { key: 'baseDate', label: '기준일', control: 'date', required: true },
    { key: 'co', label: '투자기업', control: 'text', required: true },
    { key: 'bizno', label: '사업자번호', control: 'text' },
    { key: 'overseas', label: '해외기업', control: 'radio', options: OPT_YN },
    { key: 'founded', label: '창업일자', control: 'date' },
    { key: 'fdiv', label: '사업분야', control: 'select', options: OPT_FDIV },
    { key: 'fcon', label: '사업내용', control: 'text' },
    { key: 'iv', label: '투자유형', control: 'select', options: OPT_IV },
    { key: 'ns', label: '신주/구주', control: 'radio', options: ['신주', '구주'] },
    { key: 'ivDate', label: '투자일자', control: 'date' },
    { key: 'sale', label: '투자전 매출액(원)', control: 'text' },
    { key: 'mm', label: '경영형태', control: 'select', options: OPT_MM },
    { key: 'venture', label: '벤처인증 여부', control: 'radio', options: OPT_YN },
    { key: 'region', label: '소재지', control: 'select', options: OPT_REGION },
    { key: 'ob', label: '의무투자', control: 'radio', options: OPT_YN },
    { key: 'sm', label: '일정규모이하투자', control: 'radio', options: OPT_YN3 },
    { key: 'agf', label: '농식품경영체 여부', control: 'radio', options: OPT_YN },
    { key: 'follow', label: '후속투자여부', control: 'radio', options: OPT_YN },
    { key: 'opinion', label: '컴플라이언스의견', control: 'select', options: OPT_COMPLIANCE },
    { key: 'remark', label: '비고', control: 'textarea' },
  ],
  provenance: PROVENANCE,
});
