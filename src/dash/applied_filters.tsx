/* 필터 칩 행 — GridFrame 툴바 좌측의 SSOT (2026-09-24 사용자 결정, 전 화면 공통).

   한 줄만 쓴다. 칩 순서 = [기본 필터 칩(FilterChip)…] [적용 칩(값 ×)…] [전체 해제]. 넘치면 **넘치는 만큼만**
   뒤에서부터 `+N ▾` 드롭다운으로 접는다 — 앞쪽 칩은 그대로 보인다. 숨겨진 기본 칩이 선택(active)되면 그 칩을
   **첫 자리로 끌어올려** 항상 보이게 한다(DOM 순서 자체를 바꾼다 — CSS order 는 탭 순서와 어긋나 WCAG 2.4.3 위반).

   폭 판정: 보이지 않는 측정용 사본에 전 항목 + `+99` 트리거를 한 번에 그려 각 폭을 읽고, 행 컨테이너 폭
   (flex-1 min-w-0 — 우측 액션을 뺀 남은 폭)에 그리디로 채운다. 측정 사본은 보이는 배치와 무관해 진동이 없다.

   규칙:
   - 적용 칩 = 값만 표시(항목명은 title·aria-label 로 회수), 최대 240px 말줄임. onClear 가 있는 칩만 ×.
   - 해제 가능한 적용 칩이 2개 이상이면 `전체 해제` — 각 칩의 onClear 를 차례로 부른다.
   - 보이는 캡션 없음(role="group" aria-label 만).
   - 행 선택 중엔 GridFrame 이 이 행을 아예 렌더하지 않는다(선택 = 액션 영역, 필터와 별개).
   ⚠ 적용 칩 모양·'필터 제거' aria·기본 칩 렌더는 이 파일에만 둔다 — 가드 applied_filters.test.ts. */
import React from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';

const { FilterChip } = UI;

export interface AppliedFilter {
  /** 항목명 — 칩에는 안 보이고 title·aria-label 로 쓰인다 */
  label: string;
  /** 표시 값. 빈 문자열/공백이면 적용되지 않은 것으로 보고 칩을 만들지 않는다 */
  value: string;
  /** 없으면 × 없이 표시만 하고 전체 해제 대상에서도 빠진다 */
  onClear?: () => void;
}

/** 기본(주) 필터 칩 한 개 — 툴바 첫 칩 무리. 라벨·건수·선택 상태만 넘긴다(FilterChip 렌더는 이 파일이 한다). */
export interface FilterChipItem {
  key: string;
  label: string;
  count?: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}

export const activeFilters = (items: readonly AppliedFilter[] | undefined): AppliedFilter[] =>
  (items ?? []).filter((f) => f.value != null && String(f.value).trim() !== '');

