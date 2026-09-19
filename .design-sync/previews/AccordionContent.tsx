import * as React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'apfs-dashboard-offline';

/* AccordionContent — Radix Content(높이 애니메이션 overflow-hidden) + 내부 pb-4 래퍼.
   기본 타이포는 text-sm/muted-foreground. 본문에 시맨틱 태그를 쓸 때는 preflight:false 라
   UA 마진이 살아 있으므로 margin:0 을 직접 지정한다. */

const wrap: React.CSSProperties = { maxWidth: 520, color: 'var(--foreground)' };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 4 };
const dl: React.CSSProperties = { display: 'grid', gridTemplateColumns: '92px 1fr', rowGap: 6, columnGap: 12, margin: 0, fontSize: 13 };
const dt: React.CSSProperties = { color: 'var(--caption)' };
const dd: React.CSSProperties = { margin: 0, color: 'var(--foreground)' };
const ul: React.CSSProperties = { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 };

export function SpecBody() {
  return (
    <div style={wrap}>
      <div style={cap}>정의 목록형 본문 — 자펀드 결성 명세</div>
      <Accordion type="single" collapsible defaultValue="spec">
        <AccordionItem value="spec">
          <AccordionTrigger>결성 조건 상세</AccordionTrigger>
          <AccordionContent>
            <dl style={dl}>
              <dt style={dt}>약정총액</dt><dd style={dd}>30,000 백만원</dd>
              <dt style={dt}>모태 출자</dt><dd style={dd}>18,000 백만원 (60.0%)</dd>
              <dt style={dt}>존속기간</dt><dd style={dd}>8년 (2026-06-10 ~ 2034-06-09)</dd>
              <dt style={dt}>관리보수</dt><dd style={dd}>연 2.0% (투자기간) / 연 1.0% (회수기간)</dd>
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function ListBody() {
  return (
    <div style={wrap}>
      <div style={cap}>목록형 본문 — UA 마진 제거(margin:0 · paddingLeft)</div>
      <Accordion type="single" collapsible defaultValue="docs">
        <AccordionItem value="docs">
          <AccordionTrigger>결성 등록 제출 서류</AccordionTrigger>
          <AccordionContent>
            <ul style={ul}>
              <li>조합 규약 사본 1부 (전자서명본 허용)</li>
              <li>결성총회 회의록 및 출자확약서</li>
              <li>대표 운용인력 경력 증빙</li>
              <li>수탁기관 계좌 확인서</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function TextBody() {
  return (
    <div style={wrap}>
      <div style={cap}>긴 문단 본문 — 기본 text-sm / muted-foreground</div>
      <Accordion type="single" collapsible defaultValue="p">
        <AccordionItem value="p">
          <AccordionTrigger>조기경보 해제 절차</AccordionTrigger>
          <AccordionContent>
            운용사가 개선계획을 제출하면 농금원이 30일 내 이행 여부를 점검하고, 재무건전성·보고지연 지표가 2개 분기
            연속 기준을 충족할 때 경보를 해제합니다. 해제 이후에도 1년간 관찰 등급으로 월간 모니터링을 유지합니다.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
