/* 거래처 검색 팝업 — ACC-003 전표등록 분개 행 거래처 [검색]/키워드+Enter (slide 13).
   명세
   - 조건: ☑법인 ☑개인(기본 둘 다) · 거래처명(placeholder '거래처명으로 검색하세요.') · [검색](Enter 동일) · [거래처 간편추가]
   - 결과 그리드 7열(고객번호·관리번호·거래처명·구분·대표자명·이메일·연락처). 조회 전 빈 상태 "조회 버튼을 클릭하면 데이터를 불러옵니다."
   - 행 클릭 = 단일 선택 → [선택] 반영 후 닫힘 · 미선택 [선택] = "거래처를 선택해 주세요." · 더블클릭 = 바로 반영 · [닫기]/× = 반영 없이 닫힘
   - [거래처 간편추가] = 하단 입력 영역 토글(6항목, 필수 3) → 펼침 시 푸터 [저장] 추가. 저장 = 검증 → 고객번호 채번 → 원장 추가(onAdd)
     → 자동 선택(onSelect) → 닫힘 · 토스트 "저장되었습니다"
   결정·가정
   - 거래처 원장(list)·추가(onAdd)는 호출부(페이지)가 소유한다 — 간편추가 거래처가 페이지 수명 동안 남고 업로드 거래처코드 해석에도 쓰인다.
   - 열릴 때 초기 검색어(분개 행 거래처 입력값)가 있으면 바로 조회한다(계정과목 검색 팝업과 같은 동작). 비어 있으면 조회 전 빈 상태.
   - 버튼 순서는 형제 계정과목 검색 팝업 규약([닫기] 다음 주 액션) — 설계서 표기 "저장 | 선택 | 닫기"의 역순. 펼침 시 주 액션은 [저장].
   크롬: 46px 패밀리(apfs-form-modal 5 — 헤더·본문·푸터 px-[46px]). 형제 레퍼런스 = acc/account_search_modal.tsx. */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GetRowIdParams, GridApi, RowDoubleClickedEvent, RowSelectionOptions, SelectionChangedEvent } from 'ag-grid-community';
import { UI } from '../../components';
import type { SubmitResult } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { Checkbox } from '../../ui/checkbox';
import { toast } from '../../ui/sonner';
import { SchemaField, drawerInputStyle } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import '../../aggrid_shared.css';
import { todayStr } from './general_journal_data';
import type { Partner } from './general_journal_data';
import { PARTNER_MSG, draftToPartner, emptyPartnerDraft, searchPartners, validatePartnerDraft } from './general_journal_model';
import type { PartnerDraft, PartnerDraftCheck } from './general_journal_model';

const { Button, SaveButton } = UI;

/* ── 그리드 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다) ── */
const COLS: ColDef<Partner>[] = [
  { field: 'custNo', headerName: '고객번호', width: 110, minWidth: 110 },
  { field: 'mgmtNo', headerName: '관리번호', width: 120, minWidth: 120 },
  { field: 'name', headerName: '거래처명', flex: 1, minWidth: 180, width: 180 },
  { field: 'kind', headerName: '구분', width: 80, minWidth: 80 },
  { field: 'ceo', headerName: '대표자명', width: 100, minWidth: 100 },
  { field: 'email', headerName: '이메일', width: 200, minWidth: 160 },
  { field: 'phone', headerName: '연락처', width: 130, minWidth: 120 },
];
const COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
/* 검색 결과 1건 고르기 — 행 클릭 선택(체크박스 없음). 피커 팝업이라 목록 페이지의 '체크박스로만' 규약 밖 */
const ROW_SELECTION: RowSelectionOptions<Partner> = { mode: 'singleRow', checkboxes: false, enableClickSelection: true };
const getRowId = (p: GetRowIdParams<Partner>) => p.data.custNo;
const EMPTY: Partner[] = [];
const BEFORE_SEARCH_MSG = '<span>조회 버튼을 클릭하면 데이터를 불러옵니다.</span>';
const NO_RESULT_MSG = '<span>검색 결과가 없습니다.</span>';

/* 간편추가 필드 명세 — SchemaField 재사용(34px 박스·필수 테두리 토큰 자동) */
const F_KIND: FieldSpec = { key: 'kind', label: '법인/개인구분', control: 'select', options: ['법인', '개인'], required: true };
const F_REGION: FieldSpec = { key: 'region', label: '국내외구분', control: 'radio', options: ['국내', '해외'], required: true };
const F_NAME: FieldSpec = { key: 'name', label: '거래처명', control: 'text', required: true };
const F_BIZ: FieldSpec = { key: 'bizNo', label: '사업자등록번호', control: 'text', placeholder: '숫자 10자리' };
const F_CORP: FieldSpec = { key: 'corpNo', label: '법인등록번호', control: 'text' };
const F_CEO: FieldSpec = { key: 'ceo', label: '대표자명', control: 'text' };

