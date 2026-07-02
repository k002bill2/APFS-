/* 투자 성과·포트폴리오 서브페이지 — 첨부 디자인(테이블 + 하단 2카드) 스타일.
   APFS 인디고/블루 토큰 + Tailwind 유틸리티.
   claude.ai/design 프로젝트 dash/performance.js 충실 포팅(행 선택·더보기 메뉴·등록 모달 포함). */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { Shell } from './shell';
import { APFS_DATA } from './data';
import { mn, MT, useMask } from './mask';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, ICellRendererParams, IRowNode } from 'ag-grid-community';
import { apfsTheme } from './aggrid_theme';   // 공유 테마(회색 행선택) SSOT
import './aggrid_shared.css';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS — 클라이언트 전용 .xlsx 생성(쓰기 전용: XLSX.read 미사용 → 알려진 파싱 CVE 비해당)

const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { Button, StatusBadge, FilterChip, SegTabs, IconBtn, ColorChip } = UI;
const { PageHeader } = Shell;
const D = APFS_DATA;
const cx = (...a) => a.filter(Boolean).join(" ");

/* 포트폴리오 행 — 안정 _id 부여(선택삭제용; code는 'NEW' 추가 시 중복 가능해 부적합) */
type PRow = (typeof D.PORTFOLIO)[number] & { _id: string };
let SEQ = 0;
const withId = (r: (typeof D.PORTFOLIO)[number]): PRow => ({ ...r, _id: "P" + (++SEQ) });

/* 막대형 스파크라인 (성과 이력) — 최근 5칸, 낮은 높이 */
function BarSpark({ data, color = "var(--chart-1)", up = true }) {
  const bars = data.slice(-5);
  const max = Math.max(...bars);
  const c = up ? color : "var(--muted-foreground)";
  return (
    <div className="flex items-end gap-[3px] h-[10px]" aria-hidden={true}>
      {bars.map((v, i) => (
        <span
          key={i}
          className="w-[5px] rounded-[2px] inline-block"
          style={{
            height: Math.max(30, (v / max) * 100) + "%",
            background: c,
            opacity: 0.45 + (i / (bars.length - 1)) * 0.55,
          }}
        />
      ))}
    </div>
  );
}

/* 상단 요약 스탯 pill */
function StatPill({ icon, label, value, tone }: { icon?: string; label?: React.ReactNode; value?: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-card border border-border bg-card px-3.5 py-2 shadow-sm">
      <ColorChip icon={icon} color={tone || "var(--primary)"} size={30} iconSize={16} />
      <div className="leading-tight">
        <div className="t-caption text-[11px]"><MT>{label}</MT></div>
        <div className="text-[15px] font-bold tabular" style={tone ? { color: tone } : undefined}>{mn(value)}</div>
      </div>
    </div>
  );
}

/* ===== 우측 슬라이드인: 상세 필터 드로어 (이미지 사양) ===== */
function CheckRow({ label, checked, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={checked}
      className="flex items-center gap-3 w-full text-left cursor-pointer bg-transparent border-0 py-2">
      <span
        className="inline-flex items-center justify-center shrink-0 transition-all duration-150"
        style={{
          width: 26, height: 26, borderRadius: 7,
          background: checked ? "var(--brand-blue)" : "var(--card)",
          border: checked ? "1px solid var(--brand-blue)" : "1.5px solid var(--border-strong)",
        }}>
        {checked && <Icon name="check" size={17} stroke={3} style={{ color: "var(--on-brand-solid)" }} />}
      </span>
      <span className="text-[14px] font-semibold text-foreground">{label}</span>
    </button>
  );
}

