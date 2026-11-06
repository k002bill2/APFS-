/* 자금일보 전자결재 상신 모달 — ACC-021 slide 12(화면·항목·처리 규칙) · slide 20(E04 규칙).
   설계서 → 우리 규약
   - 기안 정보 = 한글 kv 그리드(가로 배열 — apfs-form-modal "읽기전용 명세 kv"): 문서번호 '자동채번'(표시) · 제목(입력, 기본 '자금일보 (기준일자)') ·
     기준일자(표시) · 기안자(표시, 성명 / 부서).
   - 결재선(결재 1~3) · 합의선(합의 1~3) = AG Grid 2장(고정 슬롯 3행, 빈 슬롯 '-') — 단계 · 결재자(아이디 성명) · 직위/부서 ·
     검색(🔍 → 결재라인조회 팝업을 그 선·단계로 열기, 초점 셀 Enter 동치). 두 그리드는 같은 고정 열폭(GRID_COLS)이라 열 경계가 맞는다.
     정렬·행선택·행 클릭 동작 없음(apfs-aggrid "조회 전용" — rowSelection 자체를 두지 않는다).
     [결재라인조회] = 팝업을 결재선 1단계로 연다. 팝업 [확인] = 이 모달 결재선에 반영(기본 결재라인은 바꾸지 않는다).
   - 전자결재 비고(textarea) · 첨부파일 표시 '자금일보_기준일자.pdf (출력 화면 PDF 변환 · 자동 첨부)' · 안내 '[상신] 시 전자문서 대기함(알림함)으로 올라갑니다.'
   - [닫기] = 반영 없이 닫힘 · [상신] = SaveButton(busyLabel '상신 중'). 결재선 미지정 = '결재선을 지정해 주세요.'(모달 유지) ·
     정상 = onSubmitted → 토스트 '상신되었습니다.' → 닫힘.
   결정·가정
   - 열 때마다 초기 결재선 = 페이지의 기본 결재라인(E05 저장값), 제목·비고 초기화.
   - 상신 확인 대화상자(설계서 '확인 후 처리')는 두지 않는다 — SaveButton 진행 표시로 대신(PM 확인).
   - 실제 PDF 변환·전자문서 대기함 연동은 백엔드 없음(파일명 표시만). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellKeyDownEvent, ColDef, GetRowIdParams, ICellRendererParams } from 'ag-grid-community';
import { Paperclip, TriangleAlert } from 'lucide-react';
import { UI } from '../../components';
import type { SubmitResult } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { Alert, AlertDescription } from '../../ui/alert';
import { toast } from '../../ui/sonner';
import { SchemaField } from '../../schemas/renderers';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import '../../aggrid_shared.css';
import type { FieldSpec } from '../../schemas/types';
import { DRAFTER } from './daily_cash_data';
import { LINE_LABEL, MSG, cloneLine, draftTitle, pdfName, userLabel, userOrg, validateSubmit } from './daily_cash_model';
import type { ApprovalLine, LineKind, Step } from './daily_cash_model';
import type { ApprovalUser } from './daily_cash_data';
import { ApprovalLineModal } from './approval_line_modal';
import type { LinePreset } from './approval_line_modal';

const { Button, IconBtn, SaveButton } = UI;

export interface ApprovalSubmission { title: string; date: string; line: ApprovalLine; memo: string; attachment: string; submittedAt: string }

const F_TITLE: FieldSpec = { key: 'title', label: '제목', control: 'text', required: true };
const F_MEMO: FieldSpec = { key: 'memo', label: '전자결재 비고', control: 'textarea' };

const KV_COLS: CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: CSSProperties = { padding: '8px 12px', fontSize: 13 };
const SECTION = 'flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3 m-0';

/* ── 결재선·합의선 그리드 ── 행 = 고정 슬롯(단계 1~3). 열 정의는 두 그리드 공용 → 열 경계가 맞는다(AUTO_SIZE_CONTENT 금지 — 내용 따라 폭이 갈린다) */
interface SlotRow { id: string; kind: LineKind; step: Step; name: string; user: ApprovalUser | null }
const SEARCH_COL = 'search';
const COL_DEF = { ...DEFAULT_COL_DEF, sortable: false, resizable: false } as const;   // 모듈 상수(인라인 금지 — 폭 리셋). resizable 끔 = 한쪽만 늘려 두 그리드 열 경계가 어긋나지 않게
const getRowId = (p: GetRowIdParams<SlotRow>) => p.data.id;
const dash = <span className="text-caption">-</span>;
/* 행 안 버튼(🔍)에서 온 키 이벤트는 버튼이 직접 처리 — 그리드 Enter 동치와 이중 실행 방지 */
const fromButton = (ev: Event | null | undefined) => !!(ev?.target as Element | null)?.closest?.('button');

