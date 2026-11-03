/* 게시판관리(ADM-013) — 게시글 등록/수정 모달. 출처: 게시판관리.html `openPostForm`(+ 본문 `.fgrid`·`.xpbox` 마크업).
   ⚠ RowFormModal(flat 스키마)로 담을 수 없어 전용 모달이다(apfs-form-modal "확장: 섹션형") — 게시대상·게시 종류 복수 체크,
   게시 종류·표시 형태·클릭 시 이동에 따라 본문·이미지·웹주소·연결 파일·열기 방식 칸이 나타나고 사라진다.
   항목 순서 = 목업 스크립트: 게시기간 · 작성자 · 게시대상 · 게시 종류 · 제목 → 본문(또는 안내) → 첨부 → [팝업·배너 설정](종류를 골랐을 때만).
   목업 → 우리 규약:
   - 네이티브 date ×2 → SchemaField date(DatePicker) ×2 · 체크 그룹 → DS Checkbox(htmlFor 명시 연결) · radio → SchemaField radio(DS RadioGroup).
   - contenteditable 서식 툴바(목업) → SchemaField richtext(공용 Plate 에디터, lazy). 값은 에디터 JSON 문자열(데모 HTML 은 에디터가 읽어 들인다).
   - 드롭존(20MB) → 공용 DocumentsField(maxSize 20MB). 이미지·연결 파일 select 후보는 첨부 CSV 에서 파생(목업 MutationObserver 대체).
   - 토스트만 띄우던 검증 → 칸 빨간 테두리 + 인라인 문구 + 토스트(board_model.validateDraft — 목업 순서·문구 그대로).
   - 작성자 = 로그인 사용자 자동(읽기 전용). 저장 = 항상 미게시(게시는 목록의 [게시]).
   ⚠ 백엔드 없음 — 첨부는 파일명만 보관, 실제 업로드·게시 송출 없음. */
import React from 'react';
import { UI } from '../../components';
import { SchemaField } from '../../schemas/renderers';
import type { FieldSpec } from '../../schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { Checkbox } from '../../ui/checkbox';   // 복수 체크 그룹 = DS 체크박스(htmlFor 명시 연결, <label> 래핑 금지)
import { DocumentsField } from '../../fields/DocumentsField';
import { parseFileNames } from '../../fields/file_names';
import { Icon } from '../../icons';
import { toast } from '../../ui/sonner';
import { AUDIENCES, POST_KINDS } from './board_data';
import type { Audience, DispType, LinkKind, LinkTarget, PostKind, PostRow } from './board_data';
import { draftOf, validateDraft, showBody, imageFiles, pickOption } from './board_model';
import type { PostDraft, DraftErrKey } from './board_model';

const { Button, SaveButton } = UI;

/* 라디오 표시 라벨 ↔ 저장 코드(목업 value 그대로) */
const DISP_LABEL: Record<DispType, string> = { text: '게시글 내용', img: '이미지' };
const LINK_LABEL: Record<LinkKind, string> = { none: '없음(보기만)', url: '웹주소', file: '파일' };
const TARGET_LABEL: Record<LinkTarget, string> = { new: '새창', self: '현재창' };
const codeOf = <K extends string>(map: Record<K, string>, label: string, fallback: K): K =>
  (Object.keys(map) as K[]).find((k) => map[k] === label) ?? fallback;

const F: Record<string, FieldSpec> = {
  from: { key: 'from', label: '게시 시작일', control: 'date', required: true },
  to: { key: 'to', label: '게시 종료일', control: 'date', required: true },
  writer: { key: 'writer', label: '작성자', control: 'readonly' },
  title: { key: 'title', label: '제목', control: 'text', required: true, long: true, placeholder: '제목을 입력하세요' },
  body: { key: 'body', label: '본문', control: 'richtext' },
  disp: { key: 'disp', label: '표시 형태', control: 'radio', options: Object.values(DISP_LABEL), required: true },
  link: { key: 'link', label: '클릭 시 이동', control: 'radio', options: Object.values(LINK_LABEL) },
  url: { key: 'url', label: '웹주소', control: 'text', required: true, long: true, placeholder: 'https://' },
  target: { key: 'target', label: '열기 방식', control: 'radio', options: Object.values(TARGET_LABEL), required: true },
};
const ATTACH_HINT = 'PPT, PDF, DOC, DOCX, XLS, XLSX, HWP, HWPX, JPG, JPEG, GIF, PNG, MP4 파일 최대 20MB까지 업로드할 수 있습니다.';

