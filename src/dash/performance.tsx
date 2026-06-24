/* 투자 성과·포트폴리오 서브페이지 — 첨부 디자인(테이블 + 하단 2카드) 스타일.
   APFS forest-green 토큰 + Tailwind 유틸리티.
   claude.ai/design 프로젝트 dash/performance.js 충실 포팅(행 선택·더보기 메뉴·등록 모달 포함). */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { Shell } from './shell';
import { APFS_DATA } from './data';
import { mn, MT, useMask } from './mask';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS — 클라이언트 전용 .xlsx 생성(쓰기 전용: XLSX.read 미사용 → 알려진 파싱 CVE 비해당)

const { useState, useEffect } = React;
const { Button, StatusBadge, FilterChip, SegTabs, IconBtn, ColorChip } = UI;
const { PageHeader } = Shell;
const D = APFS_DATA;
const cx = (...a) => a.filter(Boolean).join(" ");

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
        {checked && <Icon name="check" size={17} stroke={3} style={{ color: "#fff" }} />}
      </span>
      <span className="text-[14px] font-semibold text-foreground">{label}</span>
    </button>
  );
}

function FilterDrawer({ open, onClose, onApply, applied }) {
  const ASSETS = ["주식", "채권", "실물 자산", "사모 펀드"];
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
      setSel(applied.assets);
      setRisk(applied.risk == null ? 50 : applied.risk);
      setRiskOn(applied.risk != null);
      setPeriod(applied.period || "당기 회계연도");
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
        <SheetHeader className="px-6">
          <SheetTitle>포트폴리오 상세 필터</SheetTitle>
          <SheetDescription className="sr-only">자산 유형·리스크 노출도·기간으로 포트폴리오를 거르는 필터</SheetDescription>
          <IconBtn icon="x" onClick={onClose} label="닫기" size={38} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col" style={{ gap: 26 }}>
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
          <Button variant="outline" size="md" onClick={() => { setSel({}); setRisk(50); setRiskOn(false); setPeriod("당기 회계연도"); }}>초기화</Button>
          <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => onApply({ assets: sel, risk: riskOn ? risk : null, period })}>필터 적용</Button>
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

/* ===== 행 선택 체크박스 — Radix Checkbox(Space 토글 등 키보드 제공) ===== */
function RowCheck({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={() => onChange()}
      onClick={(e) => e.stopPropagation()}
      aria-label="행 선택"
      className="align-middle"
    />
  );
}

