import * as React from 'react';
import { EmptyState, Card, ChartCard } from 'apfs-dashboard-offline';

/* EmptyState — 목록·차트 영역의 빈 상태. msg(안내 문구) · icon(문자열 이름) · height(영역 높이).
   기본 문구는 "표시할 데이터가 없습니다". 캡션 색이라 카드 본문 안에서 조용히 자리를 채운다. */

export function Default() {
  return (
    <Card pad={0}><EmptyState /></Card>
  );
}

export function Guided() {
  return (
    <Card pad={0}><EmptyState msg="좌측에서 코드구분을 선택해 주세요." icon="layers" height={200} /></Card>
  );
}

export function NoSchedule() {
  return (
    <Card pad={0}><EmptyState msg="해당 기간·종류에 일정이 없습니다" icon="clock" height={160} /></Card>
  );
}

export function InChartCard() {
  return (
    <div style={{ maxWidth: 460 }}>
      <ChartCard title="조기경보 발생 내역" sub="선택한 조건에 해당하는 운용사 없음" icon="shield-alert" accent="var(--danger)">
        <EmptyState msg="조기경보 발생 운용사가 없습니다" icon="inbox" height={150} />
      </ChartCard>
    </div>
  );
}
