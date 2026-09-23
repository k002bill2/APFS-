/* 운용사 정량지표 등록 / 수정 팝업 — 원본 S2_71_운용사_정량지표_등록.html · S2_72_운용사_정량지표_수정.html
   (둘 다 S2_70 목록 화면의 팝업으로 이미 병합돼 있다 — 원문 openReg()/openEdit()).

   원문 구조(두 팝업 공통, 설계메모 "수정 팝업 구조로 통일")
   - 제목 + 도움말(?) — 안내문구 미정이라 원문도 자리표시 토스트만 띄운다
   - 운용사 유형 select(6종). 수정 팝업은 선택 시 그 유형의 지표 7종 그리드를 다시 불러온다(원문 renderEditGrid)
   - 편집 그리드: 사용(체크) · 지표구분 · 정상 · 주의 · 경고(표시 전용, 빈 값 '–') · 입력항목(⚠검토필요 헤더)
     입력항목 컴포넌트는 **등록=텍스트 입력 / 수정=체크박스** — 원문이 "의도된 차이"라 못박았다(구조 통일 대상 아님)
   - 행추가(지표구분·기준을 직접 입력하는 새 행) · 행삭제(선택 행). 원문 캡처에 선택 체크박스 열이 없어
     **행 클릭으로 선택(하이라이트)** 후 행삭제한다 — 그대로 옮긴다(행 안의 입력·체크 클릭은 선택을 바꾸지 않는다).
   - 저장 · 닫기. 저장은 원문처럼 토스트만(백엔드 없음 — 목록 데이터는 바꾸지 않는다).

   우리 규약: Radix Dialog(apfs-form-modal 모달 크롬 — 헤더/푸터 px-[46px]), DS Checkbox(라벨 래핑 금지 → aria-label),
   입력 박스 34px(CONTROL_BOX SSOT), 토큰 색만. */
import React, { useRef, useState } from 'react';
import { UI } from './components';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { toast } from './ui/sonner';
import { drawerInputStyle } from './schemas/renderers';
import { ReviewMarker } from './review_marker';
import { MGR_TYPES, INDICATORS, metricsFor, INPUT_NOTE } from './risk_subfund_info_data';

const { Button, IconBtn } = UI;

export type QuantModalMode = 'create' | 'edit';

interface EditRow { id: string; use: boolean; ind: string; ok: string; warn: string; bad: string; inp: boolean; inpText: string; isNew: boolean }

let seq = 0;
const nid = () => `qr-${++seq}`;
/* 등록 = 원문 presetRow(ind,'','','','text') — 사용 미체크 · 기준 빈 값 · 입력항목 텍스트 */
const presetRows = (): EditRow[] => INDICATORS.map((ind) => ({ id: nid(), use: false, ind, ok: '', warn: '', bad: '', inp: false, inpText: '', isNew: false }));
/* 수정 = 원문 dataRow(metricsFor(type)) */
const loadRows = (type: string): EditRow[] => metricsFor(type).map((d) => ({ id: nid(), ...d, inpText: '', isNew: false }));
const newRow = (): EditRow => ({ id: nid(), use: false, ind: '', ok: '', warn: '', bad: '', inp: false, inpText: '', isNew: true });

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold whitespace-nowrap text-center';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '7px 10px' };
const dash = (v: string) => (v ? v : <span className="text-muted-foreground">–</span>);
const input = (w: number | string = '100%'): React.CSSProperties => ({ ...drawerInputStyle('text'), width: w, minWidth: 0 });

