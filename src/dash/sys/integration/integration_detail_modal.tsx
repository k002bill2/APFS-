/* 연동 모니터링(ADM-005) — 송수신이력 상세 팝업(읽기 전용). 출처: `연동 모니터링.html` 스크립트 `openDetail(sn)`.

   목업 → 우리 규약
   - `.modal` + `#t-detail-h '송수신이력 상세 — #sn'` → Radix `Dialog`, 제목 + 부제(`#연계일련번호`)를 한 래퍼로 묶어 좌측에 나란히.
     본문 `p-[46px]` 패밀리라 헤더·푸터도 `px-[46px]`(apfs-form-modal 모달 크롬 규약). 스크림·Esc·포커스 트랩은 Radix 가 소유.
   - `.msec 요청·응답` kv 17항목 → 한글 가로 kv 2단 그리드(`withKvFill`, 긴 값 URL·응답메시지·전문암호화값은 전체 폭).
     전문암호화값만 monospace(값 자체가 코드 — 디자인 규칙 4 예외).
   - 원연계일련번호 `.linktxt` → `LinkCell` → `onOpenSn(원연계)` — 팝업을 닫지 않고 그 건으로 내용을 바꾼다(목업 `openDetail` 재호출 동형).
   - `.msec 연계처리이력 (N건)` · `.msec 연계첨부파일 (N건)` `table.mini` → 수제 표(테두리 셀). **섹션 순서는 스크립트 그대로**
     (요청·응답 → 연계처리이력 → 연계첨부파일 — 설계 메모도 "첨부파일은 상세팝업 하단").
     정렬: 재처리 횟수·파일 크기(수량형)만 우측, 일련번호·코드·일시·배지는 좌측(표 정렬 규약 — 목업의 가운데 정렬은 쓰지 않는다).
   - 첨부 [다운로드] → 백엔드가 없어 토스트만(목업 `toast('다운로드: <저장파일명> (목업)')` 동형).
   - 편집·재처리 액션 없음(조회 전용). */
import { useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from '../../components';
import { fmt } from '../../aggrid_theme';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { toast } from '../../ui/sonner';
import { LinkCell } from '../../link_cell';
import { withKvFill } from '../../kv_fill';
import { prcsOf, attachOf, fileSize, retryText } from './integration_monitor_model';
import type { TrsmRow, PrcsRow, AttachRow } from './integration_monitor_data';
import { CdBadge, TransitionBadges } from './integration_badges';

const { Button } = UI;

/* ── 프리미티브(형제 팝업 member_info_detail_modal 판 — 공유 export 아님) ── */
function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mb-6 last:mb-0">
      {/* h3 `m-0` 은 load-bearing — preflight:false 라 지우면 UA 마진이 되살아난다 */}
      <div className="flex items-baseline gap-2 border-b-2 border-border pb-2 mb-3">
        <h3 className="m-0 text-lg font-bold">{title}</h3>
        {count != null && <span className="text-muted-foreground tabular" style={{ fontSize: 13 }}>{String(count)}건</span>}
      </div>
      {children}
    </section>
  );
}

const KV_COLS: CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: CSSProperties = { padding: '8px 12px', fontSize: 12.5 };
const DD_STYLE: CSSProperties = { padding: '8px 12px', fontSize: 14, overflowWrap: 'anywhere' };
const NONE = <span className="text-caption">-</span>;

type KvItem = { l: string; v: ReactNode; full?: boolean };

/* 요청·응답 kv — 목업 `openDetail` row() 순서 그대로 */
function buildKv(r: TrsmRow, onOpenSn: (sn: number) => void): KvItem[] {
  const tab = (s: string) => <span className="tabular">{s}</span>;
  return [
    { l: '연계일련번호', v: tab(String(r.sn)) },
    { l: '전송ID', v: r.trsmId },
    { l: '연계기관', v: r.inst },
    { l: '인터페이스ID', v: r.ifId },
    { l: '요청자ID', v: r.rqstr },
    { l: '송수신/방식', v: `${r.trrc} · ${r.mth}` },
    { l: '전송사유', v: r.rsn },
    {
      l: '원연계일련번호',
      v: r.orgnlSn == null ? NONE : (
        <span className="inline-flex items-baseline gap-1.5">
          <LinkCell value={r.orgnlSn} hint="원연계(최초) 건 상세 보기" tabular onClick={() => onOpenSn(r.orgnlSn as number)} />
          <span className="text-caption" style={{ fontSize: 12.5 }}>(재전송 원본)</span>
        </span>
      ),
    },
    { l: 'IP주소', v: tab(r.ip) },
    { l: '요청/응답일시', v: tab(`${r.req} → ${r.rsp}`) },
    { l: 'URL', v: r.url, full: true },
    { l: '전체/성공/실패', v: tab(`${fmt(r.whol)} / ${fmt(r.scs)} / ${fmt(r.fail)}`) },
    { l: '응답코드', v: <CdBadge cd={r.cd} size="md" /> },
    { l: '응답메시지', v: r.msg, full: true },
    { l: '전문암호화값', v: <span style={{ fontFamily: 'ui-monospace,Menlo,monospace' }}>{r.encpt}</span>, full: true },
    { l: '최초등록자', v: r.regUser },
    { l: '최초등록일시', v: tab(r.regDt) },
  ];
}

