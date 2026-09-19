import * as React from 'react';
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction,
} from 'apfs-dashboard-offline';
import { Download, Eye, X, RotateCw } from 'lucide-react';

/* AttachmentActions — 행 오른쪽 끝 액션 묶음(shrink-0 · gap-0.5).
   shrink-0 이라 파일명이 아무리 길어도 버튼이 찌그러지지 않는다. */

const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };
const box: React.CSSProperties = { width: 400, color: 'var(--foreground)' };

export function ActionCounts() {
  return (
    <div style={box}>
      <div style={cap}>액션 1개 / 2개 / 3개</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="정기보고서_2026Q2.pdf" />
          <AttachmentContent><AttachmentTitle>정기보고서_2026Q2.pdf</AttachmentTitle></AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment size="sm">
          <AttachmentMedia fileName="자금집행내역.xlsx" />
          <AttachmentContent><AttachmentTitle>자금집행내역.xlsx</AttachmentTitle></AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="미리보기" title="미리보기"><Eye /></AttachmentAction>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment size="sm">
          <AttachmentMedia fileName="조합규약_최종.hwp" />
          <AttachmentContent><AttachmentTitle>조합규약_최종.hwp</AttachmentTitle></AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="미리보기" title="미리보기"><Eye /></AttachmentAction>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
            <AttachmentAction aria-label="첨부 해제" title="첨부 해제"><X /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function KeepsWidthOnLongName() {
  return (
    <div style={box}>
      <div style={cap}>긴 파일명에도 액션 영역은 shrink-0 로 폭 유지</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="농림수산식품모태펀드_2026년_1차_정시출자_선정결과_통보공문.pdf" />
          <AttachmentContent>
            <AttachmentTitle>농림수산식품모태펀드_2026년_1차_정시출자_선정결과_통보공문.pdf</AttachmentTitle>
            <AttachmentDescription state="done">PDF · 1.4MB</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="미리보기" title="미리보기"><Eye /></AttachmentAction>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
            <AttachmentAction aria-label="첨부 해제" title="첨부 해제"><X /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function RetryAction() {
  return (
    <div style={box}>
      <div style={cap}>오류 행의 재시도 액션</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="계좌확인서.jpg" />
          <AttachmentContent>
            <AttachmentTitle>계좌확인서.jpg</AttachmentTitle>
            <AttachmentDescription state="error">전송 실패 — 재시도하세요</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="재시도" title="재시도"><RotateCw /></AttachmentAction>
            <AttachmentAction aria-label="첨부 해제" title="첨부 해제"><X /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}
