/* 자펀드관리 — 편집 팝업 폼 스키마 2종 (제안서접수 등록 / 선정조합 등록·수정).
   RowFormModal(apfs-form-modal)이 fields로 폼을 자동 생성한다. 필드 순서·옵션은
   목업(자펀드관리_목업.html, 구조도 v1.4 공통코드 CDTP 확정값) 실측 그대로.

   ⚠️ schemas/index.ts ALL에 등록하지 않는다 — 라우트 가능한 페이지가 아니라 이 화면이
   직접 소비하는 모달 전용 스키마다(등록하면 route 충돌 가능). 대신 모듈 스코프에서
   parsePageSchema로 zod 검증해, 없는 control을 쓰면 import 시점에 즉시 실패한다. */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

/* 공통코드(CDTP) — 구조도 v1.4 확정값 */
export const OPT_AG = ['농식품투자계정', '농식품투자계정(농안기금)', '수산투자계정', 'FTA', '해당사항없음'];
export const OPT_FG = ['농림수산식품투자조합', '사모투자전문회사', '중소기업창업투자조합', '한국벤처투자조합', '벤처투자조합', '신기술사업투자조합', '해당사항없음'];
export const OPT_FC = ['농림수산일반', 'AgroSeed', '8대사업', '수출분야', '창업 아이디어', '스마트팜', 'ABC분야', '세컨더리', '농식품벤처', '지역특성화(경기도)', '마이크로', '지역경제활성화(전남)', '지역경제활성화(일반)', '민간제안', '지역경제활성화(충남)', '지역경제활성화(창업기획자)', '농림축산', '징검다리', '수산벤처창업', '수산유통', '수산 미래청년기업', '지역특성화(경북)', '영파머스', '그린바이오', '창업초기(Start-up)', '후속투자(Scale-up)', '사업화(Step-up)', '스마트농업', '미래혁신성장', '창업보육', '푸드테크', '스마트양식산업혁신', '지역특성화(전북)', '식품', '직접투자', '반려동물', '수산세컨더리', '전통주', '블루푸드테크', '수산', '소형프로젝트', 'PEF', '농림축산식품', '6차 산업화', 'R&D', '해당사항없음'];
export const OPT_PT = ['일시납', '분납', '수시납'];
export const OPT_FS = ['운영중', '청산중', '청산완료'];
export const OPT_MY = ['미결성', '결성', '취소'];
export const OPT_TC = ['기업은행', '한국산업은행', '농협'];
export const OPT_MF = ['농식품모태펀드', 'MOAF'];
export const OPT_MANAGER = ['양한솔', '이성훈'];   // ⚠ 구조도 엑셀 예시값 — 실 담당자 마스터 연동 필요(동적 사용자 데이터)

const CUR_YEAR = new Date().getFullYear();
export const OPT_YEARS = Array.from({ length: 12 }, (_, i) => String(CUR_YEAR + 1 - i));   // 내년~11년 전

const PROVENANCE = { capturedAt: '2026-09-08', sourceSystem: 'FFMS(S1) 통합_화면_구조도_v1.4', captureFile: '자펀드관리_목업.html' };

/* 리스트 컬럼은 페이지(subfund_manage.tsx)가 AG Grid ColDef로 직접 소유한다.
   PageSchemaZ가 columns를 필수로 요구해 모달 스키마에도 대표 컬럼만 선언한다(렌더엔 미사용). */
const REP_COLUMNS: PageSchema['columns'] = [
  { key: 'fn', label: '자펀드', type: 'text' },
  { key: 'gp1', label: '업무집행조합원1', type: 'gp' },
  { key: 'stg', label: '심사단계', type: 'status' },
];