function SearchCell(p: ICellRendererParams<SlotRow> & { onPick: (kind: LineKind, step: Step) => void }) {
  const r = p.data;
  if (!r) return null;
  return <IconBtn icon="search" label={`${r.name} 결재자 검색`} size={30} onClick={() => p.onPick(r.kind, r.step)} />;
}

function slotRows(line: ApprovalLine, kind: LineKind): SlotRow[] {
  return line[kind].map((u, i) => {
    const step = (i + 1) as Step;
    const name = `${LINE_LABEL[kind]} ${String(step)}`;
    return { id: `${kind}-${String(step)}`, kind, step, name, user: u };
  });
}

function Kv({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <div className={`grid bg-card ${full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
      <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{label}</dt>
      <dd className="m-0 flex items-center min-w-0" style={{ padding: '6px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>{children}</dd>
    </div>
  );
}

/* 라벨 래퍼 — SchemaField 가 컨트롤을 안에 그려 정적 분석이 연결을 못 본다(user_form_modal Field 와 같은 동적 태그) */
const FieldLabel: any = 'label';

const KINDS: LineKind[] = ['approval', 'agreement'];
const KIND_TITLE: Record<LineKind, string> = { approval: '결재선', agreement: '합의선 (협조)' };

export function ApprovalSubmitModal({ open, onOpenChange, date, defaultLine, onSubmitted }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;                       // 조회 기준일자
  defaultLine: ApprovalLine;          // 기본 결재라인(E05 저장값)
  onSubmitted: (s: ApprovalSubmission) => void;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const [title, setTitle] = useState(draftTitle(date));
  const [memo, setMemo] = useState('');
  const [line, setLine] = useState<ApprovalLine>(() => cloneLine(defaultLine));
  const [picker, setPicker] = useState<{ open: boolean; preset: LinePreset }>({ open: false, preset: { kind: 'approval', step: 1 } });
  const [titleErr, setTitleErr] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(draftTitle(date)); setMemo(''); setLine(cloneLine(defaultLine)); setTitleErr(false);
  }, [open, date, defaultLine]);

  const attachment = useMemo(() => pdfName(date), [date]);
  const openPicker = useCallback((kind: LineKind, step: Step) => setPicker({ open: true, preset: { kind, step } }), []);

  /* 두 그리드 공용 열 정의 — 고정 폭(단계 88 · 검색 72) + flex 2열. 렌더마다 새로 만들지 않는다 */
  const columnDefs = useMemo<ColDef<SlotRow>[]>(() => [
    { field: 'name', headerName: '단계', width: 88, minWidth: 88, maxWidth: 88, cellStyle: { fontWeight: 600 } },
    { colId: 'user', headerName: '결재자(아이디)', flex: 1, width: 200, minWidth: 160, cellClass: 'tabular',
      valueGetter: (p) => (p.data?.user ? userLabel(p.data.user) : ''), cellRenderer: (p: ICellRendererParams<SlotRow>) => (p.data?.user ? userLabel(p.data.user) : dash) },
    { colId: 'org', headerName: '직위 / 부서', flex: 1, width: 200, minWidth: 160,
      valueGetter: (p) => (p.data?.user ? userOrg(p.data.user) : ''), cellRenderer: (p: ICellRendererParams<SlotRow>) => (p.data?.user ? userOrg(p.data.user) : dash) },
    { colId: SEARCH_COL, headerName: '검색', width: 72, minWidth: 72, maxWidth: 72,
      cellRenderer: SearchCell, cellRendererParams: { onPick: openPicker }, cellStyle: { display: 'flex', alignItems: 'center' },   // 아이콘 버튼 세로 가운데(가로는 좌측 — deleted_journal AttachCell 선례)
      suppressKeyboardEvent: (p) => p.event.key === 'Tab' || fromButton(p.event) },
  ], [openPicker]);
  /* 초점 셀 Enter(검색 열) = 🔍 클릭과 같은 동작 */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<SlotRow>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data || e.column.getColId() !== SEARCH_COL || fromButton(ev)) return;
    openPicker(e.data.kind, e.data.step);
  }, [openPicker]);
  const rowsByKind = useMemo(() => ({ approval: slotRows(line, 'approval'), agreement: slotRows(line, 'agreement') }), [line]);

  /* E04 상신 — 결재선 미지정 = 모달 유지 · 정상 = 기록 + 토스트 + 닫힘 */
  const submit = (): SubmitResult => {
    if (!title.trim()) { setTitleErr(true); toast.error('제목을 입력해 주세요.'); return undefined; }
    const err = validateSubmit(line);
    if (err) { toast.error(err); return undefined; }
    return () => {
      onSubmitted({ title: title.trim(), date, line: cloneLine(line), memo, attachment, submittedAt: new Date().toISOString() });
      toast.success(MSG.submitted);
      dlgRef.current?.close();
    };
  };

  return (
    <Dialog ref={dlgRef} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>자금일보 전자결재 상신</DialogTitle>
          <DialogDescription className="sr-only">결재선·합의선을 지정하고 자금일보를 전자문서 대기함으로 상신합니다</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-[46px] py-[28px]">
          {/* ── 기안 정보 ── */}
          <section aria-label="기안 정보">
            <h3 className={SECTION}>기안 정보</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
              <Kv label="문서번호" full><span className="text-caption">자동채번</span></Kv>
              <Kv label="제목" full>
                <div className="w-full">
                  <SchemaField field={F_TITLE} value={title} onChange={(v) => { setTitle(v); if (titleErr) setTitleErr(false); }} invalid={titleErr} fill />
                </div>
              </Kv>
              <Kv label="기준일자"><span className="tabular">{date}</span></Kv>
              <Kv label="기안자">{`${DRAFTER.name} / ${DRAFTER.dept}`}</Kv>
            </dl>
          </section>

          {/* ── 결재선 · 합의선 ── */}
          {KINDS.map((k) => (
            <section key={k} aria-label={KIND_TITLE[k]} className="mt-6">
              <h3 className={SECTION}>
                {KIND_TITLE[k]}
                {k === 'approval' && <span className="ml-auto"><Button variant="outline" size="sm" leadingIcon="users" onClick={() => openPicker('approval', 1)}>결재라인조회</Button></span>}
              </h3>
              {/* apfs-grid-min: 3행 autoHeight 그리드 아래 AG Grid 기본 최소 본문높이(150px) 빈 띠 제거(aggrid_shared.css)
                  border-y: apfsTheme 는 wrapperBorder:false(페이지 프레임용)라 외곽선이 없고, AG Grid 는 본문이 꽉 찬 마지막 행의
                  하단선도 지운다 → 모달 안에선 표 위·아래가 열려 보여 상·하단 선을 래퍼에 직접 긋는다(2026-11-06 사용자 지적). */}
              <div className="apfs-grid-min border-y border-border" role="region" aria-label={`${KIND_TITLE[k]} — 단계별 결재자, 검색 열에서 결재자 지정`}>
                <AgGridReact<SlotRow>
                  theme={apfsTheme}
                  rowData={rowsByKind[k]}
                  columnDefs={columnDefs}
                  defaultColDef={COL_DEF}
                  getRowId={getRowId}
                  domLayout="autoHeight"
                  suppressMovableColumns
                  onCellKeyDown={onCellKeyDown}
                />
              </div>
            </section>
          ))}

          {/* ── 비고 · 첨부 ── */}
          <section aria-label="비고 및 첨부" className="mt-6">
            <h3 className={SECTION}>비고 · 첨부</h3>
            <FieldLabel className="block mb-3.5">
              <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>전자결재 비고</span>
              <SchemaField field={F_MEMO} value={memo} onChange={setMemo} fill />
            </FieldLabel>
            <div className="mb-3.5">
              <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>첨부파일</span>
              <span className="inline-flex items-center gap-2 border border-border bg-muted" style={{ padding: '5px 10px', borderRadius: 6, fontSize: 13 }}>
                <Paperclip size={14} strokeWidth={2} aria-hidden />
                <span className="font-semibold">{attachment}</span>
                <span className="text-caption">(출력 화면 PDF 변환 · 자동 첨부)</span>
              </span>
            </div>
            <Alert variant="warning">
              <TriangleAlert />
              <AlertDescription>[상신] 시 전자문서 대기함(알림함)으로 올라갑니다.</AlertDescription>
            </Alert>
          </section>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton size="md" leadingIcon="file-check" busyLabel="상신 중" onSubmit={submit}>상신</SaveButton>
          </div>
        </DialogFooter>

        {/* 결재라인조회 — [확인] = 이 모달 결재선 반영 */}
        <ApprovalLineModal open={picker.open} onOpenChange={(o) => setPicker((p) => ({ ...p, open: o }))}
          line={line} preset={picker.preset} onConfirm={setLine} />
      </DialogContent>
    </Dialog>
  );
}
