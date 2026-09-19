import * as React from 'react';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from 'apfs-dashboard-offline';

/* CommandDialog — Command 를 우리 Dialog/DialogContent(focus trap·ESC) 위에 올린 오버레이 팔레트.
   앱에서는 GNB '/' 로 열린다(shell.tsx MenuCommand).
   ⚠ CommandDialog 는 forwardRef 가 아니라 평범한 함수 컴포넌트다 — Dialog 의 ref(지연 언마운트)
     계약을 통과시킬 수 없다. 제품 코드도 `<CommandDialog open onOpenChange>` 로만 쓴다.
   ⚠ 표면(bg-card)·max-w-[560px]·p-0·hideClose 는 CommandDialog 가 이미 공급하므로 감싸지 않는다. */


const subStyle: React.CSSProperties = { flexShrink: 0, fontSize: 11, color: 'var(--caption)' };

const ROWS = [
  { label: '자펀드 정보관리', sub: '자펀드' },
  { label: '투자심의 결과관리', sub: '투자심의' },
  { label: '조기경보 모니터링', sub: '리스크관리' },
  { label: '운용사 건전성 점검', sub: '리스크관리' },
  { label: '자금집행 마감', sub: '회계·자금' },
  { label: '운용사 정기보고 접수', sub: '보고관리' },
];

export function PaletteDialog() {
  return (
    <CommandDialog open onOpenChange={() => {}}>
      <CommandInput placeholder="메뉴·운용사·자펀드 검색…" />
      <CommandList>
        <CommandEmpty>결과가 없습니다.</CommandEmpty>
        <CommandGroup heading="빠른 이동">
          {ROWS.map((r) => (
            <CommandItem key={r.label} value={r.label + ' ' + r.sub}>
              <span className="flex-1 truncate">{r.label}</span>
              <span style={subStyle}>{r.sub}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
