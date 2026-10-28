/* 필터 칩 행 — GridFrame 툴바 좌측의 SSOT (2026-09-24 사용자 결정, 전 화면 공통).

   한 줄만 쓴다. 칩 순서 = [기본 필터 칩(FilterChip)…] [적용 칩(값 ×)…] [전체 해제]. 넘치면 **넘치는 만큼만**
   뒤에서부터 `+N ▾` 드롭다운으로 접는다 — 앞쪽 칩은 그대로 보인다. 숨겨진 기본 칩이 선택(active)되면 그 칩을
   **첫 자리로 끌어올려** 항상 보이게 한다(DOM 순서 자체를 바꾼다 — CSS order 는 탭 순서와 어긋나 WCAG 2.4.3 위반).

   폭 판정: 보이지 않는 측정용 사본에 전 항목 + `+99` 트리거를 한 번에 그려 각 폭을 읽고, 행 컨테이너 폭
   (flex-1 min-w-0 — 우측 액션을 뺀 남은 폭)에 그리디로 채운다. 측정 사본은 보이는 배치와 무관해 진동이 없다.

   규칙:
   - 적용 칩 = 값만 표시(항목명은 DS Tooltip·aria-label 로 회수), 최대 240px 말줄임. onClear 가 있는 칩만 ×.
     wide 칩 = 최대 480px·좁으면 2줄 줄바꿈, +N 으로 접지 않는다(배치 계산엔 minWidth 160 만 예약).
   - 해제 가능한 적용 칩이 2개 이상이면 `전체 해제` — 각 칩의 onClear 를 차례로 부른다.
   - 보이는 캡션 없음(role="group" aria-label 만).
   - 행 선택 중엔 GridFrame 이 이 행을 아예 렌더하지 않는다(선택 = 액션 영역, 필터와 별개).
   ⚠ 적용 칩 모양·'필터 제거' aria·기본 칩 렌더는 이 파일에만 둔다 — 가드 applied_filters.test.ts. */
import React from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

const { FilterChip } = UI;

export interface AppliedFilter {
  /** 항목명 — 칩에는 안 보이고 툴팁(ChipTip)·aria-label 로 쓰인다 */
  label: string;
  /** 표시 값. 빈 문자열/공백이면 적용되지 않은 것으로 보고 칩을 만들지 않는다 */
  value: string;
  /** 없으면 × 없이 표시만 하고 전체 해제 대상에서도 빠진다 */
  onClear?: () => void;
  /** 긴 경로형 값 — 최대 480px, 좁으면 2줄 줄바꿈(+N 으로 접히지 않고 최소 160px 을 예약한다) */
  wide?: boolean;
}

/** 기본(주) 필터 칩 한 개 — 툴바 첫 칩 무리. 라벨·건수·선택 상태만 넘긴다(FilterChip 렌더는 이 파일이 한다). */
export interface FilterChipItem {
  key: string;
  label: string;
  count?: React.ReactNode;
  active: boolean;
  onSelect: () => void;
  /** 필수 조건 칩 — 라벨 뒤에 `*`(foreground·700, 간격 2px — active 칩에서도 같은 색) + sr-only " 필수". 미지정이면 종전과 같다 */
  required?: boolean;
}

export const activeFilters = (items: readonly AppliedFilter[] | undefined): AppliedFilter[] =>
  (items ?? []).filter((f) => f.value != null && String(f.value).trim() !== '');

const WIDE_MIN = 160;
const WIDE_MAX = 480;

/* 필터를 건 직후 툴팁 자동 노출 시간(2026-10-26 사용자 요청 "선택 시 바로 보여주고 3초 후 사라지게") */
const FLASH_MS = 3000;
const KV = '\u0000', EN = '\u0001';
/** 적용 칩 값 서명 — 항목명·값 쌍을 이어 붙인 문자열. 두 서명을 freshLabels 로 비교한다. */
export const valueSig = (fs: readonly AppliedFilter[]): string => fs.map((f) => f.label + KV + String(f.value)).join(EN);
/** prev→cur 사이에 새로 걸리거나 값이 바뀐 항목명. prev 가 null(첫 렌더 = 페이지 진입 기본값)이면 없음, 해제는 세지 않는다. */
export function freshLabels(prev: string | null, cur: string): string[] {
  if (prev == null) return [];
  const before = sigMap(prev);
  return [...sigMap(cur)].filter(([k, v]) => before.get(k) !== v).map(([k]) => k);
}
const sigMap = (s: string) => new Map(s ? s.split(EN).map((e) => e.split(KV) as [string, string]) : []);
/* 모달(상세필터 드로어 등)이 열려 있으면 칩이 가려져 있다 — 그동안 바뀐 항목은 모아 두었다가 닫힐 때 띄운다(2026-10-26 사용자 결정).
   즉시 반영형 드로어(감사로그 등)는 고르는 순간 값이 바뀌어, 바로 띄우면 드로어 뒤에서 3초가 다 지나 버린다. */
const modalOpen = () => document.querySelector('[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]') != null;

