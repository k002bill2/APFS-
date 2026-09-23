/* 등록원부관리(S4_108) 팝업 6종 — 원문 openLedger · openMembers · openExperts · openUpload · openRegOut · openRegHist.
   원문 모달의 섹션·필드·이력 그리드·버튼 구성과 리터럴 값을 그대로 옮긴다(brief_data.ts SSOT). 섹션형 모달 규약은
   apfs-form-modal "확장: 섹션형·반복행"(골드 subfund_form_modal — Section fieldset + SchemaField).

   동작 계약(원문 그대로 — 백엔드 없음)
   - A 입력/수정: 이력 섹션 6개마다 [추가] = 입력칸 값으로 이력 행을 맨 위에 추가(변경일자·등록일자 = 오늘), 빈 값이면 원문 경고 토스트.
     수정 모드는 등록번호 잠금 + 원문 isEdit 기본값·기존 이력. [저장] = 원문 토스트 후 닫기(목록 값은 바꾸지 않는다 — 원문도 토스트뿐).
   - B 조합원 · C 전문인력: 원문 표·상세 폼 리터럴. 섹션 버튼·행 버튼([상세]·[삭제]·[수정])은 원문처럼 토스트.
   - D 업로드: 여러 파일 드롭존(원문 multiple) — 파일 없이 업로드 → 경고, 있으면 완료 토스트 후 닫기. 처리·전송 없음(브리프 규칙 5).
   - E 출력 · F 발급이력: 원문 리터럴(발급일자 2016-01-19, 페이지 수 0, 발급이력 1건). 원문처럼 목록 행과 무관하게 연다.
   날짜 입력은 네이티브 date 가 아니라 SchemaField date(DatePicker — apfs-datepicker). 표 값은 <MT>/mn() 으로 마스킹 규약을 따른다. */
import React, { useRef, useState } from 'react';
import { format } from 'date-fns';
import { UI } from './components';
import { mn, MT } from './mask';
import { toast } from './ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { SchemaField, isPlainWrapControl } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { UploadDropzone } from './trust_upload';
import type { Row } from './risk_table_meta';
import {
  HIST_SECTIONS, HIST_REQUIRED, LEDGER_UNIT_PRICE, LEDGER_FIRST_REG,
  MEMBER_HEADS, MEMBER_ROWS, MEMBER_KINDS, MEMBER_FORM, PAYMENT_HEADS, PAYMENT_ROWS,
  EXPERT_HEADS, EXPERT_ROWS, EXPERT_KINDS, EXPERT_FORM, CAREER_HEADS, CAREER_ROWS, INVEST_CAREER_HEADS, INVEST_CAREER_ROWS,
  PRINT_DATE, PRINT_PAGES, ISSUE_HISTORY,
} from './brief_data';
import type { HistSection } from './brief_data';

const { Button, IconBtn } = UI;
const say = (msg: string) => () => toast(msg);
const today = () => format(new Date(), 'yyyy-MM-dd');

/* ──────────────────────────────
   공용 부품 — 모달 골격 · 섹션 · 필드 · 소형 표
────────────────────────────── */
/* 제목 뒤 대상명(조합명)·배지의 등록번호는 데이터라 <MT> 로 가린다(설명문 sr-only 는 대상명 없이 제목만) */
function Modal({ title, target, badge, wide, onClose, footer, children, dlgRef }: {
  title: string; target?: string; badge?: React.ReactNode; wide?: boolean; onClose: () => void; footer: React.ReactNode; children: React.ReactNode;
  dlgRef: React.RefObject<DialogHandle>;
}) {
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`${wide ? 'max-w-[960px]' : 'max-w-[560px]'} max-h-[90vh]`}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-center gap-2.5 min-w-0 pr-8">
            <DialogTitle className="min-w-0 truncate">{title}{target && <> — <MT>{target}</MT></>}</DialogTitle>
            {badge && <span className="shrink-0 font-bold" style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 99, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{badge}</span>}
          </div>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto" style={{ padding: '24px 46px' }}>{children}</div>
        <DialogFooter className="px-[46px]"><div /><div className="flex gap-2">{footer}</div></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 원문 `.msec` — 제목(h3) + 우측 섹션 버튼(`.sacts`) + 본문 */
