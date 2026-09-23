/* 사용자 초대(운용사) — 관리형 리스트 페이지 (관리자 > 사용자·권한 관리 > 사용자 초대(운용사), route user-invite-gp).
   출처: S0_103_사용자초대_운용사.html(공통관리 KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(운용사·재직상태·검색어) → 주 필터 1개 = 초대상태 FilterChip(툴바 좌, 브리프) + 상세필터 드로어(검색어·운용사·재직상태). 검색어 opt-in.
   - 그리드(No·운용사·성명·이메일·재직·초대상태·초대일시·만료) → AG Grid 단일 헤더. 초대상태 배지 lg.
   - 행 선택 → [초대 발송](재직·미초대) [재발송][초대 취소](초대발송) [메일 미리보기](항상) — 브리프의 초대 생성·재발송·취소 UI.
       게이팅은 user_invite_model.inviteGate. 발송·재발송·취소는 AlertDialog 확인 후 로컬 상태 전이 + 발송 일시 기록(유효 72시간).
   - 초대 메일 미리보기 → 공용 `MailPreviewDialog`(실제 발송 없음). 미리보기 안 [이 내용으로 초대 발송]은 발송 가능한 행에서만.
   - 등록 없음(초대 소스 = 운용사 전자보고 운용인력 명단 — 목업) → 툴바 kebab 단독(apfs-grid 규약). 엑셀은 kebab + 푸터 download + ⌥D.
   - KPI 배지 행 미포함(사용자 확정) · 카드뷰 없음 · 명세 팝업 없음.
   ⚠ 실제 메일 발송·계정 생성·사전 승인이 아니다 — 화면 로컬 더미 상태만(브리프). 실명 아님. */
import './aggrid_shared.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from './aggrid_theme';
import { SELECTION_COL, restoreSelection } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowContextMenu } from './row_context_menu';
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { orgName, orgsOf } from './admin_demo_data';
import { demoPersonnel, filterInvites, inviteGate, inviteState, INVITE_STATES, INVITE_TONE, INVITE_TTL_HOURS, inviteExpiresAt, sendInvite, cancelInvite } from './user_invite_model';
import type { InviteRow, InviteState } from './user_invite_model';
import { MailPreviewDialog, MASKED_LINK } from './admin_mail_preview';
import type { MailSpec } from './admin_mail_preview';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

const SEARCHABLE = true;
const nowStamp = () => format(new Date(), 'yyyy-MM-dd HH:mm');

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 + 초대일시·만료(브리프: 초대 상태 목록화)
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };
type InviteView = InviteRow & { orgn: string; state: InviteState; expiresAt: string };

const columnDefs: ColDef<InviteView>[] = [
  { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: centerNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'orgn', headerName: '운용사', width: 160, minWidth: 130, maxWidth: 220, cellStyle: flexCenter, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'name', headerName: '성명', width: 110, maxWidth: 160, cellStyle: flexCenter, cellRenderer: (p: any) => <span className="font-semibold"><MT>{p.value}</MT></span> },
  { field: 'email', headerName: '이메일', flex: 1, width: 200, minWidth: 160, cellStyle: muted, cellRenderer: (p: any) => <MT>{p.value}</MT> },
  { field: 'active', headerName: '재직', width: 88, maxWidth: 88, cellStyle: flexMid, valueFormatter: (p) => (p.value ? '재직' : '퇴사'),
    cellRenderer: (p: any) => <StatusBadge tone={p.value ? 'success' : 'danger'} label={p.value ? '재직' : '퇴사'} size="md" dot={false} /> },
  { field: 'state', headerName: '초대상태', width: 110, maxWidth: 110, cellStyle: flexMid, cellRenderer: (p: any) => <StatusBadge tone={INVITE_TONE[p.value as InviteState]} label={p.value} size="lg" dot={false} /> },
  { field: 'invitedAt', headerName: '초대일시', width: 156, maxWidth: 156, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' }, valueFormatter: (p) => (p.value ? mn(p.value) : '-') },
  { field: 'expiresAt', headerName: `만료(${INVITE_TTL_HOURS}시간)`, width: 156, maxWidth: 156, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' },
    valueFormatter: (p) => (p.data?.state === '초대발송' && p.value ? mn(p.value) : '-') },
];
/* 다중 선택이 기본(2026-09-23 사용자 결정 — 전 리스트 공통). 단일 대상 액션은 selCount===1 에서만 노출한다.
   행 본문 클릭 선택 해제 — 체크박스로만 on/off (2026-09-22, apfs-aggrid "체크박스" 절) */
const ROW_SELECTION: RowSelectionOptions<InviteView> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };
const STATE_CHIPS = ['', ...INVITE_STATES] as const;

