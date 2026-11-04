/* 유무형자산관리(ACC-017) — 「유무형자산관리」 등록/수정 모달(설계서 slide13 · E02/E08).
   - 섹션 2개(자산정보 · 관리정보) — 섹션형 모달(subfund_form_modal Section 규격), 컨트롤은 SchemaField 재사용(34px · 13.5px).
   - 자동 계산: 취득원가(C = A + B) · 잔존가액(취득원가 − 감가상각누계액 − 변동 감소액, 신규는 취득원가) · 상각률(fixed_asset_model deprRate).
   - 자산유형 = 선택한 계정구분의 유무형자산 계정만. 자산유형을 고르면 내용년수 기본값(비품 5년 등)을 채운다.
   - 구입처·제조업체 = 거래처 검색 팝업(acc/slip/partner_search_modal 그대로 import — 회계 공용 위치 이동은 후속 과제).
   - 사용자 = 라디오(개인/부서/공용) + 개인·부서일 때만 선택 셀렉트(공용이면 비활성 표시).
   - 차량번호 = 자산유형이 차량 유형(차량운반구)일 때만 입력(설계서 '확인 필요' — 가정).
   - 저장 검증 = validateAsset(slide13 ③ 순서) — 첫 미충족 항목 빨간 테두리 + 인라인 문구 + 토스트 + 포커스.
   - 전표가 생성된 자산은 금액(구입가액·부대비용·수량·단가)·취득일자를 읽기 전용으로 두고 안내 문구를 보인다(slide13 ③-10).
     변동내역이 있는 자산도 같은 항목을 읽기 전용(변동 스냅샷·취득원가 해당분·'변동일 ≥ 취득일' 무결성 — 설계서에 없는 규칙).
     둘 중 하나라도 해당하면 계정구분·자산유형도 읽기 전용(전표 분개 계정·그룹이 바뀌지 않게 — 설계서에 없는 규칙).
   - 저장 검증에 설계서 밖 2건: 구입가액 0원 = 미입력 문구 · 내용년수 1~99(상각구분 다음 순서, '내용년수를 확인해 주세요.').
   - 취득일자를 바꾸면(잠금이 아닐 때) 자산번호를 새 취득일로 재채번한다(fixed_asset_model commitAsset).
   크롬: 46px 패밀리(헤더·본문·푸터 px-[46px]) · max-w-[880px] 2단. */
import React from 'react';
import { UI } from '../../components';
import { SchemaField, isPlainWrapControl } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { toast } from '../../ui/sonner';
import { formatAmount, parseAmount } from '../slip/general_journal_model';
import type { Partner } from '../slip/general_journal_data';
import { PartnerSearchModal } from '../slip/partner_search_modal';
import { dayWrap, focusIn } from '../slip/suspense_clear_modal';
import { ACQ_KINDS, DEPARTMENTS, DEPR_KINDS, EMPLOYEES, FA_FUNDS, USER_KINDS, findType, typesOf } from './fixed_asset_data';
import type { AcqKind, DeprKind, FaFund, UserKind } from './fixed_asset_data';
import { ASSET_MSG, acqCost, deprRate, rateLabel, validateAsset } from './fixed_asset_model';
import type { AssetField, AssetPatch, AssetView } from './fixed_asset_model';

const { Button, SaveButton } = UI;

const PLACEHOLDER = '선택해 주세요';
const fromSel = (x: string) => (x === PLACEHOLDER ? '' : x);
const toSel = (x: string) => x || PLACEHOLDER;
const sel = (key: string, label: string, options: readonly string[], required?: boolean): FieldSpec =>
  ({ key, label, control: 'select', options: [PLACEHOLDER, ...options], required });
const txt = (key: string, label: string, required?: boolean, placeholder?: string): FieldSpec => ({ key, label, control: 'text', required, placeholder });
const ro = (label: string): FieldSpec => ({ key: label, label, control: 'readonly' });
const F_USER_KIND: FieldSpec = { key: 'userKind', label: '사용자 구분', control: 'radio', options: [...USER_KINDS] };
const F_MEMO: FieldSpec = { key: 'memo', label: '비고', control: 'textarea' };
const F_FILES: FieldSpec = { key: 'files', label: '첨부파일', control: 'file' };
const F_LOCATION: FieldSpec = { key: 'location', label: '보관위치', control: 'text', long: true };

