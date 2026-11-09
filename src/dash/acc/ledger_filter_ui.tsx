/* 장부조회(ACC-009~014) 상세필터 공용 조각 — 6화면이 같은 모양·같은 칩 문구를 쓰게(병렬 구현 드리프트 방지).
   - DrawerField: 라벨 + 컨트롤 + 오류 문구(일반전표 관리 동형). plain = <div> 래퍼(PeriodPicker 버튼 2회 토글 방지).
   - DayField / DayRangeField: PeriodPicker day 를 fit-content 래퍼로 감싼 단일·범위 일자(apfs-datepicker "폭").
   - FlagCheck: 체크박스 플래그 — 미결재포함·모든계정포함·결산전표포함·작성계정과목만. 2026-11-03 사용자 지시 '~포함 필터는 전부 체크박스'
     (여/부 셀렉트 FlagSelect 는 폐기 — 다시 만들지 않는다).
   - flagChips: 플래그 적용 칩 — 값만 보이므로 값 자체가 뜻을 담게('미결재 포함'), 기본값과 같으면 × 없음.
   필수 조건(기간·기준일) 칩은 onClear 를 넘기지 않는다(설계서: 필수라 ✕ 없음). */
import { useId } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Checkbox } from '../ui/checkbox';
import { PeriodPicker } from '../ui/period-picker';
import { controlMinWidth } from '../schemas/renderers';
import type { AppliedFilter } from '../applied_filters';
import type { LedgerCond } from './ledger/ledger_model';

export function DrawerField({ label, plain, required, errMsg, children }: { label: string; plain?: boolean; required?: boolean; errMsg?: string; children: ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{required && <><span aria-hidden className="text-foreground" style={{ marginLeft: 2 }}>*</span><span className="sr-only"> 필수</span></>}
      </span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 12 }}>{errMsg}</span>}
    </Wrap>
  );
}

const dayWrap: CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

export function DayField({ label, value, onChange, required, errMsg }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; errMsg?: string }) {
  return (
    <DrawerField label={label} plain required={required} errMsg={errMsg}>
      <div style={dayWrap}><PeriodPicker mode="day" value={value} onChange={onChange} ariaLabel={label} invalid={!!errMsg} /></div>
    </DrawerField>
  );
}

export function DayRangeField({ label, from, to, onFrom, onTo, required, errMsg }: {
  label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; required?: boolean; errMsg?: string;
}) {
  return (
    <DrawerField label={label} plain required={required} errMsg={errMsg}>
      <div className="flex items-center gap-2 flex-wrap">
        <div style={dayWrap}><PeriodPicker mode="day" value={from} onChange={onFrom} ariaLabel={`${label} 시작일`} invalid={!!errMsg} /></div>
        <span className="text-caption">~</span>
        <div style={dayWrap}><PeriodPicker mode="day" value={to} onChange={onTo} ariaLabel={`${label} 종료일`} invalid={!!errMsg} /></div>
      </div>
    </DrawerField>
  );
}

/** 체크박스 플래그 — DS Checkbox + htmlFor 라벨(Root 가 <button> 이라 <label> 로 감싸지 않는다 · generic_list DrawerCheckRow 동형) */
export function FlagCheck({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 mb-4">
      <Checkbox id={id} checked={value} onCheckedChange={(c) => onChange(c === true)} />
      <label htmlFor={id} className="font-semibold text-muted-foreground cursor-pointer select-none" style={{ fontSize: 14 }}>{label}</label>
    </div>
  );
}

type FlagKey = 'includeUnapproved' | 'includeAll' | 'includeClosing';
const FLAG_TEXT: Record<FlagKey, { label: string; on: string; off: string }> = {
  includeUnapproved: { label: '미결재포함', on: '미결재 포함', off: '미결재 제외' },
  includeAll: { label: '모든계정포함', on: '모든계정 포함', off: '잔액 계정만' },
  includeClosing: { label: '결산전표포함', on: '결산전표 포함', off: '결산전표 제외' },
};

/** 플래그 적용 칩 — 순서 = 넘긴 keys 순서. 선택형 조건이라 기본값이면 칩을 띄우지 않고(초기 진입 = 칩 없음),
    사용자가 바꿔 적용했을 때만 표시 · ×(→ 기본값 복원). 2026-11-02 사용자 지시(재무상태표). */
export function flagChips(cond: LedgerCond, defaults: LedgerCond, set: (patch: Partial<LedgerCond>) => void,
  keys: readonly FlagKey[] = ['includeUnapproved', 'includeAll', 'includeClosing']): AppliedFilter[] {
  return keys.filter((k) => cond[k] !== defaults[k]).map((k) => {
    const t = FLAG_TEXT[k];
    return { label: t.label, value: cond[k] ? t.on : t.off, onClear: () => set({ [k]: defaults[k] }) };
  });
}
