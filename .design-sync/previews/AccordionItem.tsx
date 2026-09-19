import * as React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'apfs-dashboard-offline';

/* AccordionItem — Root 의 자식. value 로 식별되고 disabled 로 항목 단위 비활성이 가능하다.
   기본 룩에 구분선이 없으므로 항목 경계가 필요한 목록에서는 className 으로 border-b 를 준다. */

const wrap: React.CSSProperties = { maxWidth: 460, color: 'var(--foreground)' };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 4 };

export function ItemStates() {
  return (
    <div style={wrap}>
      <div style={cap}>항목 상태 — 펼침 / 접힘 / 비활성</div>
      <Accordion type="single" collapsible defaultValue="open">
        <AccordionItem value="open" className="border-b border-border">
          <AccordionTrigger>펼친 항목 — 출자 심의 결과</AccordionTrigger>
          <AccordionContent>2026년 1차 정시 출자 선정 · 배정액 180억원 · 결성 기한 2026-09-30.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="closed" className="border-b border-border">
          <AccordionTrigger>접힌 항목 — 투자심의 이력</AccordionTrigger>
          <AccordionContent>총 12건 심의 · 가결 9건 · 부결 3건.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="disabled" disabled className="border-b border-border">
          <AccordionTrigger>비활성 항목 — 청산 보고(미도래)</AccordionTrigger>
          <AccordionContent>존속기간 만료 후 열람할 수 있습니다.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function BorderedList() {
  const rows = [
    { v: 'q1', t: '2026년 1분기 정기보고', b: '제출 2026-05-14 · 검토 완료' },
    { v: 'q2', t: '2026년 2분기 정기보고', b: '제출 2026-08-12 · 검토 중' },
    { v: 'q3', t: '2026년 3분기 정기보고', b: '마감 2026-11-14 · 미제출' },
    { v: 'ad', t: '수시보고(중요사항 변경)', b: '대표 운용인력 변경 신고 1건' },
  ];
  return (
    <div style={wrap}>
      <div style={cap}>보고 이력 — 항목마다 구분선</div>
      <Accordion type="single" collapsible defaultValue="q2">
        {rows.map((r) => (
          <AccordionItem key={r.v} value={r.v} className="border-b border-border">
            <AccordionTrigger>{r.t}</AccordionTrigger>
            <AccordionContent>{r.b}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
