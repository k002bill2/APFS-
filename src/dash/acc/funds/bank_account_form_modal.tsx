/* 계좌관리(ACC-019) — 「계좌관리 등록/수정」 모달(설계서 slide 12 · E02 slide 16 · E06 slide 19). 입력 20개.

   ⚠ RowFormModal(flat 스키마)로 담을 수 없어 전용 모달이다 — 입력칸 옆 버튼([검색]·[계정구분명상동]·[3·6·12개월])이 있다.
   골격·규격: `max-w-[880px]` 2단, 46px 패밀리(헤더·본문·푸터 `px-[46px]`), 개별 컨트롤 = `SchemaField`(ad-hoc FieldSpec).
   - 배치는 설계서 와이어프레임 행 구성 그대로 — 혼자 한 줄인 항목(계정구분·계좌별칭·계좌주명·상품가입금액)은 `sm:col-span-2`
     (컨트롤 폭은 폭 규약 200~320 그대로라 늘어나지 않는다), 개설목적·적요·연동정보·첨부파일 = 전체 폭.
   - 저장 검증 = 모델 validateAccount(form, 'save'|'draft') — 첫 미충족 1건 → 그 칸 빨간 테두리 + 인라인 문구 + 토스트 + 포커스.
     [임시 저장] = 계정구분·계좌번호만 검사. 성공 = onSave → 토스트 '저장되었습니다' → 닫힘(exit 애니메이션 경로 dlgRef.close()).
   - 거래처 = 읽기전용 칸 + [검색](회계 공용 PartnerSearchModal) — 고르면 거래처명. 원장(간편추가 포함)은 페이지가 소유.
   - 지점 옵션 = 금융기관별(BANK_BRANCHES), 금융기관을 바꾸면 지점을 비운다.
   - [3·6·12개월] = 개설일 + N개월(월말 보정). 개설일이 없으면 개설일 필드 오류 '개설일을 입력하세요.'.
   - [계정구분명상동] = 계좌주명 ← 계정구분. 계정구분이 없으면 계정구분 필드 오류.
   - 이자율 = 숫자 100px(폭 규약 % 라벨) + '%' 단위. 상품가입금액 = 천단위 콤마 입력(숫자만 저장).
   - 연동정보 = 독립 플래그 3개라 DS Checkbox 그룹(멀티셀렉트 기본값의 예외 — 칸마다 독립 설정). 첨부 = DocumentsField 20MB.
   - 닫기(X·Esc·[닫기]) = requestClose 한 곳 — 바뀐 값이 있으면 "저장하지 않고 닫으시겠습니까?" 확인(depreciation_account_modal 관용구).
   ⚠ 백엔드가 없어 저장은 부모(bank_account_manage)의 로컬 행 상태만 바꾼다. */
import React, { useMemo, useRef, useState } from 'react';
import { UI } from '../../components';
import { SchemaField, isPlainWrapControl } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { Checkbox } from '../../ui/checkbox';
import { toast } from '../../ui/sonner';
import { DocumentsField } from '../../fields/DocumentsField';
import { PartnerSearchModal } from '../partner_search_modal';
import type { Partner } from '../slip/general_journal_data';
import { ACCOUNT_NO_REQUIRED_SUBJECTS, BANKS, BANK_BRANCHES, CURRENCIES, FUNDS_ACCOUNT_TYPES, LINK_FLAGS } from './funds_data';
import type { Bank, CurrencyCode, FundsAccountType, LinkFlag } from './funds_data';
import { amountDigits, amountDisplay, emptyForm, formFromAccount, formSnapshot, holderFromAccountType, maturityFromOpen, validateAccount } from './bank_account_model';
import type { BankAccountForm, BankAccountRow, FieldError, FormKey } from './bank_account_model';

const { Button, IconBtn, SaveButton } = UI;

