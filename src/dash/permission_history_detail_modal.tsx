/* 권한 변경이력 — 상세 다이얼로그(읽기 전용, audit-read-only). 출처: S0_107 `openDetail`.
   레이아웃 정본: claude.ai/design 캔버스 `권한 변경 상세 모달.dc.html`(2026-09-18) —
   헤더(제목+권한 칩+메타 한 줄) → 요약 스트립(변경유형·권한·변경 건수) → 변경된 메뉴 권한(추가/회수 카드)
   → 적용 대상(동일 권한 보유자) → 처리 정보(2열 라벨/값) → 안내 카드. 편집 액션 없음(조회 전용).
   무채색 규약(사용자 결정) — 캔버스의 초록/빨강 헤더·태그·+/− 아이콘은 쓰지 않는다. 추가/회수는 카드 제목 글자로,
   회수된 리프는 취소선으로 구분한다. 색이 남는 곳은 목록 화면과 같은 변경유형 StatusBadge 하나뿐. 동적 텍스트는 MT 마스킹. */
import { useRef, type ReactNode, type CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { MT } from './mask';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { CT_TONE, cntAdd, cntRev } from './permission_history_model';
import type { HistEntry, HistItem, Holder } from './permission_history_model';

const { Button, StatusBadge } = UI;

const FS = 13.5;                                   // 모달 본문 기준 폰트(apfs-form-modal)
const ROW: CSSProperties = { padding: '10px 16px', fontSize: FS };
const DIVIDER = '1px solid var(--border)';

/* 무채색 칩 — StatusBadge 에 중립 tone 이 없어 로컬로 둔다(색 규약: 토큰만) */
function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center bg-muted text-muted-foreground font-bold rounded-[6px] whitespace-nowrap" style={{ padding: '2px 8px', fontSize: 11.5, lineHeight: '16px' }}>{children}</span>;
}

