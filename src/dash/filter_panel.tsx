/* 상세필터 인라인 패널 공용 조각(2026-11-17 사용자 지시 "자펀드정보관리 페이지를 참고해서 모든 페이지의 상세필터를 페이지 위치로").
   상세필터 드로어(Sheet)·[상세필터] 버튼을 없애고, GridFrame `filterPanel` 슬롯(카드헤더 아래·칩 줄 위)에 칸을 펼쳐 둔다.
   정본 화면 = 자펀드정보관리(2026-11-09~10 사용자 조정분이 전부 여기 들어 있다). 규약 = apfs-detail-filter 스킬.

   - 칸 = 캡션 없이 **항목명이 placeholder·접근名**(aria-label = 적용 칩 label 정확일치 — 칩 클릭 이동 filter_field_jump 의 전제).
   - 칸 폭 120px 고정(≤640px 2열) + flex-wrap. 120 = '리스크담당자'·기준일자 달력이 안 잘리는 최소(2026-11-09 실측).
   - **고른 값은 칸에 남기지 않는다**(FIXED_PLACEHOLDER) — 값은 아래 적용 칩에만 보인다(2026-11-09/10 사용자 "선택해도 placeholder 가
     다시 보이게 — 선택항목은 아래 필터칩에 들어가기 때문"). select 는 '' 를 넘기고, 피커·다중 선택은 실제 값 + 트리거 항목명 고정.
     예외: 직접 치는 칸(검색어·텍스트)·체크 칸은 값을 그대로 보인다. 되돌릴 땐 FIXED_PLACEHOLDER 한 줄.
   - 즉시 반영 — 값 state 는 화면이 소유하고 여기선 그리기만 한다(apfs-detail-filter "즉시 반영").
   - 범위(시작~종료)는 한 항목 = `role=group aria-label=<항목>` 안에 두 칸. 칩 하나가 그룹을 가리킨다.
   - 미연동(noop) 칸은 행을 거르지 않고 칩도 없다 → DS Tooltip '데이터 연동 후 적용'(포털발 이벤트는 skipPortal 로 거른다).
   - [초기화]는 기본값이 빈 값이 아닌 화면(기간 기본값·필수 조건)만 onReset 으로 넘긴다 — 그 밖은 칩 줄 `전체 해제` 가 같은 일을 한다.
   - 검증 문구(시작 > 종료·필수 미입력)는 칸 아래가 아니라 패널 맨 아래 한 줄(role=alert) — 칸 격자를 깨지 않는다. */
import { useId } from 'react';
import type React from 'react';
import type { KeyboardEvent, ReactNode, SyntheticEvent } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { drawerInputStyle } from './schemas/renderers';
import { DrawerSelect, DrawerMultiSelect } from './drawer_select';
import { PeriodPicker } from './ui/period-picker';
import type { PeriodMode } from './ui/period-picker';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import type { SelectOption } from './ui/searchable-select';

const { Button, ClearableInput } = UI;

/** 칸에 고른 값을 보이지 않는다(값은 적용 칩에만). false 면 전 화면 칸이 고른 값을 보인다 */
const FIXED_PLACEHOLDER = true;
const shown = (v: string) => (FIXED_PLACEHOLDER ? '' : v);

/** 칸 폭 — 고정 120px(항목명이 더 길면 그만큼 — cellStyle), 좁은 화면(≤640px)은 2열 */
export const PANEL_CELL = 'w-[var(--cell-w,120px)] max-[640px]:w-[calc(50%-4px)]';
/* 항목명이 120px 칸에 안 들어가면 그 길이만큼 넓힌다(대략 글자당 13px + 컨트롤 여백). 인라인 width 대신 CSS 변수 —
   인라인 width 는 ≤640px 2열 미디어 규칙을 덮는다 */
/* 13.5px Pretendard 글자 폭 근사(한글 12.4 · 공백 3.6 · 그 밖 7.6) + 칸 안 여백(select 좌11+우32 · text 좌우 11 · 피커 좌우 11+달력 아이콘).
   실측 기준 '리스크담당자' 116px(→ 120 그대로), '수시입출금여부' 잘림(2026-11-17 다크 스크린샷)으로 맞췄다 */
