/* 결성조합 수정 — 섹션형 전용 모달 (자펀드관리 · 결성 단계 [수정]).
   RowFormModal(flat 스키마)로 못 담는 형태의 골드 레퍼런스:
   - 6개 섹션(<fieldset>) 으로 40여 필드를 묶고
   - 반복행 테이블 2종(업무집행조합원 GP · 담당자)을 행추가/행삭제로 편집하며
   - 고정 슬롯 첨부서류표(9행, 규약서는 규약일자 동반)를 둔다.
   개별 컨트롤은 schemas/renderers.tsx의 SchemaField를 그대로 재사용해(14px·DatePicker·토큰) 온-시스템을 유지한다.
   ⚠ 백엔드 없음 — 첨부는 파일명만 보관, 드래그앤드롭은 미구현(파일 선택 버튼만). apfs-form-modal 스킬 "escalation" 절 참조. */
import React from 'react';
import { UI } from './components';
import { SchemaField } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { OPT_AG, OPT_FG, OPT_FC, OPT_PT, OPT_FS, OPT_TC } from './subfund_manage_schemas';
import type { SubFundRow } from './subfund_manage';
// 첨부 셀 카드 — DocumentsField(filepond 통일 드롭존)와 동일 표시 프리미티브로, 슬롯 구조는 유지하고 셀만 온-시스템 카드로.
import { RefreshCw, X as XIcon } from 'lucide-react';
import { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction } from './ui/attachment';

const { useState, useRef } = React;
const { Button, IconBtn } = UI;

const OPT_MONTH = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);
const GP_KINDS = ['대표GP', '공동GP'];
const DUTY_KINDS = ['GP담당자', '모태펀드담당자', 'RISK관리담당자'];
/* 첨부서류 고정 슬롯 — 규약서만 규약일자 동반 */
const DOC_SLOTS: { name: string; hasDate: boolean }[] = [
  { name: '사업계획서1', hasDate: false }, { name: '사업계획서2', hasDate: false }, { name: '사업계획서3', hasDate: false },
  { name: '결성총회의사록', hasDate: false },
  { name: '조합규약서1', hasDate: true }, { name: '조합규약서2', hasDate: true }, { name: '조합규약서3', hasDate: true }, { name: '조합규약서4', hasDate: true }, { name: '조합규약서5', hasDate: true },
];

type GpRow = { kind: string; name: string };
type DutyRow = { kind: string; name: string; email: string };
type DocRow = { date: string; file: string };

const nz = (v: string | number | null | undefined) => (v == null || v === '-' ? '' : String(v));
const numOr = (v: string, d: number | null) => { const n = Number(v.replace(/[^0-9.-]/g, '')); return v !== '' && Number.isFinite(n) ? n : d; };
const dateOr = (v: string, d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : d);
// 파일명 → 확장자 라벨(DocumentsField와 동일 규약). 확장자 없으면 '파일'.
const extLabel = (name: string) => { const ext = name.split('.').pop()?.toUpperCase(); return ext && ext !== name.toUpperCase() ? ext : '파일'; };

/* 섹션 — 제목 + 2단 그리드(좁으면 1단). RowFormModal의 wide 레이아웃과 동일 규격 */
function Section({ title, children, single }: { title: string; children: React.ReactNode; single?: boolean }) {
  return (
    <fieldset className="border-0 p-0 m-0 mb-7" style={{ minWidth: 0 }}>
      <legend className="w-full flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">{title}</legend>
      <div className={single ? '' : 'grid grid-cols-1 sm:grid-cols-2 gap-x-5'}>{children}</div>
    </fieldset>
  );
}
/* 단일 필드 — SchemaField 재사용(라벨은 RowFormModal Field와 동일 규격). full=2단에서 전체 폭 */
function F({ spec, value, onChange, full }: { spec: FieldSpec; value: string; onChange: (v: string) => void; full?: boolean }) {
  const Wrap: any = spec.control === 'radio' ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{spec.label}{spec.required ? ' *' : ''}</span>
      <SchemaField field={spec} value={value} onChange={onChange} />
    </Wrap>
  );
}
// 컬럼 사이 간격은 오른쪽 8px로만 준다(좌측 0 → 첫 컬럼은 왼쪽 끝에 붙음). 마지막 컬럼은 thLast/tdLast로 우측 0(오른쪽 끝 정렬).
const thStyle: React.CSSProperties = { textAlign: 'left', fontSize: 13, fontWeight: 700, color: 'var(--caption)', padding: '6px 0 12px', paddingRight: 8, whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '4px 0', paddingRight: 8, verticalAlign: 'middle' };
const thLast: React.CSSProperties = { ...thStyle, paddingRight: 0 };
const tdLast: React.CSSProperties = { ...tdStyle, paddingRight: 0 };