function Chip({ f }: { f: AppliedFilter }) {
  const clearable = Boolean(f.onClear);
  return (
    /* 글자색 = primary 에 foreground 15% 를 섞는다 — primary 단독은 라이트에서 10% 틴트 위 4.35:1 로 AA(4.5) 미달이었다.
       foreground 는 라이트=어둡게·다크=밝게 섞이므로 한 식으로 두 테마 모두 대비가 오른다(2026-09-24 실측). */
    <span title={`${f.label}: ${f.value}`} className="inline-flex items-center gap-1.5 font-semibold shrink-0"
      style={{ padding: clearable ? '5px 8px 5px 11px' : '5px 11px', borderRadius: 9, fontSize: 12.5, maxWidth: 240, color: CHIP_FG, background: CHIP_BG }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{f.value}</span>
      {clearable && (
        <button type="button" onClick={f.onClear} aria-label={`${f.label} 필터 제거`}
          className="inline-flex items-center justify-center border-0 cursor-pointer shrink-0"
          style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
          <Icon name="x" size={13} stroke={2.4} />
        </button>
      )}
    </span>
  );
}
const CHIP_FG = 'color-mix(in srgb, var(--primary) 85%, var(--foreground))';
const CHIP_BG = 'color-mix(in srgb, var(--primary) 10%, transparent)';

type Item =
  | { id: string; kind: 'chip'; chip: FilterChipItem }
  | { id: string; kind: 'applied'; f: AppliedFilter }
  | { id: string; kind: 'clear'; run: () => void };

function ItemView({ it }: { it: Item }) {
  if (it.kind === 'chip') {
    const c = it.chip;
    return <FilterChip active={c.active} onClick={c.onSelect} count={c.count}>{c.label}</FilterChip>;
  }
  if (it.kind === 'applied') return <Chip f={it.f} />;
  return (
    <button type="button" onClick={it.run}
      className="border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground underline-offset-2 hover:underline shrink-0"
      style={{ fontSize: 12.5, padding: '4px 6px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      전체 해제
    </button>
  );
}

const GAP = 8;
/** 그리디 채우기 — 넘치면 트리거 폭을 예약하고 다시 채운다. 보이는 id 집합을 돌려준다. */
function fitIds(order: Item[], w: Record<string, number>, avail: number, trigger: number): Set<string> {
  const run = (limit: number) => {
    const ids = new Set<string>(); let used = 0;
    for (const it of order) {
      const next = used + (ids.size ? GAP : 0) + (w[it.id] ?? 0);
      if (next > limit) break;
      ids.add(it.id); used = next;
    }
    return ids;
  };
  const all = run(avail);
  if (all.size === order.length) return all;
  return run(avail - trigger - GAP);
}

/** 배치 계획(순수) — 앞에서부터 채우고 넘치는 만큼 뒤를 숨긴다. 선택된 기본 칩이 숨겨질 처지면
    그 칩을 **첫 자리로 끌어올려** 다시 채운다(순서 자체를 바꾼다 → 탭 순서 = 보이는 순서). */
export function planChips<T extends { id: string; kind: string; chip?: { active: boolean } }>(items: T[], w: Record<string, number>, avail: number, trigger: number): { shown: T[]; hidden: T[] } {
  let order = items;
  let vis = fitIds(order as unknown as Item[], w, avail, trigger);
  /* 다중 선택(조기경보 등급 등)도 있다 — 선택 칩이 **하나라도** 숨겨지면 선택 칩 전부를 원래 순서대로 앞에 모은다
     (`find` 로 첫 선택 칩만 보면, 이미 보이는 칩이 잡혀 숨은 선택 칩이 +N 에 남는다 — Codex P2) */
  const acts = items.filter((it) => it.kind === 'chip' && it.chip?.active);
  if (acts.some((a) => !vis.has(a.id))) {
    order = [...acts, ...items.filter((it) => !acts.includes(it))];
    vis = fitIds(order as unknown as Item[], w, avail, trigger);
  }
  return { shown: order.filter((it) => vis.has(it.id)), hidden: order.filter((it) => !vis.has(it.id)) };
}

export function FilterChipRow({ chips = [], applied }: { chips?: readonly FilterChipItem[]; applied?: readonly AppliedFilter[] }) {
  const on = activeFilters(applied);
  const clearable = on.filter((f) => f.onClear);
  const items: Item[] = [
    ...chips.map((c): Item => ({ id: 'c:' + c.key, kind: 'chip', chip: c })),
    ...on.map((f): Item => ({ id: 'a:' + f.label, kind: 'applied', f })),
    ...(clearable.length >= 2 ? [{ id: 'clear', kind: 'clear', run: () => clearable.forEach((f) => f.onClear?.()) } as Item] : []),
  ];

  const boxRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [m, setM] = React.useState<{ w: Record<string, number>; trigger: number; avail: number } | null>(null);
  const sig = items.map((it) => it.id + (it.kind === 'chip' ? `${it.chip.label}${String(it.chip.count ?? '')}${it.chip.active}` : it.kind === 'applied' ? it.f.value : '')).join('|');
  React.useLayoutEffect(() => {
    const box = boxRef.current, mm = measureRef.current;
    if (!box || !mm) return;
    const read = () => {
      const w: Record<string, number> = {};
      mm.querySelectorAll<HTMLElement>('[data-fid]').forEach((el) => { w[el.dataset.fid!] = el.offsetWidth; });
      const trigger = (mm.querySelector<HTMLElement>('[data-trigger]')?.offsetWidth) ?? 56;
      const avail = box.clientWidth - 6;   // 좌우 패딩 3px ×2 (focus 링 여유)
      setM((p) => (p && p.avail === avail && p.trigger === trigger && JSON.stringify(p.w) === JSON.stringify(w) ? p : { w, trigger, avail }));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(box); ro.observe(mm);
    return () => ro.disconnect();
  }, [sig]);

  const { shown, hidden } = m ? planChips(items, m.w, m.avail, m.trigger) : { shown: items, hidden: [] as Item[] };
  const hiddenActive = hidden.some((it) => it.kind === 'applied' || (it.kind === 'chip' && it.chip.active));

  if (items.length === 0) return null;
  return (
    /* 남은 폭을 다 받는다(flex-1, basis 0 → 판정 폭 = 우측 액션을 뺀 나머지). */
    <div ref={boxRef} role="group" aria-label="필터" className="relative flex items-center min-w-0 flex-1 overflow-hidden"
      /* 세로 3px 여유 — overflow:hidden 이 칩 focus 링을 자르지 않게(음수 마진으로 줄 높이는 그대로) */
      style={{ gap: GAP, padding: 3, margin: -3 }}>
      {shown.map((it) => <React.Fragment key={it.id}><ItemView it={it} /></React.Fragment>)}
      {hidden.length > 0 && <OverflowMenu key="more" hidden={hidden} tinted={hiddenActive} rowRef={boxRef} />}
      {/* 측정용 사본 — 보이지 않고(visibility:hidden)·포커스·읽기 대상에서 빠진다.
          크기 0 + overflow:hidden 상자에 가둔다 — 가두지 않으면 max-content 사본이 페이지 가로 스크롤을 만든다(400px 실측 +312px). 자식 offsetWidth 는 잘림과 무관하다. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div ref={measureRef} className="flex items-center" style={{ width: 'max-content', visibility: 'hidden', gap: GAP }}>
          {items.map((it) => <span key={it.id} data-fid={it.id} className="inline-flex shrink-0"><ItemView it={it} /></span>)}
          <span data-trigger className="inline-flex"><TriggerFace n={99} tinted={false} /></span>
        </div>
      </div>
    </div>
  );
}

function TriggerFace({ n, tinted }: { n: number; tinted: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-[10px] py-[5px] text-[12.5px] font-semibold border whitespace-nowrap ${tinted ? '' : 'border-border-strong text-muted-foreground bg-card'}`}
      style={tinted ? { color: CHIP_FG, background: CHIP_BG, borderColor: 'color-mix(in srgb,var(--primary) 28%,transparent)' } : undefined}>
      +{n}<Icon name="chevron-down" size={13} />
    </span>
  );
}

/* +N 드롭다운 — 트리거는 plain <button>(UI.Button 은 Radix asChild 트리거가 못 된다). 메뉴는 포털이라 카드 overflow 에 안 잘린다.
   tinted = 숨긴 항목 중 걸려 있는 필터(적용 칩·선택된 기본 칩)가 있다 → 접혀 있어도 "걸린 게 있다"를 색으로 알린다. */
function OverflowMenu({ hidden, tinted, rowRef }: { hidden: Item[]; tinted: boolean; rowRef: React.RefObject<HTMLDivElement> }) {
  const chips = hidden.filter((it): it is Extract<Item, { kind: 'chip' }> => it.kind === 'chip');
  const applied = hidden.filter((it): it is Extract<Item, { kind: 'applied' }> => it.kind === 'applied');
  const clear = hidden.find((it): it is Extract<Item, { kind: 'clear' }> => it.kind === 'clear');
  /* 항목을 고르면 필터가 바뀌며 행 전체가 다시 그려져 Radix 의 자동 초점 복귀가 body 로 떨어진다(실측) —
     닫힌 뒤 다음 프레임에 트리거로 직접 되돌린다(키보드 사용자가 제자리에서 이어 가도록). */
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button ref={triggerRef} type="button" aria-label={`필터 ${hidden.length}개 더 보기`}
          className="inline-flex shrink-0 border-0 bg-transparent p-0 cursor-pointer rounded-lg" style={{ fontFamily: 'inherit' }}>
          <TriggerFace n={hidden.length} tinted={tinted} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px] max-w-[320px]"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          requestAnimationFrame(() => {
            /* 마지막 숨긴 항목을 해제하면 트리거 자체가 사라진다 → 행의 마지막 버튼(보이는 칩)으로 */
            if (triggerRef.current?.isConnected) { triggerRef.current.focus(); return; }
            const btns = rowRef.current?.querySelectorAll<HTMLButtonElement>(':scope > button, :scope > span > button');
            btns?.[btns.length - 1]?.focus();
          });
        }}>
        {chips.map(({ id, chip }) => (
          <DropdownMenuItem key={id} onSelect={chip.onSelect} aria-checked={chip.active} role="menuitemradio">
            <Icon name="check" size={14} style={{ opacity: chip.active ? 1 : 0 }} />
            <span className="flex-1 truncate">{chip.label}</span>
            {chip.count != null && <span className="tabular-nums text-muted-foreground" style={{ fontSize: 12 }}>{chip.count}</span>}
          </DropdownMenuItem>
        ))}
        {chips.length > 0 && applied.length > 0 && <DropdownMenuSeparator />}
        {applied.map(({ id, f }) => (
          <DropdownMenuItem key={id} disabled={!f.onClear} onSelect={() => f.onClear?.()}
            aria-label={f.onClear ? `${f.label} 필터 제거` : `${f.label}: ${f.value}`} title={`${f.label}: ${f.value}`}>
            <span className="flex-1 truncate font-semibold" style={{ color: CHIP_FG }}>{f.value}</span>
            {f.onClear && <Icon name="x" size={13} stroke={2.4} className="text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
        {clear && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={clear.run}>전체 해제</DropdownMenuItem></>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