const labelStyle: React.CSSProperties = { fontSize: 13.5, color: 'var(--foreground)', cursor: 'pointer', userSelect: 'none' };

/* 라벨 래퍼 — user_form_modal Field 규격(로컬 복제). plain=<div>(버튼형 컨트롤 2회 발화 방지) */
function Field({ label, required, plain, errMsg, children }: { label: string; required?: boolean; plain?: boolean; errMsg?: string; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5" style={{ minWidth: 0 }}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}{required ? ' *' : ''}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

export function PartnerSearchModal({ open, onOpenChange, onSelect, list, onAdd, initialKeyword = '' }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (p: Partner) => void;
  /** 거래처 원장(호출부 소유 — 간편추가분 포함) */
  list: readonly Partner[];
  /** 간편추가 저장 — 호출부 원장에 추가 */
  onAdd: (p: Partner) => void;
  /** 열릴 때 검색어(분개 행 거래처 입력값) — 있으면 바로 조회 */
  initialKeyword?: string;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const apiRef = useRef<GridApi<Partner> | null>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initialKeyword);
  const [corp, setCorp] = useState(true);
  const [indiv, setIndiv] = useState(true);
  /* 조회 조건 스냅샷 — null = 조회 전(빈 상태 안내). [검색]/Enter 때만 갱신 */
  const [query, setQuery] = useState<{ keyword: string; corp: boolean; indiv: boolean } | null>(initialKeyword.trim() ? { keyword: initialKeyword, corp: true, indiv: true } : null);
  const [sel, setSel] = useState<Partner | null>(null);
  const [adding, setAdding] = useState(false);
  const [pd, setPd] = useState<PartnerDraft>(emptyPartnerDraft);
  const [errField, setErrField] = useState<'' | 'name' | 'bizNo'>('');

  /* 열릴 때마다 초기화 */
  useEffect(() => {
    if (!open) return;
    setDraft(initialKeyword); setCorp(true); setIndiv(true); setSel(null);
    setQuery(initialKeyword.trim() ? { keyword: initialKeyword, corp: true, indiv: true } : null);
    setAdding(false); setPd(emptyPartnerDraft()); setErrField('');
  }, [open, initialKeyword]);

  const rows = useMemo(() => (query ? searchPartners(list, query.keyword, query) : EMPTY), [list, query]);
  const search = () => setQuery({ keyword: draft, corp, indiv });

  const onSelectionChanged = useCallback((e: SelectionChangedEvent<Partner>) => setSel(e.api.getSelectedRows()[0] ?? null), []);
  const onRowDataUpdated = () => setSel(apiRef.current?.getSelectedRows()[0] ?? null);

  const apply = (p: Partner | null) => {
    if (!p) { toast.error(PARTNER_MSG.select); return; }
    onSelect(p);
    dlgRef.current?.close();
  };
  const onRowDoubleClicked = (e: RowDoubleClickedEvent<Partner>) => { if (e.data) apply(e.data); };

  /* ── 간편추가 ── */
  const setP = <K extends keyof PartnerDraft>(k: K, v: PartnerDraft[K]) => { setPd((d) => ({ ...d, [k]: v })); if (errField === k) setErrField(''); };
  const toggleAdd = () => {
    setAdding((a) => !a);
    setErrField('');
    /* 펼친 영역이 본문 스크롤 밖이면 보이게 */
    requestAnimationFrame(() => addRef.current?.scrollIntoView({ block: 'nearest' }));
  };
  const save = (): SubmitResult => {
    const check = validatePartnerDraft(pd);
    if (!check.ok) {
      const v = check as Exclude<PartnerDraftCheck, { ok: true }>;   // strict:false 라 판별 유니온이 좁혀지지 않는다
      setErrField(v.field);
      toast.error(v.message);
      (addRef.current?.querySelector(`[data-field="${v.field}"] input`) as HTMLInputElement | null)?.focus();
      return undefined;
    }
    const p = draftToPartner(pd, list, todayStr());
    return () => {
      onAdd(p);
      onSelect(p);
      toast.success(PARTNER_MSG.saved);
      dlgRef.current?.close();
    };
  };

  return (
    <Dialog ref={dlgRef} open={open} onOpenChange={onOpenChange}>
      {/* 첫 초점 = 검색어 칸. autoFocus 는 React 가 마운트 때 먼저 초점을 가져가 연 자리 기억이 빠진다(ui/focus-return.ts) */}
      <DialogContent className="max-w-[920px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>거래처 검색</DialogTitle>
          <DialogDescription className="sr-only">법인·개인 구분과 거래처명으로 거래처를 찾아 한 건을 고르거나 간편추가합니다</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-[46px] py-[28px]">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="inline-flex items-center gap-1.5">
              <Checkbox id="partner-search-corp" checked={corp} onCheckedChange={(c) => setCorp(c === true)} />
              <label htmlFor="partner-search-corp" style={labelStyle}>법인</label>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Checkbox id="partner-search-indiv" checked={indiv} onCheckedChange={(c) => setIndiv(c === true)} />
              <label htmlFor="partner-search-indiv" style={labelStyle}>개인</label>
            </span>
            <input
              ref={inputRef} type="text" value={draft} placeholder="거래처명으로 검색하세요." aria-label="거래처명 검색어"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
              style={{ ...drawerInputStyle('text'), flex: 1, minWidth: 200, width: 'auto' }} />
            <Button variant="primary" size="md" leadingIcon="search" onClick={search}>검색</Button>
            <Button variant="outline" size="md" leadingIcon={adding ? 'chevron-up' : 'plus'} onClick={toggleAdd} aria-expanded={adding} aria-controls="partner-quick-add">거래처 간편추가</Button>
          </div>

          <div role="region" aria-label="거래처 검색 결과 — 행을 눌러 고르고 선택(더블클릭은 바로 반영)" style={{ height: 300 }}>
            {/* 조회 전/후 빈 상태 문구가 다르다 — 전역 빈 상태 오버레이는 마운트 때 문구를 읽어 key 로 다시 만든다 */}
            <AgGridReact<Partner>
              key={query ? 'searched' : 'before'}
              theme={apfsTheme}
              rowData={rows}
              columnDefs={COLS}
              defaultColDef={COL_DEF}
              getRowId={getRowId}
              rowSelection={ROW_SELECTION}
              onGridReady={(e) => { apiRef.current = e.api; }}
              onSelectionChanged={onSelectionChanged}
              onRowDataUpdated={onRowDataUpdated}
              onRowDoubleClicked={onRowDoubleClicked}
              overlayNoRowsTemplate={query ? NO_RESULT_MSG : BEFORE_SEARCH_MSG}
            />
          </div>
          <p className="text-caption mt-2" aria-live="polite" style={{ fontSize: 12.5, minHeight: 18 }}>
            {query ? `${rows.length}건` : ''}
          </p>

          {adding && (
            <section id="partner-quick-add" ref={addRef} aria-label="거래처 간편추가" className="mt-4 pt-4 border-t border-border">
              <h3 className="m-0 mb-3 font-bold" style={{ fontSize: 15 }}>거래처 간편추가</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                <Field label={F_KIND.label} required>
                  <SchemaField field={F_KIND} value={pd.kind} onChange={(v) => setP('kind', v as PartnerDraft['kind'])} fill />
                </Field>
                <Field label={F_REGION.label} required plain>
                  <SchemaField field={F_REGION} value={pd.region} onChange={(v) => setP('region', v as PartnerDraft['region'])} />
                </Field>
                <div data-field="name">
                  <Field label={F_NAME.label} required errMsg={errField === 'name' ? PARTNER_MSG.required : undefined}>
                    <SchemaField field={F_NAME} value={pd.name} onChange={(v) => setP('name', v)} invalid={errField === 'name'} fill />
                  </Field>
                </div>
                <div className="hidden sm:block" />
                <div data-field="bizNo">
                  <Field label={F_BIZ.label} errMsg={errField === 'bizNo' ? PARTNER_MSG.bizNo : undefined}>
                    <SchemaField field={F_BIZ} value={pd.bizNo} onChange={(v) => setP('bizNo', v.replace(/[^0-9-]/g, ''))} invalid={errField === 'bizNo'} fill />
                  </Field>
                </div>
                {/* 법인등록번호 — 법인 선택 시만 입력(개인이면 비활성) */}
                <fieldset disabled={pd.kind === '개인'} className="border-0 p-0 m-0" style={{ minWidth: 0 }}>
                  <Field label={F_CORP.label}>
                    <SchemaField field={F_CORP} value={pd.kind === '개인' ? '' : pd.corpNo} onChange={(v) => setP('corpNo', v)} fill />
                  </Field>
                </fieldset>
                <Field label={F_CEO.label}>
                  <SchemaField field={F_CEO} value={pd.ceo} onChange={(v) => setP('ceo', v)} fill />
                </Field>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant={adding ? 'outline' : 'primary'} size="md" onClick={() => apply(sel)}>선택</Button>
            {adding && <SaveButton size="md" onSubmit={save}>저장</SaveButton>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
