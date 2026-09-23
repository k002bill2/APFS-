/* risk_page_kit.tsx — 조기경보 기업정보·자펀드정보·가치평가 typed 화면의 **바깥 양식** 공용 부품.
   GridFrame(apfs-grid) 위에 이 화면군이 반복하는 것만 얹는다:
   - 검색박스 → 상세필터 드로어(목업 검색박스 항목·순서 그대로) + 적용 칩(값만) — apfs-detail-filter "typed 페이지 트랙"
   - 금액 단위 토글(원/백만원/억원 — schemas/unit.ts SSOT) · 탭(원문 여러 화면을 한 리프로 통합한 경우)
   - 단축키 ⌥D 내보내기 · ⌘P 인쇄, 푸터 FooterActions(내보내기 진입은 푸터 아이콘 + ⌥D 두 곳)
   목업 스캐폴딩(GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모)은 옮기지 않는다 — 셸이 소유한다.
   KPI 배지 행 없음(브리프 규칙 5) · 카드뷰 없음 · 검색어 입력 없음(목업 검색박스에 없다 — SEARCHABLE opt-in 규약). */
import React, { useRef, useState } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import type { SplitButtonItem } from './ui/split-button';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';   // 드로어 컨트롤 34px SSOT
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { PeriodPicker } from './ui/period-picker';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import { UNITS } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

const { Button, IconBtn, SegTabs } = UI;

/* ──────────────────────────────
   검색조건(필터) 선언
────────────────────────────── */
export interface FilterSpec {
  label: string;
  /** radio = 배타 선택(원문 라디오 — '전체' 칩 해제 없음) · text = 부분일치 입력 · dayRange = 'YYYY-MM-DD~YYYY-MM-DD'(한쪽 비면 열린 경계) */
  kind: 'select' | 'day' | 'month' | 'year' | 'radio' | 'text' | 'dayRange';
  value: string;
  onChange: (v: string) => void;
  /** select 선택지(원문 옵션 — '전체' 제외) */
  options?: readonly string[];
  /** 빈 값('') 선택지 라벨. null = 빈 선택지 없음(원문 select 에 '전체' 가 없는 항목 — 구분) */
  allLabel?: string | null;
  /** 행 컬럼과 연동되지 않는 조회 조건 — 드로어에 `· 데이터 연동 후 적용` 캡션(무신호 무효 필터 금지) */
  noop?: boolean;
  /** text 입력 placeholder(원문 그대로) */
  placeholder?: string;
  /** false = 적용 칩 숨김 — 기본값이 있으나 아직 적용 전인 조건(값은 드로어에 그대로 보인다) */
  chip?: boolean;
}

/** dayRange 값 'from~to' ↔ [from, to] */
export const splitRange = (v: string): [string, string] => { const [a = '', b = ''] = v.split('~'); return [a, b]; };
export const joinRange = (a: string, b: string): string => (a || b ? `${a}~${b}` : '');

/* 드로어 필드 — plain=true 면 <label> 대신 <div>(PeriodPicker 트리거는 <button> 이라 라벨 이중 토글 방지) */
function DrawerField({ label, plain, noop, children }: { label: string; plain?: boolean; noop?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="flex items-center gap-1 font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}
        {noop && <span className="font-normal" style={{ fontSize: 12, marginLeft: 6 }}>· 데이터 연동 후 적용</span>}
      </span>
      {children}
    </Wrap>
  );
}