export function SubFundFormEditModal({ row, onSave, onClose }: { row: SubFundRow; onSave: (patch: Partial<SubFundRow>) => void; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>({
    fn: nz(row.fn), fd: nz(row.fd), rd: nz(row.rd), mat: nz(row.mat), liq: nz(row.liq), st: row.st === '-' ? OPT_FS[0] : row.st, regNo: '',
    c1: nz(row.c1), c2: nz(row.c2), v1: nz(row.v1), v2: nz(row.v2), unitAmt: '', closeMonth: OPT_MONTH[11],
    ctype: row.ctype === '-' ? OPT_FG[0] : row.ctype, cs: row.cs === '-' ? OPT_FC[0] : row.cs, ag: OPT_AG[0], tc: OPT_TC[0], pt: OPT_PT[0], payRounds: '',
    dur: nz(row.dur), rate: nz(row.rate), mgmtFee: '', perfFee: '',
    lgp: nz(row.lgp), lmo: '', lossOrder: '선GP', pm: '', note: '',
  });
  const set = (k: string) => (val: string) => setV((p) => ({ ...p, [k]: val }));
  const s = (key: string, label: string, control: FieldSpec['control'], extra?: Partial<FieldSpec>): FieldSpec => ({ key, label, control, ...extra });

  const [gps, setGps] = useState<GpRow[]>(() => {
    const list: GpRow[] = [];
    if (row.gp1 && row.gp1 !== '-') list.push({ kind: '대표GP', name: row.gp1 });
    if (row.gp2 && row.gp2 !== '-') list.push({ kind: '공동GP', name: row.gp2 });
    return list.length ? list : [{ kind: '대표GP', name: '' }];
  });
  const [duties, setDuties] = useState<DutyRow[]>([
    { kind: '모태펀드담당자', name: '양한솔', email: 'yhs8566@apfs.kr' },
    { kind: 'RISK관리담당자', name: '이성훈', email: 'leesh@apfs.kr' },
    { kind: 'GP담당자', name: '', email: '' },
  ]);
  const [docs, setDocs] = useState<DocRow[]>(DOC_SLOTS.map(() => ({ date: '', file: '' })));
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingDoc = useRef<number>(-1);
  const pickFile = (i: number) => { pendingDoc.current = i; fileInput.current?.click(); };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; const i = pendingDoc.current;
    if (f && i >= 0) setDocs((p) => p.map((d, k) => (k === i ? { ...d, file: f.name } : d)));
    e.target.value = '';
  };

  const submit = () => {
    const gp1 = gps.find((g) => g.kind === '대표GP')?.name || gps[0]?.name || row.gp1;
    const gp2 = gps.filter((g) => g.kind === '공동GP').map((g) => g.name).filter(Boolean).join(', ') || '-';
    // 민간 몫(c3/v3)은 총액−모태로 파생 — 총액·모태만 고치면 그리드/엑셀 합계가 어긋나므로 함께 갱신
    const c1 = numOr(v.c1, row.c1), c2 = numOr(v.c2, row.c2), v1 = numOr(v.v1, row.v1), v2 = numOr(v.v2, row.v2);
    const minus = (a: number | null, b: number | null) => (a == null ? null : a - (b ?? 0));
    onSave({
      fn: v.fn || row.fn, gp1: gp1 || '-', gp2,
      fd: dateOr(v.fd, row.fd), rd: dateOr(v.rd, row.rd), mat: dateOr(v.mat, row.mat), liq: dateOr(v.liq, row.liq), st: v.st || row.st,
      c1, c2, c3: minus(c1, c2), v1, v2, v3: minus(v1, v2),
      ctype: v.ctype, cs: v.cs, dur: numOr(v.dur, row.dur), rate: numOr(v.rate, row.rate), lgp: numOr(v.lgp, row.lgp),
    });
  };
  const yLabel = `${row.y}년 ${row.rt}${row.ch ? row.ch + '차' : ''}`;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>결성조합 수정</DialogTitle>
          <DialogDescription className="sr-only">결성된 자펀드의 기본정보·약정납입·속성·보수·담당자·첨부서류를 수정하는 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <Section title="기본정보">
            <F spec={s('mf', '모펀드구분', 'readonly')} value="농식품모태펀드" onChange={() => {}} />
            <F spec={s('y', '사업연도', 'readonly')} value={yLabel} onChange={() => {}} />
            <F spec={s('fn', '조합명', 'text', { required: true })} value={v.fn} onChange={set('fn')} full />
            {/* 업무집행조합원(GP) 반복행 */}
            <div className="sm:col-span-2 mb-3.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-caption" style={{ fontSize: 12 }}>업무집행조합원(GP)</span>
                <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setGps((p) => [...p, { kind: '공동GP', name: '' }])}>행 추가</Button>
                <span className="text-caption" style={{ fontSize: 12 }}>— 대표·공동 GP를 행 단위로 추가/삭제</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 420, tableLayout: 'fixed' }}>
                  <thead><tr><th style={{ ...thStyle, width: 160 }}>구분</th><th style={thStyle}>기관명(GP)</th><th style={{ ...thLast, width: 40 }}></th></tr></thead>
                  <tbody>{gps.map((g, i) => (
                    <tr key={i}>
                      <td style={tdStyle}><SchemaField fill field={s(`gpk${i}`, '구분', 'select', { options: GP_KINDS })} value={g.kind} onChange={(val) => setGps((p) => p.map((x, k) => (k === i ? { ...x, kind: val } : x)))} /></td>
                      <td style={tdStyle}><SchemaField fill field={s(`gpn${i}`, '기관명', 'text')} value={g.name} onChange={(val) => setGps((p) => p.map((x, k) => (k === i ? { ...x, name: val } : x)))} /></td>
                      <td style={{ ...tdLast, textAlign: 'center' }}><IconBtn icon="trash" label="행 삭제" size={34} onClick={() => setGps((p) => p.filter((_, k) => k !== i))} /></td>
                    </tr>))}</tbody>
                </table>
              </div>
            </div>
            <F spec={s('fd', '결성일', 'date')} value={v.fd} onChange={set('fd')} />
            <F spec={s('rd', '등록일', 'date')} value={v.rd} onChange={set('rd')} />
            <F spec={s('mat', '만기예정일', 'date')} value={v.mat} onChange={set('mat')} />
            <F spec={s('liq', '청산예정일', 'date')} value={v.liq} onChange={set('liq')} />
            <F spec={s('st', '조합운영상태', 'select', { options: OPT_FS })} value={v.st} onChange={set('st')} />
            <F spec={s('regNo', '조합고유번호', 'text')} value={v.regNo} onChange={set('regNo')} />
          </Section>

          <Section title="약정·납입">
            <F spec={s('c1', '조합약정총액(원)', 'number')} value={v.c1} onChange={set('c1')} />
            <F spec={s('c2', '모태펀드약정액(원)', 'number')} value={v.c2} onChange={set('c2')} />
            <F spec={s('v1', '변동조합약정액(원)', 'number')} value={v.v1} onChange={set('v1')} />
            <F spec={s('v2', '변동모태펀드약정액(원)', 'number')} value={v.v2} onChange={set('v2')} />
            <F spec={s('p1', '조합납입금누계(원)', 'readonly')} value={nz(row.p1) || '0'} onChange={() => {}} />
            <F spec={s('p2', '모태펀드납입금누계(원)', 'readonly')} value={nz(row.p2) || '0'} onChange={() => {}} />
            <F spec={s('unitAmt', '1좌당출자금액(원)', 'number')} value={v.unitAmt} onChange={set('unitAmt')} />
            <F spec={s('closeMonth', '결산월', 'select', { options: OPT_MONTH })} value={v.closeMonth} onChange={set('closeMonth')} />
          </Section>

          <Section title="조합 속성">
            <F spec={s('ctype', '조합구분', 'select', { options: OPT_FG })} value={v.ctype} onChange={set('ctype')} />
            <F spec={s('cs', '조합성격', 'select', { options: OPT_FC })} value={v.cs} onChange={set('cs')} />
            <F spec={s('ag', '조합계정', 'select', { options: OPT_AG })} value={v.ag} onChange={set('ag')} />
            <F spec={s('tc', '수탁기관', 'select', { options: OPT_TC })} value={v.tc} onChange={set('tc')} />
            <F spec={s('pt', '납입방식', 'select', { options: OPT_PT })} value={v.pt} onChange={set('pt')} />
            <F spec={s('payRounds', '납입회차', 'number')} value={v.payRounds} onChange={set('payRounds')} />
            <F spec={s('dur', '존속기간(년)', 'number')} value={v.dur} onChange={set('dur')} />
            <F spec={s('rate', '기준수익률(%)', 'number')} value={v.rate} onChange={set('rate')} />
            <F spec={s('mgmtFee', '관리보수', 'text')} value={v.mgmtFee} onChange={set('mgmtFee')} full />
            <F spec={s('perfFee', '성과보수', 'text')} value={v.perfFee} onChange={set('perfFee')} full />
          </Section>

          <Section title="우선손실·보수">
            <F spec={s('lgp', 'GP우선손실충당율(%)', 'number')} value={v.lgp} onChange={set('lgp')} />
            <F spec={s('lmo', '모태우선손실충당율(%)', 'number')} value={v.lmo} onChange={set('lmo')} />
            <F spec={s('lossOrder', '손실충당순서', 'radio', { options: ['선GP', '동시'] })} value={v.lossOrder} onChange={set('lossOrder')} full />
            <F spec={s('pm', '대표펀드매니저', 'text')} value={v.pm} onChange={set('pm')} />
          </Section>

          <Section title="담당자" single>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setDuties((p) => [...p, { kind: 'GP담당자', name: '', email: '' }])}>행 추가</Button>
              <span className="text-caption" style={{ fontSize: 12 }}>— 구분·성명·EMAIL을 행 단위로 추가/삭제</span>
            </div>
            <div className="overflow-x-auto mb-3.5">
              <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 560, tableLayout: 'fixed' }}>
                <thead><tr><th style={{ ...thStyle, width: 180 }}>담당 구분</th><th style={{ ...thStyle, width: 200 }}>성명</th><th style={thStyle}>EMAIL</th><th style={{ ...thLast, width: 40 }}></th></tr></thead>
                <tbody>{duties.map((d, i) => (
                  <tr key={i}>
                    <td style={tdStyle}><SchemaField fill field={s(`dk${i}`, '담당 구분', 'select', { options: DUTY_KINDS })} value={d.kind} onChange={(val) => setDuties((p) => p.map((x, k) => (k === i ? { ...x, kind: val } : x)))} /></td>
                    <td style={tdStyle}><SchemaField fill field={s(`dn${i}`, '성명', 'text', { pii: true })} value={d.name} onChange={(val) => setDuties((p) => p.map((x, k) => (k === i ? { ...x, name: val } : x)))} /></td>
                    <td style={tdStyle}><SchemaField fill field={s(`de${i}`, 'EMAIL', 'text', { pii: true })} value={d.email} onChange={(val) => setDuties((p) => p.map((x, k) => (k === i ? { ...x, email: val } : x)))} /></td>
                    <td style={{ ...tdLast, textAlign: 'center' }}><IconBtn icon="trash" label="행 삭제" size={34} onClick={() => setDuties((p) => p.filter((_, k) => k !== i))} /></td>
                  </tr>))}</tbody>
              </table>
            </div>
          </Section>

          <Section title="첨부서류" single>
            <p className="text-caption m-0 mb-2" style={{ fontSize: 12 }}>각 칸에서 [파일 선택] — 규약서는 규약일자를 함께 입력</p>
            <input ref={fileInput} type="file" className="sr-only" aria-label="첨부파일 선택" onChange={onFile} />
            <div className="overflow-x-auto mb-3.5">
              <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 560, tableLayout: 'fixed' }}>
                <thead><tr><th style={{ ...thStyle, width: 150 }}>문서 구분</th><th style={{ ...thStyle, width: 150 }}>규약일자</th><th style={thLast}>첨부파일</th></tr></thead>
                <tbody>{DOC_SLOTS.map((slot, i) => (
                  <tr key={slot.name}>
                    <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: 'nowrap' }}>{slot.name}</td>
                    <td style={tdStyle}>{slot.hasDate
                      ? <SchemaField fill field={s(`dd${i}`, `${slot.name} 일자`, 'date')} value={docs[i].date} onChange={(val) => setDocs((p) => p.map((d, k) => (k === i ? { ...d, date: val } : d)))} />
                      : <span className="text-caption">—</span>}</td>
                    <td style={tdLast}>
                      {/* 파일 있으면 통일 카드(Attachment: 확장자 아이콘+파일명+교체/삭제), 없으면 파일 선택 버튼. 슬롯 구조는 유지. */}
                      {docs[i].file ? (
                        // AttachmentGroup(role=list)로 감싸 role="listitem" 카드의 리스트 시맨틱을 유효화(고아 listitem 방지, web-a11y).
                        <AttachmentGroup>
                          <Attachment size="sm">
                            <AttachmentMedia fileName={docs[i].file} />
                            <AttachmentContent>
                              <AttachmentTitle>{docs[i].file}</AttachmentTitle>
                              <AttachmentDescription state="done">{extLabel(docs[i].file)} · 첨부됨</AttachmentDescription>
                            </AttachmentContent>
                            <AttachmentActions>
                              <AttachmentAction aria-label={`${slot.name} 첨부 교체`} title="교체" onClick={() => pickFile(i)}><RefreshCw /></AttachmentAction>
                              <AttachmentAction aria-label={`${slot.name} 첨부 제거`} title="삭제" onClick={() => setDocs((p) => p.map((d, k) => (k === i ? { ...d, file: '' } : d)))}><XIcon /></AttachmentAction>
                            </AttachmentActions>
                          </Attachment>
                        </AttachmentGroup>
                      ) : (
                        <Button variant="outline" size="sm" leadingIcon="upload" style={{ height: 34 }} onClick={() => pickFile(i)}>파일 선택</Button>
                      )}
                    </td>
                  </tr>))}</tbody>
              </table>
            </div>
            <F spec={s('note', '비고', 'text')} value={v.note} onChange={set('note')} />
          </Section>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={submit}>저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
