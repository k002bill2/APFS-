/* 일반 리스트 페이지 — 전용 구현이 없는 모든 메뉴 항목의 기본(폴백) 화면.
   레이아웃: KPI 배지 · 필터 칩 툴바 · CRUD 테이블 · 페이지네이션 · 하단 요약 2-카드.
   route 값(한글 레이블 또는 경로)으로 제목·브레드크럼을 자동 구성. */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { APFS_DATA } from './data';
import { mn, MT, useMask } from './mask';
import { RowFormModal, statusTone } from './generic_list_modal';
import type { Row } from './generic_list_modal';
import { resolveSchema } from './schemas';
import { Cell, controlMinWidth } from './schemas/renderers';   // controlMinWidth = 컨트롤 폭 하한 SSOT(fit-content 짝)
import { resolveFilterField, YEAR_OPTIONS } from './schemas/filter_field';
import type { FilterField } from './schemas/filter_field';
import type { PageSchema } from './schemas/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';   // kebab 트리거 툴팁(Provider는 app.tsx 루트)
import { useHotkey, HOTKEYS } from './use-hotkey';   // 앱-스코프 단축키(⌘⏎ 등록·⌘P 인쇄·⌥D 내보내기)
import { toast } from './ui/sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DatePicker } from './ui/date-picker';
import * as XLSX from 'xlsx';   // SheetJS — 클라이언트 전용 .xlsx 생성(쓰기 전용: XLSX.read 미사용 → 알려진 파싱 CVE 비해당)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, ICellRendererParams, IRowNode, CellContextMenuEvent, CellKeyDownEvent } from 'ag-grid-community';
import { apfsTheme, AUTO_SIZE_CONTENT } from './aggrid_theme';   // 공유 테마(회색 행선택)·내용폭 자동화 SSOT
import './aggrid_shared.css';
import { RowContextMenu } from './row_context_menu';   // 우클릭 컨텍스트 메뉴(Community 대체)
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { GridFrame, KpiBadge } from './grid_frame';   // 공통 양식 셸 + KPI 배지(apfs-grid 스킬 SSOT)

const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { Button, StatusBadge, IconBtn, ColorChip, SegTabs, DeltaBadge } = UI;
const D = APFS_DATA;

/* MENU 트리 노드 형태 — data.ts의 MENU는 선언 타입 없는 이질적 리터럴 배열이라
   union 프로퍼티 접근(children/path)이 좁혀지지 않는다. 실제 트리 구조(라벨 필수,
   path/children 선택)를 명시해 findMenuContext 안에서만 정합화한다. 런타임 무변경. */
type MenuNode = { label: string; path?: string; children?: MenuNode[] };

/* MENU를 재귀 탐색해 route와 일치하는 항목의 제목·breadcrumb·상위 레이블을 반환.
   app.tsx의 라우트 전환 aria-live 통지가 route→한글 제목 변환에 재사용(export). */
export function findMenuContext(route: string): { title: string; crumbs: string[]; parent?: string } {
  for (const top of D.MENU as MenuNode[]) {
    if (!top.children) continue;
    for (const child of top.children) {
      if (!child.children) {
        if (child.label === route || child.path === route)
          return { title: child.label, crumbs: ["홈", top.label, child.label], parent: top.label };
        continue;
      }
      for (const leaf of child.children) {
        if (leaf.label === route || leaf.path === route)
          return { title: leaf.label, crumbs: ["홈", top.label, child.label, leaf.label], parent: child.label };
      }
    }
  }
  return { title: route, crumbs: ["홈", route] };
}

/* 행 더미 데이터 생성 — index 기반 결정적 값 (브랜드 차트 팔레트 토큰 매핑) */
const ROW_ICONS = ["building", "layers", "target", "wallet", "chart-bar"];
const ROW_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-9)"];
const ROW_CATS = ["투자성과", "리스크", "회계마감", "운용사보고", "컴플라이언스"];
const ROW_STATUS = ["정상", "진행중", "검토중", "보류", "완료"];
// 첨부파일(filepond) 필드 더미 시드 — 수정 모달에서 기존 첨부(Attachment) 표시 확인용.
const DOC_SEED = [
  "실사보고서.pdf, 재무제표_2026.xlsx",
  "투자심의결과.pdf",
  "현장점검_사진.zip, 점검체크리스트.docx, 의견서.hwp",
  "분기보고서_2026Q1.pdf, 결산자료.xlsx",
];