function Section({ title, aside, children }: { title: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col" style={{ gap: 10 }}>
      <div className="flex items-baseline flex-wrap" style={{ gap: '2px 8px' }}>
        <h3 className="m-0 font-semibold text-foreground" style={{ fontSize: 15, letterSpacing: '-0.01em' }}>{title}</h3>
        {aside && <span className="text-muted-foreground" style={{ fontSize: 12.5 }}>{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col min-w-0" style={{ gap: 5 }}>
      <span className="font-medium text-muted-foreground" style={{ fontSize: 12 }}>{label}</span>
      <span className="font-semibold text-foreground min-w-0" style={{ fontSize: 14 }}>{children}</span>
    </div>
  );
}

/* '수탁보고 > 자펀드수탁 > 유가증권관리' → 앞 단계는 흐리게, 리프는 굵게(회수면 취소선) */
function PathCrumb({ path, revoked }: { path: string; revoked?: boolean }) {
  const segs = path.split(' > ');
  const leaf = segs[segs.length - 1];
  return (
    <span className="min-w-0 text-muted-foreground" style={{ fontSize: FS, lineHeight: 1.45 }}>
      {segs.slice(0, -1).map((s, i) => (
        <span key={i}><MT>{s}</MT><span className="text-caption" aria-hidden style={{ margin: '0 5px' }}>›</span></span>
      ))}
      <span className={'font-semibold text-foreground' + (revoked ? ' line-through' : '')} style={revoked ? { textDecorationColor: 'var(--caption)' } : undefined}><MT>{leaf}</MT></span>
    </span>
  );
}

/* 카드 외곽선 = 역할색 2px(라이트/다크 적응형 토큰만) — 추가 --primary · 회수 --danger · 적용 대상 --secondary(틸;
   --accent 는 --primary 인디고와 색상환이 가까워 구분이 약했다).
   색은 외곽선에만 쓰고 채움·글자는 무채색 유지(사용자 결정 2026-09-18). 2px 인 이유: 소수점 굵기는 DPR 1에서 1px로 스냅됨. 헤더 구분선은 기본 --border. */
const outline = (token: string) => `2px solid color-mix(in srgb, var(${token}) 65%, transparent)`;
function ItemCard({ title, items, revoked }: { title: string; items: HistItem[]; revoked?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="rounded-[10px] overflow-hidden" style={{ border: outline(revoked ? '--danger' : '--primary') }}>
      <div className="flex items-center bg-muted" style={{ ...ROW, padding: '8px 16px', gap: 8, borderBottom: DIVIDER }}>
        <span className="font-semibold text-foreground" style={{ fontSize: 13 }}>{title}</span>
        <span className="font-medium text-muted-foreground" style={{ fontSize: 13 }}>{items.length}건</span>
      </div>
      {items.map((i, k) => (
        <div key={k} className="flex items-center justify-between" style={{ ...ROW, gap: 12, borderBottom: k < items.length - 1 ? DIVIDER : undefined }}>
          <PathCrumb path={i.path} revoked={revoked} />
          <Chip>{i.field}</Chip>
        </div>
      ))}
    </div>
  );
}

function HolderRow({ h, last }: { h: Holder; last: boolean }) {
  return (
    <div className="flex items-center" style={{ ...ROW, gap: 12, borderBottom: last ? undefined : DIVIDER }}>
      <span className="inline-flex items-center justify-center shrink-0 rounded-full bg-muted text-muted-foreground font-bold" style={{ width: 28, height: 28, fontSize: 12 }} aria-hidden><MT>{h.name.slice(0, 1)}</MT></span>
      <span className="font-semibold text-foreground"><MT>{h.name}</MT></span>
      <span className="ml-auto text-muted-foreground text-right" style={{ fontSize: 13 }}><MT>{h.org}</MT></span>
    </div>
  );
}

export function PermissionHistoryDetailModal({ entry, onClose }: { entry: HistEntry; onClose: () => void }) {
  const d = entry;
  const items = d.items ?? [];
  const added = items.filter((i) => i.action === '추가');
  const revoked = items.filter((i) => i.action === '회수');
  const dlgRef = useRef<DialogHandle>(null);
  const meta: [string, ReactNode][] = [
    ['행위자', <MT>{d.actor}</MT>],
    ['발생프로그램', <MT>{d.src}</MT>],
    ['IP', <span style={{ fontVariantNumeric: 'tabular-nums' }}><MT>{d.ip}</MT></span>],
  ];
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[640px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-col flex-1 min-w-0 pr-8" style={{ gap: 4 }}>
            <div className="flex items-center flex-wrap" style={{ gap: 10 }}>
              <DialogTitle className="shrink-0">권한 변경 상세</DialogTitle>
              <Chip><MT>{d.preset}</MT></Chip>
            </div>
            <DialogDescription className="m-0 text-muted-foreground" style={{ fontSize: 13 }}><MT>{d.ts}</MT> · <MT>{d.actor}</MT> 수행</DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px] flex flex-col" style={{ gap: 22 }}>
          {/* 요약 스트립 — 한눈에 볼 3가지 */}
          <div className="grid bg-muted rounded-[10px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', padding: '14px 18px', gap: '12px 16px' }}>
            <Stat label="변경유형"><StatusBadge tone={CT_TONE[d.ctype]} label={d.ctype} size="md" dot={false} /></Stat>
            <Stat label="권한"><MT>{d.preset}</MT></Stat>
            {items.length ? (
              <Stat label="변경 건수">총 {items.length}건 <span className="font-normal text-muted-foreground">· 추가 {cntAdd(d)} · 회수 {cntRev(d)}</span></Stat>
            ) : (
              /* 전이형 — 이전 값은 취소선, 새 값은 굵게(화살표·색 없이) */
              <Stat label="변경 전 · 후">
                <span className="inline-flex items-baseline flex-wrap" style={{ gap: 8 }}>
                  <span className="font-normal text-muted-foreground line-through" style={{ textDecorationColor: 'var(--caption)' }}><MT>{d.before ?? '-'}</MT></span>
                  <MT>{d.after ?? '-'}</MT>
                </span>
              </Stat>
            )}
          </div>

          {items.length > 0 && (
            <Section title="변경된 메뉴 권한">
              <ItemCard title="추가된 권한" items={added} />
              <ItemCard title="회수된 권한" items={revoked} revoked />
            </Section>
          )}

          <Section title={<>적용 대상 {d.holders.length}명</>} aside="동일 권한 보유자 전원에게 적용됩니다">
            <div className="rounded-[10px] overflow-hidden" style={{ border: outline('--secondary') }}>
              {d.holders.length
                ? d.holders.map((h, k) => <HolderRow key={k} h={h} last={k === d.holders.length - 1} />)
                : <div className="text-caption" style={ROW}>적용 대상 없음(보유자 0명)</div>}
            </div>
          </Section>

          <Section title="처리 정보">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px 24px', fontSize: FS }}>
              {meta.map(([l, v]) => (
                <div key={l} className="grid" style={{ gridTemplateColumns: '92px minmax(0,1fr)', gap: 8 }}>
                  <span className="text-muted-foreground">{l}</span><span className="text-foreground min-w-0">{v}</span>
                </div>
              ))}
              <div className="grid" style={{ gridTemplateColumns: '92px minmax(0,1fr)', gap: 8, gridColumn: '1 / -1' }}>
                <span className="text-muted-foreground">사유</span><span className="text-foreground min-w-0" style={{ lineHeight: 1.5 }}><MT>{d.reason || '-'}</MT></span>
              </div>
            </div>
          </Section>

          <div className="flex items-start bg-muted rounded-[8px]" style={{ gap: 10, padding: '12px 16px' }}>
            <Icon name="info" size={16} className="text-caption shrink-0" style={{ marginTop: 2 }} />
            <p className="m-0 text-muted-foreground" style={{ fontSize: 12.5, lineHeight: 1.6 }}>권한은 권한 단위로 적용되므로 위 보유자 전원에게 반영됩니다.</p>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
