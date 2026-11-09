/* 결재라인조회 팝업 — ACC-021 자금일보 slide 14(화면) · slide 21(E05 규칙).
   열리는 곳 2군데: 툴바 [결재라인설정](E05 — [확인] = 기본 결재라인 저장) · 상신 모달 [결재라인조회]/🔍([확인] = 상신 모달 결재선 반영).
   반영 대상은 호출부가 onConfirm 으로 정한다(팝업은 결재라인 사본만 고친다).

   설계서 → 우리 규약
   - 검색: 부서(콤보, 기본 = 기안자 부서 자금관리팀 · '전체' 추가) — 바꾸면 즉시 조회 · 성명/아이디 — [조회](🔍)/Enter 때 조회.
   - 사용자 목록 = 결과 AG Grid 4열(아이디·성명·직위·부서) + 맨 앞 선택 열. 설계서 '선택' 라디오 열 → 단건(singleRow) + DS 체크박스 열
     (그리드 선택 표시는 DS Checkbox 하나로 통일 — aggrid_selection, code_manage 단건 동형). 행 본문 클릭으로는 선택하지 않는다.
     다시 누르면 해제(→ [추가] 시 '사용자를 선택해 주세요.'). 행 더블클릭 = 바로 [추가]. 2026-11-06 사용자 결정(종전: 행 클릭 선택).
   - 지정: 결재선/합의선 라디오(DS RadioGroup) + 단계 1~3 콤보 → [추가].
       미선택 = '사용자를 선택해 주세요.'(팝업 유지) · 그 단계에 다른 사용자가 있으면 확인 '이미 지정된 단계입니다. 변경하시겠습니까?' → 확인 시 교체.
   - 지정 현황(결재 1~3 · 합의 1~3)을 팝업 안에 표 — 칸마다 [해제] 아이콘. 설계서에 없는 보조 표시(PM 확인).
   - [닫기]/× = 반영 없이 닫힘 · [확인] = onConfirm(사본) 후 닫힘. [확인]은 서버 실행이 아니라 반영이므로 일반 primary Button.
   크롬: 46px 패밀리 · max-w-[640px] · onInteractOutside 막음. 확인 대화상자는 AlertDialogAction onClick 대신 일반 Button(exit 애니메이션 보존). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GetRowIdParams, GridApi, RowDoubleClickedEvent, RowSelectionOptions, SelectionChangedEvent } from 'ag-grid-community';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { toast } from '../../ui/sonner';
import { SchemaField, drawerInputStyle } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { SELECTION_COL } from '../../aggrid_selection';   // 선택 열 = DS Checkbox(SSOT)
import '../../aggrid_shared.css';
import { APPROVAL_DEPTS, APPROVAL_USERS, DRAFTER } from './daily_cash_data';
import type { ApprovalUser } from './daily_cash_data';
import { LINE_LABEL, MSG, STEPS, assignSlot, cloneLine, searchUsers, slotTaken, userLabel, userOrg } from './daily_cash_model';
import type { ApprovalLine, LineKind, Step } from './daily_cash_model';

const { Button, IconBtn } = UI;

const COLS: ColDef<ApprovalUser>[] = [
  { field: 'id', headerName: '아이디', width: 110, minWidth: 100 },
  { field: 'name', headerName: '성명', flex: 1, width: 120, minWidth: 100 },
  { field: 'position', headerName: '직위', width: 100, minWidth: 90 },
  { field: 'dept', headerName: '부서', flex: 1, width: 140, minWidth: 120 },
];
const COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
/* 사용자 1명 고르기 — 단건 + 체크박스 열로만 선택(설계서 '선택' 라디오 열 대응, 본문 클릭 선택 없음) */
const ROW_SELECTION: RowSelectionOptions<ApprovalUser> = { mode: 'singleRow', checkboxes: true, enableClickSelection: false };
const getRowId = (p: GetRowIdParams<ApprovalUser>) => p.data.id;

const ALL = '전체';
const F_DEPT: FieldSpec = { key: 'dept', label: '부서', control: 'select', options: [ALL, ...APPROVAL_DEPTS] };
const F_STEP: FieldSpec = { key: 'step', label: '단계', control: 'select', options: STEPS.map(String) };

const keyStyle: CSSProperties = { fontSize: 13 };
const labelStyle: CSSProperties = { fontSize: 13.5, color: 'var(--foreground)', cursor: 'pointer', userSelect: 'none' };
const KINDS: LineKind[] = ['approval', 'agreement'];

export interface LinePreset { kind: LineKind; step: Step }

