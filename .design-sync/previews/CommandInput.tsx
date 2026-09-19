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

/* 검색 입력 — 좌측 돋보기 + 하단 구분선(border-b), placeholder 는 caption 색. */
export function PaletteSearchInput() {
  return (
    <div style={stage}>
      <div style={surface}>
        <Command>
          <CommandInput placeholder="메뉴·운용사·자펀드 검색…" />
          <CommandList>
            <CommandEmpty>결과가 없습니다.</CommandEmpty>
            <CommandGroup heading="최근 이동">
              <CommandItem value="자펀드 정보관리">
                <span className="flex-1 truncate">자펀드 정보관리</span><span style={subStyle}>자펀드</span>
              </CommandItem>
              <CommandItem value="조기경보 모니터링">
                <span className="flex-1 truncate">조기경보 모니터링</span><span style={subStyle}>리스크관리</span>
              </CommandItem>
              <CommandItem value="자금집행 마감">
                <span className="flex-1 truncate">자금집행 마감</span><span style={subStyle}>회계·자금</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
