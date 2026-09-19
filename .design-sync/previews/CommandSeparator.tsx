import * as React from 'react';
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator,
} from 'apfs-dashboard-offline';

/* Command(cmdk) 패밀리 — 앱의 GNB '/' 명령 팔레트. 표면은 Dialog(bg-card)가 공급하고 Command
   자체는 투명이라 인라인 다이얼로그 표면으로 감싼다. 하위 파트는 단독 렌더가 불가하므로 부모
   조합 전체를 그리고, 파일마다 해당 파트가 두드러지는 구성을 쓴다.
   첫 항목은 cmdk 가 자동 선택(data-selected) → bg-accent-surface 하이라이트. */


const surface: React.CSSProperties = {
  width: 480, border: '1px solid var(--border)', borderRadius: 14,
  background: 'var(--card)', color: 'var(--foreground)',
  boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
};
const subStyle: React.CSSProperties = { flexShrink: 0, fontSize: 11, color: 'var(--caption)' };
const stage: React.CSSProperties = { padding: '8px 10px' };

/* 구분선 — 그룹 사이 1px(bg-border). 검색 중에도 보이게 하려면 alwaysRender 를 준다. */
export function SeparatedGroups() {
  return (
    <div style={stage}>
      <div style={surface}>
        <Command>
          <CommandInput placeholder="메뉴·운용사·자펀드 검색…" />
          <CommandList>
            <CommandEmpty>결과가 없습니다.</CommandEmpty>
            <CommandGroup heading="자펀드">
              <CommandItem value="상주-어니스트 애그테크 투자조합">
                <span className="flex-1 truncate">상주-어니스트 애그테크 투자조합</span><span style={subStyle}>결성완료</span>
              </CommandItem>
              <CommandItem value="농식품 청년창업 투자조합 2호">
                <span className="flex-1 truncate">농식품 청년창업 투자조합 2호</span><span style={subStyle}>결성완료</span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator alwaysRender />
            <CommandGroup heading="운용사">
              <CommandItem value="어니스트벤처스(주)">
                <span className="flex-1 truncate">어니스트벤처스(주)</span><span style={subStyle}>GP</span>
              </CommandItem>
              <CommandItem value="나눔엔젤스(주)">
                <span className="flex-1 truncate">나눔엔젤스(주)</span><span style={subStyle}>GP</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
