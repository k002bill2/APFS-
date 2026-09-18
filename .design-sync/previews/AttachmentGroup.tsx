import * as React from 'react';
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction,
} from 'apfs-dashboard-offline';
import { Download, X } from 'lucide-react';

/* AttachmentGroup — role="list" 래퍼. orientation 기본값은 "vertical"(flex-col),
   "horizontal" 은 flex-wrap 으로 칩처럼 줄바꿈된다. 자식 Attachment 는 role="listitem". */

const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

const DOCS = [
  { n: '조합규약_최종.pdf', d: 'PDF · 1.8MB' },
  { n: '출자확약서_일괄.xlsx', d: 'XLSX · 420KB' },
  { n: '운용인력_경력증빙.hwpx', d: 'HWPX · 310KB' },
  { n: '수탁기관_계좌확인서.png', d: 'PNG · 740KB' },
];

export function FormationDocs() {
  return (
    <div style={{ width: 460, color: 'var(--foreground)' }}>
      <div style={cap}>결성 등록 제출 서류 ({DOCS.length}) — 세로 목록(기본값)</div>
      <AttachmentGroup>
        {DOCS.map((f) => (
          <Attachment key={f.n} size="sm">
            <AttachmentMedia fileName={f.n} />
            <AttachmentContent>
              <AttachmentTitle>{f.n}</AttachmentTitle>
              <AttachmentDescription state="done">{f.d} · 업로드됨</AttachmentDescription>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction aria-label={`${f.n} 내려받기`} title="내려받기"><Download /></AttachmentAction>
              <AttachmentAction aria-label={`${f.n} 첨부 해제`} title="첨부 해제"><X /></AttachmentAction>
            </AttachmentActions>
          </Attachment>
        ))}
      </AttachmentGroup>
    </div>
  );
}

export function HorizontalWrap() {
  return (
    <div style={{ width: 640, color: 'var(--foreground)' }}>
      <div style={cap}>orientation=&quot;horizontal&quot; — 첨부 칩 줄바꿈 배치</div>
      <AttachmentGroup orientation="horizontal">
        {DOCS.map((f) => (
          <Attachment key={f.n} size="sm" style={{ width: 300 }}>
            <AttachmentMedia fileName={f.n} />
            <AttachmentContent>
              <AttachmentTitle>{f.n}</AttachmentTitle>
              <AttachmentDescription state="done">{f.d}</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        ))}
      </AttachmentGroup>
    </div>
  );
}

export function SingleFile() {
  return (
    <div style={{ width: 400, color: 'var(--foreground)' }}>
      <div style={cap}>첨부 1건 — 목록 래퍼는 그대로 유지</div>
      <AttachmentGroup>
        <Attachment>
          <AttachmentMedia fileName="조기경보_개선계획서.pdf" />
          <AttachmentContent>
            <AttachmentTitle>조기경보_개선계획서.pdf</AttachmentTitle>
            <AttachmentDescription state="done">PDF · 980KB · 2026-09-12 제출</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}
