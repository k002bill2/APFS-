/* 계정과목 검색 팝업 — ACC-001(상위계정과목) · ACC-002(결산양식 계정코드명·상세필터) · ACC-003(분개 계정과목) 공통.
   명세(ACC-001 slide 13 · ACC-003 slide 14)
   - 계정과목 검색어(코드/명) — Enter 또는 [↵] 로 조회
   - 검색기준 라디오: 계정코드(단일 옵션, 기본)
   - 계정분류 라디오: 전체(기본)/자산/부채/자본/손익 — 바꾸면 즉시 거른다
   - 결과 그리드 4열(계정코드·계정과목명·입력여부·차대구분), 세로 스크롤, 코드 오름차순, 행 클릭 = 단일 선택
   - 행 더블클릭 = 바로 반영 · [확인] 미선택 = "계정과목을 선택해 주세요." · [닫기]/× = 반영 없이 닫힘
   선택 가능 범위는 호출부가 `selectable` 로 정한다(상위계정=집계 N 만, 분개=입력 Y 만 등) — 여기서 하드코딩하지 않는다.
   선택 불가 행을 고르면 [확인]이 비활성되고 사유 캡션이 뜬다.
   ACC-001 상위계정은 후보 자체를 `list`(account_code_model `parentCandidates`→`toAccountItem`)로 좁히고,
   폼 계정분류로 라디오를 고정(`fixedClass`)·기존 상위 미리 선택(`initialSelected`)·레벨 안내(`note`)를 넘긴다.
   정렬 규약: 계정코드는 코드라 좌측(명세의 '가운데 정렬'은 프로젝트 표 정렬 규약이 우선한다 — frontend-design-defaults).
   크롬: 46px 패밀리(apfs-form-modal 5 — 헤더·본문·푸터 px-[46px]). [확인]은 서버 실행이 아닌 선택 반영이라 일반 Button. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, FirstDataRenderedEvent, GetRowIdParams, GridApi, RowDoubleClickedEvent, RowSelectionOptions, SelectionChangedEvent } from 'ag-grid-community';
import { UI } from '../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../ui/dialog';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { toast } from '../ui/sonner';
import { drawerInputStyle } from '../schemas/renderers';
import { apfsTheme, DEFAULT_COL_DEF } from '../aggrid_theme';
import '../aggrid_shared.css';
import { ACCOUNTS, ACCOUNT_CLASS_FILTERS, searchAccounts } from './account_data';
import type { AccountItem, AccountClass, AccountClassFilter } from './account_data';

const { Button, IconBtn } = UI;

/* ── 그리드 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다) ── */
const COLS: ColDef<AccountItem>[] = [
  { field: 'code', headerName: '계정코드', width: 120, minWidth: 120 },
  { field: 'name', headerName: '계정과목명', flex: 1, minWidth: 180, width: 180 },
  { field: 'inputYn', headerName: '입력여부', width: 100, minWidth: 100 },
  { field: 'drcr', headerName: '차대구분', width: 100, minWidth: 100 },
];
/* 결과 순서는 코드 오름차순 고정(명세) — 헤더 정렬은 끈다 */
const COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
/* 검색 결과 1건 고르기 — 행 클릭 선택(체크박스 없음). 피커 팝업이라 목록 페이지의 '체크박스로만' 규약 밖 */
const ROW_SELECTION: RowSelectionOptions<AccountItem> = { mode: 'singleRow', checkboxes: false, enableClickSelection: true };
const getRowId = (p: GetRowIdParams<AccountItem>) => p.data.code;
const ALL_OK = () => true;

const labelStyle: React.CSSProperties = { fontSize: 13.5, color: 'var(--foreground)', cursor: 'pointer', userSelect: 'none' };
const keyStyle: React.CSSProperties = { fontSize: 13.5, minWidth: 64 };