function Section({ title, actions, children }: { title: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}>
      <div className="flex items-center gap-2 border-b-2 border-border" style={{ paddingBottom: 8, marginBottom: 12 }}>
        <h3 className="m-0 font-bold" style={{ fontSize: 16 }}>{title}</h3>
        {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** 단일 필드 — SchemaField 재사용(골드 subfund_form_modal F). full = 2단에서 전체 폭 */
function F({ spec, value, onChange, full, children }: { spec: FieldSpec; value: string; onChange: (v: string) => void; full?: boolean; children?: React.ReactNode }) {
  const Wrap: any = isPlainWrapControl(spec.control) || children ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{spec.label}{spec.required ? ' *' : ''}</span>
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1"><SchemaField field={spec} value={value} onChange={onChange} fill={full} /></div>
        {children}
      </div>
    </Wrap>
  );
}
const Grid2 = ({ children }: { children: React.ReactNode }) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">{children}</div>;

type RowAct = 'edit' | 'detail';
/** 원문 `.mgrid` — 헤더 + 리터럴 행 + 관리 버튼(수정/삭제 · 상세/삭제). 첫 칸이 이름·주소면 좌측, 금액·수량은 우측 */
function MiniTable({ heads, rows, act, label, right = [], empty = '변경 이력이 없습니다.' }: {
  heads: string[]; rows: string[][]; act: RowAct; label: string; right?: number[]; empty?: string;
}) {
  const align = (i: number) => (right.includes(i) ? 'text-right' : i === 0 ? 'text-left' : 'text-center');
  const cell: React.CSSProperties = { padding: '8px 11px' };
  const [a, b] = act === 'edit' ? ['수정', '삭제'] : ['상세', '삭제'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13.5 }}>
        <caption className="sr-only">{label}</caption>
        <thead><tr>{heads.map((h, i) => (
          <th key={h} scope="col" className={`border border-border bg-[color:var(--grid-header)] font-bold whitespace-nowrap ${i === heads.length - 1 ? 'text-center' : align(i)}`} style={cell}>{h}</th>
        ))}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={heads.length} className="border border-border text-center text-caption" style={cell}>{empty}</td></tr>}
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((v, i) => <td key={i} className={`border border-border ${align(i)} ${right.includes(i) ? 'tabular-nums' : ''}`} style={cell}>
                {/^[\d,.\-]+$/.test(v) ? mn(v) : <MT>{v}</MT>}
              </td>)}
              <td className="border border-border text-center whitespace-nowrap" style={cell}>
                <span className="inline-flex gap-1">
                  <Button variant="outline" size="sm" onClick={say(`${act === 'edit' ? '이력' : label} ${a} (목업)`)}>{a}</Button>
                  <Button variant="outline" size="sm" style={{ color: 'var(--danger-text)' }} onClick={say(`${act === 'edit' ? '이력' : label} ${b} (목업)`)}>{b}</Button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────
   A — 등록원부 입력/수정
────────────────────────────── */
const T = (key: string, label: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label, control: 'text', ...extra });
const D = (key: string, label: string): FieldSpec => ({ key, label, control: 'date' });

function initialLedger(edit: boolean, row?: Row): Record<string, string> {
  const ev = (k: HistSection['key']) => (edit ? HIST_SECTIONS.find((s) => s.key === k)!.editValue ?? '' : '');
  const [d1 = '', d2 = ''] = ev('dur').split('~');
  return {
    regno: edit ? String(row?.regno ?? '') : '', nm: edit ? String(row?.nm ?? '') : '', dur1: d1, dur2: d2,
    addr: ev('addr'), amt: ev('amt'), gpname: ev('gpname'), gpaddr: ev('gpaddr'),
    unit: edit ? LEDGER_UNIT_PRICE : '', first: edit ? LEDGER_FIRST_REG : '',
  };
}