function DrawerSelect({ f }: { f: FilterSpec }) {
  const all = f.allLabel === undefined ? '전체' : f.allLabel;
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select aria-label={f.label} value={f.value} onChange={(e) => f.onChange(e.target.value)}
        style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {all !== null && <option value="">{all}</option>}
        {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* 배타 선택 — DS RadioGroup. Item 은 <button role=radio> 라 <label> 로 감싸지 않고 htmlFor 로 잇는다(ui/radio-group.tsx 규약) */
function DrawerRadio({ f }: { f: FilterSpec }) {
  const base = `flt-${f.label.replace(/\s+/g, '')}`;
  return (
    <RadioGroup value={f.value} onValueChange={f.onChange} aria-label={f.label}>
      {(f.options ?? []).map((o, i) => (
        <span key={o} className="inline-flex items-center gap-1.5">
          <RadioGroupItem id={`${base}-${i}`} value={o} />
          <label htmlFor={`${base}-${i}`} className="cursor-pointer" style={{ fontSize: 14 }}>{o}</label>
        </span>
      ))}
    </RadioGroup>
  );
}

const dayWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

function FilterControl({ f }: { f: FilterSpec }) {
  if (f.kind === 'select') return <DrawerField label={f.label} noop={f.noop}><DrawerSelect f={f} /></DrawerField>;
  if (f.kind === 'radio') return <DrawerField label={f.label} plain noop={f.noop}><DrawerRadio f={f} /></DrawerField>;
  if (f.kind === 'text') {
    return (
      <DrawerField label={f.label} noop={f.noop}>
        <input type="text" value={f.value} onChange={(e) => f.onChange(e.target.value)} placeholder={f.placeholder} style={inputStyle('text')} />
      </DrawerField>
    );
  }
  if (f.kind === 'dayRange') {
    const [a, b] = splitRange(f.value);
    return (
      <DrawerField label={f.label} plain noop={f.noop}>
        <div className="flex items-center gap-2 flex-wrap">
          <div style={dayWrap}><PeriodPicker mode="day" value={a} onChange={(v) => f.onChange(joinRange(v || '', b))} ariaLabel={`${f.label} 시작`} /></div>
          <span className="text-caption">~</span>
          <div style={dayWrap}><PeriodPicker mode="day" value={b} onChange={(v) => f.onChange(joinRange(a, v || ''))} ariaLabel={`${f.label} 종료`} /></div>
        </div>
      </DrawerField>
    );
  }
  /* 연도·월·일 = PeriodPicker(apfs-datepicker). 트리거가 w-full 이라 fit-content 래퍼 필수("폭" 규칙) */
  const minW = controlMinWidth(f.kind === 'day' ? 'date' : f.kind);
  return (
    <DrawerField label={f.label} plain noop={f.noop}>
      <div style={{ width: 'fit-content', minWidth: minW, maxWidth: '100%' }}>
        <PeriodPicker mode={f.kind} value={f.value} onChange={(v) => f.onChange(v || '')} ariaLabel={f.label} />
      </div>
    </DrawerField>
  );
}

export function FilterDrawer({ open, onOpenChange, filters, onReset, title }: {
  open: boolean; onOpenChange: (o: boolean) => void; filters: FilterSpec[]; onReset: () => void; title: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
        <SheetHeader>
          <SheetTitle>상세 필터</SheetTitle>
          <SheetDescription className="sr-only">{title} 조회 조건</SheetDescription>
          <IconBtn icon="x" onClick={() => onOpenChange(false)} label="닫기" size={38} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
          {filters.map((f) => <FilterControl key={f.label} f={f} />)}
        </div>
        <SheetFooter>
          <Button variant="outline" size="md" onClick={onReset}>초기화</Button>
          <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => onOpenChange(false)}>필터 적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* 적용 칩 — 항목별 개별 칩, **값만** 표시(항목명은 title·aria-label 로 회수). 빈 선택지가 없는 항목(구분)은 해제 × 없음 */
function AppliedChip({ f }: { f: FilterSpec }) {
  const clearable = f.allLabel !== null && f.kind !== 'radio';
  const shown = f.kind === 'dayRange' ? splitRange(f.value).join(' ~ ') : f.value;
  return (
    <span title={f.label} className="inline-flex items-center gap-1.5 font-semibold text-primary"
      style={{ padding: clearable ? '5px 8px 5px 11px' : '5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
      {shown}
      {clearable && (
        <button type="button" onClick={() => f.onChange('')} aria-label={`${f.label} 필터 제거`}
          className="inline-flex items-center justify-center border-0 cursor-pointer"
          style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
          <Icon name="x" size={13} stroke={2.4} />
        </button>
      )}
    </span>
  );
}

export function AppliedChips({ filters }: { filters: FilterSpec[] }) {
  const on = filters.filter((f) => f.value && f.chip !== false);
  return (
    <>
      <Icon name="filter" size={16} className="text-caption" />
      {on.length === 0 && <span className="text-caption" style={{ fontSize: 12.5 }}>전체</span>}
      {on.map((f) => <AppliedChip key={f.label} f={f} />)}
    </>
  );
}

/* ──────────────────────────────
   금액 단위 토글 — 원 단위 저장값을 렌더·엑셀 경계에서만 환산(schemas/unit.ts)
────────────────────────────── */
export function UnitToggle({ unit, onChange, note }: { unit: Unit; onChange: (u: Unit) => void; note?: string }) {
  return (
    <div role="group" aria-label="금액 단위" className="inline-flex items-center gap-2">
      <span className="text-caption" style={{ fontSize: 12 }}>금액 단위{note ? ` (${note})` : ''}</span>
      <SegTabs size="sm" options={UNITS as unknown as string[]} value={unit} onChange={(v: string) => onChange(v as Unit)} />
    </div>
  );
}

/* ──────────────────────────────
   탭 — 원문 여러 화면을 한 메뉴 리프로 통합한 화면(WAI-ARIA Tabs: 좌우 화살표·Home/End, roving tabIndex)
   ⚠ 활성 패널만 마운트한다 — display:none 패널 안의 AG Grid 는 폭 0 으로 초기화돼 flex 폭이 깨진다.
────────────────────────────── */
export interface TabItem { id: string; label: string; count?: number }

export function TabBar({ tabs, value, onChange, idBase, label }: { tabs: TabItem[]; value: string; onChange: (id: string) => void; idBase: string; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (e: React.KeyboardEvent, i: number) => {
    const n = tabs.length;
    const j = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (j < 0) return;
    e.preventDefault();
    onChange(tabs[j].id);
    refs.current[j]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-0.5 overflow-x-auto" style={{ padding: '0 14px', borderBottom: '1px solid var(--border)' }}>
      {tabs.map((t, i) => {
        const on = t.id === value;
        return (
          <button key={t.id} ref={(el) => { refs.current[i] = el; }} type="button" role="tab"
            id={`${idBase}-tab-${t.id}`} aria-selected={on} aria-controls={`${idBase}-panel`} tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.id)} onKeyDown={(e) => move(e, i)}
            className="flex items-center cursor-pointer whitespace-nowrap"
            style={{ gap: 7, padding: '12px 14px', border: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 14,
              color: on ? 'var(--primary)' : 'var(--muted-foreground)', fontWeight: on ? 800 : 600,
              borderBottom: on ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: -1 }}>
            {t.label}
            {t.count != null && (
              <span className="font-extrabold tabular-nums" style={{ fontSize: 11, borderRadius: 99, padding: '1px 7px',
                background: on ? 'color-mix(in srgb, var(--primary) 14%, transparent)' : 'var(--muted)', color: on ? 'var(--primary)' : 'var(--muted-foreground)' }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idBase, value, children }: { idBase: string; value: string; children: React.ReactNode }) {
  return <div role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${value}`}>{children}</div>;
}

/* ──────────────────────────────
   페이지 골격 — GridFrame + 필터 드로어 + 단축키
────────────────────────────── */
export interface RiskPageProps {
  /** 메뉴 대분류(브레드크럼). 미지정 = 조기경보(이 부품을 처음 만든 화면군) */
  system?: string;
  /** 메뉴 중분류(브레드크럼) */
  group: string;
  /** 메뉴 리프 라벨 = 카드 제목(apfs-grid "타이틀은 메뉴 리프와 일치") */
  label: string;
  /** route 키(즐겨찾기 별) */
  route: string;
  onNav?: (r: string) => void;
  filters?: FilterSpec[];
  /** 필터·단위 등 화면 상태를 기본값으로 되돌린다(드로어 초기화 · 새로고침 공용) */
  onReset: () => void;
  unit?: Unit;
  onUnit?: (u: Unit) => void;
  /** 단위 토글 옆 보충(예: '주식수 제외') */
  unitNote?: string;
  /** 토글이 없는 금액 화면의 단위 캡션(예: '단위: 원') */
  unitCaption?: string;
  /** 상세필터 오른쪽 · 새로고침 왼쪽 버튼(등록·저장 — apfs-grid 툴바 순서) */
  actions?: React.ReactNode;
  footerLeft: React.ReactNode;
  onExport?: () => void;
  /** 푸터 인쇄 combo 의 ▾ 메뉴(화면 전용 출력물). 없으면 인쇄는 단일 아이콘 */
  printItems?: SplitButtonItem[];
  /** 팝업이 열린 동안 ⌥D 를 끈다(팝업은 자체 엑셀 버튼 — 배경 그리드를 내려받지 않게) */
  exportEnabled?: boolean;
  /** 행 선택 액션 묶음(selbar). 있으면 툴바 좌측 적용 칩 대신 이것을 GridFrame contextActions 로 넘긴다 */
  contextActions?: React.ReactNode;
  children: React.ReactNode;
}

export function RiskPage({ system = '조기경보', group, label, route, onNav, filters = [], onReset, unit, onUnit, unitNote, unitCaption, actions, footerLeft, onExport, printItems, exportEnabled = true, contextActions, children }: RiskPageProps) {
  const [open, setOpen] = useState(false);
  useHotkey(HOTKEYS.export.combo, () => onExport?.(), { enabled: !!onExport && exportEnabled });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  const refresh = () => { onReset(); toast.success('새로고침했습니다'); };
  return (
    <GridFrame
      crumbs={['홈', system, group, label]}
      title={label}
      favRoute={route}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={!contextActions && filters.length > 0 ? <AppliedChips filters={filters} /> : undefined}
      contextActions={contextActions || undefined}
      toolbarRight={<>
        {unitCaption && <span className="text-caption" style={{ fontSize: 12 }}>{unitCaption}</span>}
        {unit && onUnit && <UnitToggle unit={unit} onChange={onUnit} note={unitNote} />}
        {filters.length > 0 && <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setOpen(true)}>상세필터</Button>}
        {actions}
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={footerLeft}
      footerRight={<FooterActions onExport={onExport} printItems={printItems} />}>
      {children}
      {filters.length > 0 && <FilterDrawer open={open} onOpenChange={setOpen} filters={filters} onReset={onReset} title={label} />}
    </GridFrame>
  );
}
