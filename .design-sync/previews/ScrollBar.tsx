import * as React from 'react';
import { ScrollArea, ScrollBar } from 'apfs-dashboard-offline';

/* ScrollBar — ScrollArea 의 바. ScrollArea 가 세로 바를 기본 포함하므로 단독으로는
   ScrollArea 안에서만 쓴다(가로 바는 orientation="horizontal" 를 추가 배치).
   두께 10px(w-2.5), 썸은 rounded-full + bg-border-strong. type="always" 로 상시 노출. */

const ROWS = [
  ['농식품 벤처투자조합 1호', '○○인베스트먼트', '2024-06-10', '32,000', '78.0%', '정상'],
  ['스마트농업 성장펀드 2호', '△△자산운용', '2026-03-28', '50,000', '42.5%', '정상'],
  ['수산 스케일업 펀드', '□□벤처파트너스', '2025-11-02', '15,000', '61.3%', '관찰'],
  ['상주-어니스트 애그테크 투자조합', '어니스트벤처스(주)', '2026-06-10', '30,000', '12.8%', '정상'],
  ['푸드테크 혁신투자조합', '◇◇캐피탈', '2025-04-17', '24,000', '55.1%', '정상'],
  ['청년창업 농식품 펀드', '◎◎인베스트', '2023-09-01', '18,000', '91.2%', '청산예정'],
];
const HEAD = ['자펀드명', '운용사', '결성일', '약정(백만원)', '소진율', '상태'];
const W = [260, 170, 110, 130, 90, 90];

const cell: React.CSSProperties = { padding: '8px 12px', fontSize: 12.5, color: 'var(--foreground)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' };

export function Vertical() {
  return (
    <div style={{ width: 320, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <ScrollArea type="always" style={{ height: 200 }}>
        <div style={{ padding: 10 }}>
          {ROWS.concat(ROWS).map((r, i) => (
            <div key={i} style={{ padding: '9px 6px', borderBottom: '1px solid var(--border)', fontSize: 12.5, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {i + 1}. {r[0]}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function Horizontal() {
  return (
    <div style={{ width: 560, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <ScrollArea type="always" style={{ height: 230 }}>
        <div style={{ width: 860 }}>
          <div style={{ display: 'flex', background: 'var(--muted)' }}>
            {HEAD.map((hd, i) => <div key={hd} style={{ ...cell, width: W[i], fontWeight: 700, color: 'var(--caption)', fontSize: 12 }}>{hd}</div>)}
          </div>
          {ROWS.map((r) => (
            <div key={r[0]} style={{ display: 'flex' }}>
              {r.map((c, i) => <div key={i} style={{ ...cell, width: W[i], textAlign: i >= 3 && i <= 4 ? 'right' : 'left' }}>{c}</div>)}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