/** 이력 섹션의 입력칸(원문 histSec 의 inputHtml) */
function HistInputs({ s, v, set, edit }: { s: HistSection; v: Record<string, string>; set: (k: string) => (x: string) => void; edit: boolean }) {
  const search = (what: string) => <IconBtn icon="search" label={`${what} 검색`} size={34} onClick={say(`${what}(주소) 검색 팝업 (목업)`)} />;
  switch (s.key) {
    case 'nm': return (
      <Grid2>
        <F spec={T('regno', '등록번호', { required: true, placeholder: '예: 2025-01', control: edit ? 'readonly' : 'text' })} value={v.regno} onChange={set('regno')} />
        <F spec={T('nm', '조합명칭', { required: true, placeholder: '조합 명칭' })} value={v.nm} onChange={set('nm')} />
      </Grid2>
    );
    case 'dur': return (
      <Grid2>
        <F spec={D('dur1', '존속기간 시작일')} value={v.dur1} onChange={set('dur1')} />
        <F spec={D('dur2', '존속기간 종료일')} value={v.dur2} onChange={set('dur2')} />
      </Grid2>
    );
    case 'addr': return <F spec={T('addr', '소재지', { placeholder: '주소 검색으로 입력', long: true })} value={v.addr} onChange={set('addr')} full>{search('소재지')}</F>;
    case 'amt': return <F spec={T('amt', '출자약정총액', { placeholder: '원' })} value={v.amt} onChange={set('amt')} />;
    case 'gpname': return <F spec={T('gpname', '업무집행조합원 명칭', { placeholder: '업무집행조합원 명칭', long: true })} value={v.gpname} onChange={set('gpname')} full />;
    case 'gpaddr': return <F spec={T('gpaddr', '업무집행조합원의 주소', { placeholder: '주소 검색으로 입력', long: true })} value={v.gpaddr} onChange={set('gpaddr')} full>{search('업무집행조합원의 주소')}</F>;
  }
}

export function LedgerFormModal({ mode, row, onClose }: { mode: 'new' | 'edit'; row?: Row; onClose: () => void }) {
  const edit = mode === 'edit';
  const dlgRef = useRef<DialogHandle>(null);
  const [v, setV] = useState(() => initialLedger(edit, row));
  const [hist, setHist] = useState<Record<string, string[][]>>(() =>
    Object.fromEntries(HIST_SECTIONS.map((s) => [s.key, edit && s.editHistory ? [s.editHistory] : []])));
  const set = (k: string) => (x: string) => setV((p) => ({ ...p, [k]: x }));

  /* 원문 addHistRow — 빈 값이면 경고, 아니면 [값…, 오늘, 오늘] 을 맨 위에 */
  const addHist = (s: HistSection) => {
    const vals = s.key === 'dur' ? [v.dur1, v.dur2] : [v[s.key].trim()];
    if (s.key === 'dur' && !v.dur2 && v.dur1) { toast('존속기간 종료일을 입력하세요'); return; }
    if (vals.some((x) => !x)) { toast(HIST_REQUIRED[s.key]); return; }
    setHist((p) => ({ ...p, [s.key]: [[...vals, today(), today()], ...p[s.key]] }));
    toast.success('변경 이력이 추가되었습니다 (목업)');
  };
  const save = () => { toast.success('등록원부가 저장되었습니다 (목업)'); dlgRef.current?.close(); };

  return (
    <Modal dlgRef={dlgRef} wide onClose={onClose} title={edit ? '등록원부 수정' : '등록원부 입력'}
      badge={edit ? <>등록번호 <MT>{v.regno}</MT> · 잠금</> : '신규 · PK 편집'}
      footer={<><Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button><Button variant="primary" size="sm" onClick={save}>저장</Button></>}>
      {HIST_SECTIONS.map((s) => (
        <Section key={s.key} title={s.title} actions={<Button variant="outline" size="sm" leadingIcon="plus" onClick={() => addHist(s)}>추가</Button>}>
          <HistInputs s={s} v={v} set={set} edit={edit} />
          <MiniTable heads={s.heads} rows={hist[s.key]} act="edit" label={`${s.title} 변경 이력`} right={s.key === 'amt' ? [0] : []} />
        </Section>
      ))}
      <Section title="출자 좌당 금액 / 최초등록">
        <Grid2>
          <F spec={T('unit', '출자1좌(座)의 금액', { placeholder: '원' })} value={v.unit} onChange={set('unit')} />
          <F spec={D('first', '최초등록 연월일')} value={v.first} onChange={set('first')} />
        </Grid2>
      </Section>
    </Modal>
  );
}

