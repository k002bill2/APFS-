import * as React from 'react';
import {
  InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon, InputGroupText, InputGroupButton,
} from 'apfs-dashboard-offline';
import { Search, Calculator } from 'lucide-react';

/* InputGroupAddon — align 축이 전부다:
   inline-start(order-1, pl-3) · inline-end(order-3, pr-3) · block-start(order-1, 아래 구분선 + 전체폭)
   · block-end(order-4, 위 구분선 + 전체폭). 내부 svg 는 size-4 로 강제되고 색은 muted-foreground. */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 440 };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function InlineAlign() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>inline-start — 앞쪽 아이콘</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><Search /></InputGroupAddon>
          <InputGroupInput placeholder="자펀드 검색" aria-label="자펀드 검색" />
        </InputGroup>
      </div>
      <div>
        <div style={cap}>inline-end — 뒤쪽 단위</div>
        <InputGroup>
          <InputGroupInput defaultValue="30,000" aria-label="약정총액" />
          <InputGroupAddon align="inline-end"><InputGroupText>백만원</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>양쪽 — 아이콘 + 버튼</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><Calculator /></InputGroupAddon>
          <InputGroupInput defaultValue="18,000" aria-label="모태 출자액" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton variant="default" size="sm">계산</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

export function BlockAlign() {
  return (
    <div style={{ width: 460 }}>
      <div style={cap}>block-start / block-end — 구분선이 있는 전체폭 띠</div>
      <InputGroup>
        <InputGroupAddon align="block-start"><InputGroupText>운용사 회신</InputGroupText></InputGroupAddon>
        <InputGroupTextarea
          aria-label="운용사 회신"
          defaultValue={'지적하신 계좌 확인서는 수탁기관 재발급 후 2026-09-20 까지 재제출하겠습니다.'}
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>어니스트벤처스(주)</InputGroupText>
          <InputGroupButton variant="default" size="sm" className="ml-auto">회신 등록</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function MultipleInOneAddon() {
  return (
    <div style={{ width: 460 }}>
      <div style={cap}>한 애드온에 여러 요소 — 단위 + 버튼</div>
      <InputGroup>
        <InputGroupAddon align="inline-start"><InputGroupText>최소</InputGroupText></InputGroupAddon>
        <InputGroupInput defaultValue="60.0" aria-label="의무투자 비율" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>%</InputGroupText>
          <InputGroupButton variant="outline" size="sm">기준 보기</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