type XCol = { header: string; get: (r: InviteView) => string };
const EXPORT_COLS: XCol[] = [
  { header: '운용사', get: (r) => r.orgn }, { header: '성명', get: (r) => r.name }, { header: '이메일', get: (r) => r.email },
  { header: '재직', get: (r) => (r.active ? '재직' : '퇴사') }, { header: '초대상태', get: (r) => r.state }, { header: '초대일시', get: (r) => r.invitedAt }, { header: '만료', get: (r) => r.expiresAt },
];

/* 초대 메일 본문(목업 mail) — 링크 토큰·QR·OTP 미표시 */
function inviteMail(r: InviteView): MailSpec {
  return {
    subject: `[농림수산식품모태펀드] 계정 초대 안내 — ${r.name}님 (${r.orgn})`, to: `${r.name} <${r.email}>`, stamp: r.invited ? '발송됨' : '예시',
    body: `${r.name}님, 안녕하세요.\n농림수산식품모태펀드 투자자산관리시스템에 사용자 계정으로 초대되셨습니다.\n\n■ 초대 정보\n · 소속: ${r.orgn} (운용사)\n · 부여 권한: 운용사\n · 초대: 농금원 투자관리부\n · 유효기간: 발송 후 ${INVITE_TTL_HOURS}시간(만료 시 재발송 요청)\n\n■ 가입 절차 (약 3분)\n 1) 아래 [초대 수락하기] 클릭\n 2) 간편인증(휴대폰 본인확인) — 초대 대상 실명과 일치해야 활성화됩니다\n 3) 비밀번호 설정 + 2차 인증(OTP) 등록 — 화면의 QR을 인증앱으로 스캔\n 4) 앱에 표시된 6자리 1회 입력 → 등록 완료\n\n   [ 초대 수락하기 ]\n   ${MASKED_LINK}\n\n■ 보안 안내\n · 본 링크는 본인에게만 유효하며 ${INVITE_TTL_HOURS}시간 후 만료됩니다.\n · QR코드·비밀번호·OTP는 이메일로 발송되지 않으며, 본인확인 후 화면에서만 표시됩니다.\n · 본인이 요청하지 않은 초대라면 링크를 클릭하지 마시고 담당자(농금원 투자관리부)로 문의해 주세요.\n\n본 메일은 발신전용입니다.`,
  };
}

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
/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'mail'; id: string }
  | { kind: 'confirm'; title: string; desc: string; okLabel: string; onOk: () => void };