function KvGrid({ items }: { items: KvItem[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {withKvFill(items, (o) => (
        <div key={o.l} className={`grid bg-card ${o.full ? 'sm:col-span-2' : ''}`} style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{o.l}</dt>
          <dd className="m-0 flex items-center min-w-0" style={DD_STYLE}>{o.v}</dd>
        </div>
      ), (o) => !!o.full)}
    </dl>
  );
}

/* ── 미니 표 공용 셀 ── */
const TH_BASE = 'border border-border bg-[color:var(--grid-header)] font-bold whitespace-nowrap';
const TH = `${TH_BASE} text-left`;
const THR = `${TH_BASE} text-right`;
const TD = 'border border-border';
const CELL: CSSProperties = { padding: '7px 9px' };
const EMPTY: CSSProperties = { fontSize: 13 };

const PRCS_HEAD: [string, boolean][] = [
  ['이력일련번호', false], ['대상테이블명', false], ['거래고유번호', false], ['변경전→후', false], ['오류코드', false],
  ['오류메시지', false], ['재처리', true], ['행위자', false], ['발생일시', false],
];

function PrcsTable({ rows }: { rows: PrcsRow[] }) {
  if (!rows.length) return <div className="text-caption" style={EMPTY}>연계된 처리이력이 없습니다.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 980 }}>
        <caption className="sr-only">이 연계일련번호로 들어온 레코드의 배치 반영 상태 전이 기록</caption>
        <thead>
          <tr>{PRCS_HEAD.map(([h, right]) => <th key={h} scope="col" className={right ? THR : TH} style={CELL}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.sn}>
              <td className={`${TD} tabular`} style={CELL}>{String(p.sn)}</td>
              <td className={TD} style={CELL}>{p.tbl}</td>
              <td className={`${TD} tabular whitespace-nowrap`} style={CELL}>{p.key}</td>
              <td className={TD} style={CELL}><TransitionBadges bef={p.bef} aft={p.aft} size="md" /></td>
              <td className={`${TD} tabular whitespace-nowrap`} style={CELL}>{p.err || NONE}</td>
              <td className={TD} style={CELL}>{p.msg || NONE}</td>
              <td className={`${TD} tabular text-right whitespace-nowrap`} style={CELL}>{retryText(p.retry)}</td>
              <td className={TD} style={CELL}>{p.actor}</td>
              <td className={`${TD} tabular whitespace-nowrap`} style={CELL}>{p.dt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ATTACH_HEAD: [string, boolean][] = [
  ['파일일련번호', false], ['구분', false], ['원본파일명', false], ['크기', true], ['등록일시', false], ['다운로드', false],
];

function AttachTable({ rows }: { rows: AttachRow[] }) {
  if (!rows.length) return <div className="text-caption" style={EMPTY}>첨부된 파일이 없습니다.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 720 }}>
        <caption className="sr-only">이 연계일련번호로 받은 첨부파일</caption>
        <thead>
          <tr>{ATTACH_HEAD.map(([h, right]) => <th key={h} scope="col" className={right ? THR : TH} style={CELL}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.fileSn}>
              <td className={`${TD} tabular`} style={CELL}>{String(f.fileSn)}</td>
              <td className={TD} style={CELL}>{f.fileType}</td>
              <td className={TD} style={{ ...CELL, overflowWrap: 'anywhere' }}>{f.orgName}</td>
              <td className={`${TD} tabular text-right whitespace-nowrap`} style={CELL}>{fileSize(f.size)}</td>
              <td className={`${TD} tabular whitespace-nowrap`} style={CELL}>{f.regDt}</td>
              <td className={TD} style={CELL}>
                <LinkCell value="다운로드" hint={`${f.orgName} 내려받기`} onClick={() => toast(`다운로드: ${f.stgName} — 데이터 연동 후 제공됩니다`)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** returnFocus — 연 자리가 닫힐 때 이미 사라진 경우(연계처리이력 탭에서 열면 탭이 송수신이력으로 바뀌어 그 셀이 언마운트된다)
    초점을 보낼 요소. 없으면 공용 focus-return(연 자리로 복귀)에 맡긴다. */
export function IntegrationDetailModal({ row, onClose, onOpenSn, returnFocus }: {
  row: TrsmRow; onClose: () => void; onOpenSn: (sn: number) => void; returnFocus?: () => HTMLElement | null;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  const hist = prcsOf(row.sn);
  const files = attachOf(row.sn);
  const onCloseAutoFocus = returnFocus ? (e: Event) => {
    const el = returnFocus();
    if (!el) return;
    e.preventDefault();
    el.focus();
  } : undefined;
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[1040px] max-h-[88vh]" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">송수신이력 상세</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0 tabular">#{String(row.sn)}</DialogDescription>
          </div>
        </DialogHeader>
        {/* key=연계일련번호 — 원연계 건으로 바꾸면 스크롤을 맨 위로 되돌린다 */}
        <div key={row.sn} className="overflow-y-auto p-[46px]">
          <Section title="요청·응답"><KvGrid items={buildKv(row, onOpenSn)} /></Section>
          <Section title="연계처리이력" count={hist.length}><PrcsTable rows={hist} /></Section>
          <Section title="연계첨부파일" count={files.length}><AttachTable rows={files} /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
