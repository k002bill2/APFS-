/* 공통코드 관리 — 코드구분/코드상세 등록·수정 모달 스키마(RowFormModal, apfs-form-modal).
   필드 순서·필수 여부는 목업 S0_106 `#m-grp`/`#m-cd` 모달 위→아래 그대로.

   두 스키마 모두 **팩토리**다 — 상위코드구분 select 는 현재 코드구분 목록에서 옵션이 나오고(동적),
   수정 모드에서는 키 필드(코드구분·코드)가 readonly 로 잠기기 때문(목업 `readOnly=(mode==='edit')`).
   호출자(code_manage.tsx)가 useMemo 로 모드·목록별 1회 생성한다.

   ⚠️ schemas/index.ts ALL 에 등록하지 않는다 — 라우트 스키마가 아니라 이 화면이 소비하는 모달 전용 스키마.
   parsePageSchema 로 zod 검증해 없는 control 을 쓰면 즉시 실패한다(subfund_manage_schemas 관례). */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';
import type { CodeGroup } from './code_manage_data';

const PROVENANCE = { capturedAt: '2026-09-14', sourceSystem: '공통관리(S0) · KRDS TO-BE', captureFile: 'S0_106_코드관리.html' };

/** 상위코드구분 select 옵션 표기 — 목업 `fillUp`: '없음' + `CODE (명칭)`. 값→코드 복원은 `upCodeOf`. */
export const UP_NONE = '없음';
export const upOption = (g: CodeGroup): string => `${g.code} (${g.name})`;
export const upCodeOf = (v: string): string => (!v || v === UP_NONE ? '' : v.split(' ')[0]);

export const USE_OPTIONS = ['여', '부'] as const;

/** 코드구분 등록/수정 — 5필드(≤6 → 460px 1단). `exclude` = 수정 중인 자기 자신(상위로 고를 수 없다). */
export function groupSchema(mode: 'create' | 'edit', groups: readonly CodeGroup[], exclude?: string): PageSchema {
  return parsePageSchema({
    route: '공통코드 관리/코드구분', title: mode === 'create' ? '코드구분 등록' : '코드구분 수정', kind: 'form', entity: '코드구분',
    columns: [{ key: 'code', label: '코드구분', type: 'code' }, { key: 'name', label: '코드구분명', type: 'text' }],
    fields: [
      { key: 'code', label: '코드구분', control: mode === 'edit' ? 'readonly' : 'text', required: mode === 'create' },
      { key: 'name', label: '코드구분명', control: 'text', required: true },
      { key: 'up', label: '상위코드구분', control: 'select', options: [UP_NONE, ...groups.filter((g) => g.code !== exclude).map(upOption)], lookup: true },
      { key: 'rem', label: '비고', control: 'text', long: true },
      { key: 'use', label: '사용여부', control: 'switch', options: [...USE_OPTIONS] },
    ],
    provenance: PROVENANCE,
  });
}

/** 코드상세 등록/수정 — 7필드(>6 → 880px 2단). 코드구분은 상위에서 고정(readonly), 코드는 수정 시 잠금. */
export function detailSchema(mode: 'create' | 'edit'): PageSchema {
  return parsePageSchema({
    route: '공통코드 관리/코드상세', title: mode === 'create' ? '코드 등록' : '코드 수정', kind: 'form', entity: '코드',
    columns: [{ key: 'code', label: '코드', type: 'code' }, { key: 'name', label: '코드명', type: 'text' }],
    fields: [
      { key: 'gcode', label: '코드구분', control: 'readonly' },
      { key: 'code', label: '코드', control: mode === 'edit' ? 'readonly' : 'text', required: mode === 'create' },
      { key: 'name', label: '코드명', control: 'text', required: true },
      { key: 'en', label: '코드명(영문)', control: 'text' },
      { key: 'ord', label: '정렬', control: 'number', required: true },
      { key: 'rem', label: '비고', control: 'text', long: true },
      { key: 'use', label: '사용여부', control: 'switch', options: [...USE_OPTIONS] },
    ],
    provenance: PROVENANCE,
  });
}
