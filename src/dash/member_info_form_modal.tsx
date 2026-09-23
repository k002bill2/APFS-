/* 조합원정보 등록/수정 — 단일 폼 2모드 모달 (출처: S1_15_조합원정보등록.html의 `openMember(mode,d)`)

   ⚠ RowFormModal(스키마 주도)로는 담을 수 없어 전용 모달이다 — 세 가지가 flat FieldSpec 밖이다:
     ① 식별번호 옆 **중복확인 버튼**(inlinegrp) ② 입력마다 **자동 하이픈 서식**(개인 13자리 / 법인 10자리,
     목업 `maskBiz` 로직 그대로) ③ 수정 모드에서 개인/법인 선택에 따라 **라벨이 사업자번호↔주민번호로 전환**.
   그 외 골격·규격은 RowFormModal을 그대로 따른다: 항목 8개(>6) → `max-w-[880px]` 2단 그리드,
   본문 `p-[46px]`(+헤더·푸터 `px-[46px]` 인셋 정렬), 개별 컨트롤은 `SchemaField`(ad-hoc FieldSpec),
   라벨 래퍼는 RowFormModal `Field` 규격 복제(12px caption · mb-3.5 · radio는 <label> 아닌 plain div).

   필드 순서 = 목업 modal-body의 row() 호출 순서:
     모펀드 · 조합원명* · 개인/법인 · 국내/해외 · 사업자번호/주민번호* · 주소(full) · 전화번호 · 비고(full)
   ⚠ 자물쇠 글리프(🔒)는 공용 `Icon` 레지스트리에 없어 텍스트 `수정불가`만 남긴다(브리프 지시). */
import React from 'react';
import { UI } from './components';
import { SchemaField } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { toast } from './ui/sonner';
import type { MemberRow } from './member_info_manage';

const { Button, SaveButton } = UI;

/* 모펀드 옵션 — 목업 검색박스·등록폼의 select 2종 그대로.
   ⚠ 페이지(member_info_manage)가 이 상수를 import 한다 — 반대 방향(모달이 페이지 값을 import)이면
     페이지→모달 컴포넌트 import와 맞물려 값 순환 참조가 된다(타입 import는 erase 되어 무해). */
export const MF_OPTIONS = ['농식품모태펀드', 'MOAF'];

type Patch = Omit<MemberRow, 'id' | 'no'>;

/* 목업 openMember 기본값 — 등록 시 개인/법인=법인, 국내/해외=국내(radio 첫 선택값이 아니라 원문 기본값) */
const EMPTY: Patch = { mf: MF_OPTIONS[0], name: '', ptype: '법인', region: '국내', biz: '', addr: '', tel: '', memo: '' };

/* 사업자번호/주민번호 자동 하이픈 — 목업 `maskBiz` 이식(개인 13자리 000000-0000000 / 법인 10자리 000-00-00000) */
function maskBiz(raw: string, ptype: MemberRow['ptype']): string {
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (ptype === '개인') {
    const v = digits.slice(0, 13);
    return v.length > 6 ? v.slice(0, 6) + '-' + v.slice(6) : v;
  }
  const v = digits.slice(0, 10);
  if (v.length > 5) return v.slice(0, 3) + '-' + v.slice(3, 5) + '-' + v.slice(5);
  return v.length > 3 ? v.slice(0, 3) + '-' + v.slice(3) : v;
}
const BIZ_PLACEHOLDER: Record<MemberRow['ptype'], string> = { 개인: '000000-0000000', 법인: '000-00-00000' };

/* ── 필드 정의(ad-hoc FieldSpec) — SchemaField가 14px·토큰·34px 규격을 자동 적용 ── */
const F: Record<string, FieldSpec> = {
  mf: { key: 'mf', label: '모펀드', control: 'select', options: MF_OPTIONS },
  name: { key: 'name', label: '조합원명', control: 'text', required: true },
  ptype: { key: 'ptype', label: '개인/법인', control: 'radio', options: ['개인', '법인'] },
  region: { key: 'region', label: '국내/해외', control: 'radio', options: ['국내', '해외'] },
  addr: { key: 'addr', label: '주소', control: 'address', long: true },
  tel: { key: 'tel', label: '전화번호', control: 'text' },
  memo: { key: 'memo', label: '비고', control: 'textarea' },
};

