/* APFS 디자인시스템 배럴 — claude.ai/design 동기(/design-sync)의 합성 엔트리.
   앱은 라이브러리 빌드가 없으므로 컨버터가 이 디렉터리(`.design-sync/config.json` srcDir=src/ds)만 훑어
   `window.APFS.*` 번들을 만든다. 여기 없는 것은 디자인 에이전트에게 존재하지 않는다.

   포함: shadcn/Radix 프리미티브(src/dash/ui) + `UI` 네임스페이스의 프레젠테이션 컴포넌트(src/dash/components.tsx).
   제외(의도): Plate 에디터 계열(editor·select-editor·inline-combobox·tag-node — 거대 의존·프로바이더 필수),
   내부 헬퍼(menu-highlight·portal-container·dialog-exit), 상수/유틸(toneVar·SAVE_DEMO_MS·glyphFor·formatPeriod 등은
   같은 모듈에서 따라오지만 PascalCase 가 아니라 컴포넌트로 잡히지 않는다).
   ⚠ 앱 코드는 이 파일을 import 하지 않는다 — 소비자는 컨버터뿐. */

// ── Radix/shadcn 프리미티브 (src/dash/ui) ──
export * from '../dash/ui/accordion';
export * from '../dash/ui/alert';
export * from '../dash/ui/alert-dialog';
export * from '../dash/ui/attachment';
export * from '../dash/ui/calendar';
export * from '../dash/ui/checkbox';
export * from '../dash/ui/command';
export * from '../dash/ui/context-menu';
export * from '../dash/ui/date-picker';
export * from '../dash/ui/dialog';
export * from '../dash/ui/dropdown-menu';
export * from '../dash/ui/hover-card';
export * from '../dash/ui/input-group';
export * from '../dash/ui/item';
export * from '../dash/ui/navigation-menu';
export * from '../dash/ui/period-picker';
export * from '../dash/ui/popover';
export * from '../dash/ui/progress';
export * from '../dash/ui/radio-group';
export * from '../dash/ui/scroll-area';
export * from '../dash/ui/sheet';
export * from '../dash/ui/skeleton';
export * from '../dash/ui/sonner';
export * from '../dash/ui/spinner';
export * from '../dash/ui/switch';
export * from '../dash/ui/tooltip';

// ── UI 네임스페이스 (src/dash/components.tsx) — 앱은 `UI.Button` 으로 쓰지만 디자인 에이전트에게는 이름별 export 가 필요하다 ──
import { UI } from '../dash/components';
export const ColorChip = UI.ColorChip;
export const StatusBadge = UI.StatusBadge;
export const DeltaBadge = UI.DeltaBadge;
export const StatCard = UI.StatCard;
export const Card = UI.Card;
export const ChartCard = UI.ChartCard;
export const SegTabs = UI.SegTabs;
export const FilterChip = UI.FilterChip;
export const Button = UI.Button;
export const SaveButton = UI.SaveButton;
export const IconBtn = UI.IconBtn;
export const EmptyState = UI.EmptyState;
export const CountPill = UI.CountPill;
export const PopNumber = UI.PopNumber;
export const TextSwap = UI.TextSwap;
export const TextsReveal = UI.TextsReveal;
export const ClearableInput = UI.ClearableInput;
// UI.Progress 는 ../dash/ui/progress 의 Progress 와 같은 객체 — 위 export * 로 이미 나간다.
