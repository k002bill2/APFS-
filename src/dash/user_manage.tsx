/* 사용자관리 — 관리형 리스트 페이지 (관리자 > 사용자·권한 관리 > 사용자관리, route user-manage).
   출처: S0_101_사용자관리.html(AFIT 공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(사용자구분·상태·소속기관·검색어)  → 주 필터 1개 = 상태 FilterChip(툴바 좌) + 상세필터 드로어(검색어·사용자구분·소속기관). 검색어 opt-in(SEARCHABLE).
   - 사용자 그리드(No·성명·로그인 아이디·이메일·구분·소속유형·소속·권한·상태·최근 접속일시) → AG Grid 단일 헤더(apfs-aggrid), 상태 배지 lg.
   - 행 선택 → 상태·구분별 액션(목업 gate: 수정·온보딩 메일·담당자 교체·잠금 해제·비밀번호 만료 처리·OTP 재발급)
       → 라디오 단일선택 + 툴바 좌 selbar 에 **열린 액션만** 노출(apfs-stage-workflow 선택 SSOT). 게이팅은 user_manage_model.gateFor.
   - 등록/수정 모달(조건부 소속·권한 복수) → 전용 `UserFormModal`. 등록 = 온보딩대기 + 온보딩 안내 메일 미리보기(목업).
   - 온보딩/OTP 재등록 메일 → `MailPreviewDialog`(실제 발송 없음). 잠금 해제·만료 처리·담당자 교체·OTP 재발급은 AlertDialog 확인 후 로컬 상태 전이.
   - 엑셀(리스트 공통 규약) → RegisterCombo ⌄ + 푸터 download + ⌥D. 마스크 ON이면 텍스트 ''·숫자 0.
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음 · 명세 팝업 없음 · 삭제 없음(목업 원문에 없음).
   ⚠ 실제 계정 발급·인증·잠금 정책·메일 발송이 아니다 — 백엔드 없이 화면 로컬 더미 상태만 바꾼다(브리프). 실명 아님. */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { UTYPES } from './admin_menu_tree';
import { ORGS } from './admin_demo_data';
import { demoUsers, filterUsers, gateFor, belong, belongName, STATUS_TONE, USER_STATUSES, nextUserId, unlockUser, replaceUser } from './user_manage_model';
import type { UserRow, UserStatus } from './user_manage_model';
import { UserFormModal } from './user_form_modal';
import type { UserPatch } from './user_form_modal';
import { MailPreviewDialog, MASKED_LINK } from './admin_mail_preview';
import type { MailSpec } from './admin_mail_preview';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

const SEARCHABLE = true;
const PAGE_SIZE = 20;
const nowStamp = () => format(new Date(), 'yyyy-MM-dd HH:mm');

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서 그대로
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };

const columnDefs: ColDef<UserRow>[] = [
  { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'name', headerName: '성명', width: 130, minWidth: 110, maxWidth: 200, cellStyle: flexCenter,
    cellRenderer: (p: any) => <span className="inline-flex items-center gap-1.5 min-w-0"><span className="font-semibold"><MT>{p.value}</MT></span>{p.data?.seed && <StatusBadge tone="success" label="시드" size="sm" dot={false} />}</span> },
  { field: 'lid', headerName: '로그인 아이디', width: 134, maxWidth: 160, cellStyle: { ...flexCenter, fontVariantNumeric: 'tabular-nums' }, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'email', headerName: '이메일', width: 200, minWidth: 160, maxWidth: 260, cellStyle: muted, cellRenderer: (p: any) => <MT>{p.value || '-'}</MT> },
  { field: 'type', headerName: '구분', width: 84, maxWidth: 84, cellStyle: flexMid, cellRenderer: (p: any) => <StatusBadge tone="info" label={p.value} size="md" dot={false} /> },
  { headerName: '소속유형', width: 116, maxWidth: 116, cellStyle: flexMid, valueGetter: (p) => (p.data ? belong(p.data) : ''),
    cellRenderer: (p: any) => <StatusBadge tone={p.data?.type === '농금원' ? 'primary' : 'warning'} label={p.value} size="md" dot={false} /> },
  { headerName: '소속', width: 150, minWidth: 110, maxWidth: 220, cellStyle: flexCenter, valueGetter: (p) => (p.data ? belongName(p.data) : ''), cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'roles', headerName: '권한', width: 170, minWidth: 120, maxWidth: 260, cellStyle: flexCenter, valueFormatter: (p) => (p.value ?? []).join(', '),
    cellRenderer: (p: any) => <span className="inline-flex items-center gap-1 flex-wrap">{(p.value ?? []).map((r: string) => <StatusBadge key={r} tone="info" label={r} size="md" dot={false} />)}</span> },
  { field: 'status', headerName: '상태', width: 110, maxWidth: 110, cellStyle: flexMid, cellRenderer: (p: any) => <StatusBadge tone={STATUS_TONE[p.value as UserStatus]} label={p.value} size="lg" dot={false} /> },
  { field: 'pwExpired', headerName: '비밀번호', width: 100, maxWidth: 100, cellStyle: flexMid, valueFormatter: (p) => (p.value ? '만료' : '정상'),
    cellRenderer: (p: any) => (p.value ? <StatusBadge tone="warning" label="만료" size="md" dot={false} /> : <span style={{ color: 'var(--muted-foreground)' }}>정상</span>) },
  { field: 'last', headerName: '최근 접속일시', width: 150, maxWidth: 150, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: (p) => (p.value && p.value !== '—' ? mn(p.value) : '—') },
];
const ROW_SELECTION: RowSelectionOptions<UserRow> = { mode: 'singleRow', checkboxes: true, enableClickSelection: true };
const SELECTION_COL = { pinned: 'left' as const, width: 44, maxWidth: 44 };
const STATUS_CHIPS = ['', ...USER_STATUSES] as const;

