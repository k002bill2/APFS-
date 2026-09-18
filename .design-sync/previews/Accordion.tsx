import * as React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from 'apfs-dashboard-offline';

/* Accordion — Radix Root. type="single"+collapsible(한 번에 하나) 또는 type="multiple".
   APFS 적응: 항목 간 구분선 없음(필요하면 소비처에서 AccordionItem 에 border-b 를 준다).
   트리거는 items-start 라 두 줄 라벨도 셰브런이 첫 줄에 정렬된다. */

const wrap: React.CSSProperties = { maxWidth: 520, color: 'var(--foreground)' };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 4 };

export function SubFundSpecFaq() {
  return (
    <div style={wrap}>
      <div style={cap}>자펀드 명세 · 자주 묻는 질문</div>
      <Accordion type="single" collapsible defaultValue="terms">
        <AccordionItem value="terms">
          <AccordionTrigger>모태펀드 출자 조건은 어떻게 확인하나요?</AccordionTrigger>
          <AccordionContent>
            출자비율·존속기간·투자의무 비율은 자펀드 명세 팝업의 「결성 조건」 절에 표시됩니다. 농식품 분야 의무투자
            비율은 결성총액의 60% 이상이며, 결성일로부터 4년 내 충족해야 합니다.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="report">
          <AccordionTrigger>정기보고 주기는 어떻게 되나요?</AccordionTrigger>
          <AccordionContent>
            분기 정기보고(분기 종료 후 45일) + 수시보고입니다. 마감 임박 건은 일정·알림 위젯에 D-7 부터 노출됩니다.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="alert">
          <AccordionTrigger>조기경보 등급은 무엇을 근거로 산정하나요?</AccordionTrigger>
          <AccordionContent>
            운용사 재무건전성·보고 지연·의무투자 이행률·손실률 4개 축의 가중 점수로 정상·관찰·주의·경고를 부여합니다.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function MultipleOpen() {
  return (
    <div style={wrap}>
      <div style={cap}>type=&quot;multiple&quot; — 여러 항목 동시 펼침</div>
      <Accordion type="multiple" defaultValue={['fund', 'gp']}>
        <AccordionItem value="fund">
          <AccordionTrigger>결성 개요</AccordionTrigger>
          <AccordionContent>약정총액 300억원 · 모태 출자 180억원(60%) · 존속기간 8년 · 결성일 2026-06-10.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="gp">
          <AccordionTrigger>운용사 정보</AccordionTrigger>
          <AccordionContent>어니스트벤처스(주) · 대표 운용인력 3인 · 동일 분야 운용 이력 5개 조합.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function WithDividers() {
  return (
    <div style={wrap}>
      <div style={cap}>구분선 옵션 — AccordionItem 에 border-b 부여</div>
      <Accordion type="single" collapsible defaultValue="a">
        <AccordionItem value="a" className="border-b border-border">
          <AccordionTrigger>의무투자 이행 현황</AccordionTrigger>
          <AccordionContent>농식품 분야 68.4% 이행(목표 60%) · 잔여 의무 없음.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b" className="border-b border-border">
          <AccordionTrigger>회계 마감 상태</AccordionTrigger>
          <AccordionContent>2026년 2분기 가결산 완료 · 확정 결산 미제출.</AccordionContent>
        </AccordionItem>
        <AccordionItem value="c" className="border-b border-border">
          <AccordionTrigger>자금 집행 내역</AccordionTrigger>
          <AccordionContent>캐피탈콜 3차까지 집행(누적 210억원) · 4차 예정 2026-10.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
