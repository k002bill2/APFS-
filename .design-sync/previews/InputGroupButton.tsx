import * as React from 'react';
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText, InputGroupButton } from 'apfs-dashboard-offline';
import { Search, X, RotateCw, Download } from 'lucide-react';

/* InputGroupButton — 애드온 안에 들어가는 작은 버튼.
   variant: default(primary) · outline · ghost(기본값) · secondary
   size: xs(h-6, 기본값) · sm(h-7) · icon-xs(6x6) · icon-sm(7x7). icon-* 는 svg 자식 전용.
   type 은 기본 button(폼 안에서 의도치 않은 submit 방지). */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 440 };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function VariantAxis() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>variant=&quot;default&quot; — 주 액션</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><Search /></InputGroupAddon>
          <InputGroupInput placeholder="자펀드·운용사 검색" aria-label="자펀드 검색" />
          <InputGroupAddon align="inline-end"><InputGroupButton variant="default" size="sm">검색</InputGroupButton></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>variant=&quot;outline&quot; — 보조 액션</div>
        <InputGroup>
          <InputGroupInput defaultValue="18,000" aria-label="모태 출자액" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>백만원</InputGroupText>
            <InputGroupButton variant="outline" size="sm">자동계산</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>variant=&quot;ghost&quot;(기본값) — 약한 액션</div>
        <InputGroup>
          <InputGroupInput defaultValue="어니스트벤처스(주)" aria-label="운용사" />
          <InputGroupAddon align="inline-end"><InputGroupButton>초기화</InputGroupButton></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>variant=&quot;secondary&quot;</div>
        <InputGroup>
          <InputGroupInput defaultValue="2026-09-15" aria-label="기준일" />
          <InputGroupAddon align="inline-end"><InputGroupButton variant="secondary" size="sm">오늘</InputGroupButton></InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

export function IconSizes() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>size=&quot;icon-sm&quot; — 검색어 지우기</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><Search /></InputGroupAddon>
          <InputGroupInput defaultValue="애그테크" aria-label="자펀드 검색" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-sm" aria-label="검색어 지우기" title="검색어 지우기"><X /></InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>size=&quot;icon-xs&quot; — 새로고침 · 내려받기</div>
        <InputGroup>
          <InputGroupInput defaultValue="2026Q2 집행내역" aria-label="조회 대상" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label="새로고침" title="새로고침"><RotateCw /></InputGroupButton>
            <InputGroupButton size="icon-xs" aria-label="내려받기" title="내려받기"><Download /></InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

export function SizeAndDisabled() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>size=&quot;xs&quot;(기본값) vs size=&quot;sm&quot;</div>
        <InputGroup>
          <InputGroupInput defaultValue="30,000" aria-label="약정총액" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="outline" size="xs">xs</InputGroupButton>
            <InputGroupButton variant="outline" size="sm">sm</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>disabled — 마감된 회계기간</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><InputGroupText>확정결산</InputGroupText></InputGroupAddon>
          <InputGroupInput defaultValue="2026-03-31 마감" aria-label="확정결산 기준일" disabled />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="default" size="sm" disabled>수정</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}