/* RowFormModal `Field` 규격 복제(공유 export가 아니라 로컬 복사 — generic_list_modal.tsx 참조).
   plain=true면 <label> 대신 <div>(복합 컨트롤·radio는 암묵 연결이 어긋난다). */
const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, className, plain }: { label: string; children: React.ReactNode; errMsg?: string; className?: string; plain?: boolean; }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

/* SchemaField `base`(schemas/renderers.tsx) 로컬 복제 — 식별번호 입력은 inlinegrp(입력+버튼) 구성이라
   SchemaField를 그대로 못 쓴다. 규격(34px·14px·토큰·필수 danger 테두리·focus 글로우)은 동일하게 맞춘다. */
function boxStyle(opts: { danger?: boolean; focused?: boolean; muted?: boolean }): React.CSSProperties {
  return {
    boxSizing: 'border-box', padding: '7px 11px', fontSize: 14, lineHeight: '20px', height: 34, minHeight: 34, fontFamily: 'inherit',
    border: `1px solid ${opts.danger ? 'var(--danger)' : 'var(--border-strong)'}`,
    borderRadius: 9,
    background: opts.muted ? 'var(--muted)' : 'var(--card)',
    color: opts.muted ? 'var(--muted-foreground)' : 'var(--foreground)',
    transition: 'border-color .12s, box-shadow .12s',
    ...(opts.focused
      ? (opts.danger
        ? { boxShadow: '0 0 0 3px color-mix(in srgb,var(--danger) 22%,transparent)' }
        : { borderColor: 'var(--ring)', boxShadow: '0 0 0 3px color-mix(in srgb,var(--ring) 22%,transparent)' })
      : {}),
  };
}

