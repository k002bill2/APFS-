/* risk_page_kit.tsx — 조기경보 기업정보·자펀드정보·가치평가 typed 화면의 **바깥 양식** 공용 부품.
   GridFrame(apfs-grid) 위에 이 화면군이 반복하는 것만 얹는다:
   - 검색박스 → 칩 줄 위 인라인 필터 패널(목업 검색박스 항목·순서 그대로) + 적용 칩(값만) — apfs-detail-filter "typed 페이지 트랙"
   - 금액 단위 토글(원/백만원/억원 — schemas/unit.ts SSOT) · 탭(원문 여러 화면을 한 리프로 통합한 경우)
   - 단축키 ⌥D 내보내기 · ⌘P 인쇄, 푸터 FooterActions(내보내기 진입은 푸터 아이콘 + ⌥D 두 곳)
   목업 스캐폴딩(GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모)은 옮기지 않는다 — 셸이 소유한다.
   KPI 배지 행 없음(브리프 규칙 5) · 카드뷰 없음 · 검색어 입력 없음(목업 검색박스에 없다 — SEARCHABLE opt-in 규약). */
import React, { useRef } from 'react';
import { UI } from './components';
import { GridFrame, FooterActions } from './grid_frame';
import type { AppliedFilter } from './applied_filters';
import type { SplitButtonItem } from './ui/split-button';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { printGrid } from './print_grid';
import { toast } from './ui/sonner';
import { UNITS } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { FilterPanel, PanelPeriod, PanelRadio, PanelRange, PanelSelect, PanelText } from './filter_panel';   // 상세필터 인라인 패널(apfs-detail-filter)

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
  /** 기본값(처음 상태) — 칩 줄 [초기화]가 보일지(value ≠ def) 판정. 미지정 = ''. 화면 onReset 이 되돌리는 값과 같아야 한다 —
      RiskPage 가 onReset 을 칩 줄 [초기화](GridFrame filterReset)로 건다 */
  def?: string;
  /** select 선택지(원문 옵션 — '전체' 제외) */
  options?: readonly string[];
  /** 빈 값('') 선택지 라벨. null = 빈 선택지 없음(원문 select 에 '전체' 가 없는 항목 — 구분) */
  allLabel?: string | null;
  /** 행 컬럼과 연동되지 않는 조회 조건 — 칸 툴팁 '데이터 연동 후 적용'(무신호 무효 필터 금지) */
  noop?: boolean;
  /** text 입력 placeholder(원문 그대로) */
  placeholder?: string;
  /** false = 적용 칩 숨김 — 기본값이 있으나 아직 적용 전인 조건(등록원부 비활성원부). 칸에 값이 보이는 항목(radio·text)만 쓴다 —
      값 숨김 칸(select·피커)에 쓰면 고른 값이 화면 어디에도 안 보인다(2026-11-17 인라인 패널) */
  chip?: boolean;
}

/** dayRange 값 'from~to' ↔ [from, to] */
export const splitRange = (v: string): [string, string] => { const [a = '', b = ''] = v.split('~'); return [a, b]; };
export const joinRange = (a: string, b: string): string => (a || b ? `${a}~${b}` : '');

/* 검색조건 한 칸 — 인라인 패널 칸(filter_panel)으로 그린다(2026-11-17 상세필터 드로어 폐기 — apfs-detail-filter).
   칸 접근名 = f.label = 적용 칩 label(칩 클릭 이동의 전제). noop = 툴팁 '데이터 연동 후 적용' */
function FilterControl({ f }: { f: FilterSpec }) {
  if (f.kind === 'select') {
    return <PanelSelect label={f.label} value={f.value} onChange={f.onChange} options={f.options ?? []} required={f.allLabel === null} noop={f.noop} />;
  }
  if (f.kind === 'radio') return <PanelRadio label={f.label} value={f.value} onChange={f.onChange} options={f.options ?? []} />;
  if (f.kind === 'text') return <PanelText label={f.label} value={f.value} onChange={f.onChange} noop={f.noop} />;
  if (f.kind === 'dayRange') {
    const [a, b] = splitRange(f.value);
    return <PanelRange label={f.label} mode="day" from={a} to={b} onFrom={(v) => f.onChange(joinRange(v, b))} onTo={(v) => f.onChange(joinRange(a, v))} noop={f.noop} />;
  }
  /* 연도·월·일 = PeriodPicker(apfs-datepicker).
     allLabel null = 빈 값이 없는 항목(시점 스냅샷 — 평가년월·기준년월) → 해제('')를 무시한다.
     비우면 두 시점의 스냅샷이 한 표에 섞인다(칩 × 도 같은 이유로 없다 — specsToApplied). */
  const pick = (v: string) => { if (v || f.allLabel !== null) f.onChange(v); };
  return <PanelPeriod label={f.label} mode={f.kind} value={f.value} onChange={pick} noop={f.noop} />;
}

