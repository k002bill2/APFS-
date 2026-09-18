/* 자펀드실물검증 메모 등록 — 팝업 (자펀드수탁관리(실물검증) 그리드 메모 그룹의 '등록' 버튼으로 진입).
   출처: S1_26_자펀드수탁관리_실물검증_.html 하단 `<script>`의 `openMemo(ctx)` 템플릿 → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - `.msub 검증 대상` + `.inforow` 3줄   → `Section` + `KvGrid`(한글 가로 라벨 — general_meeting_detail_modal 복사)
   - `.msub 작성이력` + `.histtable`      → `Section` + 표(기준일자·메모). 비면 목업 문구 '작성 이력이 없습니다.' 한 행
   - `.msub 메모 입력` + date/textarea    → `Section` + `SchemaField`(date·textarea). 네이티브 `<input type=date>`는
                                            쓰지 않는다(apfs-datepicker: 전 화면 DatePicker 통일, 값 계약 'YYYY-MM-DD')
   - `.modal-foot 닫기·저장`              → `DialogFooter` 닫기(outline) · 저장(primary)
   - 목업이 손으로 만든 스크림·포커스트랩·ESC·스크롤잠금은 Radix `Dialog`가 이미 제공한다(web-a11y) → 이식하지 않는다.

   한계·가정(결정 기록)
   - 목업 textarea의 `placeholder="검증 메모 내용을 입력하세요"`는 싣지 않는다 — placeholder는 접근名이 아니고
     (web-a11y 함정 A) 라벨 '내용 *'이 그 역할을 한다. `SchemaField`에 placeholder 슬롯도 없다.
   - 백엔드가 없어 저장은 부모 state(행의 `memos`)에만 반영된다 — 토스트 문구는 목업 원문 그대로.
   - 섹션2(미투자자산 거래)·섹션3(미투자자산)은 원문 샘플이 없다. 두 섹션은 `corp` 슬롯에 종목/계좌번호를
     넘기지만 **라벨은 목업 팝업 템플릿 그대로 '투자기업' 고정**이다(팝업 템플릿이 섹션별로 갈리지 않는다).
   - ⚠검토필요 마커는 이 팝업에 없다 — 목업 `.review`는 검색영역 1건뿐이고 팝업 템플릿엔 없다. */
import React from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { SchemaField } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { toast } from './ui/sonner';
import type { VerifyMemo } from './custody_verify_manage';

const { Button } = UI;

/** 팝업 헤더의 검증 대상 — 목업 `.memo-btn`의 data-fund/data-gubun/data-corp 3값 그대로. */
export interface CustodyMemoCtx {
  fund: string;    // 조합명(data-fund)
  gubun: string;   // 구분(data-gubun) — 섹션명. 분류 축이라 마스킹 대상 아님
  corp: string;    // 투자기업(data-corp) — 섹션2는 종목, 섹션3은 계좌번호가 이 슬롯에 들어온다
}

/* ── 프리미티브(골드 `general_meeting_detail_modal.tsx` 복사 — 공유 export 아님) ── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mt-0 mb-3">{title}</h3>
      {children}
    </section>
  );
}

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-center';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '7px 9px' };
const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };

type KvItem = { l: string; v: string; plain?: boolean };

/* kv 그리드 — 골드는 `grid-cols-1 sm:grid-cols-2`지만 여기는 **1열 고정**이다:
   이 팝업은 640px(골드 명세 팝업은 880px)이라 2열로 나누면 본문 폭 ≈548px ÷ 2 − 라벨 150px = 값 칸이 124px로
   눌려 긴 투자기업명이 통째로 줄바꿈된다. 라벨 폭·테두리 셀 등 나머지 규격은 골드 그대로. */