export function MemberInfoFormModal({ mode, initial, onSave, onClose, onDelete }: {
  mode: 'create' | 'edit';
  initial?: MemberRow;
  onSave: (patch: Patch) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [v, setV] = React.useState<Patch>(() => initial
    ? { mf: initial.mf, name: initial.name, ptype: initial.ptype, region: initial.region, biz: initial.biz, addr: initial.addr, tel: initial.tel, memo: initial.memo }
    : EMPTY);
  const [errKey, setErrKey] = React.useState('');
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [bizFocus, setBizFocus] = React.useState(false);

  const set = <K extends keyof Patch>(k: K, val: Patch[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    if (errKey === k) setErrKey('');
  };
  /* 개인/법인 전환 시 이미 입력된 번호를 새 자릿수 규칙으로 재포맷한다(목업: change → maskBiz 재실행).
     수정 모드는 번호가 잠겨 있어 값이 바뀌지 않는다 — 라벨만 전환된다. */
  const setPtype = (t: string) => {
    const ptype = t as MemberRow['ptype'];
    setV((p) => ({ ...p, ptype, biz: mode === 'create' ? maskBiz(p.biz, ptype) : p.biz }));
  };

  /* 식별번호 라벨 — 등록은 '사업자번호/주민번호', 수정은 개인/법인에 따라 즉시 전환(목업 `m-bizlab`) */
  const bizLabel = mode === 'create' ? '사업자번호/주민번호' : (v.ptype === '개인' ? '주민번호' : '사업자번호');

  const submit = () => {
    if (!v.name.trim()) { setErrKey('name'); return; }
    // 수정 모드의 번호는 readonly(식별자 잠금)라 검사 대상이 아니다 — 빈 값이면 영구히 저장 불가가 된다.
    if (mode === 'create' && !v.biz.trim()) { setErrKey('biz'); return; }
    return () => {
      onSave({
        mf: v.mf, name: v.name.trim(), ptype: v.ptype, region: v.region,
        biz: v.biz.trim(), addr: v.addr.trim(), tel: v.tel.trim(), memo: v.memo.trim(),
      });
      toast.success(mode === 'create' ? '등록되었습니다 (목업)' : '수정되었습니다 (목업)');
    };
  };

  const title = mode === 'create' ? '조합원정보 등록' : '조합원정보 수정';

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로는 안 닫힘 — 폼 작성 중 오터치 유실 방지(RowFormModal 동형) */}
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title} 양식</DialogDescription>
        </DialogHeader>

        {/* 항목 8개(>6) → 2단 wide 그리드. 좁은 화면은 1단 적층(RowFormModal 규격 동일) */}
        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="모펀드">
              <SchemaField field={F.mf} value={v.mf} onChange={(x) => set('mf', x)} />
            </Field>

            <Field label="조합원명 *" errMsg={errKey === 'name' ? '조합원명을(를) 입력하세요.' : undefined}>
              <SchemaField field={F.name} value={v.name} onChange={(x) => set('name', x)} invalid={errKey === 'name'} />
            </Field>

            {/* radio는 plain div — <label> 암묵 연결이 라디오 첫 항목만 가리켜 그룹 라벨이 어긋난다(RowFormModal 동형) */}
            <Field label="개인/법인" plain>
              <SchemaField field={F.ptype} value={v.ptype} onChange={setPtype} />
            </Field>
            <Field label="국내/해외" plain>
              <SchemaField field={F.region} value={v.region} onChange={(x) => set('region', x as MemberRow['region'])} />
            </Field>

            {/* 사업자번호/주민번호 — 등록: 입력 + 중복확인 / 수정: 식별자 잠금(readonly).
                ⚠ plain div 래퍼다 — 등록 모드는 <label> 안에 버튼이 함께 들어가 라벨 클릭이 엉뚱한 컨트롤을
                  활성화할 수 있고(web-a11y 함정 B), 수정 모드의 값 상자는 labelable 요소가 아니다.
                  대신 입력이 자체 aria-label을 갖는다. */}
            <Field label={`${bizLabel} *`} plain
              errMsg={errKey === 'biz' ? '사업자번호/주민번호을(를) 입력하세요.' : undefined}>
              {mode === 'create' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text" inputMode="numeric" aria-label={bizLabel} aria-required
                    aria-invalid={errKey === 'biz' || undefined}
                    placeholder={BIZ_PLACEHOLDER[v.ptype]}
                    value={v.biz}
                    onChange={(e) => set('biz', maskBiz(e.target.value, v.ptype))}
                    onFocus={() => setBizFocus(true)} onBlur={() => setBizFocus(false)}
                    style={{ ...boxStyle({ danger: true, focused: bizFocus }), flex: 1, minWidth: 0, width: 'auto' }} />
                  {/* 백엔드가 없어 중복확인은 toast로만 회신한다(목업 동일) */}
                  <Button variant="outline" size="sm" onClick={() => toast('사용 가능한 번호입니다 (목업)')}>중복확인</Button>
                </div>
              ) : (
                <div className="flex items-center gap-[7px]" style={boxStyle({ muted: true })}>
                  <span className="min-w-0 truncate">{v.biz ? <>{v.biz}</> : '-'}</span>
                  <span className="shrink-0 text-caption" style={{ fontSize: 11 }}>수정불가</span>
                </div>
              )}
            </Field>

            {/* plain: AddressField 는 검색 버튼을 품은 복합 컨트롤 → <label> 암묵 연결 금지(하이재킹 방지) */}
            <Field label="주소" className="sm:col-span-2" plain>
              <SchemaField field={F.addr} value={v.addr} onChange={(x) => set('addr', x)} />
            </Field>

            <Field label="전화번호">
              <SchemaField field={F.tel} value={v.tel} onChange={(x) => set('tel', x)} />
            </Field>

            <Field label="비고" className="sm:col-span-2">
              <SchemaField field={F.memo} value={v.memo} onChange={(x) => set('memo', x)} />
            </Field>
          </div>
        </div>

        {/* 푸터 — 좌: 수정 모드 2단계 삭제(ghost → 삭제 확인) · 우: 닫기·저장(목업 modal-foot 구성) */}
        <DialogFooter className="px-[46px]">
          <div>
            {mode === 'edit' && onDelete && (
              confirmDel
                ? <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={onDelete}>삭제 확인</Button>
                : <Button variant="ghost" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDel(true)}>삭제</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
