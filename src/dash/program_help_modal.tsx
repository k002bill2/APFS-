/* 프로그램관리 — 도움말 편집 모달. 출처: S0_108_프로그램관리.html `#m-help`(도움말 제공 · 화면 개요* · 화면 캡처 · 화면 항목 설명 · 처리 절차 · FAQ · 유의사항 · 첨부파일).

   ⚠ RowFormModal(flat 스키마)로는 담을 수 없어 전용 섹션형 모달이다(apfs-form-modal "확장: 섹션형·반복행") — 반복행 4종(캡처·항목·절차·FAQ)
   + 첨부 드롭존(`DocumentsField` 통일 드롭존, 파일명만 보관). 개별 컨트롤은 `SchemaField`(ad-hoc FieldSpec), 라벨 래퍼는 `Field` 규격 로컬 복제,
   섹션 제목은 `<legend>` 밑줄형. 저장 시 `normalizeHelpDoc`(공백·빈 항목 정리) 후 제공 ON 이면 화면 개요 필수(`helpDocError`).
   ⚠ 백엔드 없음 — 저장은 부모(program_manage)의 로컬 행 상태만 바꾼다. 이미지·파일은 이름만 보관(업로드 없음). */
import React from 'react';
import { UI } from './components';
import { MT } from './mask';
import { SchemaField } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { DocumentsField } from './fields/DocumentsField';
import { normalizeHelpDoc, helpDocError } from './program_manage_model';
import type { HelpDoc, ProgramRow } from './program_manage_model';

const { Button, IconBtn } = UI;

const F: Record<string, FieldSpec> = {
  on: { key: 'on', label: '도움말 제공', control: 'switch', options: ['여', '부'] },
  overview: { key: 'overview', label: '화면 개요', control: 'textarea', required: true },
  notes: { key: 'notes', label: '유의사항', control: 'textarea' },
};
const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, plain, hint }: { label: string; children: React.ReactNode; errMsg?: string; plain?: boolean; hint?: string }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5">
      <span className="font-semibold text-caption block" style={labelStyle}>{label}{hint && <span className="font-normal" style={{ marginLeft: 6 }}>{hint}</span>}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}
function Section({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0 m-0 mb-6">
      <legend className="w-full flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">
        <span>{title}</span>{hint && <span className="text-caption font-normal" style={{ fontSize: 11.5 }}>{hint}</span>}
      </legend>
      {children}
      {action && <div className="mt-2">{action}</div>}
    </fieldset>
  );
}
/* 반복행 텍스트 입력 — 셀 채움(fill) */
const rowInput = (key: string, label: string): FieldSpec => ({ key, label, control: 'text' });
const rowArea = (key: string, label: string): FieldSpec => ({ key, label, control: 'textarea' });

