/* 권한 변경이력 — 상세 다이얼로그(읽기 전용, audit-read-only). 출처: S0_107 `openDetail`.
   kv(일시·변경유형·권한) → 변경 블록(항목형: 추가/회수 목록 · 전이형: 변경 전 → 후 비교 카드) → 적용 대상(동일 권한 보유자) → 행위자·발생프로그램·IP·사유.
   편집 액션 없음(조회 전용). 라벨 배열은 한글 kv 가로 규약(apfs-form-modal). 동적 텍스트는 MT 마스킹. */
import { UI } from './components';
import { MT } from './mask';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { CT_TONE, cntAdd, cntRev } from './permission_history_model';
import type { HistEntry, HistItem, ItemAction } from './permission_history_model';

const { Button, StatusBadge } = UI;

function Kv({ items }: { items: [label: string, value: React.ReactNode][] }) {
  return (
    <dl className="grid m-0 border border-border rounded-[8px] overflow-hidden" style={{ gridTemplateColumns: '110px minmax(0,1fr)', fontSize: 13 }}>
      {items.map(([l, v]) => (
        <div key={l} className="contents">
          <dt className="bg-muted font-bold text-muted-foreground m-0" style={{ padding: '8px 12px', fontSize: 12.5, borderBottom: '1px solid var(--border)' }}>{l}</dt>
          <dd className="m-0 min-w-0" style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ItemList({ items, action }: { items: HistItem[]; action: ItemAction }) {
  const list = items.filter((i) => i.action === action);
  if (!list.length) return null;
  const add = action === '추가';
  const color = add ? 'var(--success-text)' : 'var(--danger-text)';
  return (
    <div className="mb-2">
      <div className="font-bold" style={{ fontSize: 12, color, marginBottom: 4 }}>{add ? '▲ 추가된 메뉴 권한' : '▼ 회수된 메뉴 권한'} {list.length}건</div>
      <div className="border border-border rounded-[8px] overflow-hidden">
        {list.map((i, k) => (
          <div key={k} className="flex items-center justify-between gap-2.5" style={{ padding: '7px 12px', fontSize: 12.5, borderBottom: k < list.length - 1 ? '1px solid var(--border)' : undefined, background: add ? 'var(--success-soft)' : 'var(--danger-soft)' }}>
            <span className="min-w-0"><MT>{i.path}</MT></span><b className="whitespace-nowrap" style={{ color }}>{i.field}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PermissionHistoryDetailModal({ entry, onClose }: { entry: HistEntry; onClose: () => void }) {
  const d = entry;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[640px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">권한 변경 상세</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{d.preset}</MT></DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <Kv items={[
            ['일시', <MT>{d.ts}</MT>],
            ['변경유형', <StatusBadge tone={CT_TONE[d.ctype]} label={d.ctype} size="md" dot={false} />],
            ['권한', <b><MT>{d.preset}</MT></b>],
          ]} />

          {d.items && d.items.length ? (
            <>
              <div className="font-semibold text-muted-foreground" style={{ fontSize: 12.5, margin: '14px 0 6px' }}>변경된 메뉴 권한 — 총 {d.items.length}건 (추가 {cntAdd(d)} · 회수 {cntRev(d)})</div>
              <ItemList items={d.items} action="추가" />
              <ItemList items={d.items} action="회수" />
            </>
          ) : (
            /* 전이형 — 변경 전 → 후 비교 */
            <div className="flex items-stretch gap-2.5 flex-wrap" style={{ margin: '14px 0' }}>
              <div className="flex-1 border border-border rounded-[8px] bg-muted" style={{ padding: '10px 12px', minWidth: 140 }}>
                <div className="text-caption" style={{ fontSize: 11.5, marginBottom: 4 }}>변경 전</div>
                <div className="font-bold" style={{ fontSize: 15, color: 'var(--danger-text)' }}><MT>{d.before ?? '-'}</MT></div>
              </div>
              <div className="self-center text-caption" style={{ fontSize: 20 }} aria-hidden>→</div>
              <div className="flex-1 rounded-[8px]" style={{ padding: '10px 12px', minWidth: 140, border: '1px solid var(--primary)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}>
                <div className="text-caption" style={{ fontSize: 11.5, marginBottom: 4 }}>변경 후</div>
                <div className="font-bold text-primary" style={{ fontSize: 15 }}><MT>{d.after ?? '-'}</MT></div>
              </div>
            </div>
          )}

          <div className="font-semibold text-muted-foreground" style={{ fontSize: 12.5, margin: '6px 0 6px' }}>적용 대상 — 동일 권한 보유자 <b className="text-foreground">{d.holders.length}명</b> (이 변경이 전원에게 적용됨)</div>
          <div className="border border-border rounded-[8px] overflow-hidden mb-3">
            {d.holders.length ? d.holders.map((h, k) => (
              <div key={k} className="flex items-center justify-between gap-2.5" style={{ padding: '7px 12px', fontSize: 12.5, borderBottom: k < d.holders.length - 1 ? '1px solid var(--border)' : undefined }}>
                <b><MT>{h.name}</MT></b><span className="text-caption"><MT>{h.org}</MT></span>
              </div>
            )) : <div className="text-caption" style={{ padding: '9px 12px', fontSize: 12.5 }}>적용 대상 없음(보유자 0명)</div>}
          </div>

          <Kv items={[['행위자', <MT>{d.actor}</MT>], ['발생프로그램', <MT>{d.src}</MT>], ['IP', <MT>{d.ip}</MT>], ['사유', <MT>{d.reason}</MT>]]} />
          <p className="text-caption m-0 mt-3" style={{ fontSize: 12, lineHeight: 1.5 }}>조회 전용 — 이 변경은 {d.src} 화면에서 수행되어 이력으로 자동 기록된 것으로 가정한 데모입니다(실명 아님 · 3년 보관 문구는 목업 기준).</p>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