function Performance({ onNav }) {
  const [view, setView] = useState("list");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [modal, setModal] = useState<string | null>(null); // null | "create" | "edit"
  // risk 기본 null = 필터 해제(로드 시 전체 행). 실제 필터링되므로 비-null이면 즉시 행을 숨김 → opt-in.
  const [applied, setApplied] = useState<{ period: string | null; assets: Record<string, boolean>; risk: number | null }>({ period: "당기 회계연도", assets: { "주식": true, "채권": true }, risk: null });
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [delOpen, setDelOpen] = useState(false);
  const [rows, setRows] = useState(D.PORTFOLIO);
  const masked = useMask();   // Excel 우측정렬 숫자 셀(가치·변동폭)의 마스킹 시 값을 0으로(실값 비노출)
  // 슬라이더 값(0~100) → 리스크 버킷 라벨 (칩 표시 + 실제 행 필터 공용 도메인)
  const riskLabel = (r) => (r == null ? null : r < 33 ? "리스크 보수적" : r < 66 ? "리스크 중립" : "리스크 공격적");
  const ROW_RISK_LABEL: Record<string, string> = { "ULTRA-LOW": "리스크 보수적", "LOW": "리스크 보수적", "MEDIUM": "리스크 중립", "HIGH": "리스크 공격적" };
  const wantRisk = riskLabel(applied.risk); // applied.risk null(칩 제거)이면 필터 해제
  // risk만 행 데이터에 매핑 → 실제 필터. 원본 인덱스 보존(selection이 인덱스 기반). 자산유형/기간은 no-op(드로어 캡션으로 신호)
  const filtered = rows.map((r, i) => ({ r, i })).filter(({ r }) => !wantRisk || ROW_RISK_LABEL[r.risk] === wantRisk);
  const allChecked = filtered.length > 0 && filtered.every(({ i }) => selected[i]);
  const toggleAll = () => setSelected(allChecked ? {} : filtered.reduce((o, { i }) => ((o[i] = true), o), {} as Record<number, boolean>));
  const toggleRow = (i) => setSelected((s) => ({ ...s, [i]: !s[i] }));
  const addRow = () => {
    setRows((rs) => [{
      code: "NEW", codeColor: "var(--chart-1)", name: "신규 등록 자산", meta: "신규 · 미분류",
      value: "0", change: 0, risk: "MEDIUM", riskTone: "info", hist: [1, 1, 1, 1, 1],
    }, ...rs]);
    toast.success("자산이 등록되었습니다");
  };
  const selCount = rows.filter((_, i) => selected[i]).length;
  const deleteSelected = () => {
    if (!selCount) return;
    const n = selCount;
    setRows((rs) => rs.filter((_, i) => !selected[i]));
    setSelected({});
    setPage(1);
    toast.success(`${n}개 항목을 삭제했습니다`);
  };

  // 적용된 필터 → 칩 목록 (드로어와 연동)
  const chips = [];
  if (applied.period) chips.push({ key: "period", label: applied.period });
  Object.keys(applied.assets || {}).filter((a) => applied.assets[a]).forEach((a) => chips.push({ key: "asset:" + a, label: a }));
  if (riskLabel(applied.risk)) chips.push({ key: "risk", label: riskLabel(applied.risk) });
  const removeChip = (key) => setApplied((f) => {
    if (key === "period") return { ...f, period: null };
    if (key === "risk") return { ...f, risk: null };
    if (key.startsWith("asset:")) { const a = key.slice(6); return { ...f, assets: { ...f.assets, [a]: false } }; }
    return f;
  });

  const changeColor = (v) => (v > 0 ? "var(--success)" : v < 0 ? "var(--danger)" : "var(--muted-foreground)");
  const fmtChange = (v) => (v > 0 ? "+" : "") + v.toFixed(2) + "%";

  // Excel(.xlsx) 내보내기 — SheetJS. 고정 6컬럼(성과이력 스파크라인·관리 제외), 현재 필터(filtered) 반영.
  // 가치·변동폭은 화면처럼 우측정렬 → 숫자 셀(t:'n'+z)로 기록(Excel 자동 우측정렬·실데이터 연동 시 계산 가능).
  // 텍스트 컬럼(자산코드·자산명·구분·리스크등급)은 화면처럼 텍스트 셀(좌측). 마스크 ON이면 숫자 셀 값을 0으로 비노출.
  const exportExcel = () => {
    const cell = (v) => mn(typeof v === "number" ? v.toLocaleString() : String(v ?? ""));
    const zVal = (v) => (Number.isInteger(v) ? "#,##0" : "#,##0.0");          // 가치
    const zChg = '+0.00"%";-0.00"%";0.00"%"';                                  // 변동폭 — fmtChange(부호+2소수+%)와 동일, "%"는 리터럴(스케일링 없음)
    const header = ["자산코드", "자산명", "구분", "가치 (KRW, 백만)", "변동폭 (24시)", "리스크 등급"];
    const body = filtered.map(({ r }) => [cell(r.code), cell(r.name), cell(r.meta), masked ? 0 : r.value, masked ? 0 : r.change, cell(r.risk)]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    // 숫자 컬럼(가치=열3, 변동폭=열4)에 화면 포맷과 일치하는 숫자서식 부여(데이터는 헤더 다음=행1부터)
    filtered.forEach(({ r }, i) => {
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
                  <AlertDialogAction className="bg-danger text-white" onClick={deleteSelected}>삭제</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[840px]">
              <thead>
                <tr style={{ background: "color-mix(in srgb,var(--muted) 60%,transparent)" }}>
                  <th className="pl-5 sm:pl-6 pr-2 py-3 text-left" style={{ width: 1 }}>
                    <RowCheck checked={allChecked} onChange={toggleAll} />
                  </th>
                  {[["자산 식별자", "left"], ["가치 (KRW, 백만)", "right"], ["변동폭 (24시)", "right"], ["리스크 등급", "left"], ["성과 이력", "left"], ["관리", "right"]].map((c, i) => (
                    <th
                      key={i}
                      className={cx("t-label font-semibold px-4 py-3 whitespace-nowrap", c[1] === "right" ? "text-right" : "text-left", i === 5 && "pr-5 sm:pr-6")}>
                      <MT>{c[0]}</MT>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ r, i }) => (
                  <tr
                    key={i}
                    className="group border-t border-border transition-colors cursor-pointer"
                    onDoubleClick={() => setModal("edit")}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    {/* 선택 */}
                    <td className="pl-5 sm:pl-6 pr-2 py-3.5" style={{ width: 1 }}>
                      <RowCheck checked={!!selected[i]} onChange={() => toggleRow(i)} />
                    </td>
                    {/* 자산 식별자 */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-flex items-center justify-center w-9 h-9 rounded-[9px] text-white text-[12px] font-bold shrink-0"
                          style={{ background: r.codeColor }}><MT>{r.code}</MT></span>
                        <div className="min-w-0">
                          <div className="text-[14.5px] font-bold leading-tight text-foreground"><MT>{r.name}</MT></div>
                          <div className="t-caption mt-0.5"><MT>{r.meta}</MT></div>
                        </div>
                      </div>
                    </td>
                    {/* 가치 */}
                    <td className="px-4 py-3.5 text-right tabular text-[14.5px] font-semibold whitespace-nowrap text-foreground">{mn(r.value)}</td>
                    {/* 변동폭 */}
                    <td className="px-4 py-3.5 text-right tabular text-[14px] font-bold whitespace-nowrap" style={{ color: changeColor(r.change) }}>{mn(fmtChange(r.change))}</td>
                    {/* 리스크 등급 */}
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-bold tracking-wide"
                        style={{
                          background: `color-mix(in srgb,var(--${r.riskTone}) 14%,transparent)`,
                          color: `var(--${r.riskTone})`,
                        }}><MT w={36}>{r.risk}</MT></span>
                    </td>
                    {/* 성과 이력 */}
                    <td className="px-4 py-3.5"><BarSpark data={r.hist} color={r.codeColor} up={r.change >= 0} /></td>
                    {/* 관리 */}
                    <td className="px-4 pr-5 sm:pr-6 py-3.5 text-right">
                      <button
                        aria-label="편집"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        style={{ border: "none", background: "transparent" }}><Icon name="file" size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="rounded-card-lg p-6 text-white relative overflow-hidden shadow-md" style={{ background: "#439E00" }}>
            <div className="relative">
              <h3 className="text-[17px] font-bold mb-1.5"><MT>자본 준비금</MT></h3>
              <p className="text-[13px] mb-1" style={{ opacity: .85 }}><MT>출자 가능 미집행 자금 현황입니다.</MT></p>
              <div className="text-[34px] font-extrabold tabular mb-5 leading-tight">{mn("₩1,402,990")}</div>
              <button
                className="w-full inline-flex items-center justify-center gap-2 rounded-[10px] py-3 text-[13.5px] font-bold cursor-pointer transition-colors"
                style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }}
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