const PAD = { select: 45, text: 26, picker: 50 } as const;
const textW = (s: string) => [...s].reduce((w, ch) => w + (/[가-힣]/.test(ch) ? 12.4 : ch === ' ' ? 3.6 : 7.6), 0);
const cellStyle = (label: string, pad: keyof typeof PAD) => {
  const w = Math.ceil(textW(label) + PAD[pad]);
  return w > 120 ? ({ '--cell-w': `${w}px` } as React.CSSProperties) : undefined;
};
/* 범위 끝 칸 — 넓은 화면은 칸 폭, ≤640px 은 두 끝이 한 줄을 반씩(그룹이 한 줄 전체) */
const RANGE_END = 'w-[var(--cell-w,120px)] max-[640px]:w-auto max-[640px]:flex-1 max-[640px]:min-w-0';
const NOOP_TIP = '데이터 연동 후 적용';

/* 닫힌 네이티브 select 의 방향키·Home/End·PageUp/Down — Windows·Linux Chromium 은 목록을 열지 않고 값을 바로 바꾼다.
   칸엔 늘 '' 를 넘기므로 값이 되돌아가 ↓ 를 반복해도 첫 옵션만 걸린다(2026-11-10 Codex P2) → 그 키는 막고 목록을 연다
   (macOS 는 원래 연다). 목록을 **연 뒤에만** 키를 막는다 — showPicker 미지원·실패면 브라우저 기본 동작 그대로(Codex P2 2차) */
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']);
const openListOnNavKey = (e: KeyboardEvent<HTMLElement>) => {
  const t = e.target as HTMLSelectElement & { showPicker?: () => void };
  if (!(t instanceof HTMLSelectElement) || e.altKey || !NAV_KEYS.has(e.key) || typeof t.showPicker !== 'function') return;
  try { t.showPicker(); } catch { return; }
  e.preventDefault();
};

/* 같은 값 다시 고르기 = 무시. 값 숨김 칸은 늘 '' 를 보여서 이미 고른 값을 다시 고르면 onChange 가 또 불린다 —
   그 화면이 값 변경에 딸린 동작(구분을 바꾸면 운용사/자펀드 선택 해제 — 운용인력 변동관리)을 하면 아무것도 안 바꿨는데 선택이 풀린다(2026-11-17) */
const onlyChange = (cur: string, set: (v: string) => void) => (v: string) => { if (v !== cur) set(v); };

/* 포털(달력·검색형 목록)은 DOM 으론 칸 밖이지만 React 이벤트는 컴포넌트 트리를 타고 칸의 TooltipTrigger 까지 올라온다.
   그대로 두면 달력 안 초점이 툴팁을 열고 그 레이어가 Esc 를 먼저 먹는다(2026-11-10 실측) → 칸 DOM 밖 이벤트는 preventDefault */
const skipPortal = (e: SyntheticEvent<HTMLElement>) => {
  if (!e.currentTarget.contains(e.target as Node)) e.preventDefault();
};

/** 칸 래퍼 — 미연동 칸만 DS Tooltip 으로 감싼다. wide = 고정폭 대신 내용 폭(범위·체크·코드+명칭) */
export function PanelCell({ noop, wide, style, children }: { noop?: boolean; wide?: boolean; style?: React.CSSProperties; children: ReactNode }) {
  const box = <div className={wide ? 'max-w-full max-[640px]:w-full' : PANEL_CELL} style={style}>{children}</div>;
  if (!noop) return box;
  return (
    <Tooltip>
      <TooltipTrigger asChild onFocus={skipPortal} onPointerMove={skipPortal}>{box}</TooltipTrigger>
      <TooltipContent>{NOOP_TIP}</TooltipContent>
    </Tooltip>
  );
}

/** 패널 — 칸 묶음 + (선택) [초기화] + (선택) 검증 문구. GridFrame `filterPanel` 에 넘긴다 */
export function FilterPanel({ label = '검색 조건', onReset, errors, children }: {
  /** 그룹 접근名 */
  label?: string;
  /** 기본값 복원 — 기본값이 빈 값이 아닌 화면만(그 밖은 칩 줄 `전체 해제`) */
  onReset?: () => void;
  /** 검증 문구 — 빈 값·false 는 건너뛴다 */
  errors?: ReadonlyArray<string | false | null | undefined>;
  children: ReactNode;
}) {
  /* 같은 문구가 여러 칸에서 올 수 있다(기간 3종이 같은 문구 — 계좌잔액) → 한 번만, key 충돌도 없게 */
  const errs = [...new Set((errors ?? []).filter((m): m is string => Boolean(m)))];
  return (
    /* 컨테이너는 초점을 받지 않는다 — 자식 select 의 키를 capture 단계에서 가로채기만 한다(openListOnNavKey) */
    <div role="group" aria-label={label} className="flex flex-wrap items-center" style={{ gap: 8 }} onKeyDownCapture={openListOnNavKey}>
      {children}
      {onReset && <Button variant="ghost" size="sm" leadingIcon="rotate-ccw" onClick={onReset}>초기화</Button>}
      {errs.length > 0 && (
        <div className="basis-full">
          {errs.map((m) => <span key={m} role="alert" className="text-danger block" style={{ fontSize: 12 }}>{m}</span>)}
        </div>
      )}
    </div>
  );
}