function FilterDrawer({ open, onClose, onApply, applied }) {
  const ASSETS = ["주식", "채권", "실물 자산", "사모 펀드"];
  const [q, setQ] = useState(applied.q || "");   // 검색어 — 전 컬럼 부분일치(실제 행 필터)
  const [sel, setSel] = useState(applied.assets);
  const [risk, setRisk] = useState(applied.risk == null ? 50 : applied.risk);
  // riskOn: 슬라이더는 "off" 상태가 없으므로(항상 위치값) 활성 여부를 별도로 추적.
  // 미활성으로 열고 슬라이더를 안 건드린 채 적용하면 risk 필터가 제멋대로 켜지는 것 방지.
  const [riskOn, setRiskOn] = useState(applied.risk != null);
  const [period, setPeriod] = useState(applied.period || "당기 회계연도");
  const toggle = (a) => setSel((s) => ({ ...s, [a]: !s[a] }));
  // 드로어가 열릴 때마다 현재 적용된 필터로 초기화 (칩 제거 등 외부 변경 반영)
  useEffect(() => {
    if (open) {
      setQ(applied.q || "");
      setSel(applied.assets);
      setRisk(applied.risk == null ? 50 : applied.risk);
      setRiskOn(applied.risk != null);
      setPeriod(applied.period || "당기 회계연도");
    }
  }, [open]);

  const apply = () => onApply({ q: q.trim() || null, assets: sel, risk: riskOn ? risk : null, period });
  // 입력 중 Enter = 필터 적용 (한글 IME 조합 확정 Enter는 제외)
  const applyOnEnter = (e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) apply(); };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
        <SheetHeader className="px-6">
          <SheetTitle>포트폴리오 상세 필터</SheetTitle>
          <SheetDescription className="sr-only">자산 유형·리스크 노출도·기간으로 포트폴리오를 거르는 필터</SheetDescription>
          <IconBtn icon="x" onClick={onClose} label="닫기" size={38} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col" style={{ gap: 26 }}>
          {/* 검색어 — 모든 상세필터 공통 최상단. 자산 코드·명·구분·리스크 부분일치 */}
          <div>
            <div className="text-[13px] font-bold mb-2 text-muted-foreground">검색어</div>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={applyOnEnter}
              placeholder="검색어 입력"
              className="w-full text-[14px] text-foreground bg-card"
              style={{ boxSizing: "border-box", padding: "10px 13px", fontFamily: "inherit", outline: "none", border: "1px solid var(--border-strong)", borderRadius: 10 }}
            />
          </div>
          <div>
            <div className="text-[13px] font-bold mb-2 text-muted-foreground">자산 유형
              <span className="font-medium text-caption ml-1.5">· 데이터 연동 후 적용</span></div>
            <div className="flex flex-col">
              {ASSETS.map((a) => <CheckRow key={a} label={a} checked={!!sel[a]} onClick={() => toggle(a)} />)}
            </div>
          </div>
          <div>
            <div className="text-[13px] font-bold mb-3 text-muted-foreground">리스크 노출도
              {!riskOn && <span className="font-medium text-caption ml-1.5">· 미적용 (슬라이더 조정 시 적용)</span>}</div>
            <input
              type="range"
              min={0}
              max={100}
              value={risk}
              onChange={(e) => { setRisk(+e.target.value); setRiskOn(true); }}
              className="apfs-range w-full"
              style={{ accentColor: "var(--brand-blue)" }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[12.5px] font-semibold text-muted-foreground">보수적</span>
              <span className="text-[12.5px] font-semibold text-muted-foreground">공격적</span>
            </div>
          </div>
          <div>
            <div className="text-[13px] font-bold mb-2.5 text-muted-foreground">기간 설정
              <span className="font-medium text-caption ml-1.5">· 데이터 연동 후 적용</span></div>
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full text-[16px] font-semibold cursor-pointer appearance-none text-foreground bg-card border border-border"
                style={{
                  borderRadius: 10, padding: "11px 44px 11px 14px", fontFamily: "inherit", outline: "none",
                }}>
                {["당기 회계연도", "전기 회계연도", "최근 1년", "최근 3년", "설정 기간"].map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <Icon
                name="chevron-down"
                size={20}
                className="absolute right-3.5 pointer-events-none text-muted-foreground"
                style={{ top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          </div>
        </div>
        <SheetFooter className="px-6 py-5">
          <Button variant="outline" size="md" onClick={() => { setQ(""); setSel({}); setRisk(50); setRiskOn(false); setPeriod("당기 회계연도"); }}>초기화</Button>
          <Button variant="primary" size="md" style={{ flex: 1 }} onClick={apply}>필터 적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ===== 더보기 드롭다운 메뉴 — Radix DropdownMenu(키보드 내비·aria-haspopup·menuitem 시맨틱) ===== */
function MoreMenu({ onRegister, onDelete, onExport, count }: { onRegister: () => void; onDelete: () => void; onExport: () => void; count: number }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="더보기"
        className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
        style={{ width: 34, height: 34 }}>
        <Icon name="more" size={20} stroke={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onRegister}>
          <Icon name="plus" size={17} className="shrink-0 text-muted-foreground" />등록
        </DropdownMenuItem>
        <DropdownMenuItem danger onSelect={onDelete}>
          <Icon name="trash" size={17} className="shrink-0 text-danger" />{count > 0 ? "삭제 (" + count + ")" : "삭제"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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

/* ===== 신규 등록 모달 (내용 placeholder) ===== */
function RegField({ label, span }: { label: string; span?: boolean }) {
  return (
    <div className="flex flex-col" style={{ gap: 7, gridColumn: span ? "1 / -1" : "auto" }}>
      <div className="t-caption"><MT>{label}</MT></div>
      <div
        className="flex border border-border bg-muted"
        style={{
          height: span ? 92 : 44, borderRadius: 10,
          alignItems: span ? "flex-start" : "center", padding: span ? "13px 14px" : "0 14px",
        }}>
        <span
          aria-hidden={true}
          className="block bg-muted-foreground"
          style={{ height: "0.7em", width: span ? "64%" : "44%", borderRadius: 5, opacity: 0.16 }}
        />
      </div>
    </div>
  );
}

function RegisterModal({ open, mode = "create", onClose, onSubmit }: { open: boolean; mode?: string; onClose: () => void; onSubmit?: () => void }) {
  const edit = mode === "edit";
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[560px] max-h-[86vh]">
        <DialogHeader>
          <DialogTitle>{edit ? "수정" : "신규 등록"}</DialogTitle>
          <DialogDescription className="sr-only">자산 정보 입력 양식</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "18px 16px" }}>
          <RegField label="자산 식별자" span />
          <RegField label="자산명" />
          <RegField label="자산 분류" />
          <RegField label="평가 가치" />
          <RegField label="통화 단위" />
          <RegField label="리스크 등급" />
          <RegField label="담당자" />
          <RegField label="비고" span />
        </div>
        <DialogFooter className="justify-end">
          <Button variant="outline" size="md" onClick={onClose}>{edit ? "닫기" : "취소"}</Button>
          <Button variant="primary" size="md" leadingIcon="check" onClick={() => (onSubmit ? onSubmit() : onClose())}>{edit ? "저장" : "등록"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Performance({ onNav }) {
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null); // null | "create" | "edit"
  // risk 기본 null = 필터 해제(로드 시 전체 행). 실제 필터링되므로 비-null이면 즉시 행을 숨김 → opt-in.
  const [applied, setApplied] = useState<{ q: string | null; period: string | null; assets: Record<string, boolean>; risk: number | null }>({ q: null, period: "당기 회계연도", assets: { "주식": true, "채권": true }, risk: null });
  const apiRef = useRef<GridApi<PRow> | null>(null);
  const [selCount, setSelCount] = useState(0);   // AG Grid 선택 행 수(수제 Record 선택 대체)
  const [delOpen, setDelOpen] = useState(false);
  const [rows, setRows] = useState<PRow[]>(() => D.PORTFOLIO.map(withId));
  const masked = useMask();   // Excel 우측정렬 숫자 셀(가치·변동폭)의 마스킹 시 값을 0으로(실값 비노출)
  // 슬라이더 값(0~100) → 리스크 버킷 라벨 (칩 표시 + 실제 행 필터 공용 도메인)
  const riskLabel = (r) => (r == null ? null : r < 33 ? "리스크 보수적" : r < 66 ? "리스크 중립" : "리스크 공격적");
  const ROW_RISK_LABEL: Record<string, string> = { "ULTRA-LOW": "리스크 보수적", "LOW": "리스크 보수적", "MEDIUM": "리스크 중립", "HIGH": "리스크 공격적" };
  const wantRisk = riskLabel(applied.risk); // applied.risk null(칩 제거)이면 필터 해제
  // 검색어 = 코드·자산명·구분·리스크·가치 부분일치(OR), risk 필터와는 AND
  const wantQ = (applied.q || "").toLowerCase();
  const matchQ = (r: PRow) => !wantQ || [r.code, r.name, r.meta, r.risk, r.value].some((v) => String(v ?? "").toLowerCase().includes(wantQ));
  // risk·검색어만 행 데이터에 매핑 → AG Grid External Filter(L12)로 거른다. 자산유형/기간은 no-op(드로어 캡션으로 신호).
  // filtered는 푸터 건수·Excel 내보내기 용도(그리드 본체는 동일 술어를 external filter로 적용).
  const filtered = rows.filter((r) => matchQ(r) && (!wantRisk || ROW_RISK_LABEL[r.risk] === wantRisk));
  const addRow = () => {
    setRows((rs) => [withId({
      code: "NEW", codeColor: "var(--chart-1)", name: "신규 등록 자산", meta: "신규 · 미분류",
      value: "0", change: 0, risk: "MEDIUM", riskTone: "info", hist: [1, 1, 1, 1, 1],
    }), ...rs]);
    toast.success("자산이 등록되었습니다");
  };
  const deleteSelected = () => {
    const sel = apiRef.current?.getSelectedRows() ?? [];
    if (!sel.length) return;
    const ids = new Set(sel.map((r) => r._id));
    setRows((rs) => rs.filter((r) => !ids.has(r._id)));
    apiRef.current?.deselectAll();
    setPage(1);
    toast.success(`${sel.length}개 항목을 삭제했습니다`);
  };

  // ── AG Grid 연결: 다중행 체크박스 선택 + risk External Filter ──
  const onGridReady = useCallback((e: GridReadyEvent<PRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<PRow>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [wantRisk, wantQ]);
  const isExternalFilterPresent = useCallback(() => wantRisk != null || wantQ !== "", [wantRisk, wantQ]);
  const doesExternalFilterPass = useCallback(
    (node: IRowNode<PRow>) => (node.data ? matchQ(node.data) && (!wantRisk || ROW_RISK_LABEL[node.data.risk] === wantRisk) : true),
    [wantRisk, wantQ]);

  // 적용된 필터 → 칩 목록 (드로어와 연동)
  const chips = [];
  if (applied.q) chips.push({ key: "q", label: "검색어: " + applied.q });
  if (applied.period) chips.push({ key: "period", label: applied.period });
  Object.keys(applied.assets || {}).filter((a) => applied.assets[a]).forEach((a) => chips.push({ key: "asset:" + a, label: a }));
  if (riskLabel(applied.risk)) chips.push({ key: "risk", label: riskLabel(applied.risk) });
  const removeChip = (key) => setApplied((f) => {
    if (key === "q") return { ...f, q: null };
    if (key === "period") return { ...f, period: null };
    if (key === "risk") return { ...f, risk: null };
    if (key.startsWith("asset:")) { const a = key.slice(6); return { ...f, assets: { ...f.assets, [a]: false } }; }
    return f;
  });

  const changeColor = (v) => (v > 0 ? "var(--success)" : v < 0 ? "var(--danger)" : "var(--muted-foreground)");
  const fmtChange = (v) => (v > 0 ? "+" : "") + v.toFixed(2) + "%";

  // ── 컬럼 정의(고정 6컬럼) ──
  // 2줄 자산식별자(아바타+이름+메타)·우측정렬 숫자(가치/변동폭, 마스킹 valueFormatter)·리스크 배지·스파크라인·관리.
  // 헤더는 비마스킹(AG Grid headerName 평문) — 수제 표의 <MT> 헤더 마스킹을 규약대로 정규화("축은 두고 데이터는 가린다").
  // 성과이력 스파크는 비마스킹(원본 보존: aria-hidden·숫자 없음). 관리 버튼은 수정 모달(더블클릭과 동일 동작).
  const columnDefs = useMemo<ColDef<PRow>[]>(() => [
    {
      field: "name", headerName: "자산 식별자", flex: 2, minWidth: 240,
      cellStyle: { display: "flex", alignItems: "center" },
      cellRenderer: (p: ICellRendererParams<PRow>) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] text-[color:var(--on-chart-fill)] text-[12px] font-bold shrink-0"
            style={{ background: p.data?.codeColor }}><MT>{p.data?.code}</MT></span>
          <div className="min-w-0">
            <div className="text-[14.5px] font-bold leading-tight text-foreground"><MT>{p.data?.name}</MT></div>
            <div className="t-caption mt-0.5"><MT>{p.data?.meta}</MT></div>
          </div>
        </div>
      ),
    },
    {
      field: "value", headerName: "가치 (KRW, 백만)", type: "rightAligned", flex: 1, minWidth: 150,
      valueFormatter: (p) => mn(p.value),
      // value는 콤마 포함 포맷 문자열 → 기본 문자열 정렬이면 1,040,000 < 284,200로 오정렬. 숫자 비교로 교정.
      comparator: (a, b) => parseFloat(String(a).replace(/,/g, "")) - parseFloat(String(b).replace(/,/g, "")),
      cellStyle: { textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, color: "var(--foreground)" },
    },
    {
      field: "change", headerName: "변동폭 (24시)", type: "rightAligned", flex: 1, minWidth: 130,
      valueFormatter: (p) => mn(fmtChange(p.value)),
      cellStyle: (p) => ({ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: changeColor(p.value) }),
    },
    {
      field: "risk", headerName: "리스크 등급", flex: 1, minWidth: 130,
      cellStyle: { display: "flex", alignItems: "center" },
      cellRenderer: (p: ICellRendererParams<PRow>) => (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wide"
          style={{ background: `color-mix(in srgb,var(--${p.data?.riskTone}) 14%,transparent)`, color: `var(--${p.data?.riskTone})` }}>
          <MT w={36}>{p.data?.risk}</MT></span>
      ),
    },
    {
      field: "hist", headerName: "성과 이력", flex: 1, minWidth: 120, sortable: false,
      cellStyle: { display: "flex", alignItems: "center" },
      cellRenderer: (p: ICellRendererParams<PRow>) => <BarSpark data={p.data?.hist || []} color={p.data?.codeColor} up={(p.data?.change ?? 0) >= 0} />,
    },
    {
      colId: "__manage", headerName: "관리", width: 72, pinned: "right", sortable: false, resizable: false,
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
      cellRenderer: () => <IconBtn icon="file" label="편집" size={32} onClick={() => setModal("edit")} />,
    },
  ], []);

  // Excel(.xlsx) 내보내기 — SheetJS. 고정 6컬럼(성과이력 스파크라인·관리 제외), 현재 필터(filtered) 반영.
  // 가치·변동폭은 화면처럼 우측정렬 → 숫자 셀(t:'n'+z)로 기록(Excel 자동 우측정렬·실데이터 연동 시 계산 가능).
  // 텍스트 컬럼(자산코드·자산명·구분·리스크등급)은 화면처럼 텍스트 셀(좌측). 마스크 ON이면 숫자 셀 값을 0으로 비노출.
  const exportExcel = () => {
    const cell = (v) => mn(typeof v === "number" ? v.toLocaleString() : String(v ?? ""));
    const zVal = (v) => (Number.isInteger(v) ? "#,##0" : "#,##0.0");          // 가치
    const zChg = '+0.00"%";-0.00"%";0.00"%"';                                  // 변동폭 — fmtChange(부호+2소수+%)와 동일, "%"는 리터럴(스케일링 없음)
    const header = ["자산코드", "자산명", "구분", "가치 (KRW, 백만)", "변동폭 (24시)", "리스크 등급"];
    const body = filtered.map((r) => [cell(r.code), cell(r.name), cell(r.meta), masked ? 0 : r.value, masked ? 0 : r.change, cell(r.risk)]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    // 숫자 컬럼(가치=열3, 변동폭=열4)에 화면 포맷과 일치하는 숫자서식 부여(데이터는 헤더 다음=행1부터)
    filtered.forEach((r, i) => {
      const setZ = (c, z) => { const a = XLSX.utils.encode_cell({ r: i + 1, c }); if (ws[a]) ws[a].z = z; };
      setZ(3, zVal(r.value));
      setZ(4, zChg);
    });
    ws["!cols"] = [{ wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "투자포트폴리오");
    XLSX.writeFile(wb, "투자포트폴리오.xlsx");
    toast.success("Excel로 내보냈습니다");
  };

  return (
    <>
      <div className="max-w-[1320px] mx-auto" style={{ animation: "dashFade .35s var(--ease) both" }}>
        <PageHeader
          crumbs={["홈", "통계조회", "투자 성과·포트폴리오"]}
          actions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav("main")}>메인으로</Button>}
        />

        {/* ===== 카드: 헤더 + 필터 + 테이블 + 푸터 ===== */}
        <section className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mb-4">

          {/* 카드 헤더 */}
          <div className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 pt-5 pb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[19px] font-bold tracking-[-.02em]"><MT>투자포트폴리오</MT></h2>
            </div>
            <div className="flex items-center gap-2.5">
              <StatPill icon="trending" label="일일 수익률" value="+12.4%" tone="var(--success)" />
              <StatPill icon="wallet" label="순자산" value="₩42,000억" />
            </div>
          </div>

          {/* 필터 바 */}
          <div className="flex items-center gap-2 flex-wrap px-5 sm:px-6 py-3 border-t border-border">
            <IconBtn icon="filter" label="필터" size={34} />
            {chips.length
              ? chips.map((c) => <FilterChip key={c.key} active={true} onClick={() => removeChip(c.key)}><MT>{c.label}</MT><Icon name="x" size={13} /></FilterChip>)
              : <span className="text-[12.5px]" style={{ color: "var(--caption)" }}>적용된 필터 없음</span>}
            <div className="flex-1" />
            <Button variant="outline" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
            <IconBtn icon="refresh" label="새로고침" size={34} />
            <MoreMenu onRegister={() => setModal("create")} onDelete={() => { if (selCount) setDelOpen(true); }} onExport={exportExcel} count={selCount} />
            <AlertDialog open={delOpen} onOpenChange={setDelOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>선택 항목 삭제</AlertDialogTitle>
                  <AlertDialogDescription>
                    선택한 {selCount}개 항목을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction className="bg-danger text-[color:var(--destructive-foreground)]" onClick={deleteSelected}>삭제</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* 테이블 — AG Grid 본체(체크박스 다중선택 + risk External Filter + 더블클릭=수정 모달).
              행선택 회색은 공유 테마(--row-selected) 자동. 헤더=정렬. 카드/페이지네이션 토글은 푸터(장식) 유지. */}
          <div>
            <AgGridReact<PRow>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={columnDefs}
              getRowId={(p) => p.data._id}
              domLayout="autoHeight"
              rowHeight={60}
              defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
              rowSelection={{ mode: "multiRow", checkboxes: true, headerCheckbox: true }}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
              onRowDoubleClicked={(e) => e.data && setModal("edit")}
              overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">표시할 항목이 없습니다</span>'}
            />
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 py-4 border-t border-border">
            <span className="t-caption">총 {mn("1,208")}개 중 <b className="text-foreground">{mn(filtered.length) + "개"}</b> 항목 표시 중</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted-foreground cursor-pointer border border-border bg-card"><Icon name="chevron-left" size={16} /></button>
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cx("w-8 h-8 inline-flex items-center justify-center rounded-lg text-[13px] font-semibold cursor-pointer tabular transition-colors")}
                  style={page === n
                    ? { background: "color-mix(in srgb,var(--primary) 12%,transparent)", color: "var(--primary)", border: "1px solid color-mix(in srgb,var(--primary) 40%,transparent)" }
                    : { background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{n}</button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(3, p + 1))}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-muted-foreground cursor-pointer border border-border bg-card"><Icon name="chevron-right" size={16} /></button>
            </div>
            <div className="flex items-center gap-3">
              <SegTabs options={[{ value: "list", label: "리스트 뷰" }, { value: "detail", label: "카드뷰" }]} value={view} onChange={setView} size="sm" />
              <div className="flex items-center gap-0.5">
                <IconBtn icon="download" label="다운로드" size={34} onClick={exportExcel} />
                {["external", "file", "more"].map((ic, i) => <IconBtn key={i} icon={ic} label={ic} size={34} />)}
              </div>
            </div>
          </div>
        </section>

        {/* ===== 하단 2카드 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* 분기별 전망 */}
          <div className="rounded-card-lg border border-border p-6" style={{ background: "color-mix(in srgb,var(--muted) 50%,var(--card))" }}>
            <h3 className="text-[17px] font-bold mb-3"><MT>분기별 전망</MT></h3>
            <p className="t-body text-[13.5px] leading-relaxed text-muted-foreground" style={{ maxWidth: 540 }}>
              {["100%", "97%", "58%"].map((wd, i) => (
                <span key={i} aria-hidden={true} className="block" style={{ height: "0.72em", margin: "0.42em 0", borderRadius: 5, background: "currentColor", opacity: 0.14, width: wd }} />
              ))}
            </p>
            <div className="flex items-end gap-10 mt-6">
              <div>
                <div className="t-caption mb-1"><MT>신뢰 지수</MT></div>
                <div className="text-[30px] font-extrabold tabular text-accent">{mn("88%")}</div>
              </div>
              <div>
                <div className="t-caption mb-1"><MT>변동성 지수</MT></div>
                <div className="text-[30px] font-extrabold text-success"><MT>낮음</MT></div>
              </div>
            </div>
          </div>

          {/* 자본 준비금 (단색) */}
          <div className="rounded-card-lg p-6 text-[color:var(--on-brand-solid)] relative overflow-hidden shadow-md" style={{ background: "var(--brand-solid)" }}>
            <div className="relative">
              <h3 className="text-[17px] font-bold mb-1.5"><MT>자본 준비금</MT></h3>
              <p className="text-[13px] mb-1" style={{ opacity: .85 }}><MT>출자 가능 미집행 자금 현황입니다.</MT></p>
              <div className="text-[34px] font-extrabold tabular mb-5 leading-tight">{mn("₩1,402,990")}</div>
              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] py-3 text-[13.5px] font-bold cursor-pointer transition-colors"
                style={{ background: "rgba(255,255,255,.18)", color: "var(--on-brand-solid)", border: "1px solid rgba(255,255,255,.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.28)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.18)")}>
                <Icon name="trending" size={16} /><MT>배분 요청</MT></button>
            </div>
          </div>
        </div>
      </div>

      <FilterDrawer
        open={filterOpen}
        applied={applied}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => { setApplied((f) => ({ ...f, ...next })); setFilterOpen(false); }}
      />
      <RegisterModal
        open={!!modal}
        mode={modal || "create"}
        onClose={() => setModal(null)}
        onSubmit={() => { if (modal === "create") addRow(); setModal(null); }}
      />
    </>
  );
}

export { Performance };
