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
import { Cell } from './schemas/renderers';
import { resolveFilterField, YEAR_OPTIONS } from './schemas/filter_field';
import type { FilterField } from './schemas/filter_field';
import type { PageSchema } from './schemas/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { toast } from './ui/sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import * as XLSX from 'xlsx';   // SheetJS — 클라이언트 전용 .xlsx 생성(쓰기 전용: XLSX.read 미사용 → 알려진 파싱 CVE 비해당)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, ICellRendererParams, IRowNode } from 'ag-grid-community';
import { apfsTheme } from './aggrid_theme';   // 공유 테마(회색 행선택) SSOT
import './aggrid_shared.css';
import { GridFrame, KpiBadge } from './grid_frame';   // 공통 양식 셸 + KPI 배지(apfs-grid 스킬 SSOT)

const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { Button, StatusBadge, IconBtn, ColorChip, SegTabs, DeltaBadge } = UI;
const D = APFS_DATA;

/* MENU를 재귀 탐색해 route와 일치하는 항목의 제목·breadcrumb·상위 레이블을 반환 */
function findMenuContext(route: string): { title: string; crumbs: string[]; parent?: string } {
  for (const top of D.MENU) {
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

function makeRows(schema: PageSchema, n: number): Row[] {
  return Array.from({ length: n }, (_, i) => {
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
    const extra: Record<string, unknown> = {};
    for (const c of schema.columns) {
      if (['name', 'amount', 'change', 'status', 'trend'].includes(c.key)) continue;
      const field = schema.fields.find((f) => f.key === c.key);
      if (field?.control === 'select' && field.options?.length) {
        extra[c.key] = field.options[i % field.options.length];     // enum 도메인 시드 → 상세필터 매칭 성립
      } else if (/(년도|연도)/.test(c.label)) {
        extra[c.key] = YEAR_OPTIONS[i % YEAR_OPTIONS.length];        // 년도 도메인 시드 → year 필터 매칭
      } else if (c.type === 'amount' || c.type === 'number' || c.type === 'rate') {
        extra[c.key] = (i + 1) * 100 + (i * 7) % 90;
      } else {
        extra[c.key] = c.label + ' ' + String(i + 1).padStart(3, '0');
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

/* 제거 가능한 필터 칩 — 라벨(평문 UI 라벨) + 선택값(데이터 → MT 마스킹). 태그형은 값 없음. */
function FilterPill({ label, value, onRemove }: { label: string; value?: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: "5px 8px 5px 11px", borderRadius: 9, fontSize: 12.5, background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
      <span className="inline-flex items-center gap-1">
        <span>{label}{value ? ":" : ""}</span>
        {value ? <MT>{value}</MT> : null}
      </span>
      <button onClick={onRemove} aria-label={label + " 필터 제거"} className="inline-flex border-0 cursor-pointer p-0" style={{ background: "transparent", color: "inherit" }}>
        <Icon name="x" size={13} stroke={2.4} />
      </button>
    </span>
  );
}

/* ===== 더보기 드롭다운 메뉴 (kebab) — Radix DropdownMenu(키보드 내비·menuitem 시맨틱) ===== */
function MoreMenu({ onRegister, onExport, editable }: { onRegister: () => void; onExport: () => void; editable: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="더보기"
        className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
        style={{ width: 34, height: 34 }}>
        <Icon name="more" size={20} stroke={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {editable && (
          <>
            <DropdownMenuItem onSelect={onRegister}>
              <Icon name="plus" size={17} className="shrink-0 text-muted-foreground" />등록
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={onExport}>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Icon name="file" size={17} className="shrink-0 text-muted-foreground" /><MT>인쇄</MT>
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

/* 값-필터 컨트롤 — kind별 입력(year/enum select · date · number · text).
   입력 폰트 14px(전 컨트롤 기본 사이즈로 통일), 색은 토큰(라이트/다크 양립). 빈 값 = 미적용.
   주의: <16px라 iOS Safari는 포커스 시 자동 줌인됨 — 14px 통일을 우선한 결과. */
const drawerInputStyle: React.CSSProperties = {
  // font 단축속성을 먼저(Pretendard 상속) → fontSize를 뒤에: 명시값이 단축속성을 이김.
  width: "100%", boxSizing: "border-box", padding: "9px 11px", font: "inherit", fontSize: 14,
  border: "1px solid var(--border-strong)", borderRadius: 9, background: "var(--card)", color: "var(--foreground)",
};

function DrawerFilterControl({ ff, value, onChange }: { ff: FilterField; value: string; onChange: (v: string) => void }) {
  let control: React.ReactNode;
  if (ff.kind === "year" || ff.kind === "enum") {
    // Safari menulist는 세로 padding을 무시해 select가 input보다 낮게 렌더됨(WebKit 22 vs 37px).
    // appearance:none으로 높이를 맞추고, 사라진 네이티브 화살표는 chevron으로 보강. (date는 달력 아이콘 보존 위해 미적용)
    control = (
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...drawerInputStyle, appearance: "none", WebkitAppearance: "none", paddingRight: 32 }}>
          <option value="">전체</option>
          {ff.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Icon name="chevron-down" size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
      </div>
    );
  } else if (ff.kind === "date") {
    control = <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={drawerInputStyle} />;
  } else if (ff.kind === "number") {
    control = <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="값 입력" style={drawerInputStyle} />;
  } else {
    control = <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={ff.label + " 입력"} style={drawerInputStyle} />;
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
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
        <SheetHeader>
          <SheetTitle>상세 필터</SheetTitle>
          <SheetDescription className="sr-only">목록을 조건으로 거르는 상세 필터</SheetDescription>
          <IconBtn icon="x" onClick={onClose} label="닫기" size={38} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px clamp(14px,3vw,20px)" }}>
          {filters.length === 0 ? (
            <div className="text-caption text-center" style={{ fontSize: 13, padding: "28px 0" }}>설정 가능한 필터가 없습니다.</div>
          ) : (
            <>
              <div className="font-bold text-muted-foreground" style={{ fontSize: 13, marginBottom: 10 }}>필터 항목</div>
              <div className="flex flex-col">
                {filters.map((label) => {
                  const ff = resolveFilterField(label, schema);
                  return ff.kind === "tag"
                    ? <DrawerCheckRow key={label} label={label} checked={!!draft[label]} onClick={() => toggleTag(label)} />
                    : <DrawerFilterControl key={label} ff={ff} value={draft[label] ?? ""} onChange={(v) => setVal(label, v)} />;
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
  const [view, setView] = useState("list");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: Row } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // 활성 필터로 행을 실제 필터링 → KPI·카드뷰·건수는 이 결과 기준
  // (그리드 리스트뷰는 external filter로 동일 술어를 적용 — 페이지네이션은 그리드가 소유).
  const filtered = rows.filter((r) => rowMatchesFilters(r, schema, filterValues));
  // 칩: filterValues에서 파생 (값-필터는 "라벨: 값", 카테고리 태그는 값 없이 라벨만)
  const chipItems = Object.entries(filterValues).map(([label, value]) => ({
    label, value: resolveFilterField(label, schema).kind === "tag" ? undefined : value,
  }));
  const removeFilter = (label: string) => setFilterValues((prev) => { const n = { ...prev }; delete n[label]; return n; });

  // 파생 KPI (필터 결과 기준)
  const sumAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const avgChange = filtered.length ? filtered.reduce((s, r) => s + r.change, 0) / filtered.length : 0;
  const avgUp = avgChange >= 0;

  // ── AG Grid 연결 ──
  const onGridReady = useCallback((e: GridReadyEvent<Row>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<Row>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    setPage({ current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() });
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
    const cols: ColDef<Row>[] = schema.columns.map((c): ColDef<Row> => {
      if (c.key === "name") {
        return {
          field: "name", headerName: c.label, flex: 2, minWidth: 180,
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
          field: "trend", headerName: c.label, width: 120, sortable: false,
          cellStyle: { display: "flex", alignItems: "center", textAlign: (c.align || "left") as any },
          cellRenderer: (p: ICellRendererParams<Row>) => <MT w={40}><MiniBars data={(p.value as number[]) || []} color={p.data?.color || "var(--chart-1)"} /></MT>,
        };
      }
      const right = c.align === "right";
      return {
        field: c.key as any, headerName: c.label + (c.unit ? ` (${c.unit})` : ""),   // 스키마 동적 키 — Row 정적 타입 밖
        flex: 1, minWidth: 110, type: right ? "rightAligned" : undefined,
        cellStyle: { display: "flex", alignItems: "center", textAlign: (c.align || "left") as any, ...(right ? { justifyContent: "flex-end" } : {}) },
        cellRenderer: (p: ICellRendererParams<Row>) => <Cell col={c} value={p.value} color={p.data?.color} statusDomain={schema.statusDomain} />,
      };
    });
    if (editable) {
      cols.push({
        headerName: "관리", colId: "__manage", width: 76, pinned: "right", sortable: false, resizable: false,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (p: ICellRendererParams<Row>) => (
          <MT w={20}><IconBtn icon="file" label={(p.data?.name || "") + " 상세·수정"} size={32} onClick={() => p.data && setModal({ mode: "edit", row: p.data })} /></MT>
        ),
      });
    }
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

  // 푸터 건수 — 리스트뷰는 그리드 페이지 기준, 카드뷰는 필터 결과 기준
  const shown = view === "list" ? Math.min(PER, Math.max(0, page.rowCount - page.current * PER)) : filtered.length;
  const totalForCount = view === "list" ? page.rowCount : filtered.length;

  return (
    <GridFrame
      crumbs={crumbs}
      title={title}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav("main")}>메인으로</Button>}
      kpis={<>
        <KpiBadge icon="trending" color="var(--chart-1)" label="평균 변동률"
          value={mn((avgUp ? "+" : "-") + Math.abs(avgChange).toFixed(1)) + "%"}
          valueColor={avgUp ? "var(--success)" : "var(--danger)"} />
        <KpiBadge icon="wallet" color="var(--accent)" label="합계 금액"
          value={"₩" + mn(Math.round(sumAmount / 100).toLocaleString()) + "억"} />
      </>}
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
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={() => { setRows(makeRows(schema, 23)); apiRef.current?.deselectAll(); apiRef.current?.paginationGoToFirstPage(); }} />
        <MoreMenu onRegister={() => setModal({ mode: "create" })} onExport={exportExcel} editable={editable} />
      </>}
      footerLeft={'총 ' + mn(String(totalForCount)) + '개 중 ' + mn(String(shown)) + '개 항목 표시 중'}
      footerCenter={view === "list" && page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => i).map((i) => (
            <button key={i} onClick={() => apiRef.current?.paginationGoToPage(i)} style={{
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
        <SegTabs size="sm" value={view} onChange={setView} options={[{ value: "list", label: "리스트 뷰" }, { value: "detail", label: "카드뷰" }]} />
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="external" label="새 창" size={32} />
        <IconBtn icon="more" label="더보기" size={32} />
      </>}>

        {/* 테이블 / 상세 뷰 (GridFrame children) */}
        {view === "list" ? (
          /* AG Grid 본체 — 스키마 주도 컬럼 + 체크박스 선택 + 페이지네이션 + external filter.
             더블클릭=수정 모달(editable 한정). 행선택 배경은 공유 테마의 --row-selected(회색). */
          <div style={{ padding: "0 2px 2px" }}>
            <AgGridReact<Row>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={columnDefs}
              getRowId={(p) => p.data.id}
              domLayout="autoHeight"
              rowHeight={52}
              defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
              rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true }}
              pagination
              paginationPageSize={PER}
              suppressPaginationPanel
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
              onPaginationChanged={onPaginationChanged}
              onRowDoubleClicked={editable ? (e) => e.data && setModal({ mode: "edit", row: e.data }) : undefined}
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
                <div className="flex items-center justify-between">
                  <span className="tabular font-bold" style={{ fontSize: 15 }}>{mn(r.amount.toLocaleString())}</span>
                  <DeltaBadge value={r.change} />
                </div>
                <StatusBadge tone={statusTone(r.status)} label={r.status} size="sm" />
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
    </GridFrame>
  );
}
