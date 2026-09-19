import * as React from 'react';
import { Alert, AlertTitle, AlertDescription } from 'apfs-dashboard-offline';
import { Bell, Info, CircleCheck, TriangleAlert, ShieldAlert } from 'lucide-react';

/* Alert — 인라인 콜아웃 배너. variant: default · info · success · warning · destructive.
   아이콘은 반드시 Alert 의 직계 자식 <svg> 여야 한다([&>svg]:absolute · [&:has(>svg)]:pl-11). 래퍼 금지.
   색은 -soft 배경 + 솔리드 전경 토큰 + color-mix 테두리(opacity 모디파이어 미사용). */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620 };

export function Variants() {
  return (
    <div style={col}>
      <Alert variant="default">
        <Bell />
        <AlertTitle>공지</AlertTitle>
        <AlertDescription>2026년 2차 정시 출자 공고가 9월 30일 게시됩니다.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info />
        <AlertTitle>검토 진행 중</AlertTitle>
        <AlertDescription>2분기 정기보고 3건이 담당자 검토 대기 상태입니다.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CircleCheck />
        <AlertTitle>결성 등록 완료</AlertTitle>
        <AlertDescription>상주-어니스트 애그테크 투자조합이 자펀드 목록에 반영되었습니다.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>필수 항목 누락</AlertTitle>
        <AlertDescription>결성일·약정총액을 입력해야 저장할 수 있습니다.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertTitle>조기경보 발령</AlertTitle>
        <AlertDescription>운용사 2개사가 보고 지연 60일을 초과했습니다. 현장 점검 대상입니다.</AlertDescription>
      </Alert>
    </div>
  );
}

export function NoIcon() {
  return (
    <div style={col}>
      <Alert variant="info">
        <AlertTitle>아이콘 없는 배너</AlertTitle>
        <AlertDescription>아이콘을 넣지 않으면 왼쪽 패딩이 기본값(px-4)으로 돌아갑니다.</AlertDescription>
      </Alert>
      <Alert variant="default">
        <AlertTitle>마감 안내</AlertTitle>
        <AlertDescription>3분기 정기보고 마감은 2026-11-14 입니다.</AlertDescription>
      </Alert>
    </div>
  );
}

export function FormValidationSummary() {
  const errs = [
    '운용사: 선택되지 않았습니다.',
    '약정총액: 숫자만 입력할 수 있습니다.',
    '결성일: 출자 승인일보다 이전일 수 없습니다.',
  ];
  return (
    <div style={{ maxWidth: 620 }}>
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>입력값 3건을 확인해 주세요</AlertTitle>
        <AlertDescription>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {errs.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
