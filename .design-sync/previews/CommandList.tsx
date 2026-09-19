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

/* 결과 리스트 — DS 기본 max-h 340px 스크롤 영역. 최소높이를 240 으로 고정해 결과가 적어도 패널 높이가 유지되고 420 뷰포트 안에 전체가 들어간다. */
export function PaletteResultList() {
  const rows = [
    ['자펀드 정보관리', '자펀드'],
    ['결성조합 등록', '자펀드'],
    ['투자심의 결과관리', '투자심의'],
    ['조기경보 모니터링', '리스크관리'],
    ['운용사 건전성 점검', '리스크관리'],
    ['자금집행 마감', '회계·자금'],
    ['운용사 정기보고 접수', '보고관리'],
  ];
  return (
    <div style={stage}>
      <div style={surface}>
        <Command>
          <CommandInput placeholder="메뉴·운용사·자펀드 검색…" />
          <CommandList style={{ minHeight: 240 }}>
            <CommandEmpty>결과가 없습니다.</CommandEmpty>
            <CommandGroup heading="빠른 이동">
              {rows.map(([label, sub]) => (
                <CommandItem key={label} value={label + ' ' + sub}>
                  <span className="flex-1 truncate">{label}</span><span style={subStyle}>{sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
