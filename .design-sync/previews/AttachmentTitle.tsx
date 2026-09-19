import * as React from 'react';
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentDescription,
} from 'apfs-dashboard-offline';

/* AttachmentTitle — 파일명 슬롯(13px · font-medium · leading-snug · text-foreground).
   말줄임이 걸려 있으므로 항상 폭이 제한된 부모 안에서 쓴다. 한 줄 고정이다(줄바꿈 없음). */

const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function FileNames() {
  const names = ['조합규약_최종.pdf', '자금집행내역_2026Q3.xlsx', '운용인력_경력증빙.hwpx'];
  return (
    <div style={{ width: 340, color: 'var(--foreground)' }}>
      <div style={cap}>일반 길이 파일명</div>
      <AttachmentGroup>
        {names.map((n) => (
          <Attachment key={n} size="sm">
            <AttachmentMedia fileName={n} />
            <AttachmentContent><AttachmentTitle>{n}</AttachmentTitle></AttachmentContent>
          </Attachment>
        ))}
      </AttachmentGroup>
    </div>
  );
}

export function NarrowEllipsis() {
  const n = '농식품_벤처투자조합_1호_결성총회_회의록_서명본.pdf';
  return (
    <div style={{ width: 240, color: 'var(--foreground)' }}>
      <div style={cap}>좁은 폭 — 넘치는 파일명은 말줄임</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName={n} />
          <AttachmentContent>
            <AttachmentTitle>{n}</AttachmentTitle>
            <AttachmentDescription state="done">PDF · 2.1MB</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function WithDescription() {
  return (
    <div style={{ width: 340, color: 'var(--foreground)' }}>
      <div style={cap}>제목 + 설명 대비 — 13px/medium vs 12px/muted</div>
      <AttachmentGroup>
        <Attachment>
          <AttachmentMedia fileName="조기경보_개선계획서.pdf" />
          <AttachmentContent>
            <AttachmentTitle>조기경보_개선계획서.pdf</AttachmentTitle>
            <AttachmentDescription state="done">PDF · 980KB · 검토 완료</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}