/** 검색어 — 친 글자는 칸에 그대로(값 고정 예외). 돋보기는 입력 뒤(ClearableInput 래퍼가 relative 라 앞에 두면 입력 배경이 덮는다) */
export function PanelSearch({ value, onChange, label = '검색어' }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className={PANEL_CELL + ' relative'}>
      <ClearableInput type="text" value={value} onValueChange={onChange} placeholder={label} aria-label={label}
        clearLabel={`${label} 지우기`} style={{ ...drawerInputStyle('text'), width: '100%', minWidth: 0, paddingLeft: 32 }} />
      <Icon name="search" size={15} className="text-muted-foreground"
        style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

/** 텍스트·숫자 입력 — 친 값은 칸에 그대로 */
export function PanelText({ label, value, onChange, type = 'text', noop }: {
  label: string; value: string; onChange: (v: string) => void; type?: 'text' | 'number'; noop?: boolean;
}) {
  return (
    <PanelCell noop={noop} style={cellStyle(label, 'text')}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label}
        style={{ ...drawerInputStyle(type), width: '100%', minWidth: 0 }} />
    </PanelCell>
  );
}

/** 단일 선택 — '전체'(빈 값) 항목 라벨 = 항목명. required(전체 없음)면 항목명은 고를 수 없는 표시용 */
export function PanelSelect({ label, value, onChange, options, required, searchable, noop, showValue }: {
  label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<SelectOption>;
  /** '전체' 없는 필수 선택(기본값 있음) */
  required?: boolean;
  searchable?: boolean;
  noop?: boolean;
  /** 고른 값을 칸에 보인다(칩 없음) — 다른 칸의 뜻을 정하는 수식어 select 전용(검색어의 '검색기준' — 코드·메뉴·프로그램 관리).
      그 자체로 행을 거르지 않아 칩을 따로 두면 검색어 칩과 같은 말이 두 번 뜬다(2026-11-17) */
  showValue?: boolean;
}) {
  return (
    <PanelCell noop={noop} style={cellStyle(label, 'select')}>
      <DrawerSelect value={showValue ? value : shown(value)} onChange={onlyChange(value, onChange)} options={options} noAll={required} searchable={searchable}
        placeholder={label} ariaLabel={label} fill />
    </PanelCell>
  );
}

/** 다중 선택 — 트리거엔 항목명만(고른 요약은 적용 칩), 펼친 목록의 체크는 실제 값 */
export function PanelMulti({ label, value, onChange, options, searchable }: {
  label: string; value: readonly string[]; onChange: (v: string[]) => void; options: ReadonlyArray<SelectOption>; searchable?: boolean;
}) {
  return (
    <PanelCell style={cellStyle(label, 'select')}>
      <DrawerMultiSelect value={value} onChange={onChange} options={options} searchable={searchable} ariaLabel={label}
        placeholder={FIXED_PLACEHOLDER ? label : undefined} fill />
    </PanelCell>
  );
}

/** 연도·반기·분기·월·일 하나 — PeriodPicker.
    피커엔 실제 값을 넘기고 트리거만 항목명으로 고정한다(fixedLabel) — 달력의 선택 표시·재클릭 해제(범위 한쪽 끝 비우기)가 살아 있다
    (2026-11-17 Codex 지적: 빈 값을 넘기면 한쪽 끝만 지울 수 없었다). 필수는 칩 × 없음 + invalid·패널 검증 문구로 알린다 */
