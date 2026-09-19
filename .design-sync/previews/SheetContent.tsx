import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription, Button } from 'apfs-dashboard-offline';

/* SheetContent — 측면 슬라이드 패널(폭 400px, 전체 높이). side="right"(기본) | "left".
   ⚠ Sheet 는 DialogPrimitive.Root 그대로라 Dialog 와 달리 ref 핸들이 없다 — open 만 제어한다. */

const label: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6, display: 'block' };
const input: React.CSSProperties = { width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, boxSizing: 'border-box' };
const chip: React.CSSProperties = { padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border-strong)', fontSize: 12.5, color: 'var(--foreground)' };
const chipOn: React.CSSProperties = { ...chip, background: 'color-mix(in srgb,var(--primary) 12%,transparent)', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: 700 };

export function RightFilterDrawer() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>상세 조건</SheetTitle>
            <SheetDescription>투자현황 목록에 적용할 조회 조건</SheetDescription>
          </div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          <div><span style={label}>조회기간</span><input style={input} defaultValue="2026-01-01 ~ 2026-09-30" /></div>
          <div><span style={label}>운용사</span><input style={input} defaultValue="전체" /></div>
          <div>
            <span style={label}>투자분야</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={chipOn}>스마트농업</span><span style={chip}>푸드테크</span><span style={chip}>수산</span><span style={chipOn}>임업</span><span style={chip}>농자재</span>
            </div>
          </div>
          <div>
            <span style={label}>조합 상태</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span style={chipOn}>운용중</span><span style={chip}>결성중</span><span style={chip}>청산</span>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" size="sm" leadingIcon="refresh" onClick={() => {}}>초기화</Button>
          <Button variant="primary" size="sm" leadingIcon="search" onClick={() => {}}>조건 적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function LeftAlarmDrawer() {
  return (
    <Sheet open onOpenChange={() => {}}>
      <SheetContent side="left" onInteractOutside={(e) => e.preventDefault()} onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div>
            <SheetTitle>조기경보 알림</SheetTitle>
            <SheetDescription>최근 7일 감지된 경보</SheetDescription>
          </div>
        </SheetHeader>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
          {[
            ['자펀드 의무투자 비율 미달', '농식품 스마트팜 투자조합 2호 · 38.4%'],
            ['운용사 분기보고 지연', '그린하베스트파트너스 · 6일 경과'],
            ['피투자기업 자본잠식', '(주)한들수산 · 부채비율 412%'],
          ].map(([t, s]) => (
            <div key={t} style={{ border: '1px solid var(--border-strong)', borderRadius: 10, padding: '12px 14px', background: 'var(--card)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--foreground)' }}>{t}</div>
              <div style={{ fontSize: 12, color: 'var(--caption)', marginTop: 4 }}>{s}</div>
            </div>
          ))}
        </div>
        <SheetFooter>
          <Button variant="outline" size="sm" onClick={() => {}}>전체 경보 보기</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
