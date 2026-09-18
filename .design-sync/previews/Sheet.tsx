import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button, StatusBadge } from 'apfs-dashboard-offline';

/* Sheet — 측면 슬라이드 패널(Radix Dialog 기반). 목록의 상세필터·상세보기처럼 본문을 가리지 않고 옆에서 여는 흐름.
   ⚠ Sheet 는 DialogPrimitive.Root 그대로다 — Dialog/AlertDialog 와 달리 ref 핸들(close())이 없고 open 만 제어한다. */

const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: 'var(--foreground)' };

export function DetailPanel() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>자펀드 상세</SheetTitle>
            <SheetDescription>농식품 스마트팜 투자조합 2호</SheetDescription>
          </div>
          <div style={{ marginRight: 26 }}><StatusBadge tone="success" label="운용중" /></div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <div style={row}><span style={{ color: 'var(--caption)' }}>운용사</span><span>어니스트벤처스(주)</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>결성일</span><span>2026-06-10</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>약정총액</span><span>30,000백만원</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>모태 출자비율</span><span>60.0%</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>투자잔액</span><span>11,520백만원</span></div>
          <div style={row}><span style={{ color: 'var(--caption)' }}>의무투자 비율</span><span style={{ color: 'var(--danger-text)' }}>38.4%</span></div>
          <div style={{ borderTop: '1px solid var(--border-strong)', paddingTop: 12, fontSize: 12, color: 'var(--caption)' }}>최근 변경 2026-09-11 · 투자운용부 김서연</div>
        </div>
        <SheetFooter>
          <Button variant="outline" size="sm" onClick={() => {}}>명세 내려받기</Button>
          <Button variant="primary" size="sm" onClick={() => {}}>정보 수정</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function ScheduleDrawer() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent side="left" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>이번 주 일정</SheetTitle>
            <SheetDescription>2026-09-14 ~ 2026-09-20</SheetDescription>
          </div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          {[
            ['09-15 (화)', '투자심의위원회 3차', '대회의실 · 14:00'],
            ['09-16 (수)', '운용사 정기점검 · 그린하베스트파트너스', '현장 · 10:00'],
            ['09-18 (금)', '3분기 조합재무제표 제출 마감', '전 운용사'],
            ['09-20 (일)', '조기경보 주간 리포트 자동 생성', '시스템'],
          ].map(([d, t, s2]) => (
            <div key={d} style={{ borderLeft: '2px solid var(--primary)', paddingLeft: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--caption)' }}>{d}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)', marginTop: 2 }}>{t}</div>
              <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{s2}</div>
            </div>
          ))}
        </div>
        <SheetFooter>
          <Button variant="outline" size="sm" onClick={() => {}}>월간 일정</Button>
          <Button variant="primary" size="sm" leadingIcon="plus" onClick={() => {}}>일정 등록</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