const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, className, plain, hint, hintId }: { label: string; children: React.ReactNode; errMsg?: string; className?: string; plain?: boolean; hint?: React.ReactNode; hintId?: string }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {hint && !errMsg && <span id={hintId} className="text-caption block mt-1" style={{ fontSize: 11.5 }}>{hint}</span>}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0 m-0 mb-2" style={{ minWidth: 0 }}>
      <legend className="w-full flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">
        <span>{title}</span>{hint && <span className="text-caption font-normal" style={{ fontSize: 11.5 }}>{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}
/* 복수 체크 그룹 — DS Checkbox + 가시 라벨 htmlFor 연결 */
function CheckGroup<T extends string>({ name, items, checked, onToggle, idPrefix, invalid }: { name: string; items: readonly T[]; checked: readonly T[]; onToggle: (v: T) => void; idPrefix: string; invalid?: boolean }) {
  return (
    <div role="group" aria-label={name} className="flex items-center gap-4 flex-wrap" style={{ minHeight: 34 }}>
      {items.map((it, i) => (
        <span key={it} className="inline-flex items-center gap-1.5" style={{ fontSize: 13.5 }}>
          <Checkbox id={`${idPrefix}-${i}`} checked={checked.includes(it)} onCheckedChange={() => onToggle(it)} aria-label={`${name} ${it}`} aria-invalid={invalid || undefined} />
          <label htmlFor={`${idPrefix}-${i}`} style={{ cursor: 'pointer', userSelect: 'none' }}>{it}</label>
        </span>
      ))}
    </div>
  );
}
/* 후보가 없는 select 자리 — 빈 <select> 대신 안내 문구 */
const NoChoice = ({ msg }: { msg: string }) => (
  <span className="text-caption inline-flex items-center gap-1.5" style={{ fontSize: 12.5, minHeight: 34 }}><Icon name="info" size={14} />{msg}</span>
);
const toggle = <T,>(list: readonly T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function BoardFormModal({ row, writer, onSave, onClose }: {
  row: PostRow | null;                  // null = 신규 등록
  writer: string;                       // 신규 작성자(로그인 사용자) — 수정은 원 작성자
  onSave: (d: PostDraft) => void;
  onClose: () => void;
}) {
  const [d, setD] = React.useState<PostDraft>(() => draftOf(row));
  const [err, setErr] = React.useState<{ key: DraftErrKey; msg: string } | null>(null);
  const set = <K extends keyof PostDraft>(k: K, v: PostDraft[K], clears: readonly DraftErrKey[] = []) => {
    setD((p) => ({ ...p, [k]: v }));
    setErr((e) => (e && clears.includes(e.key) ? null : e));
  };
  const uid = React.useId();
  const dlgRef = React.useRef<DialogHandle>(null);

  const any = d.kinds.length > 0;
  const bodyOn = showBody(d.kinds, d.dispType);
  const files = parseFileNames(d.file);
  const images = imageFiles(d.file);
  const errOf = (k: DraftErrKey) => (err?.key === k ? err.msg : undefined);

  const submit = () => {
    const e = validateDraft(d);
    if (e) { setErr(e); toast.error(e.msg); return; }
    return () => onSave(d);
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{row ? '게시글 수정' : '게시글 등록'}</DialogTitle>
          <DialogDescription className="sr-only">게시기간·게시대상·게시 종류·제목·본문·첨부와 팝업·배너 설정을 입력합니다. 저장하면 미게시 상태가 됩니다.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="게시기간 *" plain errMsg={errOf('period')}>
              <div className="flex items-center gap-2 flex-wrap">
                <SchemaField field={F.from} value={d.from} onChange={(x) => set('from', x, ['period'])} invalid={err?.key === 'period'} />
                <span className="text-caption">~</span>
                <SchemaField field={F.to} value={d.to} onChange={(x) => set('to', x, ['period'])} invalid={err?.key === 'period'} />
              </div>
            </Field>
            <Field label="작성자" hint="로그인 사용자 — 고칠 수 없습니다">
              <SchemaField field={F.writer} value={row?.writer ?? writer} onChange={() => {}} />
            </Field>
            <Field label="게시대상 *" plain className="sm:col-span-2" errMsg={errOf('aud')}>
              <CheckGroup<Audience> name="게시대상" items={AUDIENCES} checked={d.aud} idPrefix={`${uid}-aud`} invalid={err?.key === 'aud'}
                onToggle={(a) => set('aud', toggle(d.aud, a), ['aud'])} />
            </Field>
            <Field label="게시 종류" plain className="sm:col-span-2" hint="고르지 않으면 일반 게시글입니다. 고르면 아래 [팝업·배너 설정]이 열립니다.">
              <CheckGroup<PostKind> name="게시 종류" items={POST_KINDS} checked={d.kinds} idPrefix={`${uid}-kind`}
                onToggle={(k) => set('kinds', toggle(d.kinds, k), ['img', 'url', 'linkFile'])} />
            </Field>
            <Field label="제목 *" className="sm:col-span-2" errMsg={errOf('title')}>
              <SchemaField field={F.title} value={d.title} onChange={(x) => set('title', x, ['title'])} invalid={err?.key === 'title'} />
            </Field>
          </div>

          {bodyOn ? (
            <Field label="본문" plain>
              <SchemaField field={F.body} value={d.body} onChange={(x) => set('body', x)} />
            </Field>
          ) : (
            <p role="note" className="flex items-start gap-2 rounded-card-sm border border-dashed border-border-strong bg-muted text-muted-foreground"
              style={{ margin: '0 0 14px', padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>
              <Icon name="info" size={16} />
              <span>이미지로만 띄우는 글이라 본문은 쓰지 않습니다. 아래 [표시 형태]를 <b className="text-foreground">게시글 내용</b>으로 고르면 본문을 써서 그대로 띄울 수 있습니다.</span>
            </p>
          )}

          <Field label="첨부파일" plain hint={ATTACH_HINT} hintId={`${uid}-att-hint`}>
            <DocumentsField label="첨부파일" value={d.file} multiple maxSize="20MB" describedBy={`${uid}-att-hint`}
              onChange={(csv) => set('file', csv, ['img', 'linkFile'])} />
          </Field>

          {any && (
            <Section title="팝업·배너 설정" hint="체크한 게시 종류에 모두 같은 설정이 들어갑니다">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
                <Field label="표시 형태 *" plain className="sm:col-span-2">
                  <SchemaField field={F.disp} value={DISP_LABEL[d.dispType]} onChange={(x) => set('dispType', codeOf(DISP_LABEL, x, 'text'), ['img'])} />
                </Field>
                {d.dispType === 'img' && (
                  <Field label="이미지 *" className="sm:col-span-2" plain={!images.length} errMsg={errOf('img')}>
                    {images.length
                      ? <SchemaField field={{ key: 'img', label: '이미지', control: 'select', options: images, required: true }} value={pickOption(d.img, images)} onChange={(x) => set('img', x, ['img'])} />
                      : <NoChoice msg="이미지 첨부파일이 없습니다 — 위 첨부파일에 JPG·PNG·GIF 를 올려 주세요." />}
                  </Field>
                )}
                <Field label="클릭 시 이동" plain className="sm:col-span-2">
                  <SchemaField field={F.link} value={LINK_LABEL[d.link]} onChange={(x) => set('link', codeOf(LINK_LABEL, x, 'none'), ['url', 'linkFile'])} />
                </Field>
                {d.link === 'url' && (
                  <Field label="웹주소 *" className="sm:col-span-2" errMsg={errOf('url')}>
                    <SchemaField field={F.url} value={d.url} onChange={(x) => set('url', x, ['url'])} invalid={err?.key === 'url'} />
                  </Field>
                )}
                {d.link === 'file' && (
                  <Field label="연결 파일 *" className="sm:col-span-2" plain={!files.length} errMsg={errOf('linkFile')}>
                    {files.length
                      ? <SchemaField field={{ key: 'linkFile', label: '연결 파일', control: 'select', options: files, required: true }} value={pickOption(d.linkFile, files)} onChange={(x) => set('linkFile', x, ['linkFile'])} />
                      : <NoChoice msg="첨부파일이 없습니다 — 위 첨부파일에 눌렀을 때 열 파일을 올려 주세요." />}
                  </Field>
                )}
                {d.link !== 'none' && (
                  <Field label="열기 방식 *" plain className="sm:col-span-2">
                    <SchemaField field={F.target} value={TARGET_LABEL[d.target]} onChange={(x) => set('target', codeOf(TARGET_LABEL, x, 'new'))} />
                  </Field>
                )}
              </div>
            </Section>
          )}
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