export function UserInviteManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<InviteView> | null>(null);
  const [rows, setRows] = useState<InviteRow[]>(() => demoPersonnel());
  /* 선택 SSOT — 체크된 행 id 배열. selId(첫 행)·selCount 는 파생이라 둘이 어긋날 수 없다(Codex 리뷰 2026-09-23) */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selId = selIds[0] ?? null;      // 단일 액션 대상(선택 1건일 때만 쓴다)
  const selCount = selIds.length;       // 단일/다건 분기의 SSOT
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();

  const [filterOpen, setFilterOpen] = useState(false);
  const [fState, setFState] = useState<typeof STATE_CHIPS[number]>('');
  const [fOrg, setFOrg] = useState('');
  const [fActive, setFActive] = useState<'' | '재직' | '퇴사'>('');
  const [fText, setFText] = useState('');
  const clearFilters = () => { setFState(''); setFOrg(''); setFActive(''); setFText(''); };

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  const visible = useMemo<InviteView[]>(() => filterInvites(rows, { org: fOrg, active: fActive, state: fState, kw: fText })
    .map((r) => ({ ...r, orgn: orgName(r.org), state: inviteState(r), expiresAt: inviteExpiresAt(r.invitedAt) })), [rows, fOrg, fActive, fState, fText]);

  /* 선택 SSOT = selIds(배열). multiRow 라 복원도 **선택 전체**를 되돌린다 — 첫 id 만 되살리면 clearSelection 이
     나머지 체크를 지워 사용자가 아무것도 안 했는데 다건 선택이 1건으로 줄어든다(Codex 리뷰 2026-09-23). */
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const onGridReady = useCallback((e: GridReadyEvent<InviteView>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<InviteView>) => {
    setSelIds(e.api.getSelectedRows().map((r) => r.id));
  }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<InviteView> }) => {
    restoreSelection(e.api, selIdsRef.current);
  }, []);
  const openPreview = useCallback((id: string) => setModal({ kind: 'mail', id }), []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<InviteView>) => { if (e.data && !e.rowPinned) openPreview(e.data.id); }, [openPreview]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<InviteView>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    openPreview(e.data.id);
  }, [openPreview]);

  /* 단일 대상 액션은 **정확히 1건** 체크일 때만 — 다건 선택에 단건 모달·전이는 의미가 없다(2026-09-23) */
  const single = selCount === 1 && selId ? visible.find((r) => r.id === selId) ?? null : null;
  const gate = inviteGate(single);
  const previewRow = modal?.kind === 'mail' ? visible.find((r) => r.id === modal.id) ?? null : null;

  /* ── 전이(목업 doSend + 브리프 재발송·취소) — 확인 → 로컬 상태 → toast ── */
  const patchRow = (id: string, fn: (r: InviteRow) => InviteRow) => setRows((prev) => prev.map((r) => (r.id === id ? fn(r) : r)));
  const doSend = (r: InviteView, resend: boolean) => {
    patchRow(r.id, (x) => sendInvite(x, nowStamp()));
    toast.success(`초대 메일 ${resend ? '재발송' : '발송'}: ${r.name} (${r.orgn}) — 감사로그에 기록됩니다 (목업)`);
  };
  const askSend = (r: InviteView, resend: boolean) => setModal({
    kind: 'confirm', title: resend ? '초대 재발송' : '초대 발송', okLabel: resend ? '재발송' : '발송',
    desc: `${r.name} (${r.orgn}) 님에게 초대 메일을 ${resend ? '다시 ' : ''}발송할까요? 부여 권한 = 운용사 · 유효기간 ${INVITE_TTL_HOURS}시간`,
    onOk: () => doSend(r, resend),
  });
  const askCancel = (r: InviteView) => setModal({
    kind: 'confirm', title: '초대 취소', okLabel: '초대 취소', desc: `${r.name} (${r.orgn}) 님의 초대를 취소할까요? 발송된 링크는 무효 처리되고 미초대 상태로 돌아갑니다.`,
    onOk: () => { patchRow(r.id, cancelInvite); toast.success(`초대 취소: ${r.name} — 미초대로 되돌렸습니다 (목업)`); },
  });
  const handleCellContextMenu = (e: CellContextMenuEvent<InviteView>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const g = inviteGate(row);
    const items: CtxItem[] = [
      { label: '메일 미리보기', icon: 'eye', onSelect: () => openPreview(row.id) },
      ...(g.send ? [{ label: '초대 발송', icon: 'bell', onSelect: () => askSend(row, false) } as CtxItem] : []),
      ...(g.resend ? [{ label: '재발송', icon: 'refresh', onSelect: () => askSend(row, true) } as CtxItem] : []),
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      ...(g.cancel ? ['sep' as const, { label: '초대 취소', icon: 'x', danger: true, onSelect: () => askCancel(row) } as CtxItem] : []),
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };
  const refresh = () => { setRows(demoPersonnel()); apiRef.current?.deselectAll(); clearFilters(); toast.success('새로고침했습니다'); };

  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => (masked ? '' : c.get(r))));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '이메일' || c.header === '운용사' ? 26 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '사용자 초대');
    XLSX.writeFile(wb, '사용자초대_운용사.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const chips: [string, string, () => void][] = [
    ['운용사', fOrg && orgName(fOrg), () => setFOrg('')],
    ['재직상태', fActive, () => setFActive('')],
    ['검색어', fText.trim(), () => setFText('')],
  ];

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다
     (contextActions 슬롯). 그래서 선택 시 toolbarLeft 는 비워 둔다 — 둘 다 넘기면 탭 스톱이 2벌 된다. */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{mn(String(selCount))}건 선택됨</span>
      {single && <>
      <StatusBadge tone={INVITE_TONE[single.state]} label={single.state} size="lg" dot={false} />
      {gate.send && <Button variant="primary" size="sm" leadingIcon="bell" onClick={() => askSend(single, false)}>초대 발송</Button>}
      {gate.resend && <Button variant="primary" size="sm" leadingIcon="refresh" onClick={() => askSend(single, true)}>재발송</Button>}
      <Button variant="outline" size="sm" leadingIcon="eye" onClick={() => openPreview(single.id)}>메일 미리보기</Button>
      {gate.cancel && <Button variant="outline" size="sm" leadingIcon="x" style={{ color: 'var(--danger)' }} onClick={() => askCancel(single)}>초대 취소</Button>}
      </>}
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;
  return (
    <GridFrame
      crumbs={['홈', '관리자', '사용자·권한 관리', '사용자 초대(운용사)']}
      title="사용자 초대(운용사)"
      favRoute="user-invite-gp"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={selCount > 0 ? null : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {STATE_CHIPS.map((s) => <FilterChip key={s || 'all'} active={fState === s} onClick={() => setFState(s)}>{s || '전체'}</FilterChip>)}
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
      contextActions={selActions}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(rows.length)) + '명 중 ' + mn(String(visible.length)) + '명 표시 중'}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div>
        <AgGridReact<InviteView>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onModelUpdated={refreshNoColumn}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">초대 대상 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="검색어">
                <input type="text" value={fText} onChange={(e) => setFText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="성명 · 이메일" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="운용사"><DrawerSelect value={fOrg} onChange={setFOrg} options={orgsOf('GP').map((o) => ({ value: o.id, label: o.name }))} /></DrawerField>
            <DrawerField label="재직상태"><DrawerSelect value={fActive} onChange={(v) => setFActive(v as '' | '재직' | '퇴사')} options={[{ value: '재직', label: '재직' }, { value: '퇴사', label: '퇴사' }]} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 초대 메일 미리보기 — 발송 가능한 행이면 [이 내용으로 초대 발송] ── */}
      {previewRow && (
        <MailPreviewDialog title={`초대 메일 미리보기 — ${previewRow.name}`} mail={inviteMail(previewRow)} onClose={() => setModal(null)}
          action={inviteGate(previewRow).send ? { label: '이 내용으로 초대 발송 (목업)', onClick: () => doSend(previewRow, false) } : undefined} />
      )}
      {modal?.kind === 'confirm' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{modal.title}</AlertDialogTitle>
              <AlertDialogDescription>{modal.desc}<br />화면 시연용 프로토타입 — 실제 메일은 발송되지 않습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={modal.onOk}>{modal.okLabel}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
