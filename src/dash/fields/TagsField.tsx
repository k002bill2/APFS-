/* APFS TagsField — 스키마 폼 컨트롤 'tags'의 렌더러.
 * Plate 레지스트리 SelectEditor(멀티 태그/라벨 입력, GitHub 라벨 피커류)를 감싸
 * RowFormModal의 값 계약(문자열 in/out)에 맞춘다.
 *
 * ⚠️ 값 계약: 태그 배열을 **JSON 배열 문자열**('["성장","회수"]')로 주고받는다(richtext의 Slate JSON 계약과 동형).
 *    빈 배열은 '' 로 방출 — 상위 required `.trim()`이 '[]'를 non-empty로 오인해 false-pass 하는 것을 막는다.
 * ⚠️ parse 메모이제이션: SelectEditorContent는 `value` prop을 effect 의존성으로 두고 !isEqualTags일 때
 *    editor.tf.replaceNodes를 호출한다. 인라인 parse는 매 렌더 새 배열 참조를 넘겨 불필요한 동기화를 유발하므로
 *    raw 문자열을 키로 useMemo한다(Plate 렌더 루프 예방).
 * ⚠️ 복합 컨트롤: 자체 combobox/Popover를 품으므로 RowFormModal에서 <label> 미래핑(plain)+전체폭(span2)으로 렌더된다
 *    (generic_list_modal.tsx의 complex 목록에 편입). Popover는 공유 popover.tsx(z-popover 85>modal 80)를 상속해
 *    Dialog 위로 뜬다(→ apfs-datepicker와 동일 해법).
 */
import * as React from 'react';

import {
  type SelectItem,
  SelectEditor,
  SelectEditorCombobox,
  SelectEditorContent,
  SelectEditorInput,
} from '../ui/select-editor';

export function TagsField({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: string[];
  required?: boolean;
  label?: string;
}) {
  // 현재 값(JSON 배열 문자열) → SelectItem[]. raw 문자열 키로 메모이제이션.
  const selected = React.useMemo<SelectItem[]>(() => {
    if (!value || !value.startsWith('[')) return [];
    try {
      const arr = JSON.parse(value);
      return Array.isArray(arr) ? arr.map((v) => ({ value: String(v) })) : [];
    } catch {
      return [];
    }
  }, [value]);

  // 선택 후보(스키마 field.options). 사용자는 여기 없는 값도 새로 생성(isNew)할 수 있다.
  const items = React.useMemo<SelectItem[]>(
    () => (options || []).map((o) => ({ value: o })),
    [options]
  );

  const handleChange = (next: SelectItem[]) => {
    const vals = next.map((i) => i.value);
    onChange(vals.length ? JSON.stringify(vals) : '');
  };

  return (
    <SelectEditor value={selected} onValueChange={handleChange} items={items}>
      <SelectEditorContent>
        <SelectEditorInput placeholder={`${label ?? '태그'} 선택…`} />
        <SelectEditorCombobox />
      </SelectEditorContent>
    </SelectEditor>
  );
}