function makeRows(schema: PageSchema, n: number): Row[] {
  // 리터럴 샘플 우선 — 목업/캡처의 실제 행을 그대로 표시(합성 더미 대체). 개수=샘플 길이.
  const sample = schema.sample?.length ? schema.sample : null;
  const count = sample ? sample.length : n;
  return Array.from({ length: count }, (_, i) => {
    const k = i % 5;
    const base: Row = {
      id: "R" + String(i + 1).padStart(3, "0"),
      icon: ROW_ICONS[k],
      color: ROW_COLORS[k],
      name: "항목명 " + String(i + 1).padStart(3, "0"),
      category: ROW_CATS[k],
      amount: 1200 * (i + 1) + ((i * 137) % 800),
      change: Number((((i * 13) % 200) / 10 - 8).toFixed(1)),
      status: (schema.statusDomain?.[i % (schema.statusDomain.length || 1)]?.label) ?? ROW_STATUS[i % 5],
      trend: [3, 5, 4, 7, 6].map((v, j) => v + ((i + j * 2) % 4)),
    };
    // 샘플 행: 리터럴 값이 base 기본값을 덮어쓴다(id/icon/color는 base 유지). 합성 시드 건너뜀.
    // 카드뷰·KPI가 읽는 name/category도 실제 값으로 진실화(합성 "항목명 001"·가짜 금액 방지).
    if (sample) {
      const s = sample[i];
      return { ...base, ...s, name: String(s.name ?? s.title ?? base.name), category: String(s.category ?? schema.entity) } as Row;
    }
    const extra: Record<string, unknown> = {};
    for (const c of schema.columns) {
      if (['name', 'amount', 'change', 'status', 'trend'].includes(c.key)) continue;
      const field = schema.fields.find((f) => f.key === c.key);
      if (field?.control === 'select' && field.options?.length) {
        extra[c.key] = field.options[i % field.options.length];     // enum 도메인 시드 → 상세필터 매칭 성립
      } else if (/(년도|연도)/.test(c.label)) {
        extra[c.key] = YEAR_OPTIONS[i % YEAR_OPTIONS.length];        // 년도 도메인 시드 → year 필터 매칭
      } else if (/(차수|회차|순번|순서)/.test(c.label)) {
        extra[c.key] = (i % 12) + 1;                                 // 차수/회차는 작은 서수(금액 시드 오적용 방지)
      } else if (c.type === 'amount' || c.type === 'number' || c.type === 'rate') {
        extra[c.key] = (i + 1) * 100 + (i * 7) % 90;
      } else {
        extra[c.key] = c.label + ' ' + String(i + 1).padStart(3, '0');
      }
    }
    // 첨부파일(filepond) 필드는 columns가 아니라 fields라 위 루프에서 시드되지 않는다.
    // 수정 모달에서 기존 첨부가 Attachment로 보이도록 결정적 더미 파일명을 시드(3행마다 무첨부).
    for (const f of schema.fields) {
      if (f.control === 'filepond' && extra[f.key] == null && base[f.key] == null) {
        extra[f.key] = i % 3 === 2 ? '' : DOC_SEED[i % DOC_SEED.length];
      }
    }
    return { ...base, ...extra } as Row;
  });
}

let SEQ = 500;
const nextId = () => "R" + (++SEQ);

const PER = 20;

/* 작은 막대 스파크라인 — 마지막 막대만 진하게 (이미지 참조) */
function MiniBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="inline-flex items-end" style={{ gap: 3, height: 20 }}>
      {data.map((v, i) => (
        <span key={i} style={{
          width: 5, borderRadius: 2, height: Math.max(3, (v / max) * 20),
          background: i === data.length - 1 ? color : `color-mix(in srgb, ${color} 32%, transparent)`,
        }} />
      ))}
    </div>
  );
}

/* KpiBadge는 grid_frame.tsx(GridFrame SSOT)에서 import — 인라인 정의 제거(apfs-grid 양식 이관) */

/* 제거 가능한 필터 칩 — 값만 표시(항목명 접두사 없음, 2026-09-09 통일: typed 페이지 골드 규약과 일치).
   항목명은 title(호버)·aria-label로 회수해 의미 손실을 상쇄한다. 값은 데이터→MT 마스킹. 태그형(value 없음)은 라벨=값 토큰이라 라벨을 그대로 표시. */
