import * as React from 'react';
import { Alert, AlertTitle, AlertDescription } from 'apfs-dashboard-offline';
import { Info, TriangleAlert } from 'lucide-react';

/* AlertDescription — 배너 본문 슬롯(div, text-muted-foreground · [&_p]:leading-relaxed).
   내부에 ul/p 같은 시맨틱 태그를 쓸 때는 preflight:false 라 UA 마진이 살아 있으므로
   margin:0(+ ul 은 paddingLeft)을 직접 준다. */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 620 };
const p: React.CSSProperties = { margin: 0 };
const ul: React.CSSProperties = { margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 };

export function ListDescription() {
  return (
    <div style={{ maxWidth: 620 }}>
      <Alert variant="warning">
        <TriangleAlert />
        <AlertTitle>결성 등록 전 확인 항목</AlertTitle>
        <AlertDescription>
          <ul style={ul}>
            <li>조합 규약 사본 — 미첨부</li>
            <li>결성총회 회의록 — 첨부됨 (2026-06-12)</li>
            <li>수탁기관 계좌 확인서 — 미첨부</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function ParagraphDescription() {
  return (
    <div style={col}>
      <Alert variant="info">
        <Info />
        <AlertTitle>정기보고 검토 절차</AlertTitle>
        <AlertDescription>
          <p style={p}>
            운용사가 제출한 분기보고는 담당자 1차 검토 후 팀장 승인을 거쳐 확정됩니다. 확정 이후에는 수정 요청을
            통해서만 값이 변경되며, 변경 이력은 감사로그에 남습니다.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function PlainDescription() {
  return (
    <div style={col}>
      <Alert variant="default">
        <Info />
        <AlertDescription>아이콘과 설명만으로도 성립합니다 — 제목 없는 보조 안내 배너.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <AlertDescription>모태펀드 집행률 78.0% · 목표 80% 대비 1.4%p 상승.</AlertDescription>
      </Alert>
    </div>
  );
}
