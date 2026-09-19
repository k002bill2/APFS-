import * as React from 'react';
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction,
} from 'apfs-dashboard-offline';
import { Download } from 'lucide-react';

/* AttachmentContent — 제목·설명을 담는 가운데 영역(min-w-0 flex-1 flex-col gap-0.5).
   min-w-0 이 핵심이다 — 이게 없으면 긴 파일명이 flex 행을 밀어내 액션 버튼이 잘린다. */

const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };
const box: React.CSSProperties = { width: 360, color: 'var(--foreground)' };

export function TitleAndDescription() {
  return (
    <div style={box}>
      <div style={cap}>제목 + 설명 2줄 구성</div>
      <AttachmentGroup>
        <Attachment>
          <AttachmentMedia fileName="2026년_2분기_정기보고.pdf" />
          <AttachmentContent>
            <AttachmentTitle>2026년_2분기_정기보고.pdf</AttachmentTitle>
            <AttachmentDescription state="done">PDF · 3.2MB · 2026-08-12 제출</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function LongFileName() {
  return (
    <div style={box}>
      <div style={cap}>긴 파일명 — min-w-0 로 말줄임 처리, 액션 버튼은 보존</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="농림수산식품모태펀드_2026년_1차_정시출자_선정결과_통보공문_최종본.pdf" />
          <AttachmentContent>
            <AttachmentTitle>농림수산식품모태펀드_2026년_1차_정시출자_선정결과_통보공문_최종본.pdf</AttachmentTitle>
            <AttachmentDescription state="done">PDF · 1.4MB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function TitleOnly() {
  return (
    <div style={box}>
      <div style={cap}>제목만 — 설명 생략 시 1줄 높이</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="출자확약서.pdf" />
          <AttachmentContent><AttachmentTitle>출자확약서.pdf</AttachmentTitle></AttachmentContent>
        </Attachment>
        <Attachment size="sm">
          <AttachmentMedia fileName="사업자등록증.jpg" />
          <AttachmentContent><AttachmentTitle>사업자등록증.jpg</AttachmentTitle></AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}
