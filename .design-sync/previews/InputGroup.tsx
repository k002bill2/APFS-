import * as React from 'react';
import {
  InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon, InputGroupText, InputGroupButton,
} from 'apfs-dashboard-offline';
import { Search, Calculator } from 'lucide-react';

/* InputGroup — 입력 컨트롤 + 애드온을 한 테두리 안에 묶는 컨테이너.
   테두리는 컨테이너가 소유하고 내부 input 은 border-0. 컨트롤 높이 38px(APFS 폼 표준).
   애드온 배치는 align prop 의 order 로 결정된다: inline-start(1) · control(2) · inline-end(3) · block-end(4).
   textarea 가 들어오면 has-[textarea] 로 세로 스택(flex-col)으로 바뀐다. */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 420 };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function SearchWithButton() {
  return (
    <div style={{ width: 420 }}>
      <div style={cap}>자펀드·운용사 검색 — 앞 아이콘 + 뒤 버튼</div>
      <InputGroup>
        <InputGroupAddon align="inline-start"><Search /></InputGroupAddon>
        <InputGroupInput placeholder="자펀드·운용사 검색" aria-label="자펀드·운용사 검색" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton variant="default" size="sm">검색</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function UnitAndPrefix() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>단위 접미 — 약정총액</div>
        <InputGroup>
          <InputGroupInput defaultValue="30,000" aria-label="약정총액" />
          <InputGroupAddon align="inline-end"><InputGroupText>백만원</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>접두 라벨 — 의무투자 비율</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><InputGroupText>최소</InputGroupText></InputGroupAddon>
          <InputGroupInput defaultValue="60.0" aria-label="의무투자 비율" />
          <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>아이콘 + 단위 + 보조 버튼</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><Calculator /></InputGroupAddon>
          <InputGroupInput defaultValue="18,000" aria-label="모태 출자액" />
          <InputGroupAddon align="inline-end">
            <InputGroupText>백만원</InputGroupText>
            <InputGroupButton variant="outline" size="sm">자동계산</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

export function WithTextarea() {
  return (
    <div style={{ width: 460 }}>
      <div style={cap}>textarea — block-start / block-end 애드온으로 세로 스택</div>
      <InputGroup>
        <InputGroupAddon align="block-start"><InputGroupText>심의 의견</InputGroupText></InputGroupAddon>
        <InputGroupTextarea
          aria-label="심의 의견"
          defaultValue={'농식품 분야 의무투자 이행률이 기준을 상회하고 운용 이력도 충분함.'}
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>작성자 · 심사1팀</InputGroupText>
          <InputGroupButton variant="default" size="sm" className="ml-auto">저장</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function DisabledState() {
  return (
    <div style={{ width: 420 }}>
      <div style={cap}>비활성 — 마감된 회계기간은 입력 잠금</div>
      <InputGroup>
        <InputGroupAddon align="inline-start"><InputGroupText>확정결산</InputGroupText></InputGroupAddon>
        <InputGroupInput defaultValue="2026-03-31 마감" aria-label="확정결산 기준일" disabled />
        <InputGroupAddon align="inline-end">
          <InputGroupButton variant="outline" size="sm" disabled>수정</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
