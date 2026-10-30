/* 계정과목 관리(ACC-001) — 「계정과목관리 등록/수정」 모달(설계서 slide12). 「계정과목 검색」(slide13)은 회계 공용 팝업을 중첩으로 띄운다.

   ⚠ RowFormModal(flat 스키마)로 담을 수 없어 전용 모달이다(menu_form_modal 동형):
     ① 계정레벨 ↔ 상위계정과목 연동(레벨1이면 상위 값 비우고 입력·[검색] 비활성, 검증 제외)
     ② 상위계정과목은 [검색] 팝업(공용 `acc/account_search_modal`, 중첩 Dialog)에서 고른다 — 표시는 "코드 계정명", 저장값은 상위코드
     ③ 저장 검증은 토스트 + 해당 필드 포커스(설계서 ③ — 인라인 오류 아님)
   골격·규격은 RowFormModal 그대로: 항목 13개(>6) → `max-w-[880px]` 2단, 본문 `p-[46px]`(+헤더·푸터 `px-[46px]`),
   개별 컨트롤은 `SchemaField`(ad-hoc FieldSpec — 높이 등 박스 규격은 renderers CONTROL_BOX SSOT), 라벨 래퍼는 `Field` 규격 로컬 복제.
   ⚠ 백엔드가 없어 저장은 부모(account_code_manage)의 로컬 행 상태만 바꾼다. */
import React from 'react';
import { UI } from '../../components';
import { SchemaField, isPlainWrapControl } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { Checkbox } from '../../ui/checkbox';
import { toast } from '../../ui/sonner';
import { ACCOUNT_CLASSES, ACCOUNT_LEVELS, ACCOUNT_NATURES, REQUIRED_ITEMS } from './account_code_data';
import type { AccountClass, AccountRow, AccountNature, ContraType, DcType, RequiredItem, Yn } from './account_code_data';
import { validateAccount, parentCandidates, parentLabel, parentFits, hasChildren, toAccountItem } from './account_code_model';
import { Switch } from '../../ui/switch';
import type { ValidationKey } from './account_code_model';
import { AccountSearchModal } from '../account_search_modal';

const { Button, SaveButton } = UI;

/** 부모가 받는 저장값 — 최초등록자/최종수정자는 부모가 채운다 */
export type AccountPatch = Omit<AccountRow, 'createdBy' | 'updatedBy'>;

const PLACEHOLDER = '선택해 주세요';
const F: Record<string, FieldSpec> = {
  code: { key: 'code', label: '계정코드', control: 'text', required: true },
  codeRo: { key: 'code', label: '계정코드', control: 'readonly' },
  name: { key: 'name', label: '계정과목명', control: 'text', required: true },
  nameEn: { key: 'nameEn', label: '계정과목명(영문)', control: 'text' },
  cls: { key: 'cls', label: '계정분류', control: 'select', options: [PLACEHOLDER, ...ACCOUNT_CLASSES], required: true },
  contra: { key: 'contra', label: '차감구분', control: 'radio', options: ['일반', '차감'] },
  dc: { key: 'dc', label: '차대구분', control: 'radio', options: ['차변', '대변'], required: true },
  level: { key: 'level', label: '계정레벨', control: 'select', options: [PLACEHOLDER, ...ACCOUNT_LEVELS], required: true },
  parent: { key: 'parent', label: '상위계정과목', control: 'text', placeholder: '상위계정과목' },
  parentRo: { key: 'parent', label: '상위계정과목', control: 'readonly' },
  input: { key: 'input', label: '입력 가능여부', control: 'switch', options: ['Y', 'N'] },
  use: { key: 'use', label: '사용여부', control: 'switch', options: ['Y', 'N'] },
  evidence: { key: 'evidence', label: '증빙첨부 여부', control: 'switch', options: ['Y', 'N'] },
  nature: { key: 'nature', label: '계정성격', control: 'select', options: [PLACEHOLDER, ...ACCOUNT_NATURES] },
};
const fromSel = (x: string) => (x === PLACEHOLDER ? '' : x);
const toSel = (x: string) => x || PLACEHOLDER;

/* RowFormModal `Field` 규격 로컬 복제. plain=<div> 래퍼(버튼을 품은 복합 컨트롤·radio·switch·checkbox 그룹). */
const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, className, plain, hint, boxRef }: { label: string; children: React.ReactNode; className?: string; plain?: boolean; hint?: string; boxRef?: (el: HTMLElement | null) => void }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap ref={boxRef} className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {hint && <span className="text-caption block mt-1" style={{ fontSize: 11.5 }}>{hint}</span>}
    </Wrap>
  );
}

