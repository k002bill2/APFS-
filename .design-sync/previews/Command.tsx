import * as React from 'react';
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator,
} from 'apfs-dashboard-offline';

/* Command — cmdk 기반 명령 팔레트(앱의 GNB '/' 검색). APFS 규약:
   - 표면은 Dialog(bg-card)가 공급하고 Command 자체는 투명 → 인라인 다이얼로그 표면으로 감싼다.
   - 첫 항목은 cmdk 가 자동 선택(data-selected) → bg-accent-surface 하이라이트(브랜드 navy 아님).
   - 인라인 렌더라 `open` 이 필요없다(오버레이 버전은 CommandDialog). */


const surface: React.CSSProperties = {
  width: 480, border: '1px solid var(--border)', borderRadius: 14,
  background: 'var(--card)', color: 'var(--foreground)',
  boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
};
const subStyle: React.CSSProperties = { flexShrink: 0, fontSize: 11, color: 'var(--caption)' };

const MENU_ROWS = [
  { label: '자펀드 정보관리', sub: '자펀드' },
  { label: '결성조합 등록', sub: '자펀드' },
  { label: '투자심의 결과관리', sub: '투자심의' },
];
const GP_ROWS = [
  { label: '어니스트벤처스(주)', sub: 'GP' },
  { label: '나눔엔젤스(주)', sub: 'GP' },
  { label: '이앤인베스트먼트', sub: 'GP' },
];

function PaletteRow({ label, sub, cat }: { label: string; sub: string; cat: string }) {
  return (
    <CommandItem value={label + ' ' + cat}>
      <span className="flex-1 truncate">{label}</span>
      <span style={subStyle}>{sub}</span>
    </CommandItem>
  );
}

/* 대표 스토리 — 검색어 없이 전체 그룹이 보이는 기본 팔레트. */
export function MenuPalette() {
  return (
    <div style={surface}>
      <Command>
        <CommandInput placeholder="메뉴·운용사·자펀드 검색…" />
        <CommandList>
          <CommandEmpty>결과가 없습니다.</CommandEmpty>
          <CommandGroup heading="투자관리">
            {MENU_ROWS.map((r) => <PaletteRow key={r.label} label={r.label} sub={r.sub} cat="투자관리" />)}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="운용사">
            {GP_ROWS.map((r) => <PaletteRow key={r.label} label={r.label} sub={r.sub} cat="운용사" />)}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

/* 검색어 입력 상태 — cmdk 필터가 일치 항목만 남긴다(점수 0 항목·빈 그룹은 자동 숨김). */
export function SearchResultsPalette() {
  return (
    <div style={surface}>
      <Command>
        <CommandInput value="투자조합" onValueChange={() => {}} placeholder="메뉴·운용사·자펀드 검색…" />
        <CommandList>
          <CommandEmpty>결과가 없습니다.</CommandEmpty>
          <CommandGroup heading="자펀드">
            <CommandItem value="상주-어니스트 애그테크 투자조합">
              <span className="flex-1 truncate">상주-어니스트 애그테크 투자조합</span>
              <span style={subStyle}>결성완료</span>
            </CommandItem>
            <CommandItem value="농식품 청년창업 투자조합 2호">
              <span className="flex-1 truncate">농식품 청년창업 투자조합 2호</span>
              <span style={subStyle}>결성완료</span>
            </CommandItem>
            <CommandItem value="수출지원 스케일업 투자조합">
              <span className="flex-1 truncate">수출지원 스케일업 투자조합</span>
              <span style={subStyle}>결성중</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="메뉴">
            <CommandItem value="투자조합 결성 등록">
              <span className="flex-1 truncate">결성조합 등록</span>
              <span style={subStyle}>자펀드 정보관리</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