function FilterPill({ label, value, onRemove }: { label: string; value?: string; onRemove: () => void }) {
  return (
    <span title={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: "5px 8px 5px 11px", borderRadius: 9, fontSize: 12.5, background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
      {value ? <MT>{value}</MT> : <span>{label}</span>}
      <button onClick={onRemove} aria-label={label + " 필터 제거"} className="inline-flex border-0 cursor-pointer p-0" style={{ background: "transparent", color: "inherit" }}>
        <Icon name="x" size={13} stroke={2.4} />
      </button>
    </span>
  );
}

/* ===== 더보기 드롭다운 메뉴 (kebab) — Radix DropdownMenu(키보드 내비·menuitem 시맨틱) =====
   내보내기(Excel)·인쇄만 남는다. 등록은 kebab에서 꺼내 툴바 독립 버튼으로 승격(2026-09-11 사용자 결정,
   진입 빈도가 높은 1차 액션이라 2클릭→1클릭). 독립 '엑셀' 버튼은 두지 않는다(내보내기 항목으로 흡수).
   골드 subfund_manage.tsx의 MoreMenu 동형 — Tooltip 래핑 + DropdownMenuShortcut 힌트 + size prop. */
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      {/* Tooltip/Dropdown 트리거를 같은 노드에 합성하면 Radix가 data-state를 서로 덮어써
          kebab의 data-[state=open] 열림 스타일이 죽는다 → span을 끼워 data-state 노드를 분리한다. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger
              aria-label="더보기"
              className="apfs-menu-trigger inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary focus-visible:bg-card focus-visible:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
              style={{ width: size, height: size }}>
              <Icon name="more" size={20} stroke={2} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>더보기</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onExport}>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
          <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()}>
          <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
          <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── 드로어 체크 행 — 박스+체크 시각 (토큰 기반, 라이트/다크 양립) ── */
function DrawerCheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={checked}
      className="flex items-center gap-3 w-full text-left cursor-pointer border-0 py-2 px-0"
      style={{ background: "transparent", font: "inherit" }}>
      <span className="inline-flex items-center justify-center shrink-0" style={{
        width: 24, height: 24, borderRadius: 7, transition: "all .15s var(--ease)",
        background: checked ? "var(--primary)" : "var(--card)",
        border: checked ? "1px solid var(--primary)" : "1.5px solid var(--border-strong)" }}>
        {checked && <Icon name="check" size={16} stroke={3} style={{ color: "var(--primary-foreground)" }} />}
      </span>
      <span className="font-semibold text-foreground" style={{ fontSize: 14 }}>{label}</span>
    </button>
  );
}

/* 예약 라벨: 상세필터 최상단 공통 검색어 — 스키마 filters와 무관하게 항상 노출.
   resolveFilterField를 타지 않고(휴리스틱이 tag로 오판 → 표 증발) rowMatchesFilters에서 특수 처리:
   행의 전 컬럼 부분일치(OR), 다른 필터와는 AND. */
export const SEARCH_LABEL = "검색어";

/* 값-필터 컨트롤 — kind별 입력(year/enum select · date · number · text).
   입력 폰트 14px(전 컨트롤 기본 사이즈로 통일), 색은 토큰(라이트/다크 양립). 빈 값 = 미적용.
   주의: <16px라 iOS Safari는 포커스 시 자동 줌인됨 — 14px 통일을 우선한 결과. */
const drawerInputStyle = (kind?: string): React.CSSProperties => ({
  // 폭은 fit-content(내용 맞춤, 2026-09-09), 하한은 타입별 controlMinWidth SSOT. font 단축속성 먼저 → fontSize 뒤(명시값이 단축을 이김, 패밀리만 상속).
  width: "fit-content", minWidth: controlMinWidth(kind), maxWidth: "100%", boxSizing: "border-box", padding: "9px 11px", font: "inherit", fontSize: 14,
  border: "1px solid var(--border-strong)", borderRadius: 9, background: "var(--card)", color: "var(--foreground)",
});

function DrawerFilterControl({ ff, value, onChange, onEnter }: { ff: FilterField; value: string; onChange: (v: string) => void; onEnter?: () => void }) {
  // Enter로 즉시 적용 — 한글 IME 조합 확정 Enter(isComposing)는 무시해 오적용 방지
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) onEnter?.(); };
  let control: React.ReactNode;
  if (ff.kind === "year" || ff.kind === "enum") {
    // Safari menulist는 세로 padding을 무시해 select가 input보다 낮게 렌더됨(WebKit 22 vs 37px).
    // appearance:none으로 높이를 맞추고, 사라진 네이티브 화살표는 chevron으로 보강. (date는 달력 아이콘 보존 위해 미적용)
    control = (
      // 래퍼도 fit-content — block 100% 래퍼면 절대배치 chevron이 드로어 오른쪽 끝으로 떨어진다
      <div className="relative" style={{ width: "fit-content", maxWidth: "100%" }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...drawerInputStyle("enum"), appearance: "none", WebkitAppearance: "none", paddingRight: 32 }}>
          <option value="">전체</option>
          {ff.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Icon name="chevron-down" size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
      </div>
    );
  } else if (ff.kind === "date") {
    // 일자선택 — shadcn Radix Calendar(Popover). 값은 'YYYY-MM-DD' 문자열 유지(정확일치 필터 계약). DatePicker 트리거는 w-full이라 fit-content 래퍼로 폭 규칙 적용.
    control = <div style={{ width: "fit-content", minWidth: controlMinWidth("date"), maxWidth: "100%" }}><DatePicker value={value} onChange={onChange} ariaLabel={ff.label} /></div>;
  } else if (ff.kind === "number") {
    control = <input type="number" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder="값 입력" style={drawerInputStyle("number")} />;
  } else {
    control = <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={ff.label + " 입력"} style={drawerInputStyle("text")} />;
  }
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 13, marginBottom: 6 }}>
        {ff.label}
        {/* 매칭 컬럼이 없어 더미데이터를 거를 수 없는 필터(조회 파라미터) — 무신호 no-op 방지 */}
        {!ff.columnKey && <span className="font-medium text-caption" style={{ marginLeft: 6 }}>· 데이터 연동 후 적용</span>}
      </span>
      {control}
    </label>
  );
}