/** 검색조건 패널 — RiskPage 가 GridFrame filterPanel 로 넘긴다([초기화]는 칩 줄 끝 — RiskPage filterReset) */
export function FilterPanelOf({ filters, title }: { filters: FilterSpec[]; title: string }) {
  return (
    <FilterPanel label={`${title} 조회 조건`}>
      {filters.map((f) => <FilterControl key={f.label} f={f} />)}
    </FilterPanel>
  );
}

/* 적용된 필터(GridFrame 둘째 줄) — 항목별 개별 칩, **값만** 표시(항목명은 툴팁·aria-label 로 회수).
   빈 선택지가 없는 항목(구분·radio)은 해제 × 없음. 칩 렌더는 applied_filters.tsx 가 소유한다. */
export const specsToApplied = (filters: FilterSpec[]): AppliedFilter[] =>
  filters.filter((f) => f.value && f.chip !== false).map((f) => ({
    label: f.label,
    value: f.kind === 'dayRange' ? splitRange(f.value).join(' ~ ') : f.value,
    onClear: f.allLabel !== null && f.kind !== 'radio' ? () => f.onChange('') : undefined,
  }));

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
    /* overflow-x:auto 면 overflow-y 도 visible 이 아니라 auto 로 계산된다(CSS 규칙). 활성 탭 밑줄(2px)+marginBottom:-1 이
       세로로 1px 넘쳐 세로 스크롤바가 생기므로 y축은 명시적으로 숨긴다. 숨기면 바깥 포커스 글로우도 잘리므로
       `apfs-tabbar` 가 탭 포커스를 안쪽(inset)으로 그린다(tokens.css) */
    <div role="tablist" aria-label={label} className="apfs-tabbar flex gap-0.5 overflow-x-auto" style={{ padding: '0 14px', borderBottom: '1px solid var(--border)', overflowY: 'hidden' }}>
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
  /** 필터·단위 등 화면 상태를 기본값으로 되돌린다(칩 줄 [초기화] · 새로고침 공용) */
  onReset: () => void;
  unit?: Unit;
  onUnit?: (u: Unit) => void;
  /** 단위 토글 옆 보충(예: '주식수 제외') */
  unitNote?: string;
  /** 토글이 없는 금액 화면의 단위 캡션(예: '단위: 원') */
  unitCaption?: string;
  /** 새로고침 왼쪽 버튼(등록·저장 — apfs-grid 툴바 순서) */
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
  useHotkey(HOTKEYS.export.combo, () => onExport?.(), { enabled: !!onExport && exportEnabled, skipInDialog: true });
  useHotkey(HOTKEYS.print.combo, printGrid, { skipInDialog: true });
  const refresh = () => { onReset(); toast.success('조회되었습니다'); };
  /* 칩 줄 [초기화] — 처음(def)과 다를 때만 보인다. def 를 빠뜨리면 첫 화면부터 [초기화]가 떠서 드러난다(브라우저 전수 점검).
     dirty 는 필터 값만 본다 — 금액 단위·화면 편집값(평가 입력 등)만 바꾼 상태엔 필터 줄 버튼을 띄우지 않는다(⟳ 조회가 화면 전체를 되돌린다) */
  const filterReset = filters.length > 0 ? { run: onReset, dirty: filters.some((f) => f.value !== (f.def ?? '')) } : undefined;
  return (
    <GridFrame
      crumbs={['홈', system, group, label]}
      title={label}
      favRoute={route}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={contextActions || undefined}
      appliedFilters={specsToApplied(filters)}
      filterPanel={filters.length > 0 ? <FilterPanelOf filters={filters} title={label} /> : undefined}
      filterReset={filterReset}
      toolbarRight={<>
        {unitCaption && <span className="text-caption" style={{ fontSize: 12 }}>{unitCaption}</span>}
        {unit && onUnit && <UnitToggle unit={unit} onChange={onUnit} note={unitNote} />}
        {actions}
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={footerLeft}
      footerRight={<FooterActions onExport={onExport} printItems={printItems} />}>
      {children}
    </GridFrame>
  );
}