export function ApprovalLineModal({ open, onOpenChange, line, preset, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 열 때 보여 줄 결재라인(호출부 값 — 팝업은 사본만 고친다) */
  line: ApprovalLine;
  /** 🔍 로 열 때 지정 위치 미리 선택(없으면 결재선 1단계) */
  preset?: LinePreset;
  onConfirm: (line: ApprovalLine) => void;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const apiRef = useRef<GridApi<ApprovalUser> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dept, setDept] = useState<string>(DRAFTER.dept);
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState<ApprovalUser | null>(null);
  const [kind, setKind] = useState<LineKind>('approval');
  const [step, setStep] = useState<Step>(1);
  const [work, setWork] = useState<ApprovalLine>(() => cloneLine(line));
  const [confirm, setConfirm] = useState<ApprovalUser | null>(null);   // 교체 확인 대상

  /* 열릴 때마다 초기화 — 호출부 결재라인 사본 · 지정 위치 preset */
  useEffect(() => {
    if (!open) return;
    setDept(DRAFTER.dept); setKeyword(''); setQuery(''); setSel(null); setConfirm(null);
    setKind(preset?.kind ?? 'approval'); setStep(preset?.step ?? 1);
    setWork(cloneLine(line));
  }, [open, line, preset]);

  const rows = useMemo(() => searchUsers(APPROVAL_USERS, dept === ALL ? '' : dept, query), [dept, query]);
  const search = () => setQuery(keyword);

  const onSelectionChanged = useCallback((e: SelectionChangedEvent<ApprovalUser>) => setSel(e.api.getSelectedRows()[0] ?? null), []);
  const onRowDataUpdated = () => setSel(apiRef.current?.getSelectedRows()[0] ?? null);

  const place = (u: ApprovalUser) => { setWork((w) => assignSlot(w, kind, step, u)); };
  /* [추가] — 미선택 / 단계 점유(확인 후 교체) / 추가 */
  const add = (u: ApprovalUser | null) => {
    if (!u) { toast.error(MSG.noUser); return; }
    if (slotTaken(work, kind, step, u)) { setConfirm(u); return; }
    place(u);
  };
  const onRowDoubleClicked = (e: RowDoubleClickedEvent<ApprovalUser>) => { if (e.data) add(e.data); };

  const ok = () => { onConfirm(cloneLine(work)); dlgRef.current?.close(); };

  return (
    <Dialog ref={dlgRef} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>결재라인조회</DialogTitle>
          <DialogDescription className="sr-only">부서·성명으로 사용자를 찾아 결재선·합의선 단계에 지정합니다</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-[46px] py-[28px]">
          {/* 검색 */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="font-semibold text-muted-foreground shrink-0" style={keyStyle}>부서</span>
            <div style={{ width: 160 }}><SchemaField field={F_DEPT} value={dept} onChange={setDept} fill /></div>
            <span className="font-semibold text-muted-foreground shrink-0" style={keyStyle}>성명</span>
            <input ref={inputRef} type="text" value={keyword} placeholder="성명 또는 아이디" aria-label="성명 또는 아이디 검색어"
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
              style={{ ...drawerInputStyle('text'), flex: 1, minWidth: 140, width: 'auto' }} />
            <IconBtn icon="search" label="조회" size={34} onClick={search} />
          </div>

          <div role="region" aria-label="사용자 목록 — 선택 열에서 1명을 체크하고 추가(행 더블클릭은 바로 추가)" style={{ height: 260 }}>
            <AgGridReact<ApprovalUser>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={COLS}
              defaultColDef={COL_DEF}
              getRowId={getRowId}
              rowSelection={ROW_SELECTION}
              selectionColumnDef={SELECTION_COL}
              onGridReady={(e) => { apiRef.current = e.api; }}
              onSelectionChanged={onSelectionChanged}
              onRowDataUpdated={onRowDataUpdated}
              onRowDoubleClicked={onRowDoubleClicked}
              overlayNoRowsTemplate="<span>검색 결과가 없습니다.</span>"
            />
          </div>
          <p className="text-caption mt-2" aria-live="polite" style={{ fontSize: 12.5, minHeight: 18 }}>{`${String(rows.length)}건`}</p>

          {/* 지정 */}
          <div className="flex items-center gap-3 flex-wrap mt-2">
            <span className="font-semibold text-muted-foreground shrink-0" style={keyStyle}>지정</span>
            <RadioGroup value={kind} onValueChange={(v) => setKind(v as LineKind)} aria-label="지정" style={{ minHeight: 34 }}>
              {KINDS.map((k) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <RadioGroupItem id={`approval-line-kind-${k}`} value={k} aria-label={`지정 ${LINE_LABEL[k]}선`} />
                  <label htmlFor={`approval-line-kind-${k}`} style={labelStyle}>{`${LINE_LABEL[k]}선`}</label>
                </span>
              ))}
            </RadioGroup>
            <span className="font-semibold text-muted-foreground shrink-0" style={keyStyle}>단계</span>
            <div style={{ width: 88 }}><SchemaField field={F_STEP} value={String(step)} onChange={(v) => setStep(Number(v) as Step)} fill /></div>
            <Button variant="outline" size="md" leadingIcon="plus" onClick={() => add(sel)}>추가</Button>
          </div>

          {/* 지정 현황 */}
          <section aria-label="지정 현황" className="mt-5">
            <h3 className="flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3 m-0">지정 현황</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
              {KINDS.map((k) => (
                <ul key={k} className="m-0 p-0" style={{ listStyle: 'none' }} aria-label={`${LINE_LABEL[k]}선`}>
                  {work[k].map((u, i) => (
                    <li key={i} className="flex items-center gap-2 border-b border-border" style={{ minHeight: 36, fontSize: 13.5 }}>
                      <span className="font-semibold text-muted-foreground shrink-0" style={{ width: 48 }}>{`${LINE_LABEL[k]} ${String(i + 1)}`}</span>
                      <span className="min-w-0 flex-1 truncate">{u ? `${userLabel(u)} · ${userOrg(u)}` : <span className="text-caption">-</span>}</span>
                      {u && <IconBtn icon="x" label={`${LINE_LABEL[k]} ${String(i + 1)} 해제`} size={28}
                        onClick={() => setWork((w) => assignSlot(w, k, (i + 1) as Step, null))} />}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant="primary" size="md" onClick={ok}>확인</Button>
          </div>
        </DialogFooter>

        {/* 단계 점유 확인 — 확인 = 교체 */}
        <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) setConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>단계 변경 확인</AlertDialogTitle>
              <AlertDialogDescription>{MSG.slotTaken}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <Button variant="primary" size="sm" onClick={() => { if (confirm) place(confirm); setConfirm(null); }}>변경</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