/* ──────────────────────────────
   B — 조합원 및 납입출자금 관리
────────────────────────────── */
export function MembersModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const [f, setF] = useState<Record<string, string>>({ ...MEMBER_FORM });
  const set = (k: string) => (x: string) => setF((p) => ({ ...p, [k]: x }));
  return (
    <Modal dlgRef={dlgRef} wide onClose={onClose} title="조합원 및 납입출자금 관리" target={String(row.nm)}
      footer={<Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>}>
      <Section title="조합원 및 납입출자금 관리" actions={<>
        <Button variant="outline" size="sm" onClick={say('양도/양수 추가 (목업)')}>양도/양수 추가</Button>
        <Button variant="outline" size="sm" onClick={say('추가출자 등록 (목업)')}>추가출자</Button>
        <Button variant="primary" size="sm" onClick={say('조합원 조회 (목업)')}>조회</Button>
      </>}>
        <MiniTable heads={MEMBER_HEADS} rows={MEMBER_ROWS} act="detail" label="조합원" right={[3, 4]} />
      </Section>
      <Section title="조합원 정보 상세" actions={<>
        <Button variant="outline" size="sm" onClick={say('조합원 입력 초기화 (목업)')}>추가</Button>
        <Button variant="primary" size="sm" onClick={say('조합원 정보 저장 (목업)')}>저장</Button>
      </>}>
        <Grid2>
          <F spec={T('name', '명칭')} value={f.name} onChange={set('name')} />
          <F spec={{ key: 'kind', label: '조합원구분', control: 'radio', options: [...MEMBER_KINDS] }} value={f.kind} onChange={set('kind')} />
          <F spec={T('regNo', '주민(사업자)등록번호')} value={f.regNo} onChange={set('regNo')} />
          <F spec={D('regDate', '등록일자')} value={f.regDate} onChange={set('regDate')} />
          <F spec={T('amount', '약정액')} value={f.amount} onChange={set('amount')} />
          <F spec={T('units', '출자좌수')} value={f.units} onChange={set('units')} />
        </Grid2>
      </Section>
      <Section title="납입출자금" actions={<Button variant="outline" size="sm" leadingIcon="plus" onClick={say('납입출자금 이력 추가 (목업)')}>추가</Button>}>
        <MiniTable heads={PAYMENT_HEADS} rows={PAYMENT_ROWS} act="edit" label="납입출자금" right={[1, 3, 4]} />
      </Section>
    </Modal>
  );
}

/* ──────────────────────────────
   C — 전문인력 관리
────────────────────────────── */
export function ExpertsModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const [f, setF] = useState<Record<string, string>>({ ...EXPERT_FORM });
  const set = (k: string) => (x: string) => setF((p) => ({ ...p, [k]: x }));
  return (
    <Modal dlgRef={dlgRef} wide onClose={onClose} title="전문인력 관리" target={String(row.nm)}
      footer={<Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>}>
      <Section title="전문인력 관리" actions={<Button variant="primary" size="sm" onClick={say('전문인력 조회 (목업)')}>조회</Button>}>
        <MiniTable heads={EXPERT_HEADS} rows={EXPERT_ROWS} act="detail" label="전문인력" />
      </Section>
      <Section title="전문인력 상세 정보" actions={<>
        <Button variant="outline" size="sm" onClick={say('전문인력 입력 초기화 (목업)')}>추가</Button>
        <Button variant="primary" size="sm" onClick={say('전문인력 정보 저장 (목업)')}>저장</Button>
      </>}>
        <Grid2>
          <F spec={T('name', '성명')} value={f.name} onChange={set('name')} />
          <F spec={{ key: 'kind', label: '전문인력 구분', control: 'radio', options: [...EXPERT_KINDS] }} value={f.kind} onChange={set('kind')} />
          <F spec={T('regNo', '주민(사업자)등록번호')} value={f.regNo} onChange={set('regNo')} />
          <F spec={D('regDate', '등록일자')} value={f.regDate} onChange={set('regDate')} />
          <F spec={D('from', '담당시작일')} value={f.from} onChange={set('from')} />
          <F spec={D('to', '담당종료일')} value={f.to} onChange={set('to')} />
          <F spec={T('cause', '원인', { long: true })} value={f.cause} onChange={set('cause')} full />
        </Grid2>
        <div className="flex items-center gap-2" style={{ margin: '6px 0 10px' }}>
          <h4 className="m-0 font-bold" style={{ fontSize: 14 }}>약력</h4>
          <Button variant="outline" size="sm" leadingIcon="plus" onClick={say('약력 추가 (목업)')}>추가</Button>
        </div>
        <MiniTable heads={CAREER_HEADS} rows={CAREER_ROWS} act="edit" label="약력" />
      </Section>
      <Section title="투자경력" actions={<Button variant="outline" size="sm" leadingIcon="plus" onClick={say('투자경력 추가 (목업)')}>추가</Button>}>
        <MiniTable heads={INVEST_CAREER_HEADS} rows={INVEST_CAREER_ROWS} act="edit" label="투자경력" />
      </Section>
    </Modal>
  );
}