/* ──────────────────────────────
   모달 본체
────────────────────────────── */
type V = {
  code: string; name: string; nameEn: string; cls: AccountClass | ''; contra: ContraType; dc: DcType | '';
  level: string; parentText: string; parentCode: string;
  input: Yn; use: Yn; evidence: Yn; required: RequiredItem[]; nature: AccountNature | '';
};

export function AccountCodeFormModal({ mode, initial, rows, takenCodes, onSave, onClose }: {
  mode: 'create' | 'edit';
  initial?: AccountRow;
  rows: readonly AccountRow[];            // 활성 계정과목(상위 후보·표시용)
  takenCodes: ReadonlySet<string>;        // 등록 시 중복으로 볼 코드(활성 + 논리삭제)
  onSave: (patch: AccountPatch) => void;
  onClose: () => void;
}) {
  const [v, setV] = React.useState<V>(() => {
    if (initial) {
      const p = initial.parent ? rows.find((r) => r.code === initial.parent) : undefined;
      return {
        code: initial.code, name: initial.name, nameEn: initial.nameEn, cls: initial.cls, contra: initial.contra, dc: initial.dc,
        level: String(initial.level), parentCode: initial.parent ?? '', parentText: p ? parentLabel(p) : (initial.parent ?? ''),
        input: initial.input, use: initial.use, evidence: initial.evidence, required: [...initial.required], nature: initial.nature,
      };
    }
    /* 기본값(설계서 ②): 셀렉트 '선택해 주세요' · 차대구분 미선택(필수 — 검증이 고르게 한다) · 차감구분 '일반' ·
       입력 가능여부 ON · 사용여부 ON · 증빙첨부 OFF · 필수입력사항 미선택 */
    return { code: '', name: '', nameEn: '', cls: '', contra: '일반', dc: '', level: '', parentText: '', parentCode: '', input: 'Y', use: 'Y', evidence: 'N', required: [], nature: '' };
  });
  const [searchOpen, setSearchOpen] = React.useState(false);
  const set = <K extends keyof V>(k: K, val: V[K]) => setV((p) => ({ ...p, [k]: val }));
  const isTop = v.level === '1';
  /* 하위 계정이 있는 계정 수정 — 계정레벨·계정분류·상위계정과목 변경 불가, 입력 가능여부 N 고정(menu_form_modal lvlLocked 선례).
     바꾸면 자식의 레벨 = 상위+1·분류 일치·상위=집계계정 불변식이 깨진다 */
  const locked = mode === 'edit' && !!initial && hasChildren(rows, initial.code);
  /* 계정분류·계정레벨을 바꿔 기존 상위와 어긋나면 상위 선택을 비운다(레벨1은 항상 비움) */
  const reconcileParent = (p: V): V => {
    if (!p.parentCode) return p;
    const parent = rows.find((r) => r.code === p.parentCode);
    return parent && parentFits(parent, p.cls, p.level) ? p : { ...p, parentText: '', parentCode: '' };
  };
  const setLevel = (lvl: string) => setV((p) => reconcileParent({ ...p, level: lvl, ...(lvl === '1' ? { parentText: '', parentCode: '' } : {}) }));
  const setCls = (cls: V['cls']) => setV((p) => reconcileParent({ ...p, cls }));

  /* 검증 실패 포커스 — SchemaField 는 ref 를 받지 않으므로 래퍼에서 첫 컨트롤을 찾는다. 상위계정과목은 [검색] 버튼 */
  const boxes = React.useRef<Partial<Record<ValidationKey, HTMLElement | null>>>({});
  const reg = (k: ValidationKey) => (el: HTMLElement | null) => { boxes.current[k] = el; };
  const focusField = (k: ValidationKey) => requestAnimationFrame(() => {
    const box = boxes.current[k];
    const el = k === 'parent' ? box?.querySelector<HTMLElement>('[data-role="parent-search"] button') : box?.querySelector<HTMLElement>('input, select, button[role=radio], button[role=combobox]');
    el?.focus();
  });

  /* [검색] — 후보가 계정레벨에 묶이므로 레벨 미선택이면 팝업을 열지 않는다 */
  const openSearch = () => {
    if (!v.level) { toast.error('계정레벨을 선택해 주세요.'); focusField('level'); return; }
    setSearchOpen(true);
  };
  const uid = React.useId();
  const toggleReq = (it: RequiredItem) => set('required', v.required.includes(it) ? v.required.filter((x) => x !== it) : [...v.required, it]);

  const submit = () => {
    const parent = !isTop && v.parentCode ? rows.find((r) => r.code === v.parentCode) ?? null : null;
    const res = validateAccount({ code: v.code, name: v.name, cls: v.cls, dc: v.dc, level: v.level, parentCode: isTop ? '' : v.parentCode }, mode === 'create' ? takenCodes : new Set(), parent);
    if (!res.ok) { toast.error(res.msg); focusField(res.key); return; }
    const patch: AccountPatch = {
      code: v.code.trim(), name: v.name.trim(), nameEn: v.nameEn.trim(), cls: v.cls as AccountClass, contra: v.contra, dc: v.dc as DcType,
      level: Number(v.level), parent: isTop ? null : v.parentCode,
      input: locked ? 'N' : v.input, use: locked && initial ? initial.use : v.use, evidence: v.evidence, required: REQUIRED_ITEMS.filter((x) => v.required.includes(x)), nature: v.nature,
    };
    return () => { onSave(patch); toast.success('저장되었습니다'); };
  };

  const dlgRef = React.useRef<DialogHandle>(null);
  const title = '계정과목관리 등록/수정';

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">계정과목 {mode === 'create' ? '등록' : '수정'} 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="계정코드 *" boxRef={reg('code')} hint={mode === 'edit' ? '계정코드는 수정할 수 없습니다.' : undefined}>
              <SchemaField field={mode === 'edit' ? F.codeRo : F.code} value={v.code} onChange={(x) => set('code', x)} />
            </Field>
            <Field label="계정과목명 *" boxRef={reg('name')}>
              <SchemaField field={F.name} value={v.name} onChange={(x) => set('name', x)} />
            </Field>
            <Field label="계정과목명(영문)">
              <SchemaField field={F.nameEn} value={v.nameEn} onChange={(x) => set('nameEn', x)} />
            </Field>
            <Field label="계정분류 *" boxRef={reg('cls')}>
              {locked
                ? <SchemaField field={{ ...F.cls, control: 'readonly' }} value={v.cls} onChange={() => undefined} />
                : <SchemaField field={F.cls} value={toSel(v.cls)} onChange={(x) => setCls(fromSel(x) as V['cls'])} />}
            </Field>
            <Field label="차감구분" plain={isPlainWrapControl(F.contra.control)}>
              <SchemaField field={F.contra} value={v.contra} onChange={(x) => set('contra', x as ContraType)} />
            </Field>
            <Field label="차대구분 *" plain={isPlainWrapControl(F.dc.control)} boxRef={reg('dc')}>
              <SchemaField field={F.dc} value={v.dc} onChange={(x) => set('dc', x as DcType)} />
            </Field>
            <Field label="계정레벨 *" boxRef={reg('level')}>
              {locked
                ? <SchemaField field={{ ...F.level, control: 'readonly' }} value={v.level} onChange={() => undefined} />
                : <SchemaField field={F.level} value={toSel(v.level)} onChange={(x) => setLevel(fromSel(x))} />}
            </Field>

            {/* 상위계정과목 — 텍스트(검색어 겸 표시) + [검색]. 직접 입력하면 선택이 풀리고(저장값 없음) [검색]으로만 확정된다.
                레벨1이면 값 비우고 비활성·검증 제외. plain div(버튼 동거) */}
            <Field label={isTop ? '상위계정과목' : '상위계정과목 *'} plain boxRef={reg('parent')}
              hint={isTop ? '계정레벨 1은 상위계정과목을 입력하지 않습니다.' : '[검색]에서 집계계정(입력여부 N)을 선택합니다.'}>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={{ minWidth: 0, flex: '1 1 160px' }}>
                  {isTop || locked
                    ? <SchemaField field={F.parentRo} value={isTop ? '' : v.parentText} onChange={() => undefined} fill />
                    : <SchemaField field={{ ...F.parent, required: !!v.level }} value={v.parentText} onChange={(x) => setV((p) => ({ ...p, parentText: x, parentCode: '' }))} fill />}
                </div>
                <span data-role="parent-search" className="inline-flex"><Button variant="outline" size="sm" leadingIcon="search" disabled={isTop || locked} onClick={openSearch}>검색</Button></span>
              </div>
            </Field>

            <Field label="입력 가능여부" plain={isPlainWrapControl(F.input.control)}>
              {locked
                /* 하위 계정이 있는 집계계정 — N 고정. SchemaField switch 는 disabled 를 받지 않아 같은 마크업을 비활성으로 그린다 */
                ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minHeight: 34 }}>
                    <Switch id={`${uid}-input-locked`} checked={false} disabled aria-label={F.input.label} />
                    <label htmlFor={`${uid}-input-locked`} style={{ fontSize: 13.5, color: 'var(--muted-foreground)', userSelect: 'none' }}>N</label>
                  </div>
                : <SchemaField field={F.input} value={v.input} onChange={(x) => set('input', x as Yn)} />}
            </Field>
            <Field label="사용여부" plain={isPlainWrapControl(F.use.control)}>
              {locked
                /* 하위 계정이 있는 집계계정 — 현재값 고정(입력 가능여부와 같은 비활성 마크업) */
                ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minHeight: 34 }}>
                    <Switch id={`${uid}-use-locked`} checked={v.use === 'Y'} disabled aria-label={F.use.label} />
                    <label htmlFor={`${uid}-use-locked`} style={{ fontSize: 13.5, color: 'var(--muted-foreground)', userSelect: 'none' }}>{v.use}</label>
                  </div>
                : <SchemaField field={F.use} value={v.use} onChange={(x) => set('use', x as Yn)} />}
            </Field>
            <Field label="증빙첨부 여부" plain={isPlainWrapControl(F.evidence.control)}>
              <SchemaField field={F.evidence} value={v.evidence} onChange={(x) => set('evidence', x as Yn)} />
            </Field>
            {/* 필수입력사항 체크 — 복수 선택 DS Checkbox 그룹(htmlFor 명시 연결, label 래핑 금지). 전체 폭 */}
            <Field label="필수입력사항 체크" plain className="sm:col-span-2">
              <div role="group" aria-label="필수입력사항 체크" className="flex items-center gap-4 flex-wrap" style={{ minHeight: 34 }}>
                {REQUIRED_ITEMS.map((it, i) => (
                  <span key={it} className="inline-flex items-center gap-1.5" style={{ fontSize: 13.5 }}>
                    <Checkbox id={`${uid}-req-${i}`} checked={v.required.includes(it)} onCheckedChange={() => toggleReq(it)} aria-label={`필수입력사항 ${it}`} />
                    <label htmlFor={`${uid}-req-${i}`} style={{ cursor: 'pointer', userSelect: 'none' }}>{it}</label>
                  </span>
                ))}
              </div>
            </Field>
            {/* 계정성격 — 기획서 입력 항목 순서 13(필수입력사항 체크 12 다음) */}
            <Field label="계정성격">
              <SchemaField field={F.nature} value={toSel(v.nature)} onChange={(x) => set('nature', fromSel(x) as V['nature'])} />
            </Field>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>취소</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>

      {/* 상위계정 [검색] = 회계 공용 계정과목 검색 팝업(설계서 slide13). 후보(집계계정·사용 Y·레벨-1·자기/자손 제외)는
          여기서 좁혀 넘기고, 검색어·계정분류는 팝업이 거른다. 폼에서 계정분류를 골랐으면 라디오를 그 분류로 고정(계층 무결성) */}
      {searchOpen && (
        <AccountSearchModal open onOpenChange={(o) => { if (!o) setSearchOpen(false); }}
          list={parentCandidates(rows, { selfCode: mode === 'edit' ? initial?.code : v.code.trim() || undefined, level: Number(v.level) }).map(toAccountItem)}
          fixedClass={v.cls || undefined} initialSelected={v.parentCode || undefined}
          /* 이미 고른 상위가 있으면 코드만 넘긴다 — "코드 계정명" 문자열은 부분일치 0건이 된다 */
          initialKeyword={v.parentCode || v.parentText.trim()}
          note={`입력여부 N(집계계정) 중 계정레벨 ${Number(v.level) - 1}만 상위계정으로 선택할 수 있습니다.`}
          onSelect={(a) => setV((p) => ({ ...p, parentCode: a.code, parentText: parentLabel(a) }))} />
      )}
    </Dialog>
  );
}