export function PanelPeriod({ label, mode, value, onChange, yearRange, invalid, noop }: {
  label: string; mode: PeriodMode; value: string; onChange: (v: string) => void;
  yearRange?: [number, number]; invalid?: boolean; noop?: boolean;
}) {
  return (
    <PanelCell noop={noop} style={cellStyle(label, 'picker')}>
      <PeriodPicker mode={mode} value={value} fixedLabel={FIXED_PLACEHOLDER} onChange={onChange} ariaLabel={label} placeholder={label}
        yearRange={yearRange} invalid={invalid} />
    </PanelCell>
  );
}

/** 범위(시작~종료) — 한 항목. 칩 label = 그룹 aria-label = label. 칸 접근名은 `<label> 시작`/`<label> 종료` */
export function PanelRange({ label, mode, from, to, onFrom, onTo, invalid, noop }: {
  label: string; mode: PeriodMode; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void;
  invalid?: boolean; noop?: boolean;
}) {
  const end = (which: '시작' | '종료', v: string, set: (v: string) => void) => (
    <div className={RANGE_END} style={cellStyle(`${label} ${which}`, 'picker')}>
      <PeriodPicker mode={mode} value={v} fixedLabel={FIXED_PLACEHOLDER} onChange={set} ariaLabel={`${label} ${which}`}
        placeholder={`${label} ${which}`} invalid={invalid} />
    </div>
  );
  return (
    <PanelCell noop={noop} wide>
      <div role="group" aria-label={label} className="flex items-center" style={{ gap: 6 }}>
        {end('시작', from, onFrom)}
        <span className="text-caption" aria-hidden>~</span>
        {end('종료', to, onTo)}
      </div>
    </PanelCell>
  );
}

/** 텍스트 범위(금액 최소~최대 등) — 친 값은 칸에 그대로. 칩 label = 그룹 aria-label = label */
export function PanelTextRange({ label, min, max, onMin, onMax, invalid, inputMode = 'numeric', ends = ['최소', '최대'] }: {
  label: string; min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void;
  invalid?: boolean; inputMode?: 'numeric' | 'decimal' | 'text'; ends?: readonly [string, string];
}) {
  const end = (which: string, v: string, set: (v: string) => void) => (
    <div className={RANGE_END} style={cellStyle(`${label} ${which}`, 'text')}>
      <input type="text" inputMode={inputMode} value={v} onChange={(e) => set(e.target.value)} placeholder={`${label} ${which}`} aria-label={`${label} ${which}`}
        aria-invalid={invalid || undefined}
        style={{ ...drawerInputStyle('text'), width: '100%', minWidth: 0, textAlign: v ? 'right' : undefined, fontVariantNumeric: 'tabular-nums', ...(invalid ? { border: '1px solid var(--danger)' } : null) }} />
    </div>
  );
  return (
    <PanelCell wide>
      <div role="group" aria-label={label} className="flex items-center" style={{ gap: 6 }}>
        {end(ends[0], min, onMin)}
        <span className="text-caption" aria-hidden>~</span>
        {end(ends[1], max, onMax)}
      </div>
    </PanelCell>
  );
}

/** 배타 선택(원문 라디오) — 고른 값이 곧 보이는 칸(값 고정 예외). DS RadioGroup, Item 은 <button role=radio> 라 htmlFor 로 잇는다 */
export function PanelRadio({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  const base = useId();
  return (
    <PanelCell wide>
      <RadioGroup value={value} onValueChange={onChange} aria-label={label} className="flex items-center flex-wrap" style={{ gap: 12, minHeight: 34, padding: '0 4px' }}>
        {options.map((o, i) => (
          <span key={o} className="inline-flex items-center gap-1.5">
            <RadioGroupItem id={`${base}-${i}`} value={o} />
            <label htmlFor={`${base}-${i}`} className="cursor-pointer whitespace-nowrap" style={{ fontSize: 13.5 }}>{o}</label>
          </span>
        ))}
      </RadioGroup>
    </PanelCell>
  );
}

/** 체크 플래그(~포함 등)·태그 토글 — 체크 상태가 곧 값이라 칸에 보인다.
   Checkbox Root 가 <button> 이라 <label> 로 감싸지 않고 htmlFor 로 잇는다(감싸면 이중 토글) */
export function PanelCheck({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <PanelCell wide>
      <div className="flex items-center" style={{ gap: 8, height: 34, padding: '0 4px' }}>
        <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} aria-label={label} />
        <label htmlFor={id} className="font-semibold text-muted-foreground whitespace-nowrap cursor-pointer select-none" style={{ fontSize: 13.5 }}>{label}</label>
      </div>
    </PanelCell>
  );
}
