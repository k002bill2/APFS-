import * as React from 'react';
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupText, InputGroupButton } from 'apfs-dashboard-offline';
import { Search } from 'lucide-react';

/* InputGroupInput — 그룹 내부의 <input>. 높이 38px · border-0 · bg-transparent · outline-none.
   테두리와 포커스 링은 부모 InputGroup 의 focus-within 이 담당한다(입력 자체는 선을 그리지 않는다).
   order-2 라 애드온 배치와 무관하게 항상 가운데에 놓인다. */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 420 };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function PlaceholderAndValue() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>placeholder — text-caption 색</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><Search /></InputGroupAddon>
          <InputGroupInput placeholder="운용사명 또는 사업자번호" aria-label="운용사 검색" />
        </InputGroup>
      </div>
      <div>
        <div style={cap}>값 입력 상태 — text-foreground</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><Search /></InputGroupAddon>
          <InputGroupInput defaultValue="어니스트벤처스(주)" aria-label="운용사 검색" />
        </InputGroup>
      </div>
    </div>
  );
}

export function NumericInput() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>금액 입력 — 우측 단위 애드온과 조합</div>
        <InputGroup>
          <InputGroupInput defaultValue="30,000" aria-label="약정총액" />
          <InputGroupAddon align="inline-end"><InputGroupText>백만원</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>기간 입력 — 좌우 애드온 사이</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><InputGroupText>존속</InputGroupText></InputGroupAddon>
          <InputGroupInput defaultValue="8" aria-label="존속기간" />
          <InputGroupAddon align="inline-end"><InputGroupText>년</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

export function DisabledInput() {
  return (
    <div style={{ width: 420 }}>
      <div style={cap}>disabled — 커서 차단 + 흐림</div>
      <InputGroup>
        <InputGroupAddon align="inline-start"><InputGroupText>펀드코드</InputGroupText></InputGroupAddon>
        <InputGroupInput defaultValue="AFF-2026-013" aria-label="펀드코드" disabled />
        <InputGroupAddon align="inline-end"><InputGroupButton size="sm" disabled>변경</InputGroupButton></InputGroupAddon>
      </InputGroup>
    </div>
  );
}
