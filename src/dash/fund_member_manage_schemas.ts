/* 자펀드별조합원관리 — 조합원 등록/수정 팝업 스키마(단일 폼 2모드).
   출처: S1_18_자펀드별조합원관리.html `openForm(mode)` → 필드 순서·필수 여부·옵션 집합 그대로.
   목업 팝업 순: 자펀드(readonly) · 조합원* · 조합원유형* · 조합원구분* · 최초출자약정액* · 비고

   ⚠️ schemas/index.ts ALL에 등록하지 않는다 — 라우트 가능한 페이지가 아니라 이 화면
   (fund_member_manage.tsx)이 직접 소비하는 모달 전용 스키마다. 대신 모듈 스코프 parsePageSchema로
   zod 검증해, 없는 control을 쓰면 import 시점에 즉시 실패한다(report_form_manage_schemas.ts 관례). */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

const PROVENANCE = {
  capturedAt: '2026-09-12',
  sourceSystem: 'FFMS(S1) 자펀드관리 · KRDS TO-BE',
  captureFile: 'S1_18_자펀드별조합원관리.html',
};

/* 공통코드 옵션 — 목업 설계메모 기준(2026-08-26 공통코드 시트 확인분):
   조합원구분 = CDTP:BKIND · 조합원유형 = CDTP:JKIND. 목업 JS 상수 순서 그대로(창작·정렬 금지). */
export const CLS_OPTS = ['GP', 'LP', 'SP'] as const;
export const TYPE_OPTS = [
  '창투사', '신기술사', '모태펀드', '지자체', '은행', '보험사', '증권사',
  '공공기관', '일반법인', '개인', '유한책임회사', '기타금융기관', '법인 아닌 단체',
] as const;

/* 리스트 컬럼은 페이지(fund_member_manage.tsx)가 AG Grid ColDef로 직접 소유한다.
   PageSchemaZ가 columns를 필수로 요구해 대표 컬럼만 선언한다(렌더엔 미사용). */
const FM_COLUMNS: PageSchema['columns'] = [
  { key: 'mem', label: '조합원', type: 'text' },
  { key: 'cls', label: '조합원구분', type: 'text' },
  { key: 'mtype', label: '조합원유형', type: 'text' },
  { key: 'c1', label: '최초 출자약정액', type: 'amount' },
  { key: 'c2', label: '최종 출자약정액', type: 'amount' },
];

/* 조합원 — 목업은 **옵션이 하나도 없는 `<select>`**(`<option value="">선택</option>`만)이다.
   "빈 select 금지"(apfs-detail-filter/form 규약: 선택지 없는 드롭다운은 고장처럼 보임) + "옵션 창작 금지"가
   동시에 걸리므로 `text`로 격하하고, 그 판단 근거를 ⚠검토필요 마커(목업 원문 그대로)로 화면에 남긴다. */
const MEMBER_NOTE = { rec: '조합원 원장(마스터)에서 선택', dat: '옵션 목록 미확인 — 샘플값 생성 안 함' };

/* 최초출자약정액 — 목업은 `<input type=text inputmode=numeric>` + 우측 `원` 접미사 뱃지다.
   SchemaField엔 접미사 슬롯이 없어 라벨에 단위를 넣고 control은 number로 둔다(콤마 자동서식도 불필요해짐). */
const AMOUNT_LABEL = '최초출자약정액(원)';

export const CREATE_SCHEMA: PageSchema = parsePageSchema({
  route: '자펀드별조합원관리/조합원등록', title: '조합원 등록', kind: 'form', entity: '조합원',
  columns: FM_COLUMNS,
  fields: [
    { key: 'fn', label: '자펀드', control: 'readonly' },
    { key: 'mem', label: '조합원', control: 'text', required: true, note: MEMBER_NOTE },
    { key: 'mtype', label: '조합원유형', control: 'select', options: [...TYPE_OPTS], required: true },
    { key: 'cls', label: '조합원구분', control: 'select', options: [...CLS_OPTS], required: true },
    { key: 'c1', label: AMOUNT_LABEL, control: 'number', required: true },
    { key: 'memo', label: '비고', control: 'text' },
  ],
  provenance: PROVENANCE,
});

/* 수정 — 목업은 조합원만 `.readonly` div로 바뀌고(마커도 등록 모드에만 붙는다) 나머지는 동일한 입력이다. */
export const EDIT_SCHEMA: PageSchema = parsePageSchema({
  route: '자펀드별조합원관리/조합원수정', title: '조합원 수정', kind: 'form', entity: '조합원',
  columns: FM_COLUMNS,
  fields: [
    { key: 'fn', label: '자펀드', control: 'readonly' },
    { key: 'mem', label: '조합원', control: 'readonly' },
    { key: 'mtype', label: '조합원유형', control: 'select', options: [...TYPE_OPTS], required: true },
    { key: 'cls', label: '조합원구분', control: 'select', options: [...CLS_OPTS], required: true },
    { key: 'c1', label: AMOUNT_LABEL, control: 'number', required: true },
    { key: 'memo', label: '비고', control: 'text' },
  ],
  provenance: PROVENANCE,
});
