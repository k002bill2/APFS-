/* 조합원총회 상세 — 읽기전용 팝업 (출처: S1_07_조합원총회.html의 행 클릭 팝업 `openDetail`)
   구성(목업 → 우리 규약):
   - `buildGen`   → ① 일반사항 kv 그리드(한글 가로 라벨 150px — `subfund_spec_modal.tsx` KvGrid 복사)
   - `buildReport`→ ② 보고안건 표(안건순서·보고안건)
   - `buildMotion`→ ③ 부의안건 표(의안순서·안건내역·결의방법·MOAF의견·결과)
   - `buildFiles` → ④ 첨부파일 표(파일명·등록일시·수정일시·업로드 여부·다운로드)
       ⚠ 목업은 PDF 배지 + 메타 한 줄(`.filelist`)이지만, 등록/수정/업로드 3값이 한 줄에 뭉쳐 읽기 어려워
         같은 값을 표로 편다(열 집합·순서는 목업 메타 순서 그대로).
   - 푸터: 닫기 하나(목업 동일)

   골격·크롬(Dialog 880 · `px-[46px]` 인셋 정렬 · Section · TH/TD/CELL 표 헬퍼)은 골드
   `occasional_report_modal.tsx` 복사 관례. 금액 항목이 없어 **단위 토글 없음**(apfs-spec-popup 규약 2는
   금액이 있을 때의 규약). **엑셀도 두지 않는다** — 렌더 소스가 4개(kv·보고안건·부의안건·첨부)라
   "화면=엑셀 불변식"(규약 6)을 지키기 어렵고 목업 푸터도 닫기 하나다(골드 동일 결정).

   kv dt/dd 폰트는 골드(`subfund_spec_modal.tsx` 13/14 = apfs-spec-popup 규약 8 "값 14 / 라벨 13")를 따른다. */
import React from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from './ui/sonner';
import type { MeetingRow, MeetingDetail } from './general_meeting_manage';

const { Button } = UI;

/* ── 프리미티브(골드 복사 — 공유 export 아님) ── */
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

/* kv 항목 — `date`면 mn(숫자 마스킹), 아니면 <MT>. 값 없음은 '-'(muted) */
type KvItem = { l: string; v: string; full?: boolean; date?: boolean };

const buildGen = (g: MeetingDetail['gen']): KvItem[] => [
  { l: '자펀드', v: g.fund, full: true },
  { l: '총회종류', v: g.gtype },
  { l: '총회일시', v: g.gdt, date: true },
  { l: '담당심사역', v: g.mgr },
  { l: '제목(총회명)', v: g.title },
  { l: '총회장소', v: g.place, full: true },
  { l: '결의형태', v: g.resolform },
  { l: '결의방법', v: g.resolway },
  { l: '기간단축', v: g.shorten },
];

