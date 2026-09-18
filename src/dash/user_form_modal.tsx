/* 사용자관리 — 사용자 등록/수정 모달. 출처: S0_101_사용자관리.html `openEdit`·`condField`·`m-edit-save`.

   ⚠ RowFormModal(flat 스키마)로는 담을 수 없어 전용 모달이다 — ① 사용자구분에 따라 조건부 필드가 바뀐다
   (농금원=부서 · 운용사=소속 운용사 · 수탁=소속 수탁사 · 부처=계정구분 라디오) ② 권한은 복수 체크 + "유효 메뉴(권한 합집합)" 힌트.
   골격은 RowFormModal 규격(항목 >6 → `max-w-[880px]` 2단, 본문 `p-[46px]`, 헤더·푸터 `px-[46px]`), 컨트롤은 `SchemaField`(ad-hoc FieldSpec).
   등록 = 농금원·수탁·부처만(운용사는 「사용자 초대(운용사)」로만 생성 — 목업 note). 수정은 로그인 아이디·사용자구분 잠금.
   검증 순서(목업 주석): 성명 → 아이디(등록, 중복) → 이메일 → 조건부(부서) → 권한 1개 이상.
   ⚠ 백엔드 없음 — 저장은 부모(user_manage)의 로컬 행 상태만 바꾼다. 실제 계정 발급·메일 발송 없음. */
import React from 'react';
import { UI } from './components';
import { SchemaField } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { Checkbox } from './ui/checkbox';   // 권한(복수) 체크 그룹 = DS 체크박스(htmlFor 명시 연결, 래핑 금지)
import type { UType } from './admin_menu_tree';
import { ROLE_NAMES, effectiveMenus, orgsOf } from './admin_demo_data';
import type { RoleName } from './admin_demo_data';
import { lidTaken } from './user_manage_model';
import type { UserRow, UserStatus, AccountKind } from './user_manage_model';

const { Button, SaveButton } = UI;

export type UserPatch = Pick<UserRow, 'name' | 'lid' | 'email' | 'type' | 'dept' | 'org' | 'account' | 'roles' | 'status'>;
const NEW_TYPES: UType[] = ['농금원', '수탁', '부처'];
const ALL_TYPES: UType[] = ['농금원', '운용사', '수탁', '부처'];

const F: Record<string, FieldSpec> = {
  name: { key: 'name', label: '성명(계정명)', control: 'text', required: true },
  lid: { key: 'lid', label: '로그인 아이디', control: 'text', required: true },
  lidRo: { key: 'lid', label: '로그인 아이디', control: 'readonly' },
  email: { key: 'email', label: '이메일', control: 'text', required: true },
  typeRo: { key: 'type', label: '사용자구분', control: 'readonly' },
  dept: { key: 'dept', label: '부서', control: 'text', required: true },
  account: { key: 'account', label: '계정구분', control: 'radio', options: ['농식품', '수산'], required: true },
};

