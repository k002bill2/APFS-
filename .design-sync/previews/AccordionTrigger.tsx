import * as React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'apfs-dashboard-offline';

/* AccordionTrigger — Header 안의 Radix Trigger. 14px/font-medium·hover:underline·py-4,
   셰브런은 data-state=open 에서 180도 회전한다. items-start 라 두 줄 라벨에서도 셰브런이 첫 줄에 붙는다.
   포커스 링은 tokens.css 의 전역 :focus-visible 글로우가 담당한다(ring 유틸 미부착). */

const wrap: React.CSSProperties = { maxWidth: 440, color: 'var(--foreground)' };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 4 };

export function OpenAndClosed() {
  return (
    <div style={wrap}>
      <div style={cap}>셰브런 방향 — 열림(▲) / 접힘(▼)</div>
      <Accordion type="multiple" defaultValue={['open']}>
        <AccordionItem value="open" className="border-b border-border">
          <AccordionTrigger>열린 트리거 — 조기경보 산정 기준</AccordionTrigger>
          <AccordionContent>재무건전성·보고지연·의무투자 이행률·손실률 4개 축 가중 점수.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="closed" className="border-b border-border">
          <AccordionTrigger>접힌 트리거 — 등급별 조치 사항</AccordionTrigger>
          <AccordionContent>관찰 등급부터 월간 모니터링, 경고 등급은 현장 점검 대상.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function LongLabel() {
  return (
    <div style={wrap}>
      <div style={cap}>두 줄 라벨 — items-start 로 셰브런이 첫 줄에 정렬</div>
      <Accordion type="single" collapsible>
        <AccordionItem value="long">
          <AccordionTrigger>
            농림수산식품모태펀드 자펀드 결성 이후 의무투자 비율 산정 기준과 미이행 시 제재 절차는 어떻게 되나요?
          </AccordionTrigger>
          <AccordionContent>결성총액 기준 60% 이상, 결성일로부터 4년 내 충족. 미이행 시 관리보수 감액 대상.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={wrap}>
      <div style={cap}>비활성 트리거 — pointer-events 차단 + 흐림</div>
      <Accordion type="single" collapsible>
        <AccordionItem value="x" disabled>
          <AccordionTrigger>청산 정산 내역 (존속기간 만료 후 공개)</AccordionTrigger>
          <AccordionContent>해산 결의 후 열람할 수 있습니다.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