export function ProgramHelpModal({ program, onSave, onClose }: {
  program: ProgramRow;
  onSave: (on: boolean, doc: HelpDoc) => void;
  onClose: () => void;
}) {
  const [on, setOn] = React.useState<'여' | '부'>(program.help ? '여' : '부');
  /* 편집 중 사본(목업 draft) — 깊은 복사로 원본과 분리 */
  const [d, setD] = React.useState<HelpDoc>(() => JSON.parse(JSON.stringify(program.helpDoc)) as HelpDoc);
  const [err, setErr] = React.useState<'overview' | null>(null);
  const patch = (p: Partial<HelpDoc>) => setD((prev) => ({ ...prev, ...p }));
  const upd = <K extends 'images' | 'items' | 'steps' | 'faqs'>(k: K, i: number, val: HelpDoc[K][number]) => patch({ [k]: d[k].map((x, j) => (j === i ? val : x)) } as Partial<HelpDoc>);
  const del = (k: 'images' | 'items' | 'steps' | 'faqs', i: number) => patch({ [k]: (d[k] as unknown[]).filter((_, j) => j !== i) } as Partial<HelpDoc>);

  const submit = () => {
    const doc = normalizeHelpDoc(d);
    const e = helpDocError(on === '여', doc);
    if (e) { setErr(e); return; }
    onSave(on === '여', doc);
  };
  const delBtn = (onClick: () => void, label: string) => <IconBtn icon="trash" label={label} size={34} onClick={onClick} />;

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">도움말 편집</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{`${program.pid} · ${program.pname}`}</MT></DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="도움말 제공" plain hint="여 = 사용자 화면 툴팁·도움말 페이지로 노출">
              <SchemaField field={F.on} value={on} onChange={(x) => { setOn(x as '여' | '부'); setErr(null); }} />
            </Field>
          </div>
          <Field label={on === '여' ? '화면 개요 *' : '화면 개요'} hint="이 프로그램으로 무엇을 하는지" errMsg={err === 'overview' ? '화면 개요는 필수입니다(도움말 제공 시).' : undefined}>
            <SchemaField field={{ ...F.overview, required: on === '여' }} value={d.overview} onChange={(x) => { patch({ overview: x }); setErr(null); }} invalid={err === 'overview'} />
          </Field>

          <Section title="화면 캡처" hint="스크린샷 이미지 (여러 장 가능 · 이름만 보관)"
            action={<Button variant="outline" size="sm" leadingIcon="plus" onClick={() => patch({ images: [...d.images, { name: '' }] })}>이미지 추가</Button>}>
            <div className="flex gap-2.5 flex-wrap">
              {d.images.length === 0 && <span className="text-caption" style={{ fontSize: 12 }}>등록된 캡처가 없습니다.</span>}
              {d.images.map((im, i) => (
                <div key={i} className="relative border border-border rounded-[8px] bg-muted" style={{ width: 150, padding: 8 }}>
                  <div className="flex items-center justify-center rounded-[6px] text-caption" style={{ height: 70, background: 'color-mix(in srgb, var(--muted-foreground) 14%, transparent)' }} aria-hidden>🖼</div>
                  <div className="mt-1.5"><SchemaField fill field={rowInput(`img-${i}`, '이미지 설명')} value={im.name} onChange={(x) => upd('images', i, { name: x })} /></div>
                  <div className="absolute" style={{ top: 4, right: 4 }}>{delBtn(() => del('images', i), `캡처 ${i + 1} 삭제`)}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="화면 항목 설명" hint="입력필드·버튼·컬럼 등"
            action={<Button variant="outline" size="sm" leadingIcon="plus" onClick={() => patch({ items: [...d.items, { label: '', desc: '' }] })}>항목 추가</Button>}>
            {d.items.map((it, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <div style={{ flex: '0 0 200px', minWidth: 0 }}><SchemaField fill field={rowInput(`it-l-${i}`, '항목명')} value={it.label} onChange={(x) => upd('items', i, { ...it, label: x })} /></div>
                <div className="flex-1 min-w-0"><SchemaField fill field={rowInput(`it-d-${i}`, '설명')} value={it.desc} onChange={(x) => upd('items', i, { ...it, desc: x })} /></div>
                {delBtn(() => del('items', i), `항목 ${i + 1} 삭제`)}
              </div>
            ))}
          </Section>

          <Section title="처리 절차" hint="사용 순서"
            action={<Button variant="outline" size="sm" leadingIcon="plus" onClick={() => patch({ steps: [...d.steps, ''] })}>단계 추가</Button>}>
            {d.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <span className="inline-flex items-center justify-center shrink-0 font-bold text-primary rounded-full" style={{ width: 24, height: 24, fontSize: 12, background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }} aria-hidden>{i + 1}</span>
                <div className="flex-1 min-w-0"><SchemaField fill field={rowInput(`st-${i}`, `${i + 1}단계`)} value={s} onChange={(x) => upd('steps', i, x)} /></div>
                {delBtn(() => del('steps', i), `${i + 1}단계 삭제`)}
              </div>
            ))}
          </Section>

          <Section title="자주 묻는 질문 (FAQ)"
            action={<Button variant="outline" size="sm" leadingIcon="plus" onClick={() => patch({ faqs: [...d.faqs, { q: '', a: '' }] })}>FAQ 추가</Button>}>
            {d.faqs.map((f, i) => (
              <div key={i} className="border border-border rounded-[8px] mb-2" style={{ padding: 10 }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="shrink-0 font-bold text-primary" style={{ fontSize: 12.5, minWidth: 26 }} aria-hidden>Q{i + 1}</span>
                  <div className="flex-1 min-w-0"><SchemaField fill field={rowInput(`fq-${i}`, `질문 ${i + 1}`)} value={f.q} onChange={(x) => upd('faqs', i, { ...f, q: x })} /></div>
                  {delBtn(() => del('faqs', i), `FAQ ${i + 1} 삭제`)}
                </div>
                <SchemaField fill field={rowArea(`fa-${i}`, `답변 ${i + 1}`)} value={f.a} onChange={(x) => upd('faqs', i, { ...f, a: x })} />
              </div>
            ))}
          </Section>

          <Field label="유의사항">
            <SchemaField field={F.notes} value={d.notes} onChange={(x) => patch({ notes: x })} />
          </Field>

          <Section title="첨부파일" hint="관련 문서·양식 등 — 파일명만 보관(업로드 없음)">
            <DocumentsField label="첨부파일" value={d.files.join(', ')} onChange={(csv) => patch({ files: csv.split(',').map((s) => s.trim()).filter(Boolean) })} />
          </Section>
          <p className="text-caption m-0" style={{ fontSize: 12, lineHeight: 1.5 }}>도움말 원본은 여기서 관리하고 메뉴에는 연결만 합니다. 화면 시연용 프로토타입 — 저장은 화면 로컬 상태만 바꿉니다.</p>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={submit}>저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