export function GpQuantIndicatorModal({ mode, preType, onClose }: { mode: QuantModalMode; preType?: string; onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [type, setType] = useState(preType ?? (mode === 'edit' ? '증권회사' : MGR_TYPES[0]));
  const [rows, setRows] = useState<EditRow[]>(() => (mode === 'edit' ? loadRows(preType ?? '증권회사') : presetRows()));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const title = mode === 'create' ? '운용사 정량지표 등록' : '운용사 정량지표 수정';

  const patch = (id: string, p: Partial<EditRow>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const changeType = (t: string) => {
    setType(t);
    if (mode === 'edit') { setRows(loadRows(t)); setSel(new Set()); }   // 원문: 수정 팝업만 유형 선택 시 그리드 갱신
  };
  const addRow = () => {
    setRows((rs) => [...rs, newRow()]);
    /* 원문: 새 행의 첫 텍스트 입력으로 포커스 */
    requestAnimationFrame(() => tbodyRef.current?.querySelector<HTMLInputElement>('tr:last-child input[type=text]')?.focus());
  };
  const deleteRows = () => {
    if (sel.size === 0) { toast.error('삭제할 행을 선택하세요'); return; }
    const n = sel.size;
    setRows((rs) => rs.filter((r) => !sel.has(r.id)));
    setSel(new Set());
    toast.success(`${n}개 행 삭제됨`);
  };
  const save = () => {
    toast.success(mode === 'create' ? '등록되었습니다' : '수정되었습니다');
    dlgRef.current?.close();
  };
  /* 행 선택 — 행 안의 입력·체크박스 조작은 선택을 바꾸지 않는다(원문 `if(e.target.tagName==='INPUT')return`) */
  const onRowClick = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('input,button,select')) return;
    toggleSel(id);
  };
  const onRowKey = (e: React.KeyboardEvent, id: string) => {
    if (e.target !== e.currentTarget || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    toggleSel(id);
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[860px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-center gap-1.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">{title}</DialogTitle>
            {/* 원문 도움말(?) — 안내문구 미정(원문도 자리표시 토스트) */}
            <IconBtn icon="help-circle" label="도움말" size={30} onClick={() => toast.info('도움말 안내문구는 아직 정의되지 않았습니다')} />
            <DialogDescription className="sr-only">운용사 유형별 정량지표 사용여부와 입력항목을 설정합니다</DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]" style={{ fontSize: 13.5 }}>
          <label className="flex items-center gap-2.5 mb-4" style={{ width: 'fit-content' }}>
            <span className="font-semibold text-muted-foreground" style={{ fontSize: 13.5 }}>운용사 유형</span>
            <select value={type} onChange={(e) => changeType(e.target.value)} style={drawerInputStyle('select')}>
              {MGR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: 640 }}>
              <caption className="sr-only">{title} — 지표별 사용여부·기준·입력항목. 행을 눌러 선택한 뒤 행삭제</caption>
              <thead>
                <tr>
                  <th scope="col" className={TH} style={{ ...CELL, width: 56 }}>사용</th>
                  <th scope="col" className={`${TH} !text-left`} style={CELL}>지표구분</th>
                  <th scope="col" className={TH} style={CELL}>정상</th>
                  <th scope="col" className={TH} style={CELL}>주의</th>
                  <th scope="col" className={TH} style={CELL}>경고</th>
                  <th scope="col" className={TH} style={{ ...CELL, width: mode === 'create' ? 150 : 118 }}>
                    <span className="inline-flex items-center">입력항목<ReviewMarker {...INPUT_NOTE} label="입력항목" /></span>
                  </th>
                </tr>
              </thead>
              <tbody ref={tbodyRef}>
                {rows.map((r) => {
                  const on = sel.has(r.id);
                  const name = r.ind || '신규 지표';
                  return (
                    <tr key={r.id} tabIndex={0} aria-selected={on} onClick={(e) => onRowClick(e, r.id)} onKeyDown={(e) => onRowKey(e, r.id)}
                      style={{ cursor: 'pointer', background: on ? 'var(--row-selected)' : undefined }}>
                      <td className={`${TD} text-center`} style={CELL}>
                        <span className="inline-flex"><Checkbox checked={r.use} onCheckedChange={(v) => patch(r.id, { use: v === true })} aria-label={`${name} 사용`} /></span>
                      </td>
                      {r.isNew ? (
                        <>
                          <td className={TD} style={CELL}><input type="text" value={r.ind} placeholder="지표구분" aria-label="신규 지표구분" onChange={(e) => patch(r.id, { ind: e.target.value })} style={input()} /></td>
                          <td className={TD} style={CELL}><input type="text" value={r.ok} placeholder="예: 75 이상" aria-label="신규 지표 정상 기준" onChange={(e) => patch(r.id, { ok: e.target.value })} style={input()} /></td>
                          <td className={TD} style={CELL}><input type="text" value={r.warn} placeholder="예: 50 이상" aria-label="신규 지표 주의 기준" onChange={(e) => patch(r.id, { warn: e.target.value })} style={input()} /></td>
                          <td className={TD} style={CELL}><input type="text" value={r.bad} placeholder="예: 50 미만" aria-label="신규 지표 경고 기준" onChange={(e) => patch(r.id, { bad: e.target.value })} style={input()} /></td>
                        </>
                      ) : (
                        <>
                          <td className={TD} style={CELL}>{r.ind}</td>
                          <td className={`${TD} text-center`} style={CELL}>{dash(r.ok)}</td>
                          <td className={`${TD} text-center`} style={CELL}>{dash(r.warn)}</td>
                          <td className={`${TD} text-center`} style={CELL}>{dash(r.bad)}</td>
                        </>
                      )}
                      <td className={`${TD} text-center`} style={CELL}>
                        {mode === 'create'
                          ? <input type="text" value={r.inpText} aria-label={`${name} 입력항목`} onChange={(e) => patch(r.id, { inpText: e.target.value })} style={input()} />
                          : <span className="inline-flex"><Checkbox checked={r.inp} onCheckedChange={(v) => patch(r.id, { inp: v === true })} aria-label={`${name} 입력항목`} /></span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-caption mr-auto" aria-live="polite" style={{ fontSize: 12.5 }}>{sel.size > 0 ? `${sel.size}개 행 선택됨` : '행을 눌러 선택'}</span>
            <Button variant="outline" size="sm" leadingIcon="plus" onClick={addRow}>행추가</Button>
            <Button variant="outline" size="sm" leadingIcon="trash" onClick={deleteRows}>행삭제</Button>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant="primary" size="md" onClick={save}>저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