const PLACEHOLDER = '선택';
const F: Record<string, FieldSpec> = {
  accountType: { key: 'accountType', label: '계정구분', control: 'select', options: [...FUNDS_ACCOUNT_TYPES], required: true, searchable: true, placeholder: PLACEHOLDER },
  alias: { key: 'alias', label: '계좌별칭', control: 'text' },
  subject: { key: 'subject', label: '계정과목', control: 'select', options: [...ACCOUNT_NO_REQUIRED_SUBJECTS], required: true, placeholder: PLACEHOLDER },
  partner: { key: 'partner', label: '거래처', control: 'readonly' },
  bank: { key: 'bank', label: '금융기관', control: 'select', options: [...BANKS], required: true, placeholder: PLACEHOLDER },
  branch: { key: 'branch', label: '지점', control: 'select', placeholder: PLACEHOLDER },
  accountNo: { key: 'accountNo', label: '계좌번호', control: 'text', required: true },
  virtualNo: { key: 'virtualNo', label: '가상계좌번호', control: 'text' },
  holder: { key: 'holder', label: '계좌주명', control: 'text' },
  openDate: { key: 'openDate', label: '개설일', control: 'date', required: true },
  maturityDate: { key: 'maturityDate', label: '만기일', control: 'date' },
  freeWithdraw: { key: 'freeWithdraw', label: '수시입출금가능여부', control: 'switch', options: ['Y', 'N'] },
  active: { key: 'active', label: '사용여부', control: 'switch', options: ['Y', 'N'] },
  currency: { key: 'currency', label: '통화', control: 'select', options: CURRENCIES.map((c) => c.label) },
  rate: { key: 'rate', label: '이자율(%)', control: 'number', required: true },   // 라벨의 '%' = 폭 규약 100px(SHORT_VALUE_LABEL)
  productAmount: { key: 'productAmount', label: '상품가입금액', control: 'text', placeholder: '0' },
  purpose: { key: 'purpose', label: '개설목적', control: 'text', long: true },
  memo: { key: 'memo', label: '적요', control: 'text', long: true },
};
const currencyLabel = (c: CurrencyCode) => CURRENCIES.find((x) => x.code === c)?.label ?? c;
const currencyCode = (label: string): CurrencyCode => CURRENCIES.find((x) => x.label === label)?.code ?? 'KRW';

/* 입력칸 옆 버튼 = 컨트롤 높이(34px)에 맞추고 줄어들지 않게 — 입력칸과 같은 줄 유지 */
const BTN_34: React.CSSProperties = { height: 34, flexShrink: 0 };