function KvGrid({ items }: { items: KvItem[] }) {
  return (
    <dl className="grid grid-cols-1 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map((o) => (
        <div key={o.l} className="grid bg-card" style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
          <dd className={`m-0 flex items-center min-w-0 ${o.v ? '' : 'text-caption'}`}
            style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
            {/* plain=분류 축(구분)은 비마스킹, 나머지 텍스트는 <MT>. 값 없음은 '-' */}
            {!o.v ? '-' : o.plain ? o.v : <MT>{o.v}</MT>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* 라벨 + 컨트롤 래퍼 — `RowFormModal`의 `Field` 규격 복제(apfs-form-modal 확장 규칙 ③).
   plain=true → `<label>` 대신 `<div>`: DatePicker 트리거는 `<button>`이고 button은 labelable이라
   `<label>` 안에 두면 라벨 활성화와 트리거 클릭이 겹쳐 팝오버가 2회 토글된다(apfs-datepicker "폭·라벨" 규칙). */
function Field({ label, plain, errMsg, children }: { label: string; plain?: boolean; errMsg?: string; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-3.5">
      <span className="font-semibold text-caption block" style={{ fontSize: 12, marginBottom: 5 }}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

/* ad-hoc FieldSpec — `SchemaField`에 넘겨 14px·DatePicker·토큰을 그대로 얻는다(스키마 페이지가 아니라 PageSchema 아님) */
const DATE_FIELD: FieldSpec = { key: 'date', label: '기준일자', control: 'date', required: true };
const CONTENT_FIELD: FieldSpec = { key: 'content', label: '내용', control: 'textarea', required: true };

export function CustodyMemoModal({ ctx, history, baseDate, onSave, onClose }: {
  ctx: CustodyMemoCtx;
  history: VerifyMemo[];
  /** 기준일자 초기값 — 상세필터 '기준일'(목업 기본 2026-04-30)을 시드로 받는다 */
  baseDate: string;
  onSave: (m: VerifyMemo) => void;
  onClose: () => void;
}) {
  const [date, setDate] = React.useState(baseDate);
  const [content, setContent] = React.useState('');
  const [errKey, setErrKey] = React.useState<'' | 'date' | 'content'>('');

  const submit = () => {
    if (!date.trim()) { setErrKey('date'); return; }
    if (!content.trim()) { setErrKey('content'); return; }
    setErrKey('');
    onSave({ date, content: content.trim() });
    toast.success('저장되었습니다 (목업)');
  };

  const kv: KvItem[] = [
    { l: '조합명', v: ctx.fund },
    { l: '구분', v: ctx.gubun, plain: true },
    { l: '투자기업', v: ctx.corp },
  ];

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로 닫히지 않는다 — 작성 중 오터치 유실 방지(RowFormModal과 동일 계약) */}
      <DialogContent className="max-w-[640px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>자펀드실물검증 메모 등록</DialogTitle>
          <DialogDescription className="sr-only">자펀드 실물검증 대상에 검증 메모를 등록하는 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <Section title="검증 대상"><KvGrid items={kv} /></Section>

          <Section title="작성이력">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 380 }}>
                <caption className="sr-only">메모 작성이력 — 기준일자·메모</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH} style={{ ...CELL, width: 130 }}>기준일자</th>
                    <th scope="col" className={TH} style={CELL}>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td className={`${TD} text-center text-caption`} colSpan={2} style={{ ...CELL, padding: '18px 9px' }}>작성 이력이 없습니다.</td>
                    </tr>
                  ) : history.map((h, i) => (
                    <tr key={h.date + '-' + i}>
                      <td className={`${TD} text-center tabular`} style={CELL}>{mn(h.date)}</td>
                      <td className={TD} style={{ ...CELL, overflowWrap: 'anywhere' }}><MT>{h.content}</MT></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="메모 입력">
            {/* 기준일자 — plain(div) 래퍼 이유는 위 Field 주석(라벨 안 버튼 2회 토글) */}
            <Field label="기준일자 *" plain errMsg={errKey === 'date' ? '기준일자를 입력하세요.' : undefined}>
              <SchemaField field={DATE_FIELD} value={date} onChange={(v) => { setDate(v); if (errKey === 'date') setErrKey(''); }} invalid={errKey === 'date'} />
            </Field>
            <Field label="내용 *" errMsg={errKey === 'content' ? '내용을 입력하세요.' : undefined}>
              <SchemaField field={CONTENT_FIELD} value={content} onChange={(v) => { setContent(v); if (errKey === 'content') setErrKey(''); }} invalid={errKey === 'content'} />
            </Field>
          </Section>
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
