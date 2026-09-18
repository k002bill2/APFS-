import * as React from 'react';
import { Button } from 'apfs-dashboard-offline';

/* Button — 앱 공통 버튼. variant: primary | accent | secondary | outline | ghost, size: sm | md | lg.
   leadingIcon/trailingIcon 은 아이콘 이름 문자열. loading 은 disabled 속성을 쓰지 않고(포커스 유지) aria-busy + 클릭 가드로 차단하며
   스피너가 leadingIcon 자리를 대체한다. disabled prop 만 진짜 비활성. hover/press 스케일은 Motion spring. */

const rowWrap: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 };
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--caption)' };

export function Variants() {
  return (
    <div style={field}>
      <span style={label}>variant 5종</span>
      <div style={rowWrap}>
        <Button variant="primary" leadingIcon="plus">새 등록</Button>
        <Button variant="accent" leadingIcon="star">강조</Button>
        <Button variant="secondary">보조</Button>
        <Button variant="outline" leadingIcon="download">엑셀 다운로드</Button>
        <Button variant="ghost" leadingIcon="refresh">새로고침</Button>
      </div>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={field}>
      <span style={label}>size sm · md · lg</span>
      <div style={{ ...rowWrap, alignItems: 'flex-end' }}>
        <Button variant="primary" size="sm" leadingIcon="check">저장</Button>
        <Button variant="primary" size="md" leadingIcon="check">저장</Button>
        <Button variant="primary" size="lg" leadingIcon="check">저장</Button>
      </div>
    </div>
  );
}

export function States() {
  return (
    <div style={field}>
      <span style={label}>상태 — loading(포커스 유지·클릭만 차단) / disabled</span>
      <div style={rowWrap}>
        <Button variant="primary" leadingIcon="check">기본</Button>
        <Button variant="primary" loading>저장 중</Button>
        <Button variant="outline" disabled>비활성</Button>
        <Button variant="ghost" loading>불러오는 중</Button>
      </div>
    </div>
  );
}

export function WithIcons() {
  return (
    <div style={rowWrap}>
      <Button variant="outline" leadingIcon="filter">상세 필터</Button>
      <Button variant="outline" leadingIcon="upload">보고서 업로드</Button>
      <Button variant="outline" trailingIcon="more">더보기</Button>
      <Button variant="ghost" leadingIcon="trash">삭제</Button>
    </div>
  );
}
