import * as React from 'react';
import { InputGroup, InputGroupTextarea, InputGroupAddon, InputGroupText, InputGroupButton } from 'apfs-dashboard-offline';

/* InputGroupTextarea — 여러 줄 입력. min-h-16 · resize-none · p-3 · border-0.
   부모 InputGroup 이 has-[textarea] 로 flex-col + items-stretch 로 바뀌므로
   애드온은 inline-start/end 대신 block-start / block-end 를 쓴다(위·아래 가로 띠). */

const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };
const box: React.CSSProperties = { width: 460 };

export function ReviewOpinion() {
  return (
    <div style={box}>
      <div style={cap}>투자심의 의견 — 상·하 애드온</div>
      <InputGroup>
        <InputGroupAddon align="block-start"><InputGroupText>심의 의견</InputGroupText></InputGroupAddon>
        <InputGroupTextarea
          aria-label="심의 의견"
          defaultValue={'의무투자 이행률이 기준(60%)을 상회하며 운용 이력도 충분함.'}
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>심사1팀 · 2026-09-15</InputGroupText>
          <InputGroupButton variant="default" size="sm" className="ml-auto">등록</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

export function PlaceholderOnly() {
  return (
    <div style={box}>
      <div style={cap}>빈 상태 — placeholder 만</div>
      <InputGroup>
        <InputGroupTextarea placeholder="수시보고 사유를 입력하세요 (중요사항 변경·소송·대표 운용인력 교체 등)" aria-label="수시보고 사유" />
      </InputGroup>
    </div>
  );
}

export function WithFooterOnly() {
  return (
    <div style={box}>
      <div style={cap}>하단 애드온만 — 글자수 카운터 + 액션</div>
      <InputGroup>
        <InputGroupTextarea
          aria-label="조기경보 개선계획 요약"
          defaultValue="재무건전성 지표 개선을 위해 2026년 4분기까지 자본 확충 20억원을 완료하고, 지연된 분기보고 2건을 10월 내 제출한다."
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>78 / 500자</InputGroupText>
          <InputGroupButton variant="outline" size="sm" className="ml-auto">임시저장</InputGroupButton>
          <InputGroupButton variant="default" size="sm">제출</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