const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, className, plain, hint }: { label: string; children: React.ReactNode; errMsg?: string; className?: string; plain?: boolean; hint?: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {hint && !errMsg && <span className="text-caption block mt-1" style={{ fontSize: 11.5 }}>{hint}</span>}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

type V = { name: string; lid: string; email: string; type: UType; dept: string; org: string; account: AccountKind; roles: RoleName[]; status: UserStatus };

export function UserFormModal({ mode, initial, existing, onSave, onClose }: {
  mode: 'create' | 'edit';
  initial?: UserRow;
  existing: readonly Pick<UserRow, 'id' | 'lid'>[];   // 아이디 중복 검사 대상
  onSave: (patch: UserPatch) => void;
  onClose: () => void;
}) {
  const [v, setV] = React.useState<V>(() => initial
    ? { name: initial.name, lid: initial.lid, email: initial.email, type: initial.type, dept: initial.dept ?? '', org: initial.org ?? '', account: initial.account ?? '농식품', roles: [...initial.roles], status: initial.status }
    : { name: '', lid: '', email: '', type: '농금원', dept: '', org: '', account: '농식품', roles: [], status: '온보딩대기' });
  const [errKey, setErrKey] = React.useState('');
  const set = <K extends keyof V>(k: K, val: V[K]) => { setV((p) => ({ ...p, [k]: val })); if (errKey === k || errKey === `${String(k)}Dup`) setErrKey(''); };
  /* 사용자구분 변경 → 조건부 값 초기화(목업 e-type change) */
  const setType = (t: string) => { setV((p) => ({ ...p, type: t as UType, dept: '', org: '', account: '농식품' })); setErrKey(''); };
  const uid = React.useId();   // 체크 그룹 id 접두(htmlFor 명시 연결용)
  const toggleRole = (r: RoleName) => { set('roles', v.roles.includes(r) ? v.roles.filter((x) => x !== r) : [...v.roles, r]); };

  /* 조건부 소속 — 운용사·수탁은 기관 select(값=기관명, 저장 시 id 로 환원) */
  const orgs = v.type === '운용사' ? orgsOf('GP') : v.type === '수탁' ? orgsOf('수탁') : [];
  const orgField: FieldSpec = React.useMemo(() => ({ key: 'org', label: v.type === '운용사' ? '소속 운용사' : '소속 수탁사', control: 'select', options: orgs.map((o) => o.name), required: true }), [v.type, orgs]);
  const orgValue = orgs.find((o) => o.id === v.org)?.name ?? orgs[0]?.name ?? '';
  const typeField: FieldSpec = React.useMemo(() => ({ key: 'type', label: '사용자구분', control: 'select', options: mode === 'create' ? NEW_TYPES : ALL_TYPES, required: true }), [mode]);
  const statusField: FieldSpec = React.useMemo(() => ({ key: 'status', label: '상태', control: 'select', options: ['활성', '비활성', ...(v.status === '잠금' || v.status === '온보딩대기' ? [v.status] : [])] }), [v.status]);

  const submit = () => {
    const name = v.name.trim(), lid = v.lid.trim(), email = v.email.trim();
    if (!name) { setErrKey('name'); return; }
    if (mode === 'create') {
      if (!lid) { setErrKey('lid'); return; }
      if (lidTaken(existing, lid)) { setErrKey('lidDup'); return; }
    }
    if (!email) { setErrKey('email'); return; }
    if (v.type === '농금원' && !v.dept.trim()) { setErrKey('dept'); return; }
    if (!v.roles.length) { setErrKey('roles'); return; }
    const org = orgs.length ? (orgs.find((o) => o.name === orgValue)?.id ?? orgs[0].id) : undefined;
    return () => onSave({
      name, lid: mode === 'create' ? lid : (initial?.lid ?? lid), email, type: v.type,
      dept: v.type === '농금원' ? v.dept.trim() : undefined, org, account: v.type === '부처' ? v.account : undefined,
      roles: [...v.roles], status: mode === 'create' ? '온보딩대기' : v.status,
    });
  };
  const eff = effectiveMenus(v.roles);
  const title = mode === 'create' ? '사용자 등록 (농금원·수탁·부처)' : `사용자 수정 — ${initial?.name ?? ''}`;

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">사용자 양식 — 성명·로그인 아이디·이메일·사용자구분·소속·권한·상태</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="성명(계정명) *" errMsg={errKey === 'name' ? '성명(계정명)을 입력하세요.' : undefined}>
              <SchemaField field={F.name} value={v.name} onChange={(x) => set('name', x)} invalid={errKey === 'name'} />
            </Field>
            <Field label={mode === 'create' ? '로그인 아이디 *' : '로그인 아이디'} hint={mode === 'edit' ? '식별자는 등록 후 수정할 수 없습니다(등록 시 중복확인 완료).' : undefined}
              errMsg={errKey === 'lid' ? '로그인 아이디를 입력하세요.' : errKey === 'lidDup' ? '이미 사용 중인 아이디입니다 — 중복확인 실패.' : undefined}>
              <SchemaField field={mode === 'create' ? F.lid : F.lidRo} value={v.lid} onChange={(x) => set('lid', x)} invalid={errKey === 'lid' || errKey === 'lidDup'} />
            </Field>
            <Field label="이메일 *" hint="온보딩 안내 발송용 · 회사 이메일 우선" errMsg={errKey === 'email' ? '이메일을 입력하세요 — 온보딩 안내 발송에 필요합니다.' : undefined}>
              <SchemaField field={F.email} value={v.email} onChange={(x) => set('email', x)} invalid={errKey === 'email'} />
            </Field>
            <Field label="사용자구분 *" hint={mode === 'create' ? '운용사 사용자는 「사용자 초대(운용사)」로만 생성됩니다.' : undefined}>
              {mode === 'create'
                ? <SchemaField field={typeField} value={v.type} onChange={setType} />
                : <SchemaField field={F.typeRo} value={v.type} onChange={() => {}} />}
            </Field>

            {/* 조건부 소속 필드(목업 condField) */}
            {v.type === '농금원' && (
              <Field label="부서 *" errMsg={errKey === 'dept' ? '부서를 입력하세요.' : undefined}>
                <SchemaField field={F.dept} value={v.dept} onChange={(x) => set('dept', x)} invalid={errKey === 'dept'} />
              </Field>
            )}
            {(v.type === '운용사' || v.type === '수탁') && (
              <Field label={`${orgField.label} *`}>
                <SchemaField field={orgField} value={orgValue} onChange={(name) => set('org', orgs.find((o) => o.name === name)?.id ?? '')} />
              </Field>
            )}
            {v.type === '부처' && (
              <Field label="계정구분 *" plain>
                <SchemaField field={F.account} value={v.account} onChange={(x) => set('account', x as AccountKind)} />
              </Field>
            )}
            {mode === 'edit' && (
              <Field label="상태">
                <SchemaField field={statusField} value={v.status} onChange={(x) => set('status', x as UserStatus)} />
              </Field>
            )}

            {/* 권한(복수) — 체크박스 그룹 + 유효 메뉴 힌트(aria-live) */}
            <Field label="권한 (복수) *" plain className="sm:col-span-2" errMsg={errKey === 'roles' ? '권한을 1개 이상 선택하세요.' : undefined}>
              <div role="group" aria-label="권한" className="flex items-center gap-4 flex-wrap" style={{ minHeight: 34 }}>
                {ROLE_NAMES.map((r) => (
                  <span key={r} className="inline-flex items-center gap-1.5" style={{ fontSize: 14 }}>
                    <Checkbox id={`${uid}-role-${r}`} checked={v.roles.includes(r)} onCheckedChange={() => toggleRole(r)} aria-label={`권한 ${r}`} />
                    <label htmlFor={`${uid}-role-${r}`} style={{ cursor: 'pointer', userSelect: 'none' }}>{r}</label>
                  </span>
                ))}
              </div>
              <span className="text-caption block mt-1" style={{ fontSize: 11.5 }} aria-live="polite">유효 메뉴(권한 합집합): <b className="text-foreground">{eff.length ? eff.join(', ') : '없음'}</b></span>
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
    </Dialog>
  );
}