function Chip({ f, flash }: { f: AppliedFilter; flash?: boolean }) {
  const clearable = Boolean(f.onClear);
  if (f.wide) return <WideChip f={f} clearable={clearable} flash={flash} />;
  return (
    /* 글자색 = primary 에 foreground 15% 를 섞는다 — primary 단독은 라이트에서 10% 틴트 위 4.35:1 로 AA(4.5) 미달이었다.
       foreground 는 라이트=어둡게·다크=밝게 섞이므로 한 식으로 두 테마 모두 대비가 오른다(2026-09-24 실측). */
    <ChipTip f={f} flash={flash}>
    <span className="inline-flex items-center gap-1.5 font-semibold shrink-0 cursor-pointer"
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
    </ChipTip>
  );
}
/* 항목명 툴팁(2026-10-26 사용자 요청) — 칩은 값만 보이므로 호버·× 포커스 때 DS Tooltip 으로 항목명을 띄운다.
   본문 = 항목명만(값은 칩에 이미 보인다 — 사용자 지시). 네이티브 title 은 두지 않는다 — OS 말풍선이 겹쳐 뜬다.
   × 포커스로도 열린다: React onFocus 는 버블링이라 자식 버튼 포커스가 트리거(span)까지 올라온다.
   칩 본문 커서 = pointer(사용자 결정 — help 의 물음표는 거슬린다). × 버튼도 pointer.
   flash(필터를 건 직후 3초, 행이 켜고 끈다) 동안은 바로 열어 둔다 — 제어형이라 Provider 의 300ms 지연을 건너뛴다.
   flash 중에 포인터가 올라오면 호버 상태로 넘겨받는다 — 3초가 지나도 커서 아래에서 닫히지 않고, 벗어나면 Radix 가 닫는다
   (Radix 는 같은 진입 안에서 다시 열지 않으므로 넘겨받지 않으면 커서 아래에서 꺼진다). */
function ChipTip({ f, flash = false, children }: { f: AppliedFilter; flash?: boolean; children: React.ReactElement }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Tooltip open={open || flash} onOpenChange={setOpen}>
      <TooltipTrigger asChild onPointerEnter={() => { if (flash) setOpen(true); }}>{children}</TooltipTrigger>
      <TooltipContent>{f.label}</TooltipContent>
    </Tooltip>
  );
}
/* wide 칩 — 남은 폭까지 줄어들며(shrink, minWidth 160) 텍스트는 2줄까지 줄바꿈, 넘칠 때만 말줄임.
   keep-all — 한글 이름이 글자 단위로 쪼개지지 않게(줄바꿈 지점은 소비처가 값 문자열의 공백으로 정한다). */
function WideChip({ f, clearable, flash }: { f: AppliedFilter; clearable: boolean; flash?: boolean }) {
  return (
    <ChipTip f={f} flash={flash}>
    <span className="inline-flex items-center gap-1.5 font-semibold min-w-0 cursor-pointer"
      style={{ padding: clearable ? '5px 8px 5px 11px' : '5px 11px', borderRadius: 9, fontSize: 12.5, maxWidth: WIDE_MAX, minWidth: WIDE_MIN, flexShrink: 1, color: CHIP_FG, background: CHIP_BG }}>
      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', whiteSpace: 'normal', wordBreak: 'keep-all', lineHeight: '18px', minWidth: 0 }}>{f.value}</span>
      {clearable && (
        <button type="button" onClick={f.onClear} aria-label={`${f.label} 필터 제거`}
          className="inline-flex items-center justify-center border-0 cursor-pointer shrink-0"
          style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
          <Icon name="x" size={13} stroke={2.4} />
        </button>
      )}
    </span>
    </ChipTip>
  );
}
const CHIP_FG = 'color-mix(in srgb, var(--primary) 85%, var(--foreground))';
const CHIP_BG = 'color-mix(in srgb, var(--primary) 10%, transparent)';

type Item =
  | { id: string; kind: 'chip'; chip: FilterChipItem }
  | { id: string; kind: 'applied'; f: AppliedFilter }
  | { id: string; kind: 'clear'; run: () => void };