/* ──────────────────────────────
   D — 등록원부 업로드
────────────────────────────── */
export function LedgerUploadModal({ onClose }: { onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const [files, setFiles] = useState<string[]>([]);
  const upload = () => {
    if (!files.length) { toast('업로드할 파일을 선택하세요'); return; }
    toast.success('등록원부 업로드 완료 (목업)');
    dlgRef.current?.close();
  };
  return (
    <Modal dlgRef={dlgRef} onClose={onClose} title="등록원부 업로드"
      footer={<><Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button><Button variant="primary" size="sm" leadingIcon="upload" onClick={upload}>업로드</Button></>}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 6 }}>파일 업로드</span>
      <UploadDropzone files={files} onChange={setFiles} multiple hint="XLSX, CSV · 최대 20MB" maxSize="20MB" label="등록원부 파일" />
    </Modal>
  );
}

/* ──────────────────────────────
   E — 등록원부 출력 · F — 등록원부 발급이력 출력
────────────────────────────── */
export function LedgerPrintModal({ onClose }: { onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const [date, setDate] = useState(PRINT_DATE);
  const [pages, setPages] = useState<Record<string, string>>(() => Object.fromEntries(PRINT_PAGES.map((p) => [p, '0'])));
  const save = () => { toast.success('저장되었습니다 (목업)'); dlgRef.current?.close(); };
  return (
    <Modal dlgRef={dlgRef} onClose={onClose} title="등록원부 출력"
      footer={<><Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button><Button variant="primary" size="sm" onClick={save}>저장</Button></>}>
      <F spec={D('issue', '발급일자')} value={date} onChange={setDate}>
        <Button variant="outline" size="sm" leadingIcon="printer" onClick={say('등록원부를 출력합니다 (목업)')}>출력</Button>
      </F>
      <h3 className="m-0 font-bold" style={{ fontSize: 14, margin: '10px 0 10px' }}>출력 페이지 수</h3>
      {PRINT_PAGES.map((p) => (
        <F key={p} spec={{ key: p, label: p, control: 'number' }} value={pages[p]} onChange={(x) => setPages((s) => ({ ...s, [p]: x }))}>
          <span className="text-caption" style={{ fontSize: 13 }}>페이지</span>
        </F>
      ))}
    </Modal>
  );
}

export function LedgerIssueHistoryModal({ onClose }: { onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const print = () => { toast.success('선택한 발급이력을 출력합니다 (목업)'); dlgRef.current?.close(); };
  const cell: React.CSSProperties = { padding: '8px 11px' };
  return (
    <Modal dlgRef={dlgRef} onClose={onClose} title="등록원부 발급이력 출력"
      footer={<><Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button><Button variant="primary" size="sm" leadingIcon="printer" onClick={print}>출력</Button></>}>
      {/* 원문은 목록 행과 무관하게 열어 조합명이 비어 있다(행별 출력 열 제거 — 원문 2026-09-01 지시) */}
      <F spec={{ key: 'fund', label: '조합명', control: 'readonly' }} value="" onChange={() => undefined} />
      <div className="font-semibold text-caption" style={{ fontSize: 13.5, margin: '14px 0 8px' }}>발급이력</div>
      <table className="w-full border-collapse" style={{ fontSize: 13.5 }}>
        <caption className="sr-only">발급이력</caption>
        <thead><tr>
          <th scope="col" className="border border-border bg-[color:var(--grid-header)] font-bold text-center" style={{ ...cell, width: 64 }}>No</th>
          <th scope="col" className="border border-border bg-[color:var(--grid-header)] font-bold text-center" style={cell}>발급일자</th>
        </tr></thead>
        <tbody>{ISSUE_HISTORY.map((h) => (
          <tr key={h.no}><td className="border border-border text-center" style={cell}>{h.no}</td><td className="border border-border text-center" style={cell}>{mn(h.date)}</td></tr>
        ))}</tbody>
      </table>
    </Modal>
  );
}