/* ── 우측 슬라이드인: 스키마 기반 상세 필터 드로어 ──
   schema.filters 각 항목을 타입에 맞는 컨트롤로 노출한다 — 값-필터는 값 픽커, 카테고리는 on/off 토글.
   상태 SSOT = Record<라벨, 값>(빈 값=미적용). 적용 시 부모 filterValues를 갱신해 행을 실제 필터링한다.
   Portal로 body 직계 렌더(루트 dashFade transform의 영향 차단), 좁은 화면은 maxWidth 92vw로 축소. */
function ListFilterDrawer({ open, onClose, schema, applied, onApply }: {
  open: boolean; onClose: () => void; schema: PageSchema; applied: Record<string, string>; onApply: (next: Record<string, string>) => void;
}) {
  const filters = schema.filters ?? [];
  const [draft, setDraft] = useState<Record<string, string>>(() => ({ ...applied }));
  // 열릴 때마다 현재 활성 값으로 초기화 (툴바에서 칩 제거 등 외부 변경 반영)
  useEffect(() => { if (open) setDraft({ ...applied }); }, [open]);
  const setVal = (label: string, v: string) => setDraft((prev) => ({ ...prev, [label]: v }));
  const toggleTag = (label: string) => setDraft((prev) => {
    const next = { ...prev };
    next[label] ? delete next[label] : (next[label] = label);
    return next;
  });
  // 빈 값은 제거하고 적용 (미선택 필터는 비활성)
  const apply = () => { onApply(Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== ""))); onClose(); };
  // 입력 중 Enter = 필터 적용 (IME 조합 확정 Enter는 제외)
  const applyOnEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) apply(); };
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
        <SheetHeader>
          <SheetTitle>상세 필터</SheetTitle>
          <SheetDescription className="sr-only">목록을 조건으로 거르는 상세 필터</SheetDescription>
          <IconBtn icon="x" onClick={onClose} label="닫기" size={38} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px clamp(14px,3vw,20px)" }}>
          {/* 검색어 — 예약 라벨, opt-in(schema.searchable). 최상단 고정, 전 컬럼 부분일치 검색 */}
          {schema.searchable && (
            <label className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 13, marginBottom: 6 }}>{SEARCH_LABEL}</span>
              <input type="text" value={draft[SEARCH_LABEL] ?? ""} onChange={(e) => setVal(SEARCH_LABEL, e.target.value)} onKeyDown={applyOnEnter} placeholder="검색어 입력" style={drawerInputStyle("text")} />
            </label>
          )}
          {filters.length === 0 && !schema.searchable ? (
            <div className="text-caption text-center" style={{ fontSize: 13, padding: "28px 0" }}>설정 가능한 필터가 없습니다.</div>
          ) : (
            <>
              <div className="font-bold text-muted-foreground" style={{ fontSize: 13, marginBottom: 10 }}>필터 항목</div>
              <div className="flex flex-col">
                {filters.map((label) => {
                  const ff = resolveFilterField(label, schema);
                  return ff.kind === "tag"
                    ? <DrawerCheckRow key={label} label={label} checked={!!draft[label]} onClick={() => toggleTag(label)} />
                    : <DrawerFilterControl key={label} ff={ff} value={draft[label] ?? ""} onChange={(v) => setVal(label, v)} onEnter={apply} />;
                })}
              </div>
            </>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" size="md" onClick={() => setDraft({})}>초기화</Button>
          <Button variant="primary" size="md" style={{ flex: 1 }} onClick={apply}>필터 적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* 활성 필터(filterValues)로 행 1건의 통과 여부 판정.
   값-필터(year/enum/date/number/text)는 모두 AND, 카테고리 태그끼리는 합집합(OR).
   text/number는 부분일치(includes), 그 외(year/enum/date)는 정확일치. columnKey 미해결 필터는 무시(칩만). */
function rowMatchesFilters(row: Row, schema: PageSchema, filterValues: Record<string, string>): boolean {
  const active = Object.entries(filterValues).filter(([, v]) => v !== "");
  if (active.length === 0) return true;
  const tags: string[] = [];
  for (const [label, value] of active) {
    // 검색어(예약 라벨): 전 컬럼 부분일치(OR) — 휴리스틱(tag 오판) 우회, 다른 필터와는 AND
    if (label === SEARCH_LABEL) {
      const q = value.toLowerCase();
      const hit = schema.columns.some((c) => String((row as Record<string, unknown>)[c.key] ?? "").toLowerCase().includes(q))
        || row.category.toLowerCase().includes(q);
      if (!hit) return false;
      continue;
    }
    const ff = resolveFilterField(label, schema);
    if (ff.kind === "tag") { tags.push(label); continue; }
    if (!ff.columnKey) continue;
    const rv = String((row as Record<string, unknown>)[ff.columnKey] ?? "");
    const ok = ff.kind === "text" || ff.kind === "number"
      ? rv.toLowerCase().includes(value.toLowerCase())
      : rv === value;
    if (!ok) return false;
  }
  if (tags.length > 0 && !tags.includes(row.category)) return false;
  return true;
}

export function GenericListPage({ route, onNav }: { route: string; onNav: (r: string) => void }) {
  const { title, crumbs } = findMenuContext(route);
  const schema = resolveSchema(route);
  const editable = schema.fields.length > 0;
  const masked = useMask();   // Excel 우측정렬 숫자 셀의 마스킹 시 값을 0으로(실값 비노출)
  const apiRef = useRef<GridApi<Row> | null>(null);
  const [rows, setRows] = useState<Row[]>(() => makeRows(schema, 23));
  const [selCount, setSelCount] = useState(0);   // AG Grid 선택 행 수(수제 Set 선택 대체)
  // 상태 SSOT: 필터 라벨 → 선택값(빈 값/부재 = 비활성). 칩·행필터 모두 여기서 파생.
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 23 });   // AG Grid 페이지네이션 미러
  const [viewState, setView] = useState("list");
  // 카드뷰 미사용 스키마(hideCardView)는 SegTabs를 숨기고 리스트 뷰로 고정 — view === "list" 게이트가 모두 참이 된다
  const view = schema.hideCardView ? "list" : viewState;
  const [showAll, setShowAll] = useState(false);   // 전체보기 — 페이지 크기를 전체 행 수로 키워 한 페이지에 모두 표시
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: Row } | null>(null);
  /* 상단 kebab 가시성 — 뷰포트에서 벗어나면(스크롤) 푸터 kebab 폴백을 노출(골드 subfund_manage 동형) */
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [ctx, setCtx] = useState<CtxMenuState>(null);   // 우클릭 컨텍스트 메뉴 좌표·항목(null=닫힘)

  // 활성 필터로 행을 실제 필터링 → KPI·카드뷰·건수는 이 결과 기준
  // (그리드 리스트뷰는 external filter로 동일 술어를 적용 — 페이지네이션은 그리드가 소유).
  const filtered = rows.filter((r) => rowMatchesFilters(r, schema, filterValues));
  // 칩: filterValues에서 파생 (값-필터는 "라벨: 값", 카테고리 태그는 값 없이 라벨만)
  // 검색어(예약 라벨)는 휴리스틱이 tag로 오판하므로 값-칩으로 강제
  const chipItems = Object.entries(filterValues).map(([label, value]) => ({
    label, value: label !== SEARCH_LABEL && resolveFilterField(label, schema).kind === "tag" ? undefined : value,
  }));
  const removeFilter = (label: string) => setFilterValues((prev) => { const n = { ...prev }; delete n[label]; return n; });

  // 파생 KPI (필터 결과 기준)
  const sumAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const avgChange = filtered.length ? filtered.reduce((s, r) => s + r.change, 0) / filtered.length : 0;
  const avgUp = avgChange >= 0;
  // 건수형 KPI(schema.countKpis) — column+value 매칭 행 수, 없으면 전체. 값은 필터 결과 기준.
  const countKpiNodes = schema.countKpis?.map((k) => {
    const n = k.column && k.value != null
      ? filtered.filter((r) => String((r as Record<string, unknown>)[k.column!]) === k.value).length
      : filtered.length;
    return <KpiBadge key={k.label} icon={k.icon} color={k.color} label={k.label} value={mn(String(n)) + " 건"} />;
  });

  // ── AG Grid 연결 ──
  const onGridReady = useCallback((e: GridReadyEvent<Row>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<Row>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next)); // 값 동일 시 동일 참조 반환→재렌더 방지
  }, []);

  // 외부 필터(상세필터 드로어 → 그리드 행 거르기). 값이 바뀌면 그리드에 재적용 통지.
  const filterActive = Object.values(filterValues).some((v) => v !== "");
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [filterValues]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback(
    (node: IRowNode<Row>) => (node.data ? rowMatchesFilters(node.data, schema, filterValues) : true),
    [schema, filterValues]);

  // ── 스키마 주도 컬럼 정의 ──
  // 특수 컬럼(name=2줄 · trend=스파크라인)만 전용 cellRenderer, 그 외는 Cell 재사용(마스킹 내장).
  // 마지막 '관리' 컬럼은 editable일 때만 — 더블클릭 수정과 동일하게 수정 모달을 연다.
  const columnDefs = useMemo<ColDef<Row>[]>(() => {
    // 남는 그리드 폭을 채울 stretch 컬럼 = 주 식별/텍스트 컬럼(마지막 left-text, 또는 name).
    // 이 컬럼만 flex로 잔여폭 흡수 + autoSize 제외(fitCellContents가 폭을 고정하지 않도록) → 우측 빈 공간 제거.
    const textCols = schema.columns.filter((c) => (c.type === "text" || c.key === "name") && c.align !== "right" && c.key !== "trend");
    const stretchKey = textCols.length ? textCols[textCols.length - 1].key : undefined;
    const cols: ColDef<Row>[] = schema.columns.map((c): ColDef<Row> => {
      const stretch = c.key === stretchKey;
      if (c.key === "name") {
        return {
          field: "name", headerName: c.label,
          ...(stretch ? { flex: 1, minWidth: 200, suppressAutoSize: true } : { width: 240, minWidth: 180, maxWidth: 360 }),   // stretch면 잔여폭 흡수, 아니면 골드 subfund_manage 폭 규칙
          cellStyle: { display: "flex", flexDirection: "column", justifyContent: "center" },
          cellRenderer: (p: ICellRendererParams<Row>) => (
            <div className="min-w-0" style={{ lineHeight: 1.25 }}>
              <div className="font-semibold" style={{ fontSize: 13.5 }}><MT>{p.data?.name}</MT></div>
              <div className="text-muted-foreground" style={{ fontSize: 12 }}><MT>{p.data?.category}</MT></div>
            </div>
          ),
        };
      }
      if (c.key === "trend") {
        return {
          field: "trend", headerName: c.label, width: 120, minWidth: 120, sortable: false,   // 스파크라인 — 내용폭 측정이 좁으니 하한 고정
          cellDataType: false,   // 값은 number[](스파크라인) — 커스텀 렌더러라 타입 추론 불필요(AG Grid warning #48 억제)
          cellStyle: { display: "flex", alignItems: "center", textAlign: (c.align || "left") as any },
          cellRenderer: (p: ICellRendererParams<Row>) => <MT w={40}><MiniBars data={(p.value as number[]) || []} color={p.data?.color || "var(--chart-1)"} /></MT>,
        };
      }
      const right = c.align === "right";
      return {
        field: c.key as any, headerName: c.label + (c.unit ? ` (${c.unit})` : ""),   // 스키마 동적 키 — Row 정적 타입 밖
        ...(stretch ? { flex: 1, minWidth: 200, suppressAutoSize: true } : { minWidth: 110, maxWidth: 240 }),   // stretch면 잔여폭 흡수, 아니면 긴 텍스트 상한 캡
        type: right ? "rightAligned" : undefined,
        cellStyle: { display: "flex", alignItems: "center", textAlign: (c.align || "left") as any, ...(right ? { justifyContent: "flex-end" } : {}) },
        cellRenderer: (p: ICellRendererParams<Row>) => <Cell col={c} value={p.value} color={p.data?.color} statusDomain={schema.statusDomain} />,
      };
    });
    // '관리' 액션 컬럼 제거(2026-09-11) — 행 더블클릭(onRowDoubleClicked)이 수정 모달을 열어 기능 대체.
    return cols;
  }, [schema, editable]);

  // CRUD
  const save = (row: Row) => {
    const creating = modal?.mode === "create";
    setRows((prev) => creating
      ? [{ ...row, id: nextId() }, ...prev]
      : prev.map((r) => (r.id === row.id ? row : r)));
    setModal(null);
    toast.success(creating ? "항목이 등록되었습니다" : "항목이 수정되었습니다");
  };
  const deleteOne = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    apiRef.current?.deselectAll();
    setModal(null);
    toast.success("항목이 삭제되었습니다");
  };
  const bulkDelete = () => {
    const sel = apiRef.current?.getSelectedRows() ?? [];
    if (!sel.length) return;
    const ids = new Set(sel.map((r) => r.id));
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    apiRef.current?.deselectAll();
    toast.success(`${sel.length}개 항목을 삭제했습니다`);
  };

  // Excel(.xlsx) 내보내기 — SheetJS. 스키마 컬럼을 동적 추출(스파크라인 trend는 값 없음 → 제외), 현재 필터(filtered) 반영.
  // 화면 우측정렬(align:'right') 숫자 컬럼만 숫자 셀(t:'n'+z)로 기록 → Excel 자동 우측정렬·실데이터 연동 시 계산 가능.
  // 그 외(text/code/date/status·center 정렬)는 화면처럼 텍스트 셀(좌측). 마스크 ON이면 숫자 셀 값을 0으로 비노출.
  // ※ Excel은 center 정렬을 스타일 없이 못 내므로(커뮤니티 xlsx 한계) center 숫자 컬럼은 텍스트(좌측) 유지가 최선.
  const exportExcel = () => {
    const cols = schema.columns.filter((c) => c.key !== 'trend');
    const cell = (v: any) => mn(typeof v === 'number' ? v.toLocaleString() : String(v ?? ''));
    const zFmt = (v: number) => (Number.isInteger(v) ? '#,##0' : '#,##0.0');
    const isNum = (c: typeof cols[number], v: any) => c.align === 'right' && typeof v === 'number';   // 우측정렬 숫자 컬럼만
    const header = cols.map((c) => c.label + (c.unit ? ` (${c.unit})` : ''));
    const body = filtered.map((r) => cols.map((c) => {
      const v = (r as any)[c.key];
      return isNum(c, v) ? (masked ? 0 : v) : cell(v);
    }));
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    // 숫자 셀에 화면 포맷과 일치하는 숫자서식(z) 부여 (행: 헤더 다음=1부터)
    filtered.forEach((r, i) => cols.forEach((c, j) => {
      const v = (r as any)[c.key];
      if (!isNum(c, v)) return;
      const addr = XLSX.utils.encode_cell({ r: i + 1, c: j });
      if (ws[addr]) ws[addr].z = zFmt(v);
    }));
    ws['!cols'] = cols.map((c) => ({ wch: c.key === 'name' ? 22 : 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '목록');
    XLSX.writeFile(wb, `${title}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  /* 상단 kebab 가시성 관찰 — 뷰포트에서 벗어나면 푸터 kebab 폴백을 켠다(골드 subfund_manage 동형) */
  useEffect(() => {
    const el = topMoreRef.current;
    // 미지원 환경에선 관찰이 불가능하므로 폴백을 상시 노출(true로 두면 푸터 kebab이 영원히 안 떠 내보내기·인쇄 접근이 끊긴다)
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* 앱-스코프 단축키 — 등록 ⌘⏎(편집 가능 + 모달 닫힘일 때만)·인쇄 ⌘P·내보내기 ⌥D. 힌트는 kebab의 DropdownMenuShortcut */
  useHotkey(HOTKEYS.register.combo, () => setModal({ mode: 'create' }), { enabled: editable && modal === null && !filterOpen && ctx === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  // 행 복사 — 스키마 컬럼(스파크라인 trend 제외)을 TSV로. 마스크 ON이면 mn()으로 실값 비노출(엑셀과 동일 계약).
  const copyRow = (row: Row) => {
    const line = schema.columns.filter((c) => c.key !== 'trend')
      .map((c) => mn(String((row as any)[c.key] ?? ''))).join('\t');
    navigator.clipboard?.writeText(line).then(
      () => toast.success('행을 복사했습니다'),
      () => toast.error('복사에 실패했습니다'));
  };

  // 우클릭 컨텍스트 메뉴 — Community엔 내장 메뉴가 없어 onCellContextMenu(이벤트만 제공)로 직접 띄운다.
  // pinned 행(합계 등)·데이터 없는 셀은 제외. 항목은 기존 CRUD 핸들러 재사용.
  const handleCellContextMenu = (e: CellContextMenuEvent<Row>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [];
    if (editable) items.push({ label: '수정', icon: 'file', onSelect: () => setModal({ mode: 'edit', row }) });
    items.push({ label: '행 복사', icon: 'layers', onSelect: () => copyRow(row) });
    items.push({ label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel });
    if (editable) { items.push('sep'); items.push({ label: '삭제', icon: 'trash', danger: true, onSelect: () => deleteOne(row.id) }); }
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  // 전체보기 시 페이지 크기 = 전체 행 수 → total pages가 1이 되어 푸터 페이지네이션이 자동으로 숨는다
  const pageSize = showAll ? Math.max(rows.length, 1) : PER;
  // 푸터 건수 — 리스트뷰는 그리드 페이지 기준, 카드뷰는 필터 결과 기준
  const shown = view === "list" ? Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize)) : filtered.length;
  const totalForCount = view === "list" ? page.rowCount : filtered.length;

  return (
    <GridFrame
      crumbs={crumbs}
      title={title}
      favRoute={route}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav("main")}>메인으로</Button>}
      kpis={schema.hideKpis ? undefined : countKpiNodes ? <>{countKpiNodes}</> : schema.hideMetrics ? undefined : (<>
        <KpiBadge icon="trending" color="var(--chart-1)" label="평균 변동률"
          value={mn((avgUp ? "+" : "-") + Math.abs(avgChange).toFixed(1)) + "%"}
          valueColor={avgUp ? "var(--success-text)" : "var(--danger-text)"} />
        <KpiBadge icon="wallet" color="var(--accent)" label="합계 금액"
          value={"₩" + mn(Math.round(sumAmount / 100).toLocaleString()) + "억"} />
      </>)}
      toolbarLeft={selCount > 0 ? (
        <>
          <span className="font-semibold" style={{ fontSize: 13 }}>{selCount}건 선택됨</span>
          <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: "var(--danger)" }} onClick={bulkDelete}>선택 삭제</Button>
          <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
        </>
      ) : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {chipItems.map((c) => <FilterPill key={c.label} label={c.label} value={c.value} onRemove={() => removeFilter(c.label)} />)}
          {chipItems.length === 0 && <span className="text-caption" style={{ fontSize: 12.5 }}>필터 없음</span>}
        </>
      )}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {/* 등록 = 이 화면의 1차 액션. kebab 밖 독립 버튼(outline)으로 두어 보조 액션(ghost·아이콘)과 위계를 가른다.
            라벨은 도메인 액션명 그대로(스키마 entity — '공고 등록' 등), "등록"으로 줄이지 않는다.
            편집 가능한 스키마(fields 보유)에서만 노출. Tooltip으로 감싸지 않는다(UI.Button은 asChild 트리거 불가). */}
        {editable && (
          <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ mode: "create" })}>{schema.entity + " 등록"}</Button>
        )}
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={() => { setRows(makeRows(schema, 23)); apiRef.current?.deselectAll(); apiRef.current?.paginationGoToFirstPage(); }} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={'총 ' + mn(String(totalForCount)) + '개 중 ' + mn(String(shown)) + '개 항목 표시 중'}
      footerCenter={view === "list" && page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => i).map((i) => (
            <button key={i} onClick={() => apiRef.current?.paginationGoToPage(i)} aria-label={`${i + 1} 페이지`} aria-current={i === page.current ? "page" : undefined} style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid",
              borderColor: i === page.current ? "var(--primary)" : "var(--border)",
              background: i === page.current ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
              color: i === page.current ? "var(--primary)" : "var(--foreground)",
              font: "inherit", fontSize: 13, fontWeight: i === page.current ? 700 : 500, cursor: "pointer", transition: "all .12s",
            }}>{i + 1}</button>
          ))}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        {!schema.hideCardView && (
          <SegTabs size="sm" value={view} onChange={setView} options={[{ value: "list", label: "리스트 뷰" }, { value: "detail", label: "카드뷰" }]} />
        )}
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        {view === "list" && (
          <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        )}
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {/* 상단 kebab이 화면 밖일 때만 노출(스크롤 시 내보내기/인쇄 접근 유지). 등록은 툴바 버튼 + ⌘⏎로 접근 */}
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

        {/* 테이블 / 상세 뷰 (GridFrame children) */}
        {view === "list" ? (
          /* AG Grid 본체 — 스키마 주도 컬럼 + 체크박스 선택 + 페이지네이션 + external filter.
             더블클릭=수정 모달(editable 한정). 행선택 배경은 공유 테마의 --row-selected(회색). */
          <div>
            <AgGridReact<Row>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={columnDefs}
              getRowId={(p) => p.data.id}
              domLayout="autoHeight"
              autoSizeStrategy={AUTO_SIZE_CONTENT}   // 컬럼 폭=내용 폭(첫 렌더 1회). columnDefs flex 제거가 전제. 골드 subfund_manage와 동일
              rowHeight={44}
              defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
              rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true }}
              pagination
              paginationPageSize={pageSize}
              paginationPageSizeSelector={false}
              suppressPaginationPanel
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
              onPaginationChanged={onPaginationChanged}
              onRowDoubleClicked={editable ? (e) => e.data && setModal({ mode: "edit", row: e.data }) : undefined}
              onCellKeyDown={editable ? (e: CellKeyDownEvent<Row>) => {
                // 관리 컬럼 제거 대체 — 키보드로 행에서 Enter 시 수정 모달(더블클릭과 동일). 선택 체크박스 컬럼은 Enter=선택 토글 유지.
                const ke = e.event as KeyboardEvent | null;
                if (!ke || ke.key !== "Enter" || !e.data) return;
                if ((e.column?.getColId?.() ?? "").startsWith("ag-Grid")) return;
                setModal({ mode: "edit", row: e.data });
              } : undefined}
              preventDefaultOnContextMenu
              onCellContextMenu={handleCellContextMenu}
              overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">표시할 항목이 없습니다</span>'}
            />
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))", padding: 18 }}>
            {filtered.map((r) => (
              <button key={r.id} onClick={editable ? () => setModal({ mode: "edit", row: r }) : undefined}
                className="text-left border border-border bg-card flex flex-col gap-2.5 p-3.5"
                style={{ borderRadius: 12, cursor: editable ? "pointer" : "default", font: "inherit" }}>
                <div className="flex items-center gap-2.5">
                  <ColorChip icon={r.icon} color={r.color} size={36} iconSize={18} />
                  <div className="min-w-0">
                    <div className="font-semibold" style={{ fontSize: 13.5 }}><MT>{r.name}</MT></div>
                    <div className="text-muted-foreground" style={{ fontSize: 12 }}><MT>{r.category}</MT></div>
                  </div>
                </div>
                {!schema.hideMetrics && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="tabular font-bold" style={{ fontSize: 15 }}>{mn(r.amount.toLocaleString())}</span>
                      <DeltaBadge value={r.change} />
                    </div>
                    <StatusBadge tone={statusTone(r.status)} label={r.status} size="sm" />
                  </>
                )}
              </button>
            ))}
          </div>
        )}

      {modal && (
        <RowFormModal
          mode={modal.mode}
          initial={modal.row}
          schema={schema}
          onSave={save}
          onClose={() => setModal(null)}
          onDelete={modal.row ? () => deleteOne(modal.row!.id) : undefined} />
      )}

      <ListFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        schema={schema}
        applied={filterValues}
        onApply={(next) => { setFilterValues(next); apiRef.current?.paginationGoToFirstPage(); }} />

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />
    </GridFrame>
  );
}