export function AccountSearchModal({ open, onOpenChange, onSelect, initialKeyword = '', selectable = ALL_OK, list = ACCOUNTS, fixedClass, initialSelected, note }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (a: AccountItem) => void;
  /** 열릴 때 검색어로 채워 바로 조회 */
  initialKeyword?: string;
  /** 고를 수 있는 계정(기본 전부). false 행은 선택돼도 [확인]·더블클릭이 반영하지 않는다 */
  selectable?: (a: AccountItem) => boolean;
  /** 검색 원천(기본 공용 계정과목) */
  list?: readonly AccountItem[];
  /** 계정분류 고정 — 라디오가 이 분류 하나만 보인다(ACC-001 상위계정: 폼에서 고른 분류와 일치해야 하는 계층 무결성) */
  fixedClass?: AccountClass;
  /** 열릴 때 미리 선택해 둘 계정코드(수정 모드의 기존 값). 결과에 없으면 무시 */
  initialSelected?: string;
  /** 결과 건수 아래 안내문(선택 가능 범위 설명 등) */
  note?: string;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const apiRef = useRef<GridApi<AccountItem> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initialKeyword);
  const [keyword, setKeyword] = useState(initialKeyword);   // 조회에 쓰인 검색어(Enter/↵ 때만 갱신)
  const [cls, setCls] = useState<AccountClassFilter>(fixedClass ?? '전체');
  const [sel, setSel] = useState<AccountItem | null>(null);
  const clsOptions: readonly AccountClassFilter[] = fixedClass ? [fixedClass] : ACCOUNT_CLASS_FILTERS;

  /* 열릴 때마다 초기화 — 검색어는 호출부 값으로 채워 바로 조회 */
  useEffect(() => {
    if (!open) return;
    setDraft(initialKeyword); setKeyword(initialKeyword); setCls(fixedClass ?? '전체'); setSel(null);
  }, [open, initialKeyword, fixedClass]);

  const rows = useMemo(() => searchAccounts(list, keyword, cls), [list, keyword, cls]);
  const search = () => setKeyword(draft);

  /* 수정 모드의 기존 값 미리 선택 — 그리드가 열릴 때(첫 렌더) 한 번만. 이후 재조회는 사용자 선택을 따른다 */
  const onFirstDataRendered = (e: FirstDataRenderedEvent<AccountItem>) => {
    const n = initialSelected ? e.api.getRowNode(initialSelected) : undefined;
    if (n) { n.setSelected(true); e.api.ensureNodeVisible(n); }
  };
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<AccountItem>) => setSel(e.api.getSelectedRows()[0] ?? null), []);
  /* 결과가 바뀌어 선택 행이 빠지면 AG Grid 가 선택을 푼다 — 그때 상태도 맞춘다 */
  const onRowDataUpdated = () => setSel(apiRef.current?.getSelectedRows()[0] ?? null);

  const apply = (a: AccountItem | null) => {
    if (!a) { toast.error('계정과목을 선택해 주세요.'); return; }
    if (!selectable(a)) return;
    onSelect(a);
    dlgRef.current?.close();
  };
  const onRowDoubleClicked = (e: RowDoubleClickedEvent<AccountItem>) => { if (e.data) apply(e.data); };
  const blocked = sel != null && !selectable(sel);

  return (
    <Dialog ref={dlgRef} open={open} onOpenChange={onOpenChange}>
      {/* 첫 초점 = 검색어 칸. autoFocus 는 React 가 마운트 때 먼저 초점을 가져가 연 자리 기억이 빠진다(ui/focus-return.ts) */}
      <DialogContent className="max-w-[640px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>계정과목 검색</DialogTitle>
          <DialogDescription className="sr-only">계정코드 또는 계정과목명으로 계정과목을 찾아 한 건을 고릅니다</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-[46px] py-[28px]">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-muted-foreground shrink-0" style={keyStyle}>계정과목</span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  ref={inputRef} type="text" value={draft} placeholder="계정코드/계정과목명" aria-label="계정과목 검색어"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
                  style={{ ...drawerInputStyle('text'), width: '100%', minWidth: 0 }} />
                <IconBtn icon="search" label="조회" size={34} onClick={search} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-muted-foreground shrink-0" style={keyStyle}>검색기준</span>
              <RadioGroup value="code" aria-label="검색기준" style={{ minHeight: 34 }}>
                <span className="inline-flex items-center gap-1.5">
                  <RadioGroupItem id="acct-search-by-code" value="code" aria-label="검색기준 계정코드" />
                  <label htmlFor="acct-search-by-code" style={labelStyle}>계정코드</label>
                </span>
              </RadioGroup>
            </div>
            {/* 계정분류는 자기 행 — 검색기준과 한 줄에 두면 640px 본문에서 1px 모자라 라디오만 다음 줄로 떨어져 라벨과 갈라졌다 */}
            <div className="flex items-center gap-3">
              <span className="font-semibold text-muted-foreground shrink-0" style={keyStyle}>계정분류</span>
              <RadioGroup value={cls} onValueChange={(v) => setCls(v as AccountClassFilter)} aria-label="계정분류" className="min-w-0" style={{ minHeight: 34 }}>
                {clsOptions.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5">
                    <RadioGroupItem id={`acct-search-cls-${c}`} value={c} aria-label={`계정분류 ${c}`} />
                    <label htmlFor={`acct-search-cls-${c}`} style={labelStyle}>{c}</label>
                  </span>
                ))}
              </RadioGroup>
            </div>
          </div>

          <div role="region" aria-label="계정과목 검색 결과 — 행을 눌러 고르고 확인(더블클릭은 바로 반영)" style={{ height: 320 }}>
            <AgGridReact<AccountItem>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={COLS}
              defaultColDef={COL_DEF}
              getRowId={getRowId}
              rowSelection={ROW_SELECTION}
              onGridReady={(e) => { apiRef.current = e.api; }}
              onFirstDataRendered={onFirstDataRendered}
              onSelectionChanged={onSelectionChanged}
              onRowDataUpdated={onRowDataUpdated}
              onRowDoubleClicked={onRowDoubleClicked}
              overlayNoRowsTemplate={'<span style="color:var(--muted-foreground);font-size:13px">검색 결과가 없습니다.</span>'}
            />
          </div>
          <p className="text-caption mt-2" aria-live="polite" style={{ fontSize: 12.5, minHeight: 18 }}>
            {blocked ? `${sel!.name}(${sel!.code})은(는) 이 화면에서 선택할 수 없는 계정입니다.` : `${rows.length}건`}
          </p>
          {note && <p className="text-caption m-0 mt-1" style={{ fontSize: 12, lineHeight: 1.5 }}>{note}</p>}
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant="primary" size="md" disabled={blocked} onClick={() => apply(sel)}>확인</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
