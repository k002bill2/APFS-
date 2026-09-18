import * as React from 'react';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuGroup, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator, ContextMenuLabel,
} from 'apfs-dashboard-offline';

/* ContextMenu 패밀리 — AG Grid 행 우클릭 메뉴(Community 대체)의 DS 표면. dropdown-menu 와 동일 토큰.
   하위 파트는 단독 렌더가 불가하므로 부모 조합 전체를 그리고, 파일마다 해당 파트가 두드러지는 구성을 쓴다.
   ⚠ `open` 제어 prop 은 있으나 상호작용 전 true 면 앵커가 없어 뷰포트 좌상단(0,0)에 붙는다(콘솔 경고).
     그래서 마운트 직후 트리거에 실제 contextmenu 이벤트를 디스패치해 커서 좌표에서 연다 — 제품과 같은 경로.
   ⚠ `onOpenAutoFocus` preventDefault: Content(role=menu)가 focus 를 받으면 tokens.css 의
     `[role="menu"]:focus-visible{box-shadow:none}` 이 shadow-lg 엘리베이션까지 지운다. */


function useOpenAt(ref: React.MutableRefObject<HTMLElement | null>, x: number, y: number) {
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      ref.current?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
}

const stage: React.CSSProperties = { padding: '16px 18px' };
const frame: React.CSSProperties = { border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', background: 'var(--card)', width: 420 };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: 'var(--foreground)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '7px 10px', fontSize: 11.5, fontWeight: 600, color: 'var(--caption)', background: 'var(--grid-header)', borderBottom: '1px solid var(--border)' };
const td: React.CSSProperties = { padding: '7px 10px', borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' };
const noAutoFocus = (e: Event) => e.preventDefault();

const ROWS: [string, string][] = [
  ['상주-어니스트 애그테크 투자조합', '30,000'],
  ['농식품 청년창업 투자조합 2호', '18,500'],
  ['수출지원 스케일업 투자조합', '42,000'],
];

/* 그리드 픽스처 — 메뉴가 "행 위에서" 열린 것으로 읽히게 한다(2행이 선택 상태). */
function RowsFixture() {
  return (
    <div style={frame}>
      <table style={table}>
        <thead><tr><th style={th}>자펀드명</th><th style={{ ...th, textAlign: 'right' }}>약정총액(백만원)</th></tr></thead>
        <tbody>
          {ROWS.map(([name, amt], i) => (
            <tr key={name} style={i === 1 ? { background: 'var(--row-selected)' } : undefined}>
              <td style={td}>{name}</td><td style={{ ...td, textAlign: 'right' }}>{amt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* 그룹 — 라벨이 붙는 항목 묶음(role=group). 조회 / 편집 두 구역으로 나눈다. */
export function GroupedRowActions() {
  const ref = React.useRef<HTMLElement | null>(null);
  useOpenAt(ref, 150, 92);
  return (
    <div style={stage}>
      <ContextMenu>
        <ContextMenuTrigger ref={ref as any} style={{ display: 'block' }}>
          <RowsFixture />
        </ContextMenuTrigger>
        <ContextMenuContent style={{ width: 208 }} onOpenAutoFocus={noAutoFocus}>
          <ContextMenuGroup>
            <ContextMenuLabel>조회</ContextMenuLabel>
            <ContextMenuItem>자펀드 명세</ContextMenuItem>
            <ContextMenuItem>출자 이행 내역</ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuLabel>편집</ContextMenuLabel>
            <ContextMenuItem>결성조합 정보 수정</ContextMenuItem>
            <ContextMenuItem danger>삭제</ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}
