import * as React from 'react';
import { Alert, AlertTitle, AlertDescription } from 'apfs-dashboard-offline';
import { CircleCheck, TriangleAlert, Info } from 'lucide-react';

/* AlertTitle — 배너 제목 슬롯(div, font-semibold·leading-snug·mb-1·text-foreground).
   설명 없이 제목만 쓰는 1줄 배너도 성립한다. 헤딩 태그가 아니므로 UA 마진 함정이 없다. */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 600 };

export function TitleOnly() {
  return (
    <div style={col}>
      <Alert variant="success">
        <CircleCheck />
        <AlertTitle>자펀드 명세 저장이 완료되었습니다.</AlertTitle>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>미제출 정기보고 3건이 있습니다.</AlertTitle>
      </Alert>
      <Alert variant="info">
        <Info />
        <AlertTitle>회계 마감 기간에는 수정이 제한됩니다.</AlertTitle>
      </Alert>
    </div>
  );
}

export function TitleWithDescription() {
  return (
    <div style={{ maxWidth: 600 }}>
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>의무투자 이행률 점검 필요</AlertTitle>
        <AlertDescription>
          농식품 분야 의무투자 이행률이 52.3% 로 기준(60%)에 미달합니다. 잔여 기한은 2027-06-09 까지입니다.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function LongTitle() {
  return (
    <div style={{ maxWidth: 420 }}>
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertTitle>수탁기관 계좌 정보가 일치하지 않아 캐피탈콜 지급이 보류되었습니다</AlertTitle>
        <AlertDescription>운용사에 계좌 확인서 재제출을 요청하세요.</AlertDescription>
      </Alert>
    </div>
  );
}