/* ① 제안서접수 등록 — ＋제안서접수 등록 버튼 → 심사단계 '신청' 행 신규 생성 */
export const APPLY_SCHEMA: PageSchema = parsePageSchema({
  route: '자펀드관리/제안서접수', title: '제안서접수 등록', kind: 'form', entity: '자펀드',
  columns: REP_COLUMNS,
  fields: [
    { key: 'mf', label: '모펀드', control: 'select', options: OPT_MF },
    { key: 'applyDate', label: '신청일자', control: 'date', required: true },
    { key: 'y', label: '사업연도', control: 'select', options: OPT_YEARS, required: true },
    { key: 'rt', label: '정기/수시', control: 'select', options: ['정기', '수시'] },
    { key: 'ch', label: '차수', control: 'number' },
    { key: 'seq', label: '순번', control: 'number' },
    { key: 'gp1', label: 'GP명', control: 'text' },
    { key: 'fn', label: '조합명', control: 'text', required: true },
    { key: 'c1', label: '조합결성예정액(원)', control: 'number' },
    { key: 'c2', label: '모태펀드출자요청액(원)', control: 'number' },
    { key: 'ctype', label: '조합구분', control: 'select', options: OPT_FG },
    { key: 'cs', label: '조합성격', control: 'select', options: OPT_FC },
    { key: 'ag', label: '계정구분', control: 'select', options: OPT_AG },
    { key: 'pt', label: '납입방식', control: 'select', options: OPT_PT },
    { key: 'dur', label: '존속기간(년)', control: 'number' },
    { key: 'rate', label: '기준수익률(%)', control: 'number' },
    { key: 'mgmtFee', label: '관리보수', control: 'text' },
    { key: 'perfFee', label: '성과보수', control: 'text' },
    { key: 'pm', label: '대표펀드매니저', control: 'text' },
    { key: 'attach', label: '첨부파일 (PDF·HWP·DOCX, 최대 20MB)', control: 'file' },
    { key: 'result', label: '선정결과', control: 'radio', options: ['취소', '탈락', '선정', '반납'] },
    { key: 'rejectReason', label: '탈락사유', control: 'textarea' },
  ],
  provenance: PROVENANCE,
});

/* ② 선정조합 등록/수정 — 행 선택 후 [선정조합 등록](신청→선정) · [수정](선정 단계) 에서 호출.
   제목은 호출 시점 단계에 따라 RowFormModal title prop으로 바꾼다. */
export const SELECT_SCHEMA: PageSchema = parsePageSchema({
  route: '자펀드관리/선정조합', title: '선정조합 등록', kind: 'form', entity: '자펀드',
  columns: REP_COLUMNS,
  fields: [
    { key: 'selDate', label: '선정일자', control: 'date', required: true },
    { key: 'y', label: '사업연도', control: 'readonly' },
    { key: 'gp1', label: 'GP명', control: 'text' },
    { key: 'fn', label: '조합명', control: 'text', required: true },
    { key: 'c1', label: '조합약정총액(원)', control: 'number' },
    { key: 'c2', label: '모태펀드출자약정액(원)', control: 'number' },
    { key: 'gpCommit', label: 'GP출자약정액(원)', control: 'number' },
    { key: 'manager', label: '자펀드담당자', control: 'select', options: OPT_MANAGER },
    { key: 'ctype', label: '조합구분', control: 'select', options: OPT_FG },
    { key: 'cs', label: '조합성격', control: 'select', options: OPT_FC },
    { key: 'ag', label: '계정구분', control: 'select', options: OPT_AG },
    { key: 'pt', label: '납입방식', control: 'select', options: OPT_PT },
    { key: 'dur', label: '존속기간(년)', control: 'number' },
    { key: 'rate', label: '기준수익률(%)', control: 'number' },
    { key: 'mgmtFee', label: '관리보수', control: 'text' },
    { key: 'perfFee', label: '성과보수', control: 'text' },
    { key: 'formDeadline', label: '조합결성시한', control: 'date' },
    { key: 'payDue', label: '조합납입예정일', control: 'date' },
    { key: 'my', label: '결성여부', control: 'select', options: OPT_MY },
    { key: 'etc', label: '기타', control: 'text' },
  ],
  provenance: PROVENANCE,
});