/* RowFormModal `Field` 규격 로컬 복제 + 인라인 오류(trust_manage_kit 동형). plain = <div> 래퍼(버튼을 품은 복합 컨트롤) */
function Field({ label, children, className, plain, errMsg, boxRef }: { label: string; children: React.ReactNode; className?: string; plain?: boolean; errMsg?: string; boxRef?: (el: HTMLElement | null) => void }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap ref={boxRef} className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

export function BankAccountFormModal({ mode, initial, partners, onAddPartner, onSave, onClose }: {
  mode: 'create' | 'edit';
  initial?: BankAccountRow;
  partners: readonly Partner[];                 // 거래처 원장(페이지 소유 — 간편추가분 포함)
  onAddPartner: (p: Partner) => void;
  onSave: (form: BankAccountForm, draft: boolean) => void;
  onClose: () => void;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const start = useMemo(() => (initial ? formFromAccount(initial) : emptyForm()), [initial]);
  const [v, setV] = useState<BankAccountForm>(start);
  const baseline = useMemo(() => formSnapshot(start), [start]);
  const dirty = formSnapshot(v) !== baseline;
  const [err, setErr] = useState<FieldError | null>(null);
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const uid = React.useId();

  const set = <K extends keyof BankAccountForm>(k: K, val: BankAccountForm[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setErr((e) => (e?.key === k ? null : e));
  };
  /* 금융기관 변경 → 지점 초기화 */
  const setBank = (bank: Bank | '') => { setV((p) => ({ ...p, bank, branch: p.bank === bank ? p.branch : '' })); setErr((e) => (e?.key === 'bank' ? null : e)); };

  /* 검증 실패 포커스 — SchemaField 는 ref 를 받지 않으므로 래퍼에서 첫 컨트롤을 찾는다. 거래처는 [검색] 버튼 */
  const boxes = useRef<Partial<Record<FormKey, HTMLElement | null>>>({});
  const reg = (k: FormKey) => (el: HTMLElement | null) => { boxes.current[k] = el; };
  const showError = (e: FieldError) => {
    setErr(e);
    toast.error(e.msg);
    requestAnimationFrame(() => {
      const box = boxes.current[e.key];
      const el = e.key === 'partner'
        ? box?.querySelector<HTMLElement>('[data-role="partner-search"] button')
        : box?.querySelector<HTMLElement>('input, select, button');
      el?.focus();
    });
  };
  const errMsg = (k: FormKey) => (err?.key === k ? err.msg : undefined);
  const bad = (k: FormKey) => err?.key === k;

  /* [3·6·12개월] — 개설일 기준 만기일 */
  const fillMaturity = (n: number) => {
    const r = maturityFromOpen(v.openDate, n);
    if (r.ok === false) { showError(r.error); return; }
    set('maturityDate', r.value);
  };
  /* [계정구분명상동] */
  const fillHolder = () => {
    const r = holderFromAccountType(v);
    if (r.ok === false) { showError(r.error); return; }
    set('holder', r.value);
  };
  const toggleLink = (l: LinkFlag) => set('links', v.links.includes(l) ? v.links.filter((x) => x !== l) : [...v.links, l]);

  const requestClose = () => { if (dirty) setConfirmClose(true); else dlgRef.current?.close(); };

  /* E02-2 · E06-2 저장 / 임시 저장 — SaveButton 계약: 실패 = undefined(스피너 없음), 통과 = commit closure */
  /* 두 SaveButton 이 각자 잠금을 가져 저장 대기 중 키보드로 다른 쪽을 누르면 이중 커밋(같은 계좌코드 2건)이 된다 → 1회만 */
  const committedRef = useRef(false);
  const submit = (draft: boolean) => () => {
    if (committedRef.current) return undefined;
    const errors = validateAccount(v, draft ? 'draft' : 'save');
    if (errors.length > 0) { showError(errors[0]); return undefined; }
    const snapshot = v;
    committedRef.current = true;
    return () => { onSave(snapshot, draft); toast.success('저장되었습니다'); dlgRef.current?.close(); };
  };

  const title = mode === 'create' ? '계좌관리 등록' : '계좌관리 수정';
  const branchSpec: FieldSpec = { ...F.branch, options: v.bank ? BANK_BRANCHES[v.bank] : [] };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent hideClose className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}
        onEscapeKeyDown={(e) => { e.preventDefault(); if (!confirmClose && !partnerOpen) requestClose(); }}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">계좌 {mode === 'create' ? '등록' : '수정'} 양식</DialogDescription>
          <IconBtn icon="x" label="닫기" size={34} onClick={requestClose} />
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="계정구분 *" plain className="sm:col-span-2" boxRef={reg('accountType')} errMsg={errMsg('accountType')}>
              <SchemaField field={F.accountType} value={v.accountType} invalid={bad('accountType')} onChange={(x) => set('accountType', x as FundsAccountType)} />
            </Field>
            <Field label="계좌별칭" className="sm:col-span-2">
              <SchemaField field={F.alias} value={v.alias} onChange={(x) => set('alias', x)} />
            </Field>
            <Field label="계정과목 *" boxRef={reg('subject')} errMsg={errMsg('subject')}>
              <SchemaField field={F.subject} value={v.subject} invalid={bad('subject')} onChange={(x) => set('subject', x)} />
            </Field>
            {/* 거래처 — 읽기전용 표시 + [검색](plain div — 버튼 동거) */}
            <Field label="거래처 *" plain boxRef={reg('partner')} errMsg={errMsg('partner')}>
              <div className="flex items-center gap-2">
                <div style={{ minWidth: 0, flex: '0 1 320px' }}><SchemaField field={F.partner} value={v.partner} invalid={bad('partner')} onChange={() => undefined} /></div>
                <span data-role="partner-search" className="inline-flex shrink-0">
                  <Button variant="outline" size="sm" leadingIcon="search" style={BTN_34} onClick={() => setPartnerOpen(true)}>검색</Button>
                </span>
              </div>
            </Field>
            <Field label="금융기관 *" boxRef={reg('bank')} errMsg={errMsg('bank')}>
              <SchemaField field={F.bank} value={v.bank} invalid={bad('bank')} onChange={(x) => setBank(x as Bank | '')} />
            </Field>
            <Field label="지점">
              <SchemaField field={branchSpec} value={v.branch} onChange={(x) => set('branch', x)} />
            </Field>
            <Field label="계좌번호 *" boxRef={reg('accountNo')} errMsg={errMsg('accountNo')}>
              <SchemaField field={F.accountNo} value={v.accountNo} invalid={bad('accountNo')} onChange={(x) => set('accountNo', x)} />
            </Field>
            <Field label="가상계좌번호">
              <SchemaField field={F.virtualNo} value={v.virtualNo} onChange={(x) => set('virtualNo', x)} />
            </Field>
            <Field label="계좌주명" plain className="sm:col-span-2">
              <div className="flex items-center gap-2">
                <div style={{ minWidth: 0, flex: '0 1 320px' }}><SchemaField field={F.holder} value={v.holder} onChange={(x) => set('holder', x)} /></div>
                <Button variant="outline" size="sm" style={BTN_34} onClick={fillHolder}>계정구분명상동</Button>
              </div>
            </Field>
            <Field label="개설일 *" plain boxRef={reg('openDate')} errMsg={errMsg('openDate')}>
              <SchemaField field={F.openDate} value={v.openDate} invalid={bad('openDate')} onChange={(x) => set('openDate', x)} />
            </Field>
            <Field label="만기일" plain>
              <div className="flex items-center gap-2">
                <SchemaField field={F.maturityDate} value={v.maturityDate} onChange={(x) => set('maturityDate', x)} />
                {[3, 6, 12].map((n) => (
                  <Button key={n} variant="outline" size="sm" style={BTN_34} onClick={() => fillMaturity(n)}>{`${String(n)}개월`}</Button>
                ))}
              </div>
            </Field>
            <Field label="수시입출금가능여부" plain={isPlainWrapControl(F.freeWithdraw.control)}>
              <SchemaField field={F.freeWithdraw} value={v.freeWithdraw} onChange={(x) => set('freeWithdraw', x as 'Y' | 'N')} />
            </Field>
            <Field label="사용여부" plain={isPlainWrapControl(F.active.control)}>
              <SchemaField field={F.active} value={v.active} onChange={(x) => set('active', x as 'Y' | 'N')} />
            </Field>
            <Field label="통화">
              <SchemaField field={F.currency} value={currencyLabel(v.currency)} onChange={(x) => set('currency', currencyCode(x))} />
            </Field>
            <Field label="이자율 *" boxRef={reg('rate')} errMsg={errMsg('rate')}>
              <div className="flex items-center gap-1.5">
                <SchemaField field={F.rate} value={v.rate} invalid={bad('rate')} onChange={(x) => set('rate', x)} />
                <span className="text-muted-foreground" style={{ fontSize: 13 }}>%</span>
              </div>
            </Field>
            <Field label="상품가입금액" className="sm:col-span-2">
              <SchemaField field={F.productAmount} value={amountDisplay(v.productAmount)} onChange={(x) => set('productAmount', amountDigits(x))} />
            </Field>
            <Field label="개설목적" className="sm:col-span-2">
              <SchemaField field={F.purpose} value={v.purpose} onChange={(x) => set('purpose', x)} />
            </Field>
            <Field label="적요" className="sm:col-span-2">
              <SchemaField field={F.memo} value={v.memo} onChange={(x) => set('memo', x)} />
            </Field>
            {/* 연동정보 — 독립 플래그 3개(DS Checkbox, htmlFor 명시 연결 · label 래핑 금지) */}
            <Field label="연동정보 선택" plain className="sm:col-span-2">
              <div role="group" aria-label="연동정보 선택" className="flex items-center gap-4 flex-wrap" style={{ minHeight: 34 }}>
                {LINK_FLAGS.map((l, i) => (
                  <span key={l} className="inline-flex items-center gap-1.5" style={{ fontSize: 13.5 }}>
                    <Checkbox id={`${uid}-link-${String(i)}`} checked={v.links.includes(l)} onCheckedChange={() => toggleLink(l)} />
                    <label htmlFor={`${uid}-link-${String(i)}`} style={{ cursor: 'pointer', userSelect: 'none' }}>{l}</label>
                  </span>
                ))}
              </div>
            </Field>
            <Field label="첨부파일" plain className="sm:col-span-2">
              <DocumentsField value={v.attachments} onChange={(x) => setV((p) => (p.attachments === x ? p : { ...p, attachments: x }))} label="첨부파일" maxSize="20MB" />
            </Field>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={requestClose}>닫기</Button>
            <SaveButton variant="secondary" leadingIcon="" onSubmit={submit(true)}>임시 저장</SaveButton>
            <SaveButton onSubmit={submit(false)} />
          </div>
        </DialogFooter>

        {partnerOpen && (
          <PartnerSearchModal open onOpenChange={(o) => { if (!o) setPartnerOpen(false); }}
            list={partners} onAdd={onAddPartner} initialKeyword={v.partner}
            onSelect={(p) => set('partner', p.name)} />
        )}

        {/* 입력 중 닫기 확인(E02-3) — [닫기]는 확인창을 내린 뒤 handle.close() 로 exit 애니메이션을 지킨다 */}
        <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>닫기 확인</AlertDialogTitle>
              <AlertDialogDescription>저장하지 않고 닫으시겠습니까?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <Button variant="primary" size="sm" onClick={() => { setConfirmClose(false); dlgRef.current?.close(); }}>닫기</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