type XCol = { header: string; get: (r: UserRow) => string };
const EXPORT_COLS: XCol[] = [
  { header: '성명', get: (r) => r.name }, { header: '로그인 아이디', get: (r) => r.lid }, { header: '이메일', get: (r) => r.email },
  { header: '구분', get: (r) => r.type }, { header: '소속유형', get: (r) => belong(r) }, { header: '소속', get: (r) => belongName(r) },
  { header: '권한', get: (r) => r.roles.join(', ') }, { header: '상태', get: (r) => r.status }, { header: '비밀번호', get: (r) => (r.pwExpired ? '만료' : '정상') }, { header: '최근 접속일시', get: (r) => r.last },
];

/* ── 메일 본문(목업 openMail·openOtpMail — 링크·인증정보는 마스킹) ── */
function onboardMail(u: UserRow): MailSpec {
  const org = belongName(u), gong = u.type === '수탁' || u.type === '부처';
  return {
    subject: `[에이핏(AFIT)] 계정 개설 안내 — ${u.name} (${org})`, to: `${u.name} <${u.email || '-'}>`,
    body: `${u.name} 담당자님, 안녕하세요.\n농림수산식품모태펀드 투자자산관리 에이핏(AFIT)에 사용자 계정이 개설되었습니다.\n\n■ 계정 정보\n · 계정명: ${u.name}\n · 소속/구분: ${org} (${u.type})\n · 권한: ${u.roles.join(', ')}\n · 유효기간: 링크 발송 후 72시간(만료 시 재발송 요청)\n\n■ 최초 접속 절차\n 1) 아래 [계정 활성화] 클릭\n 2) 비밀번호 설정\n 3) 2차 인증(OTP) 등록 — 화면의 QR을 인증앱으로 1회 스캔\n 4) 앱에 표시된 6자리 입력 → 활성화 완료\n\n   [ 계정 활성화 ]\n   ${MASKED_LINK}${gong ? `\n\n■ 기관 소속 계정 안내\n · 본 계정은 ${org} 소속 개별 담당자 계정입니다(공유 계정 아님).\n · 담당자 변경 시 이 계정은 비활성되고 신 담당자에게 새 계정이 발급됩니다.` : ''}\n\n■ 보안 안내\n · QR코드·비밀번호·OTP는 이메일로 발송되지 않으며, 링크 접속 후 화면에서만 표시됩니다.\n · 본인이 요청하지 않은 안내라면 링크를 클릭하지 마시고 농금원 담당자에게 문의해 주세요.\n\n본 메일은 발신전용입니다.`,
  };
}
function otpMail(u: UserRow): MailSpec {
  const gong = u.type === '수탁' || u.type === '부처';
  return {
    subject: `[에이핏(AFIT)] OTP(2차 인증) 재등록 안내 — ${u.name}`, to: `${u.name} <${u.email || '-'}>`,
    body: `${u.name}님, 안녕하세요.\n2차 인증(OTP)이 재발급되었습니다. 기존 인증앱의 코드는 더 이상 사용할 수 없습니다.\n\n■ 안내\n · 계정: ${u.lid} (${u.type})\n · 사유: 기기 변경/분실${gong ? '·담당자 인수인계' : ''}에 따른 OTP 재발급(관리자 처리)\n · 조치: 아래 링크 접속 → 새 QR 스캔 → 6자리 입력으로 재등록\n\n   [ OTP 재등록 ]  ${MASKED_LINK}\n\n■ 보안 안내\n · QR·시드는 이메일이 아니라 링크 접속 후 화면에서만 표시됩니다.\n · 기존 인증앱에 등록된 항목은 삭제해 주세요.\n\n본 메일은 발신전용입니다.`,
  };
}