function KvGrid({ items }: { items: KvItem[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map((o) => (
        <div key={o.l} className={`grid bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
          <dd className={`m-0 flex items-center min-w-0 ${o.v ? '' : 'text-caption'}`}
            style={{ padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' }}>
            {!o.v ? '-' : o.date ? mn(o.v) : <MT>{o.v}</MT>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* 비어 있는 표 본문 — 목업 `.empty` 한 행 그대로 */
function EmptyRow({ span, msg }: { span: number; msg: string }) {
  return (
    <tr>
      <td className={`${TD} text-center text-caption`} colSpan={span} style={{ ...CELL, padding: '18px 9px' }}>{msg}</td>
    </tr>
  );
}

/* ② 보고안건 — 안건순서·보고안건 */
function ReportTable({ list }: { list: MeetingDetail['report'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 420 }}>
        <caption className="sr-only">보고안건 목록 — 안건순서·보고안건</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={{ ...CELL, width: 90 }}>안건순서</th>
            <th scope="col" className={TH} style={CELL}>보고안건</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? <EmptyRow span={2} msg="등록된 보고안건 없음" /> : list.map((x) => (
            <tr key={x.ord}>
              <td className={`${TD} text-center tabular`} style={CELL}>{mn(x.ord)}</td>
              <td className={TD} style={CELL}><MT>{x.content}</MT></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ③ 부의안건 — 의안순서·안건내역·결의방법·MOAF의견·결과. 빈 값은 '-' */
function MotionTable({ list }: { list: MeetingDetail['motion'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 640 }}>
        <caption className="sr-only">부의안건 목록 — 의안순서·안건내역·결의방법·MOAF의견·결과</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={{ ...CELL, width: 80 }}>의안순서</th>
            <th scope="col" className={TH} style={CELL}>안건내역</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 120 }}>결의방법</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 110 }}>MOAF의견</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 90 }}>결과</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? <EmptyRow span={5} msg="등록된 부의안건 없음" /> : list.map((x) => (
            <tr key={x.ord}>
              <td className={`${TD} text-center tabular`} style={CELL}>{mn(x.ord)}</td>
              <td className={TD} style={CELL}><MT>{x.content}</MT></td>
              <td className={`${TD} text-center`} style={CELL}><MT>{x.way}</MT></td>
              <td className={`${TD} text-center ${x.moaf ? '' : 'text-caption'}`} style={CELL}>{x.moaf ? <MT>{x.moaf}</MT> : '-'}</td>
              <td className={`${TD} text-center ${x.result ? '' : 'text-caption'}`} style={CELL}>{x.result ? <MT>{x.result}</MT> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ④ 첨부파일 — 파일명·등록일시·수정일시·업로드 여부·다운로드.
   ⚠ 다운로드 버튼의 접근名: `UI.Button`은 `aria-label`을 받지 않으므로(rest props 없음) 파일명을
      sr-only 자식으로 넣어 "<파일명> 다운로드"를 만든다. 파일명은 <MT>라 마스크 ON이면 이름이 빠지고
      "다운로드"만 남는다(마스크 경계는 엑셀·툴팁·접근名까지). */
function FileTable({ list }: { list: MeetingDetail['files'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 720 }}>
        <caption className="sr-only">첨부파일 목록 — 첨부파일명·등록일시·수정일시·업로드 여부·다운로드</caption>
        <thead>
          <tr>
            <th scope="col" className={TH} style={CELL}>첨부파일명</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 168 }}>등록일시</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 168 }}>수정일시</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 104 }}>업로드 여부</th>
            <th scope="col" className={TH} style={{ ...CELL, width: 120 }}>다운로드</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? <EmptyRow span={5} msg="첨부파일 없음" /> : list.map((f) => (
            <tr key={f.name}>
              <td className={TD} style={{ ...CELL, overflowWrap: 'anywhere' }}><MT>{f.name}</MT></td>
              <td className={`${TD} text-center tabular`} style={CELL}>{mn(f.reg)}</td>
              <td className={`${TD} text-center tabular`} style={CELL}>{mn(f.mod)}</td>
              {/* 업로드 여부는 O/X 표식(상태)이라 비마스킹 — "축은 두고 데이터는 가린다" */}
              <td className={`${TD} text-center`} style={CELL}>{f.up || '-'}</td>
              <td className={`${TD} text-center`} style={CELL}>
                <Button variant="outline" size="sm" leadingIcon="download" onClick={() => toast('다운로드 (목업)')}>
                  <span className="sr-only"><MT>{f.name}</MT> </span>다운로드
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function GeneralMeetingDetailModal({ row, onClose }: { row: MeetingRow; onClose: () => void }) {
  const d = row.detail;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 묶는다 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">조합원총회 상세</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{row.title}</MT></DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Section title="일반사항"><KvGrid items={buildGen(d.gen)} /></Section>
          <Section title="보고안건"><ReportTable list={d.report} /></Section>
          <Section title="부의안건"><MotionTable list={d.motion} /></Section>
          <Section title="첨부파일"><FileTable list={d.files} /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
