/* 자펀드 정보 등록 / 수정 팝업 — 원본 S2_74_자펀드_정보_등록.html · S2_75_자펀드_정보_수정.html
   (둘 다 S2_73 목록 화면에 openReg()/openEditFund(r) 로 병합돼 있다 — 이 팝업은 그 병합본을 옮긴다).

   원문 구조(두 팝업 공통)
   - 제목 + 도움말(?) — 안내문구 미정이라 원문도 자리표시 토스트만 띄운다 · 닫기 · 저장
   - 검색조건: 자펀드 select(등록만 필수 *) · 투자기간 [년 숫자] 년 [시작일] ~ [종료일] · 결산월 select(1~12) 월
   - 한도관리: 지표구분(의무투자비율 고정 라벨) · 비율(%) · 투자시작일자 · 투자종료일자 — 원문에 행추가/행삭제 없음(단일행)
   - 운용사(공동GP): 대표(체크) · 운용사 · 사업자번호 · 운용사구분 select · 결산월 select · 보고운용사코드 — 행추가/행삭제.
     원문 캡처에 선택 체크박스 열이 없어 **행 클릭으로 선택(하이라이트)** 후 행삭제한다(행 안 입력·체크 조작은 선택을 바꾸지 않는다).
   - 등록은 두 표 모두 빈 상태("조회 내역이 없습니다.")로 시작, 수정은 클릭한 행으로 채운다(asset_fund_info_data.formFromRow).
   - 저장은 원문처럼 토스트만(백엔드 없음 — 목록 데이터는 바꾸지 않는다).

   우리 규약: Radix Dialog(apfs-form-modal 섹션형 — 헤더/푸터 px-[46px], 바깥 클릭으로 닫지 않음),
   개별 컨트롤은 SchemaField 재사용(34px·DatePicker·토큰), 반복행 표 = tableLayout fixed · 행 추가 버튼은 섹션 제목 옆(좌측). */
import React, { useRef, useState } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { toast } from './ui/sonner';
import { SchemaField, drawerInputStyle } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import type { Row } from './risk_table_meta';
import { FUND_OPTS, GP_TYPES, MONTHS, LIMIT_INDICATOR, MODAL_EMPTY, emptyForm, formFromRow, newGpRow } from './asset_fund_info_data';
import type { FundInfoForm, GpRow, LimitRow } from './asset_fund_info_data';

const { Button, IconBtn } = UI;

export type FundInfoModalMode = 'create' | 'edit';

const spec = (key: string, label: string, control: FieldSpec['control']): FieldSpec => ({ key, label, control });

