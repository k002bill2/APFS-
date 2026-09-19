import * as React from 'react';
import { ScrollArea, StatusBadge } from 'apfs-dashboard-offline';

/* ScrollArea — Radix 기반 커스텀 스크롤 영역(Root+Viewport+ScrollBar 한 세트).
   Viewport 가 h-full 이라 **Root 에 고정 높이**를 준다. 썸 색은 --border-strong 토큰.
   type="always" 는 호버 없이도 바를 상시 노출(기본 "hover"). */

const ALERTS = [
  { t: '투심보고 승인 요청', d: '상주-어니스트 애그테크 투자조합', tone: 'info' as const, b: '검토 대기' },
  { t: '조기경보 발생', d: '△△자산운용 · 관리보수 연체 2기', tone: 'danger' as const, b: '즉시 확인' },
  { t: '회계마감 D-3', d: '2026년 9월 월별 결산 · 미승인 전표 8건', tone: 'warning' as const, b: '마감 임박' },
  { t: '캐피털콜 통지', d: '스마트농업 성장펀드 2호 · 3차 48억', tone: 'info' as const, b: '납입 예정' },
  { t: '의무투자 이행 점검', d: '청년창업 의무비율 20% 대비 17.4%', tone: 'warning' as const, b: '미달' },
  { t: '분기 정기보고 제출', d: '○○인베스트먼트 · 2026 2분기', tone: 'success' as const, b: '완료' },
  { t: '조합 규약 변경 심의', d: '농식품 벤처투자조합 1호 · 존속기간 연장', tone: 'info' as const, b: '상정' },
  { t: '수탁은행 잔액 대조', d: '2026-09-18 기준 · 차이 0원', tone: 'success' as const, b: '일치' },
];

const LEAVES = [
  '자펀드 정보관리', '결성조합 등록', '조합원 관리', '출자 이행 관리', '투자기업 관리',
  '투자 실적 조회', '회수 실적 조회', '의무투자 점검', '조기경보 지표 관리', '운용사 평가',
  '회계 전표 관리', '자금 집행 관리', '월별 결산', '정기보고 접수', '수시보고 접수',
];

export function AlertPanel() {
  return (
    <div style={{ width: 400, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)' }}>
        알림센터 · 미확인 8건
      </div>
      <ScrollArea type="always" style={{ height: 240 }}>
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ALERTS.map((a) => (
            <div key={a.t} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--muted)' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{a.t}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.d}</div>
              </div>
              <StatusBadge tone={a.tone} size="sm" label={a.b} />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function MenuList() {
  return (
    <div style={{ width: 264, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
        투자자산관리
      </div>
      <ScrollArea type="always" style={{ height: 200 }}>
        <div style={{ padding: 8 }}>
          {LEAVES.map((l, i) => (
            <div key={l} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12.5, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--primary)' : 'var(--foreground)', background: i === 0 ? 'color-mix(in srgb,var(--primary) 10%,transparent)' : 'transparent' }}>{l}</div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
