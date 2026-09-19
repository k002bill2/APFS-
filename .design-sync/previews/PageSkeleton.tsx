import * as React from 'react';
import { PageSkeleton } from 'apfs-dashboard-offline';

/* PageSkeleton — 라우트 전환 로딩용 전 페이지 골격(app.tsx 가 500ms 노출).
   브레드크럼+타이틀 · KPI 4카드(flexWrap+flexBasis, 고정 grid-cols 금지) · 테이블 블록 + 중앙 상단 40% Spinner.
   withSpinner={false} 면 스피너를 생략한다 — 초기 진입은 boot 스플래시와 중복이라 스켈레톤만 쓴다.
   셸 <main> 이 패딩을 제공하므로 컴포넌트 자체는 세로 스택만 갖는다. */

/* zoom: 프리뷰 카드(900x700)에 전 페이지 골격을 통째로 담기 위한 축소 — 제품에서는 불필요하다. */
const fit: React.CSSProperties = { padding: '4px 10px', zoom: 0.8 };

export function RouteLoading() {
  return (
    <div style={fit}>
      <PageSkeleton />
    </div>
  );
}

export function WithoutSpinner() {
  return (
    <div style={fit}>
      <PageSkeleton withSpinner={false} />
    </div>
  );
}