/* 원문 select 는 첫 옵션이 '선택'(value="") — SchemaField select 는 빈 선택지를 그리지 않아 같은 박스 규격으로 따로 둔다 */
function SelectBox({ label, value, onChange, options, fill, invalid }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[]; fill?: boolean; invalid?: boolean;
}) {
  return (
    <div className="relative" style={{ width: fill ? '100%' : 'fit-content', maxWidth: '100%' }}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid || undefined}
        style={{ ...drawerInputStyle('select'), ...(fill ? { width: '100%', minWidth: 0 } : {}), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32,
          borderColor: invalid ? 'var(--danger)' : 'var(--border-strong)' }}>
        <option value="">선택</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* 섹션 — 제목 + (좌측) 행 추가 슬롯. apfs-form-modal "행 추가 버튼은 좌측" */
function Sec({ title, add, children }: { title: string; add?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0 m-0 mb-7" style={{ minWidth: 0 }}>
      <legend className="w-full flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">
        {title}
        {add}
      </legend>
      {children}
    </fieldset>
  );
}

const Lbl = ({ children, req }: { children: React.ReactNode; req?: boolean }) => (
  <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{children}{req ? ' *' : ''}</span>
);
/* 표 셀·복합 행 안의 입력칸 접근名 — SchemaField text/number 는 감싸는 <label> 로 명명된다(가시 라벨이 없는 칸은 sr-only) */
const Named = ({ name, children, style }: { name: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <label className="block" style={style}><span className="sr-only">{name}</span>{children}</label>
);
const Sfx = ({ children }: { children: React.ReactNode }) => <span className="text-caption shrink-0" style={{ fontSize: 13 }}>{children}</span>;

/* 반복행 표 셀 규격(apfs-form-modal 반복행 레이아웃 — subfund_form_modal 정본) */
const th: React.CSSProperties = { textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--caption)', padding: '6px 0 12px', paddingRight: 8, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '4px 0', paddingRight: 8, verticalAlign: 'middle' };
const thLast: React.CSSProperties = { ...th, paddingRight: 0 };
const tdLast: React.CSSProperties = { ...td, paddingRight: 0 };
const EmptyRow = ({ span }: { span: number }) => (
  <tr><td colSpan={span} className="text-center text-caption" style={{ padding: '18px 0', fontSize: 13 }}>{MODAL_EMPTY}</td></tr>
);

export function AssetFundInfoModal({ mode, row, onClose }: { mode: FundInfoModalMode; row?: Row; onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const gpBodyRef = useRef<HTMLTableSectionElement>(null);
  const [form, setForm] = useState<FundInfoForm>(() => (mode === 'edit' && row ? formFromRow(row) : emptyForm()));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tried, setTried] = useState(false);
  const title = mode === 'create' ? '자펀드 정보 등록' : '자펀드 정보 수정';

  const set = <K extends keyof FundInfoForm>(k: K) => (v: FundInfoForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const patchLimit = (i: number, p: Partial<LimitRow>) => setForm((f) => ({ ...f, limits: f.limits.map((l, k) => (k === i ? { ...l, ...p } : l)) }));
  const patchGp = (id: string, p: Partial<GpRow>) => setForm((f) => ({ ...f, gps: f.gps.map((g) => (g.id === id ? { ...g, ...p } : g)) }));
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const addGp = () => {
    setForm((f) => ({ ...f, gps: [...f.gps, newGpRow()] }));
    /* 원문: 새 행의 첫 텍스트 입력으로 포커스 */
    requestAnimationFrame(() => gpBodyRef.current?.querySelector<HTMLInputElement>('tr:last-child input')?.focus());
  };
  const deleteGps = () => {
    if (sel.size === 0) { toast.error('삭제할 행을 선택하세요'); return; }
    const n = sel.size;
    setForm((f) => ({ ...f, gps: f.gps.filter((g) => !sel.has(g.id)) }));
    setSel(new Set());
    toast.success(`${n}개 행 삭제됨`);
  };
  const save = () => {
    /* 원문 등록 팝업만 자펀드에 필수(*) 표식이 있다 */
    if (mode === 'create' && !form.fund) { setTried(true); toast.error('자펀드를 선택하세요'); return; }
    toast.success(mode === 'create' ? '저장되었습니다' : '수정되었습니다');
    dlgRef.current?.close();
  };
  const onRowClick = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('input,button,select,label,[role=checkbox]')) return;
    toggleSel(id);
  };
  const onRowKey = (e: React.KeyboardEvent, id: string) => {
    if (e.target !== e.currentTarget || (e.key !== ' ' && e.key !== 'Enter')) return;
    e.preventDefault();
    toggleSel(id);
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-center gap-1.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">{title}</DialogTitle>
            {/* 원문 도움말(?) — 안내문구 미정(원문도 자리표시 토스트) */}
            <IconBtn icon="help-circle" label="도움말" size={30} onClick={() => toast.info('도움말 안내문구는 아직 정의되지 않았습니다')} />
            <DialogDescription className="sr-only">자펀드의 투자기간·결산월·한도관리(의무투자비율)·운용사(공동GP)를 {mode === 'create' ? '등록' : '수정'}합니다</DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]" style={{ fontSize: 13.5 }}>
          <Sec title="검색조건">
            <label className="block mb-3.5">
              <Lbl req={mode === 'create'}>자펀드</Lbl>
              <SelectBox label="자펀드" value={form.fund} onChange={set('fund')} options={FUND_OPTS} invalid={tried && !form.fund} />
            </label>
            <div className="mb-3.5">
              <Lbl>투자기간</Lbl>
              <div className="flex items-center gap-2 flex-wrap">
                <Named name="투자기간(년)" style={{ width: 88 }}><SchemaField fill field={spec('years', '투자기간(년)', 'number')} value={form.years} onChange={set('years')} /></Named>
                <Sfx>년</Sfx>
                <SchemaField field={spec('start', '투자기간 시작일', 'date')} value={form.start} onChange={set('start')} />
                <Sfx>~</Sfx>
                <SchemaField field={spec('end', '투자기간 종료일', 'date')} value={form.end} onChange={set('end')} />
              </div>
            </div>
            <label className="block mb-3.5">
              <Lbl>결산월</Lbl>
              <span className="inline-flex items-center gap-2">
                <SelectBox label="결산월" value={form.month} onChange={set('month')} options={MONTHS} />
                <Sfx>월</Sfx>
              </span>
            </label>
          </Sec>

          <Sec title="한도관리">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 600, tableLayout: 'fixed' }}>
                <caption className="sr-only">한도관리 — 의무투자비율</caption>
                <thead>
                  <tr>
                    <th scope="col" style={th}>지표구분</th>
                    <th scope="col" style={{ ...th, width: 130 }}>비율(%)</th>
                    <th scope="col" style={{ ...th, width: 170 }}>투자시작일자</th>
                    <th scope="col" style={{ ...thLast, width: 162 }}>투자종료일자</th>
                  </tr>
                </thead>
                <tbody>
                  {form.limits.length === 0 ? <EmptyRow span={4} /> : form.limits.map((l, i) => (
                    <tr key={i}>
                      <td style={td}>{LIMIT_INDICATOR}</td>
                      <td style={td}><Named name={`${LIMIT_INDICATOR} 비율(%)`}><SchemaField fill field={spec(`rate-${i}`, '비율', 'number')} value={l.rate} onChange={(v) => patchLimit(i, { rate: v })} /></Named></td>
                      <td style={td}><SchemaField fill field={spec(`ls-${i}`, '투자시작일자', 'date')} value={l.start} onChange={(v) => patchLimit(i, { start: v })} /></td>
                      <td style={tdLast}><SchemaField fill field={spec(`le-${i}`, '투자종료일자', 'date')} value={l.end} onChange={(v) => patchLimit(i, { end: v })} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sec>

          <Sec title="운용사" add={<>
            <Button variant="outline" size="sm" leadingIcon="plus" onClick={addGp}>행추가</Button>
            <Button variant="outline" size="sm" leadingIcon="trash" onClick={deleteGps}>행삭제</Button>
            <span className="text-caption font-normal" aria-live="polite" style={{ fontSize: 12.5 }}>{sel.size > 0 ? `${sel.size}개 행 선택됨` : ''}</span>
          </>}>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 760, tableLayout: 'fixed' }}>
                <caption className="sr-only">운용사(공동GP) — 대표여부·운용사·사업자번호·운용사구분·결산월·보고운용사코드. 행을 눌러 선택한 뒤 행삭제</caption>
                <thead>
                  <tr>
                    <th scope="col" style={{ ...th, width: 56, textAlign: 'center' }}>대표</th>
                    <th scope="col" style={th}>운용사</th>
                    <th scope="col" style={{ ...th, width: 140 }}>사업자번호</th>
                    <th scope="col" style={{ ...th, width: 156 }}>운용사구분</th>
                    <th scope="col" style={{ ...th, width: 96 }}>결산월</th>
                    <th scope="col" style={{ ...thLast, width: 130 }}>보고운용사코드</th>
                  </tr>
                </thead>
                <tbody ref={gpBodyRef}>
                  {form.gps.length === 0 ? <EmptyRow span={6} /> : form.gps.map((g) => {
                    const on = sel.has(g.id);
                    const name = g.name || '신규 운용사';
                    return (
                      <tr key={g.id} tabIndex={0} aria-selected={on} onClick={(e) => onRowClick(e, g.id)} onKeyDown={(e) => onRowKey(e, g.id)}
                        style={{ cursor: 'pointer', background: on ? 'var(--row-selected)' : undefined }}>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <span className="inline-flex"><Checkbox checked={g.rep} onCheckedChange={(v) => patchGp(g.id, { rep: v === true })} aria-label={`${name} 대표여부`} /></span>
                        </td>
                        <td style={td}><Named name={`${name} 운용사`}><SchemaField fill field={spec(`gn-${g.id}`, '운용사', 'text')} value={g.name} onChange={(v) => patchGp(g.id, { name: v })} /></Named></td>
                        <td style={td}><Named name={`${name} 사업자번호`}><SchemaField fill field={spec(`gb-${g.id}`, '사업자번호', 'text')} value={g.bizno} onChange={(v) => patchGp(g.id, { bizno: v })} /></Named></td>
                        <td style={td}><SelectBox fill label={`${name} 운용사구분`} value={g.otype} onChange={(v) => patchGp(g.id, { otype: v })} options={GP_TYPES} /></td>
                        <td style={td}><SelectBox fill label={`${name} 결산월`} value={g.month} onChange={(v) => patchGp(g.id, { month: v })} options={MONTHS} /></td>
                        <td style={tdLast}><Named name={`${name} 보고운용사코드`}><SchemaField fill field={spec(`gc-${g.id}`, '보고운용사코드', 'text')} value={g.code} onChange={(v) => patchGp(g.id, { code: v })} /></Named></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Sec>
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
