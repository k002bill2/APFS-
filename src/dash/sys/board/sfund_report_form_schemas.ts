/* 자펀드보고양식관리(운용사ERP)(ADM-012) — 모달 폼 스키마 2종. RowFormModal(apfs-form-modal)이 fields 로 폼을 자동 생성한다.
   필드 순서·필수 여부·placeholder 는 목업 스크립트 그대로:
   - openForm(양식 등록/수정 단일 폼 2모드): 제목* · 설명 · 첨부파일 드롭존
   - openNewVersion(새 버전 등록): 현재 버전(읽기) · 새 버전명* · 설명(현재 설명 프리필) · 첨부파일*

   ⚠️ schemas/index.ts ALL 에 등록하지 않는다 — 라우트 페이지가 아니라 이 화면이 직접 소비하는 모달 전용 스키마다.
   모듈 스코프 parsePageSchema 로 zod 검증해, 없는 control 을 쓰면 import 시점에 바로 실패한다(report_form_manage_schemas 관례). */
import { parsePageSchema } from '../../schemas/types';
import type { PageSchema } from '../../schemas/types';

const PROVENANCE = { capturedAt: '2026-11-02', sourceSystem: '관리자(ADM) 게시판 · KRDS TO-BE', captureFile: '자펀드보고양식관리(운용사ERP).html' };

/* 리스트 컬럼은 페이지가 AG Grid ColDef 로 직접 소유한다. PageSchemaZ 가 columns 를 필수로 요구해 대표 컬럼만 선언(렌더 미사용). */
const COLUMNS: PageSchema['columns'] = [
  { key: 'title', label: '양식제목', type: 'text' },
  { key: 'desc', label: '설명', type: 'text' },
];

/* 양식 등록/수정 — 같은 스키마를 RowFormModal `title` prop 으로 '양식 등록' / '양식 수정'(목업 h2) 두 제목으로 연다.
   첨부는 filepond(DocumentsField 통일 드롭존 — 목업 드래그앤드롭+파일 선택). 3필드라 460px 1단. */
export const FORM_SCHEMA: PageSchema = parsePageSchema({
  route: 'sfund-report-form-manage/form', title: '양식 등록', kind: 'form', entity: '자펀드보고양식',
  columns: COLUMNS,
  fields: [
    { key: 'title', label: '제목', control: 'text', long: true, required: true, placeholder: '보고양식 제목을 입력하세요' },
    { key: 'desc', label: '설명', control: 'text', long: true, placeholder: '양식 설명을 입력하세요' },
    { key: 'file', label: '첨부파일', control: 'filepond' },
  ],
  provenance: PROVENANCE,
});

/* 새 버전 등록 — 목업 h2 '새 버전 등록 — <양식제목>' 의 대상명은 읽기 칸 '양식제목' 으로 옮긴다(RowFormModal 제목은 문자열 한 줄이라
   긴 양식명이 붙으면 460px 머리글이 두 줄로 꺾인다). 첨부파일은 목업처럼 필수(새 버전 = 새 파일). 5필드라 460px 1단. */
export const VERSION_SCHEMA: PageSchema = parsePageSchema({
  route: 'sfund-report-form-manage/version', title: '새 버전 등록', kind: 'form', entity: '자펀드보고양식',
  columns: COLUMNS,
  fields: [
    { key: 'title', label: '양식제목', control: 'readonly', long: true },
    { key: 'cur', label: '현재 버전', control: 'readonly', long: true },
    { key: 'ver', label: '새 버전명', control: 'text', required: true, placeholder: '예: 2026년 버전' },
    { key: 'desc', label: '설명', control: 'text', long: true, placeholder: '양식 설명을 입력하세요' },
    { key: 'file', label: '첨부파일', control: 'filepond', required: true },
  ],
  provenance: PROVENANCE,
});