/* 드로어 입력 — 폭 fit-content + 타입별 하한(controlMinWidth SSOT). font(단축) 먼저 → fontSize 뒤 */
const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', font: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});
function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; all?: string | null }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {all != null && <option value="">{all}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

function MoreMenuItems({ onExport }: { onExport: () => void }) {
  return (
    <>
      <DropdownMenuItem onSelect={onExport}>
        <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
        <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => window.print()}>
        <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
        <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}
/* kebab(···) — 푸터 폴백 전용(툴바는 RegisterCombo ⌄). 로컬 복사본(apfs-grid) */
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger aria-label="더보기"
              className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
              style={{ width: size, height: size }}>
              <Icon name="more" size={20} stroke={2} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>더보기</TooltipContent>
      </Tooltip>
      <DropdownMenuContent><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
    </DropdownMenu>
  );
}
function RegisterCombo({ label, onRegister, onExport }: { label: string; onRegister: () => void; onExport: () => void }) {
  return (
    <span className="inline-flex items-stretch rounded-[9px] border border-border-strong bg-card">
      <button type="button" onClick={onRegister}
        className="inline-flex items-center gap-[7px] rounded-l-[9px] border-0 bg-transparent px-[11px] py-1.5 font-[inherit] text-[12.5px] font-semibold text-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary">
        <Icon name="plus" size={14} stroke={2.2} />{label}
      </button>
      <span aria-hidden className="w-px self-stretch bg-border-strong" />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <DropdownMenuTrigger aria-label="더보기"
                className="inline-flex h-full items-center justify-center rounded-r-[9px] border-0 bg-transparent px-2 text-muted-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary data-[state=open]:text-primary">
                <Icon name="chevron-down" size={14} stroke={2.2} />
              </DropdownMenuTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>더보기</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end"><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'form'; mode: 'create' | 'edit'; id?: string }
  | { kind: 'mail'; title: string; mail: MailSpec }
  | { kind: 'confirm'; title: string; desc: string; okLabel: string; onOk: () => void };

export function UserManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<UserRow> | null>(null);
  const [rows, setRows] = useState<UserRow[]>(() => demoUsers());
  const [selId, setSelId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  /* 필터 — 상태는 툴바 칩, 나머지는 드로어(목업 검색박스 순서: 사용자구분·상태·소속기관·검색어) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fStatus, setFStatus] = useState<typeof STATUS_CHIPS[number]>('');
  const [fType, setFType] = useState('');
  const [fOrg, setFOrg] = useState('');
  const [fText, setFText] = useState('');
  const clearFilters = () => { setFStatus(''); setFType(''); setFOrg(''); setFText(''); };

  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form', mode: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const visible = useMemo(() => filterUsers(rows, { type: fType, status: fStatus, org: fOrg, kw: fText }), [rows, fType, fStatus, fOrg, fText]);

  /* 선택 SSOT = selId. 새로 만든 행은 onRowDataUpdated 에서 라디오를 되맞춘다 */
  const selIdRef = useRef<string | null>(null); selIdRef.current = selId;
  const onGridReady = useCallback((e: GridReadyEvent<UserRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<UserRow>) => { setSelId(e.api.getSelectedRows()[0]?.id ?? null); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<UserRow> }) => {
    const id = selIdRef.current; if (!id) return;
    const node = e.api.getRowNode(id); if (node && !node.isSelected()) node.setSelected(true, true);
  }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<UserRow>) => { if (e.data && !e.rowPinned) setModal({ kind: 'form', mode: 'edit', id: e.data.id }); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<UserRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setModal({ kind: 'form', mode: 'edit', id: e.data.id });
  }, []);

  const selected = selId ? rows.find((r) => r.id === selId) ?? null : null;
  const gate = gateFor(selected);
  const target = modal?.kind === 'form' && modal.id ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* ── 액션(목업) — 확인 다이얼로그 → 로컬 전이 → toast(목업 회신 문구) ── */
  const patchRow = (id: string, fn: (u: UserRow) => UserRow) => setRows((prev) => prev.map((r) => (r.id === id ? fn(r) : r)));
  const openMail = (title: string, mail: MailSpec) => setModal({ kind: 'mail', title, mail });
  const askUnlock = (u: UserRow) => setModal({ kind: 'confirm', title: '잠금 해제', desc: `${u.name} 계정의 잠금을 해제할까요? (실패 횟수 초기화)`, okLabel: '잠금 해제', onOk: () => {
    patchRow(u.id, unlockUser); setModal(null); toast.success(`${u.name} 잠금 해제 — 감사로그에 기록됩니다 (목업)`);
  } });
  const askExpire = (u: UserRow) => setModal({ kind: 'confirm', title: '비밀번호 만료 처리', desc: `${u.name} 계정을 비밀번호 만료 처리할까요? 다음 로그인 시 변경을 안내합니다.`, okLabel: '만료 처리', onOk: () => {
    patchRow(u.id, (r) => ({ ...r, pwExpired: true })); setModal(null); toast.success(`${u.name} 만료 처리 — 안내 메일 발송 (목업)`);
  } });
  const askOtp = (u: UserRow) => setModal({ kind: 'confirm', title: 'OTP 재발급', desc: `${u.name} 계정의 OTP를 재발급할까요? 기존 앱 등록은 무효화되고 재등록 안내 메일을 미리봅니다.`, okLabel: '재발급', onOk: () => {
    openMail(`OTP 재등록 안내 메일 미리보기 — ${u.name}`, otpMail(u)); toast.success('OTP 재발급 — 재등록 안내 메일 (목업)');
  } });
  const askReplace = (u: UserRow) => setModal({ kind: 'confirm', title: '담당자 교체', desc: `담당자를 교체할까요? ${u.name} 계정은 비활성되고, 신 담당자 계정이 신규 발급(온보딩대기)됩니다. 같은 아이디를 물려주지 않습니다.`, okLabel: '교체', onOk: () => {
    const { retired, created } = replaceUser(rows, u);
    setRows((prev) => [...prev.map((r) => (r.id === u.id ? retired : r)), created]);
    setSelId(created.id);
    openMail(`온보딩 안내 메일 미리보기 — ${created.name}`, onboardMail(created));
    toast.success(`담당자 교체 — ${u.name} 비활성 + 신규 계정 발급(온보딩대기) (목업)`);
  } });

  const handleCellContextMenu = (e: CellContextMenuEvent<UserRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const g = gateFor(row);
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'form', mode: 'edit', id: row.id }) },
      ...(g.mail ? [{ label: '온보딩 메일', icon: 'bell', onSelect: () => openMail(`온보딩 안내 메일 미리보기 — ${row.name}`, onboardMail(row)) } as CtxItem] : []),
      ...(g.unlock ? [{ label: '잠금 해제', icon: 'check-circle', onSelect: () => askUnlock(row) } as CtxItem] : []),
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  /* ── 등록/수정 저장 — 불변 갱신. 등록은 온보딩대기 + 온보딩 메일 미리보기(목업 회신) ── */
  const save = (patch: UserPatch) => {
    if (!modal || modal.kind !== 'form') return;
    if (modal.mode === 'edit' && target) {
      patchRow(target.id, (r) => ({ ...r, ...patch }));
      setModal(null);
      toast.success('저장되었습니다 (목업)');
    } else {
      const row: UserRow = { id: nextUserId(rows), ...patch, last: '—', fail: 0 };
      setRows((prev) => [...prev, row]);
      setSelId(row.id);
      openMail(`온보딩 안내 메일 미리보기 — ${row.name}`, onboardMail(row));
      toast.success(`${row.name} 등록 — 온보딩 안내 메일 (목업)`);
    }
  };
  const refresh = () => { setRows(demoUsers()); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel — 표시 중인 행. 마스크 ON이면 텍스트 '' ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => (masked ? '' : c.get(r))));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '이메일' || c.header === '권한' ? 28 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '사용자관리');
    XLSX.writeFile(wb, '사용자관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['사용자구분', fType, () => setFType('')],
    ['소속기관', fOrg && (ORGS.find((o) => o.id === fOrg)?.name ?? fOrg), () => setFOrg('')],
    ['검색어', fText.trim(), () => setFText('')],
  ];

  return (
    <GridFrame
      crumbs={['홈', '관리자', '사용자·권한 관리', '사용자관리']}
      title="사용자관리"
      favRoute="user-manage"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selected ? (
        /* 선택 행 컨텍스트 액션 — 게이트가 연 것만(목업 gate). 대상명 캡션은 두지 않는다 */
        <>
          <StatusBadge tone={STATUS_TONE[selected.status]} label={selected.status} size="lg" dot={false} />
          <Button variant="primary" size="sm" onClick={() => setModal({ kind: 'form', mode: 'edit', id: selected.id })}>수정</Button>
          {gate.mail && <Button variant="outline" size="sm" leadingIcon="bell" onClick={() => openMail(`온보딩 안내 메일 미리보기 — ${selected.name}`, onboardMail(selected))}>온보딩 메일</Button>}
          {gate.replace && <Button variant="outline" size="sm" leadingIcon="users" onClick={() => askReplace(selected)}>담당자 교체</Button>}
          {gate.unlock && <Button variant="outline" size="sm" leadingIcon="check-circle" onClick={() => askUnlock(selected)}>잠금 해제</Button>}
          {gate.expire && <Button variant="outline" size="sm" leadingIcon="clock" onClick={() => askExpire(selected)}>비밀번호 만료 처리</Button>}
          {gate.otp && <Button variant="outline" size="sm" leadingIcon="refresh" onClick={() => askOtp(selected)}>OTP 재발급</Button>}
          <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
        </>
      ) : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {STATUS_CHIPS.map((s) => <FilterChip key={s || 'all'} active={fStatus === s} onClick={() => setFStatus(s)}>{s || '전체'}</FilterChip>)}
          {chips.filter(([, v]) => v).map(([label, value, clear]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              <MT>{value}</MT>
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <span ref={topMoreRef} className="inline-flex">
          <RegisterCombo label="사용자 등록" onRegister={() => setModal({ kind: 'form', mode: 'create' })} onExport={exportExcel} />
        </span>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(rows.length)) + '명 중 ' + mn(String(visible.length)) + '명 · ' + mn(String(Math.min(shown, visible.length))) + '명 표시 중 · 모든 계정 = 담당자별 개별 계정'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      <div>
        <AgGridReact<UserRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onModelUpdated={refreshNoColumn}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 검색어(opt-in) 최상단 + 사용자구분 · 소속기관(상태는 툴바 칩) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">사용자 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="성명 · 로그인 아이디 · 이메일" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="사용자구분"><DrawerSelect value={fType} onChange={setFType} options={UTYPES.map((u) => ({ value: u, label: u }))} /></DrawerField>
            <DrawerField label="소속기관"><DrawerSelect value={fOrg} onChange={setFOrg} options={ORGS.map((o) => ({ value: o.id, label: `${o.name} (${o.type})` }))} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 등록/수정 모달 ── */}
      {modal?.kind === 'form' && (modal.mode === 'create' || target) && (
        <UserFormModal mode={modal.mode} initial={modal.mode === 'edit' ? target! : undefined} existing={rows} onSave={save} onClose={() => setModal(null)} />
      )}
      {/* ── 메일 미리보기(온보딩·OTP 재등록) — 실제 발송 없음 ── */}
      {modal?.kind === 'mail' && <MailPreviewDialog title={modal.title} mail={modal.mail} onClose={() => setModal(null)} />}
      {/* ── 확인(잠금 해제·만료 처리·OTP 재발급·담당자 교체) — Radix AlertDialog ── */}
      {/* 닫힘 콜백이 onOk 가 띄운 후속 모달(메일 미리보기)을 덮어쓰지 않게 — AlertDialogAction 은 Radix 닫기
          버튼이라 onOk 직후 onOpenChange(false) 가 따라온다. 확인 모달일 때만 비운다. */}
      {modal?.kind === 'confirm' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'confirm' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{modal.title}</AlertDialogTitle>
              <AlertDialogDescription>{modal.desc}<br />화면 시연용 프로토타입 — 실제 계정·인증 상태는 바뀌지 않습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModal(null)}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={modal.onOk}>{modal.okLabel}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
