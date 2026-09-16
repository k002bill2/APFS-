/* 프로그램관리 — 프로그램 등록/수정 모달 스키마(RowFormModal, apfs-form-modal). 출처: S0_108 `#m-prog`(프로그램ID* · 프로그램명* · 사용여부).
   팩토리 — 수정 모드는 프로그램ID readonly(목업 `readOnly=(mode==='edit')`). 도움말은 별도 [도움말] 버튼(program_help_modal)에서 편집.
   ⚠ schemas/index.ts ALL 에 등록하지 않는다 — 라우트 스키마가 아니라 이 화면이 소비하는 모달 전용 스키마. */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

const PROVENANCE = { capturedAt: '2026-09-14', sourceSystem: '공통관리(S0) · KRDS TO-BE', captureFile: 'S0_108_프로그램관리.html' };
export const USE_OPTIONS = ['여', '부'] as const;

/** 프로그램 등록/수정 — 3필드(≤6 → 460px 1단) */
export function programSchema(mode: 'create' | 'edit'): PageSchema {
  return parsePageSchema({
    route: '프로그램관리/프로그램', title: mode === 'create' ? '프로그램 등록' : '프로그램 수정', kind: 'form', entity: '프로그램',
    columns: [{ key: 'pid', label: '프로그램ID', type: 'code' }, { key: 'pname', label: '프로그램명', type: 'text' }],
    fields: [
      { key: 'pid', label: '프로그램ID', control: mode === 'edit' ? 'readonly' : 'text', required: mode === 'create' },
      { key: 'pname', label: '프로그램명', control: 'text', required: true },
      { key: 'use', label: '사용여부', control: 'switch', options: [...USE_OPTIONS] },
    ],
    provenance: PROVENANCE,
  });
}
