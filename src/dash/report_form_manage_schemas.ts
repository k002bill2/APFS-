/* 보고양식관리 — 등록/수정 단일 폼(2모드) 스키마.
   RowFormModal(apfs-form-modal)이 fields로 폼을 자동 생성한다. 필드 순서·필수 여부는
   목업(S1_09_보고양식관리.html `openForm`: 제목* · 설명 · 첨부파일 드롭존) 그대로.

   ⚠️ schemas/index.ts ALL에 등록하지 않는다 — 라우트 가능한 페이지가 아니라 이 화면(report_form_manage.tsx)이
   직접 소비하는 모달 전용 스키마다. 대신 모듈 스코프 parsePageSchema로 zod 검증해, 없는 control을 쓰면
   import 시점에 즉시 실패한다(subfund_manage_schemas.ts와 동일 관례). */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

const PROVENANCE = { capturedAt: '2026-09-12', sourceSystem: 'FFMS(S1) 사후보고관리 · KRDS TO-BE', captureFile: 'S1_09_보고양식관리.html' };

/* 리스트 컬럼은 페이지(report_form_manage.tsx)가 AG Grid ColDef로 직접 소유한다.
   PageSchemaZ가 columns를 필수로 요구해 대표 컬럼만 선언한다(렌더엔 미사용). */
const REP_COLUMNS: PageSchema['columns'] = [
  { key: 'title', label: '양식제목', type: 'text' },
  { key: 'desc', label: '설명', type: 'text' },
];

/* 양식 등록/수정 — 같은 스키마를 RowFormModal `title` prop으로 '양식 등록' / '양식 수정' 두 제목으로 연다.
   첨부는 `filepond`(DocumentsField 통일 드롭존 — 목업의 드래그앤드롭+파일 선택에 대응). 3필드라 460px 1단 모달. */
export const FORM_SCHEMA: PageSchema = parsePageSchema({
  route: '보고양식관리/양식', title: '양식 등록', kind: 'form', entity: '보고양식',
  columns: REP_COLUMNS,
  fields: [
    { key: 'title', label: '제목', control: 'text', required: true },
    { key: 'desc', label: '설명', control: 'text' },
    { key: 'file', label: '첨부파일', control: 'filepond' },
  ],
  provenance: PROVENANCE,
});