function ItemView({ it, flash }: { it: Item; flash?: boolean }) {
  if (it.kind === 'chip') {
    const c = it.chip;
    /* 측정용 숨김 복제본도 ItemView 를 쓰므로 필수 마크업이 그대로 들어가 폭이 맞는다 */
    const label = c.required
      ? <>{c.label}<span aria-hidden="true" style={{ color: 'var(--foreground)', fontWeight: 700, marginLeft: 2 }}>*</span><span className="sr-only"> 필수</span></>
      : c.label;
    return <FilterChip active={c.active} onClick={c.onSelect} count={c.count}>{label}</FilterChip>;
  }
  if (it.kind === 'applied') return <Chip f={it.f} flash={flash} />;
  return (
    <button type="button" onClick={it.run}
      className="border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground underline-offset-2 hover:underline shrink-0"
      style={{ fontSize: 12.5, padding: '4px 6px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
      전체 해제
    </button>
  );
}

const GAP = 8;
const isWide = (it: { kind: string; f?: { wide?: boolean } }) => it.kind === 'applied' && Boolean(it.f?.wide);
/** 그리디 채우기 — 넘치면 트리거 폭을 예약하고 다시 채운다. 보이는 id 집합을 돌려준다.
    wide 칩은 항상 보인다 — 측정 폭 대신 minWidth(160)+gap 만 먼저 예약하고, 나머지 칩을 남은 폭에 채운다
    (실제 렌더에선 wide 칩이 남은 폭을 차지하며 2줄로 줄어든다). */
function fitIds(order: Item[], w: Record<string, number>, avail: number, trigger: number): Set<string> {
  const wides = order.filter(isWide);
  const reserve = wides.length ? wides.length * WIDE_MIN + (wides.length - 1) * GAP : 0;   // wide 사이 gap — 나머지 칩 앞 gap 은 아래 루프가 더한다
  const run = (limit: number) => {
    const ids = new Set<string>(wides.map((it) => it.id)); let used = reserve;
    for (const it of order) {
      if (isWide(it)) continue;
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

  /* 필터를 걸면(새 항목·값 변경) 그 칩의 툴팁을 FLASH_MS 동안 띄운다. 첫 렌더는 기준선만 잡는다(페이지 진입 기본값은 안 띄움).
     타이머는 행이 항목별로 갖는다 — 3초 안에 다른 필터를 걸어도 앞 칩 타이머가 끊기지 않고, +N 에서 다시 펼쳐진 칩이 만료 뒤 또 뜨지 않는다.
     (만료 시각을 state 에 두면 Date.now() 가 렌더 값으로 흘러 react-hooks/purity 위반이다) */
  const vSig = valueSig(on);
  const prevSig = React.useRef<string | null>(null);
  const pending = React.useRef(new Set<string>());   // 모달이 열려 있는 동안 바뀐 항목
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [flashing, setFlashing] = React.useState<ReadonlySet<string>>(() => new Set());
  const flashNow = React.useCallback((labels: readonly string[]) => {
    setFlashing((p) => new Set([...p, ...labels]));
    for (const l of labels) {
      clearTimeout(timers.current[l]);   // 같은 항목을 3초 안에 다시 바꾸면 그때부터 다시 센다
      timers.current[l] = setTimeout(() => setFlashing((p) => new Set([...p].filter((x) => x !== l))), FLASH_MS);
    }
  }, []);
  React.useEffect(() => {
    const fresh = freshLabels(prevSig.current, vSig);
    prevSig.current = vSig;
    const live = sigMap(vSig);
    pending.current.forEach((l) => { if (!live.has(l)) pending.current.delete(l); });   // 모달 안에서 걸었다 푼 항목은 버린다
    if (!fresh.length) return;
    if (modalOpen()) fresh.forEach((l) => pending.current.add(l));
    else flashNow(fresh);
  }, [vSig, flashNow]);
  React.useEffect(() => {
    /* 모달이 닫힘 상태로 바뀌는 순간(data-state=closed) 모아 둔 항목을 띄운다 — 포털 위치와 무관하게 body 아래 속성 변화를 본다.
       대기 항목이 없으면 바로 돌아가므로 다른 툴팁·메뉴의 상태 변화에는 비용이 거의 없다. */
    const mo = new MutationObserver(() => {
      if (!pending.current.size || modalOpen()) return;
      const labels = [...pending.current];
      pending.current.clear();
      flashNow(labels);
    });
    mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-state'] });
    const t = timers.current;
    return () => { mo.disconnect(); Object.values(t).forEach(clearTimeout); };
  }, [flashNow]);

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
      {/* flash 는 보이는 줄에만 — 측정용 사본에 넘기면 0 크기 요소에 붙은 툴팁이 한 장 더 뜬다 */}
      {shown.map((it) => <React.Fragment key={it.id}><ItemView it={it} flash={it.kind === 'applied' && flashing.has(it.f.label)} /></React.Fragment>)}
      {/* 숨긴 게 `전체 해제` 하나뿐이면 +0 트리거가 된다 → 그리지 않는다(칩별 × 는 보이는 칩에 그대로 있다) */}
      {hidden.some((it) => it.kind !== 'clear') && <OverflowMenu key="more" hidden={hidden} tinted={hiddenActive} rowRef={boxRef} />}
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
  /* +N = 숨긴 **필터** 수 — `전체 해제`는 필터가 아니라 세지 않는다(세면 칩 2개 숨김에 +3 으로 보였다). */
  const n = chips.length + applied.length;
  /* 항목을 고르면 필터가 바뀌며 행 전체가 다시 그려져 Radix 의 자동 초점 복귀가 body 로 떨어진다(실측) —
     닫힌 뒤 다음 프레임에 트리거로 직접 되돌린다(키보드 사용자가 제자리에서 이어 가도록). */
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button ref={triggerRef} type="button" aria-label={`필터 ${n}개 더 보기`}
          className="inline-flex shrink-0 border-0 bg-transparent p-0 cursor-pointer rounded-lg" style={{ fontFamily: 'inherit' }}>
          <TriggerFace n={n} tinted={tinted} />
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