/* 섹션 — subfund_form_modal Section 규격(fieldset/legend 밑줄 헤딩 + 2단) */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0 m-0 mb-7" style={{ minWidth: 0 }}>
      <legend className="w-full flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">{title}</legend>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">{children}</div>
    </fieldset>
  );
}
/* 라벨 래퍼 — RowFormModal Field 규격 로컬 복제(형제 회계 모달과 동일). plain=<div>(버튼형 컨트롤 2회 발화 방지) */
function Field({ label, required, plain, full, errMsg, hint, boxRef, children }: {
  label: string; required?: boolean; plain?: boolean; full?: boolean; errMsg?: string; hint?: string;
  boxRef?: React.Ref<HTMLDivElement>; children: React.ReactNode;
}) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 min-w-0 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}{required ? ' *' : ''}</span>
      <div ref={boxRef}>{children}</div>
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
      {!errMsg && hint && <span className="text-caption block mt-1" style={{ fontSize: 11.5 }}>{hint}</span>}
    </Wrap>
  );
}
const unitLabel: React.CSSProperties = { fontSize: 13.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' };

type V = {
  fund: FaFund | ''; assetType: string; name: string; model: string;
  purchase: string; extra: string; qty: string; unitPrice: string; spec: string; unit: string;
  acqKind: AcqKind | ''; acqDate: string; supplier: string; vehicleNo: string; maker: string; makeDate: string;
  deprKind: DeprKind | ''; life: string; userKind: UserKind; userName: string; location: string; memo: string; files: string;
};
const digits = (s: string) => s.replace(/[^\d]/g, '');
const amountText = (s: string) => formatAmount(parseAmount(digits(s)));

export function FixedAssetFormModal({ initial, partners, onAddPartner, onSave, onClose }: {
  /** 수정 대상(파생 상태 포함) — 없으면 등록 */
  initial?: AssetView;
  partners: readonly Partner[];
  onAddPartner: (p: Partner) => void;
  onSave: (patch: AssetPatch, editId?: string) => void;
  onClose: () => void;
}) {
  const dlgRef = React.useRef<DialogHandle>(null);
  const edit = !!initial;
  const slipLocked = !!initial?.slipNo;
  const changeLocked = !!initial && initial.changeCount > 0;
  const [v, setV] = React.useState<V>(() => (initial ? {
    fund: initial.fund, assetType: initial.assetType, name: initial.name, model: initial.model,
    purchase: formatAmount(initial.purchase), extra: formatAmount(initial.extra), qty: String(initial.qty), unitPrice: formatAmount(initial.unitPrice),
    spec: initial.spec, unit: initial.unit, acqKind: initial.acqKind, acqDate: initial.acqDate, supplier: initial.supplier, vehicleNo: initial.vehicleNo,
    maker: initial.maker, makeDate: initial.makeDate, deprKind: initial.deprKind, life: String(initial.life), userKind: initial.userKind,
    userName: initial.userName, location: initial.location, memo: initial.memo, files: initial.files,
  } : {
    fund: '', assetType: '', name: '', model: '', purchase: '', extra: '', qty: '1', unitPrice: '', spec: '', unit: '',
    acqKind: '', acqDate: '', supplier: '', vehicleNo: '', maker: '', makeDate: '', deprKind: '', life: '', userKind: '공용',
    userName: '', location: '', memo: '', files: '',
  }));
  const [err, setErr] = React.useState<{ field: AssetField; message: string } | null>(null);
  const [pick, setPick] = React.useState<null | 'supplier' | 'maker'>(null);
  const set = <K extends keyof V>(k: K, val: V[K], f?: AssetField) => {
    setV((p) => ({ ...p, [k]: val }));
    if (f) setErr((e) => (e?.field === f ? null : e));
  };
  const errOf = (f: AssetField) => (err?.field === f ? err.message : undefined);

  const refs: Record<AssetField, React.RefObject<HTMLDivElement | null>> = {
    fund: React.useRef(null), assetType: React.useRef(null), name: React.useRef(null), purchase: React.useRef(null),
    qtyPrice: React.useRef(null), acqKind: React.useRef(null), acqDate: React.useRef(null), deprKind: React.useRef(null), life: React.useRef(null),
  };

  const types = typesOf(v.fund);
  const type = findType(v.fund, v.assetType);
  const cost = acqCost(parseAmount(v.purchase), parseAmount(v.extra));
  /* 잔존가액 — 수정이면 원장의 상각·변동 감소분을 뺀다(취득원가 − 감가상각누계액 − Σ감소액) */
  const residual = cost - (initial ? initial.cost - initial.residual : 0);
  const life = v.life ? Number(v.life) : null;
  const rate = deprRate(v.deprKind, life);

  /* 계정구분 변경 — 그 계정구분에 없는 자산유형은 비운다 */
  const setFund = (fund: FaFund | '') => {
    setV((p) => ({ ...p, fund, assetType: findType(fund, p.assetType) ? p.assetType : '', vehicleNo: findType(fund, p.assetType)?.vehicle ? p.vehicleNo : '' }));
    setErr((e) => (e?.field === 'fund' ? null : e));
  };
  /* 자산유형 변경 — 내용년수 기본값 · 차량 유형이 아니면 차량번호 비움 */
  const setType = (name: string) => {
    const t = findType(v.fund, name);
    setV((p) => ({ ...p, assetType: name, life: t ? String(t.life) : p.life, vehicleNo: t?.vehicle ? p.vehicleNo : '' }));
    setErr((e) => (e?.field === 'assetType' ? null : e));
  };
  const setUserKind = (k: UserKind) => setV((p) => ({ ...p, userKind: k, userName: k === p.userKind ? p.userName : '' }));

  const submit = () => {
    const input = {
      fund: v.fund, assetType: v.assetType, name: v.name, purchase: parseAmount(v.purchase),
      qty: v.qty ? Number(v.qty) : null, unitPrice: parseAmount(v.unitPrice), acqKind: v.acqKind, acqDate: v.acqDate, deprKind: v.deprKind,
      life,
    };
    const check = validateAsset(input);
    if (check.ok === false) {
      setErr({ field: check.field, message: check.message });
      toast.error(check.message);
      focusIn(refs[check.field].current);
      return undefined;
    }
    const patch: AssetPatch = {
      fund: v.fund as FaFund, assetType: v.assetType, name: v.name.trim(), model: v.model.trim(),
      purchase: input.purchase ?? 0, extra: parseAmount(v.extra) ?? 0, qty: input.qty ?? 1, unitPrice: input.unitPrice ?? 0,
      spec: v.spec.trim(), unit: v.unit.trim(), acqKind: v.acqKind as AcqKind, acqDate: v.acqDate,
      supplier: v.supplier, vehicleNo: type?.vehicle ? v.vehicleNo.trim() : '', maker: v.maker, makeDate: v.makeDate,
      deprKind: v.deprKind as DeprKind, life: life ?? 5, userKind: v.userKind, userName: v.userKind === '공용' ? '' : v.userName,
      location: v.location.trim(), memo: v.memo, files: v.files,
    };
    return () => { onSave(patch, initial?.id); toast.success(ASSET_MSG.saved); dlgRef.current?.close(); };
  };

  const amountField = (key: 'purchase' | 'extra' | 'unitPrice', label: string, required: boolean, locked: boolean, f?: AssetField) => (locked
    ? <SchemaField field={ro(label)} value={v[key]} onChange={() => undefined} />
    : <SchemaField field={txt(key, label, required)} value={v[key]} invalid={!!(f && errOf(f))} onChange={(x) => set(key, amountText(x), f)} />);
  const amountLocked = slipLocked || changeLocked;
  const lockHint = slipLocked ? ASSET_MSG.slipLocked : changeLocked ? '변동내역이 있는 자산은 금액·취득일자를 수정할 수 없습니다.' : undefined;
  const qtyLocked = amountLocked;
  const groupHint = slipLocked ? '전표가 생성된 자산은 계정구분·자산유형을 수정할 수 없습니다.' : '변동내역이 있는 자산은 계정구분·자산유형을 수정할 수 없습니다.';
  const qtyHint = lockHint;

  const searchBox = (key: 'supplier' | 'maker', label: string) => (
    <div className="flex items-center gap-2 flex-wrap">
      <div style={{ minWidth: 0, flex: '1 1 160px' }}><SchemaField field={ro(label)} value={v[key]} onChange={() => undefined} fill /></div>
      <Button variant="outline" size="sm" leadingIcon="search" onClick={() => setPick(key)}>검색</Button>
    </div>
  );

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">유무형자산관리</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{edit && initial ? `${initial.assetNo} 수정` : '등록'}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <Section title="자산정보">
            <Field label="계정구분" required errMsg={errOf('fund')} boxRef={refs.fund} hint={amountLocked ? groupHint : undefined}>
              {amountLocked
                ? <SchemaField field={ro('계정구분')} value={v.fund} onChange={() => undefined} />
                : <SchemaField field={sel('fund', '계정구분', FA_FUNDS, true)} value={toSel(v.fund)} invalid={!!errOf('fund')} onChange={(x) => setFund(fromSel(x) as FaFund | '')} />}
            </Field>
            <Field label="자산유형" required errMsg={errOf('assetType')} boxRef={refs.assetType} hint={amountLocked ? groupHint : v.fund ? undefined : '계정구분을 먼저 선택해 주세요.'}>
              {amountLocked
                ? <SchemaField field={ro('자산유형')} value={v.assetType} onChange={() => undefined} />
                : <SchemaField field={sel('assetType', '자산유형', types.map((t) => t.name), true)} value={toSel(v.assetType)} invalid={!!errOf('assetType')} onChange={(x) => setType(fromSel(x))} />}
            </Field>
            <Field label="자산명" required errMsg={errOf('name')} boxRef={refs.name}>
              <SchemaField field={txt('name', '자산명', true)} value={v.name} invalid={!!errOf('name')} onChange={(x) => set('name', x, 'name')} />
            </Field>
            <Field label="모델명"><SchemaField field={txt('model', '모델명')} value={v.model} onChange={(x) => set('model', x)} /></Field>
            <Field label="구입가액(A)" required errMsg={errOf('purchase')} boxRef={refs.purchase} hint={lockHint}>
              <div className="flex items-center gap-2">{amountField('purchase', '구입가액(A)', true, amountLocked, 'purchase')}<span style={unitLabel}>원</span></div>
            </Field>
            <Field label="잔존가액">
              <div className="flex items-center gap-2"><SchemaField field={ro('잔존가액')} value={formatAmount(residual)} onChange={() => undefined} /><span style={unitLabel}>원</span></div>
            </Field>
            <Field label="부대비용(B)" hint={lockHint}>
              <div className="flex items-center gap-2">{amountField('extra', '부대비용(B)', false, amountLocked)}<span style={unitLabel}>원</span></div>
            </Field>
            <Field label="취득원가(C=A+B)">
              <div className="flex items-center gap-2"><SchemaField field={ro('취득원가')} value={formatAmount(cost)} onChange={() => undefined} /><span style={unitLabel}>원</span></div>
            </Field>
            <Field label="수량 / 단가" required plain errMsg={errOf('qtyPrice')} boxRef={refs.qtyPrice} hint={qtyHint}>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={{ width: 100 }}>
                  {qtyLocked
                    ? <SchemaField field={ro('수량')} value={v.qty} onChange={() => undefined} fill />
                    : <SchemaField field={txt('qty', '수량', true)} value={v.qty} invalid={!!errOf('qtyPrice')} onChange={(x) => set('qty', digits(x), 'qtyPrice')} fill />}
                </div>
                <span style={unitLabel}>/</span>
                {amountField('unitPrice', '단가', true, amountLocked, 'qtyPrice')}
                <span style={unitLabel}>원</span>
              </div>
            </Field>
            <Field label="규격 / 단위" plain>
              <div className="flex items-center gap-2">
                <div style={{ flex: '1 1 0', minWidth: 0 }}><SchemaField field={txt('spec', '규격')} value={v.spec} onChange={(x) => set('spec', x)} fill /></div>
                <span style={unitLabel}>/</span>
                <div style={{ width: 100 }}><SchemaField field={txt('unit', '단위')} value={v.unit} onChange={(x) => set('unit', x)} fill /></div>
              </div>
            </Field>
            <Field label="취득구분" required errMsg={errOf('acqKind')} boxRef={refs.acqKind}>
              <SchemaField field={sel('acqKind', '취득구분', ACQ_KINDS, true)} value={toSel(v.acqKind)} invalid={!!errOf('acqKind')} onChange={(x) => set('acqKind', fromSel(x) as AcqKind | '', 'acqKind')} />
            </Field>
            <Field label="취득일자" required plain errMsg={errOf('acqDate')} boxRef={refs.acqDate} hint={qtyHint}>
              {qtyLocked
                ? <SchemaField field={ro('취득일자')} value={v.acqDate} onChange={() => undefined} />
                : <div style={dayWrap}><PeriodPicker mode="day" value={v.acqDate} onChange={(x) => set('acqDate', x || '', 'acqDate')} ariaLabel="취득일자" required invalid={!!errOf('acqDate')} /></div>}
            </Field>
            <Field label="구입처" plain>{searchBox('supplier', '구입처')}</Field>
            <Field label="차량번호" hint={type?.vehicle ? undefined : '차량 유형 자산만 입력합니다.'}>
              {type?.vehicle
                ? <SchemaField field={txt('vehicleNo', '차량번호', false, '예: 12가 3456')} value={v.vehicleNo} onChange={(x) => set('vehicleNo', x)} />
                : <SchemaField field={ro('차량번호')} value="" onChange={() => undefined} />}
            </Field>
            <Field label="제조업체" plain>{searchBox('maker', '제조업체')}</Field>
            <Field label="제조일자" plain>
              <div style={dayWrap}><PeriodPicker mode="day" value={v.makeDate} onChange={(x) => set('makeDate', x || '')} ariaLabel="제조일자" /></div>
            </Field>
          </Section>

          <Section title="관리정보">
            <Field label="상각구분" required errMsg={errOf('deprKind')} boxRef={refs.deprKind}>
              <SchemaField field={sel('deprKind', '상각구분', DEPR_KINDS, true)} value={toSel(v.deprKind)} invalid={!!errOf('deprKind')} onChange={(x) => set('deprKind', fromSel(x) as DeprKind | '', 'deprKind')} />
            </Field>
            <Field label="내용년수 / 상각률" plain errMsg={errOf('life')} boxRef={refs.life}>
              <div className="flex items-center gap-2">
                <div style={{ width: 100 }}><SchemaField field={txt('life', '내용년수')} value={v.life} invalid={!!errOf('life')} onChange={(x) => set('life', digits(x).slice(0, 2), 'life')} fill /></div>
                <span style={unitLabel}>년 /</span>
                <div style={{ width: 100 }}><SchemaField field={ro('상각률')} value={rateLabel(rate)} onChange={() => undefined} fill /></div>
              </div>
            </Field>
            <Field label="사용자" plain full>
              <div className="flex items-center gap-4 flex-wrap">
                <SchemaField field={F_USER_KIND} value={v.userKind} onChange={(x) => setUserKind(x as UserKind)} />
                {v.userKind === '공용'
                  ? <SchemaField field={ro('사용자')} value="" onChange={() => undefined} />
                  : <SchemaField field={sel('userName', v.userKind === '개인' ? '사원' : '부서', v.userKind === '개인' ? EMPLOYEES : DEPARTMENTS)}
                      value={toSel(v.userName)} onChange={(x) => set('userName', fromSel(x))} />}
              </div>
            </Field>
            <Field label="보관위치" full><SchemaField field={F_LOCATION} value={v.location} onChange={(x) => set('location', x)} /></Field>
            <Field label="비고" full><SchemaField field={F_MEMO} value={v.memo} onChange={(x) => set('memo', x)} /></Field>
            <Field label="첨부파일" plain={isPlainWrapControl(F_FILES.control)} full>
              <SchemaField field={F_FILES} value={v.files} onChange={(x) => set('files', x)} />
            </Field>
          </Section>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>

      {pick && (
        <PartnerSearchModal open onOpenChange={(o) => { if (!o) setPick(null); }}
          list={partners} onAdd={onAddPartner} initialKeyword={v[pick]}
          onSelect={(p) => set(pick, p.name)} />
      )}
    </Dialog>
  );
}

