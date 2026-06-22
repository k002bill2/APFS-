/* 일반 리스트 페이지 — 전용 구현이 없는 모든 메뉴 항목의 기본(폴백) 화면.
   레이아웃: KPI 배지 · 필터 칩 툴바 · CRUD 테이블 · 페이지네이션 · 하단 요약 2-카드.
   route 값(한글 레이블 또는 경로)으로 제목·브레드크럼을 자동 구성. */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';
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

const { useState, useEffect } = React;
const { PageHeader } = Shell;
const { Card, Button, StatusBadge, IconBtn, ColorChip, SegTabs, DeltaBadge } = UI;
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

/* 헤더 우측 KPI 배지 (라벨/값 마스킹) */
function KpiBadge({ icon, color, label, value, valueColor }: { icon: string; color: string; label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div className="flex items-center gap-2.5 border border-border bg-card py-1.5 px-3.5" style={{ borderRadius: 12 }}>
      <ColorChip icon={icon} color={color} size={30} iconSize={16} />
      <div className="flex flex-col" style={{ gap: 1, lineHeight: 1.2 }}>
        <span className="font-semibold text-caption" style={{ fontSize: 11 }}><MT>{label}</MT></span>
        <span className="tabular font-extrabold" style={{ fontSize: 14, color: valueColor || "var(--foreground)" }}>{value}</span>
      </div>
    </div>
  );
}

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
function MoreMenu({ onRegister, editable }: { onRegister: () => void; editable: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="더보기"
        className="inline-flex items-center justify-center rounded-card-sm text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
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
        <DropdownMenuItem>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" /><MT>내보내기</MT>
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
        {checked && <Icon name="check" size={16} stroke={3} style={{ color: "#fff" }} />}
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
    control = (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={drawerInputStyle}>
        <option value="">전체</option>
        {ff.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
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
  const [rows, setRows] = useState<Row[]>(() => makeRows(schema, 23));
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  // 상태 SSOT: 필터 라벨 → 선택값(빈 값/부재 = 비활성). 칩·행필터 모두 여기서 파생.
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [view, setView] = useState("list");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: Row } | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  // 활성 필터로 행을 실제 필터링 → 표·KPI·페이지네이션 모두 필터 결과 기준
  const filtered = rows.filter((r) => rowMatchesFilters(r, schema, filterValues));
  // 칩: filterValues에서 파생 (값-필터는 "라벨: 값", 카테고리 태그는 값 없이 라벨만)
  const chipItems = Object.entries(filterValues).map(([label, value]) => ({
    label, value: resolveFilterField(label, schema).kind === "tag" ? undefined : value,
  }));
  const removeFilter = (label: string) => setFilterValues((prev) => { const n = { ...prev }; delete n[label]; return n; });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER));
  const curPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((curPage - 1) * PER, curPage * PER);

  // 파생 KPI (필터 결과 기준)
  const sumAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const avgChange = total ? filtered.reduce((s, r) => s + r.change, 0) / total : 0;
  const avgUp = avgChange >= 0;

  // 선택 토글
  const toggleRow = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) pageRows.forEach((r) => next.delete(r.id));
    else pageRows.forEach((r) => next.add(r.id));
    return next;
  });

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
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setModal(null);
    toast.success("항목이 삭제되었습니다");
  };
  const bulkDelete = () => {
    const n = selected.size;
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
    if (n) toast.success(`${n}개 항목을 삭제했습니다`);
  };

  const cellPad = "11px 14px";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", animation: "dashFade .3s var(--ease) both" }}>
      <PageHeader
        crumbs={crumbs}
        title={title}
        actions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav("main")}>메인으로</Button>} />

      {/* ── 메인 리스트 카드 ── */}
      <Card pad={0} className="overflow-hidden">
        {/* 카드 헤더: 타이틀 + KPI 배지 */}
        <div className="flex items-center justify-between gap-4 flex-wrap" style={{ padding: "6px 18px" }}>
          <h3 className="font-bold" style={{ fontSize: 20 }}>{title}</h3>
          <div className="flex gap-2.5 flex-wrap">
            <KpiBadge icon="trending" color="var(--chart-1)" label="평균 변동률"
              value={mn((avgUp ? "+" : "-") + Math.abs(avgChange).toFixed(1)) + "%"}
              valueColor={avgUp ? "var(--success)" : "var(--danger)"} />
            <KpiBadge icon="wallet" color="var(--accent)" label="합계 금액"
              value={"₩" + mn(Math.round(sumAmount / 100).toLocaleString()) + "억"} />
          </div>
        </div>

        {/* 툴바: 필터 칩 / 선택 액션 */}
        <div className="flex items-center justify-between gap-3 border-t border-b border-border flex-wrap" style={{ padding: "10px 18px", background: "color-mix(in srgb, var(--muted) 35%, transparent)" }}>
          {selected.size > 0 ? (
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-semibold" style={{ fontSize: 13 }}>{selected.size}건 선택됨</span>
              <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: "var(--danger)" }} onClick={bulkDelete}>선택 삭제</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>선택 해제</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <Icon name="filter" size={16} className="text-caption" />
              {chipItems.map((c) => <FilterPill key={c.label} label={c.label} value={c.value} onRemove={() => removeFilter(c.label)} />)}
              {chipItems.length === 0 && <span className="text-caption" style={{ fontSize: 12.5 }}>필터 없음</span>}
            </div>
          )}
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
            <IconBtn icon="refresh" label="새로고침" size={34} onClick={() => { setRows(makeRows(schema, 23)); setSelected(new Set()); setPage(1); }} />
            <MoreMenu onRegister={() => setModal({ mode: "create" })} editable={editable} />
          </div>
        </div>

        {/* 테이블 / 상세 뷰 */}
        {view === "list" ? (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 780 }}>
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--muted) 55%, transparent)" }}>
                  <th className="border-b border-border" style={{ padding: cellPad, width: 44 }}>
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="전체 선택" className="cursor-pointer" style={{ accentColor: "var(--primary)", width: 17, height: 17 }} />
                  </th>
                  {schema.columns.map((c) => (
                    <th key={c.key} className="font-bold text-caption whitespace-nowrap border-b border-border" style={{ padding: cellPad, textAlign: (c.align || 'left') as any, fontSize: 12 }}>
                      {c.label}{c.unit ? ` (${c.unit})` : ''}
                    </th>
                  ))}
                  <th className="text-right font-bold text-caption whitespace-nowrap border-b border-border" style={{ padding: cellPad, width: 56, fontSize: 12 }}>{editable ? "관리" : ""}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const sel = selected.has(r.id);
                  return (
                    <tr key={r.id}
                      className="border-b border-border cursor-pointer"
                      style={{ background: sel ? "color-mix(in srgb, var(--primary) 6%, transparent)" : undefined, transition: "background .12s" }}
                      title={editable ? "클릭하여 선택 · 더블클릭하여 상세·수정" : "클릭하여 선택"}
                      onClick={() => toggleRow(r.id)}
                      onDoubleClick={editable ? () => setModal({ mode: "edit", row: r }) : undefined}
                      onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "color-mix(in srgb, var(--muted) 40%, transparent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = sel ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent"; }}>
                      <td style={{ padding: cellPad }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleRow(r.id)} onClick={(e) => e.stopPropagation()} aria-label={r.name + " 선택"} className="cursor-pointer" style={{ accentColor: "var(--primary)", width: 17, height: 17 }} />
                      </td>
                      {schema.columns.map((c) => {
                        if (c.key === 'name') {
                          return (
                            <td key={c.key} style={{ padding: cellPad }}>
                              <div className="min-w-0">
                                <div className="font-semibold" style={{ fontSize: 13.5 }}><MT>{r.name}</MT></div>
                                <div className="text-muted-foreground" style={{ fontSize: 12, marginTop: 1 }}><MT>{r.category}</MT></div>
                              </div>
                            </td>
                          );
                        }
                        if (c.key === 'trend') {
                          return (
                            <td key={c.key} style={{ padding: cellPad, textAlign: (c.align || 'left') as any }}>
                              <MT w={40}><MiniBars data={r.trend} color={r.color} /></MT>
                            </td>
                          );
                        }
                        if (c.type === 'status') {
                          return (
                            <td key={c.key} style={{ padding: cellPad, textAlign: (c.align || 'left') as any }}>
                              <MT w={48}><Cell col={c} value={(r as any)[c.key]} color={r.color} statusDomain={schema.statusDomain} /></MT>
                            </td>
                          );
                        }
                        const isAmount = c.type === 'amount';
                        return (
                          <td key={c.key} style={{ padding: cellPad, textAlign: (c.align || 'left') as any, whiteSpace: isAmount ? 'nowrap' : undefined, fontSize: isAmount ? 13.5 : undefined, fontWeight: isAmount ? 600 : undefined }} className={isAmount ? "tabular" : undefined}>
                            <Cell col={c} value={(r as any)[c.key]} color={r.color} statusDomain={schema.statusDomain} />
                          </td>
                        );
                      })}
                      <td className="text-right" style={{ padding: cellPad }}>
                        {editable && <MT w={20}><IconBtn icon="file" label={r.name + " 상세·수정"} size={32} /></MT>}
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr><td colSpan={schema.columns.length + 2} className="text-center text-caption" style={{ padding: "48px 0", fontSize: 13 }}>
                    <Icon name="inbox" size={28} stroke={1.7} className="mt-0 mb-2 mx-auto" />표시할 항목이 없습니다
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))", padding: 18 }}>
            {pageRows.map((r) => (
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

        {/* 푸터: 건수 · 페이지네이션 · 뷰 토글 · 내보내기 */}
        <div className="flex items-center justify-between gap-3 border-t border-border flex-wrap" style={{ padding: "12px 18px" }}>
          <span className="text-caption" style={{ fontSize: 12.5 }}>총 {mn(String(total))}개 중 {mn(String(pageRows.length))}개 항목 표시 중</span>
          <div className="flex items-center gap-1">
            <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => setPage((p) => Math.max(1, p - 1))} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid",
                borderColor: p === curPage ? "var(--primary)" : "var(--border)",
                background: p === curPage ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                color: p === curPage ? "var(--primary)" : "var(--foreground)",
                font: "inherit", fontSize: 13, fontWeight: p === curPage ? 700 : 500, cursor: "pointer", transition: "all .12s",
              }}>{p}</button>
            ))}
            <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <SegTabs size="sm" value={view} onChange={setView} options={[{ value: "list", label: "리스트 뷰" }, { value: "detail", label: "상세 뷰" }]} />
            <IconBtn icon="download" label="다운로드" size={32} />
            <IconBtn icon="external" label="새 창" size={32} />
            <IconBtn icon="more" label="더보기" size={32} />
          </div>
        </div>
      </Card>

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
        onApply={(next) => { setFilterValues(next); setPage(1); }} />
    </div>
  );
}
