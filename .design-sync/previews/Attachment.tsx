import * as React from 'react';
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction,
} from 'apfs-dashboard-offline';
import { Download, X } from 'lucide-react';

/* Attachment — 표시 전용 첨부 행(root). size: default | sm, orientation: horizontal | vertical.
   업로드 로직은 없다(FilePond 담당) — "이미 첨부된 파일을 상태·아이콘·액션과 함께 보여주는" 역할.
   제목에 말줄임(text-overflow)이 걸려 있어 부모 폭이 필요하다(프리뷰는 인라인 width 로 고정). */

const box: React.CSSProperties = { width: 400, color: 'var(--foreground)' };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function InvestmentReviewFiles() {
  return (
    <div style={box}>
      <div style={cap}>투자심의보고 첨부파일</div>
      <AttachmentGroup>
        <Attachment>
          <AttachmentMedia fileName="투자심의보고서_상주어니스트.pdf" />
          <AttachmentContent>
            <AttachmentTitle>투자심의보고서_상주어니스트.pdf</AttachmentTitle>
            <AttachmentDescription state="done">PDF · 2.4MB · 업로드됨</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
            <AttachmentAction aria-label="첨부 해제" title="첨부 해제"><X /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment>
          <AttachmentMedia fileName="재무실사표_2026Q2.xlsx" />
          <AttachmentContent>
            <AttachmentTitle>재무실사표_2026Q2.xlsx</AttachmentTitle>
            <AttachmentDescription state="done">XLSX · 860KB · 업로드됨</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
            <AttachmentAction aria-label="첨부 해제" title="첨부 해제"><X /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function SizeSm() {
  return (
    <div style={box}>
      <div style={cap}>size=&quot;sm&quot; — 모달 내 기존 첨부 목록(DocumentsField)</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="조합규약.hwp" />
          <AttachmentContent>
            <AttachmentTitle>조합규약.hwp</AttachmentTitle>
            <AttachmentDescription state="done">HWP · 업로드됨</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
        <Attachment size="sm">
          <AttachmentMedia fileName="결성총회_회의록.docx" />
          <AttachmentContent>
            <AttachmentTitle>결성총회_회의록.docx</AttachmentTitle>
            <AttachmentDescription state="done">DOCX · 업로드됨</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function OrientationVertical() {
  return (
    <div style={{ width: 240, color: 'var(--foreground)' }}>
      <div style={cap}>orientation=&quot;vertical&quot; — 카드형 배치</div>
      <Attachment orientation="vertical">
        <AttachmentMedia fileName="현장실사_사진.png" />
        <AttachmentContent>
          <AttachmentTitle>현장실사_사진.png</AttachmentTitle>
          <AttachmentDescription state="done">PNG · 1.1MB</AttachmentDescription>
        </AttachmentContent>
        <AttachmentActions>
          <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
          <AttachmentAction aria-label="첨부 해제" title="첨부 해제"><X /></AttachmentAction>
        </AttachmentActions>
      </Attachment>
    </div>
  );
}

export function UploadStates() {
  return (
    <div style={box}>
      <div style={cap}>state 축 — done · uploading · processing · error</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="분기보고서_2026Q2.pdf" />
          <AttachmentContent>
            <AttachmentTitle>분기보고서_2026Q2.pdf</AttachmentTitle>
            <AttachmentDescription state="done">업로드 완료</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
        <Attachment size="sm">
          <AttachmentMedia fileName="자금집행내역.xlsx" />
          <AttachmentContent>
            <AttachmentTitle>자금집행내역.xlsx</AttachmentTitle>
            <AttachmentDescription state="uploading">업로드 중 · 64%</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
        <Attachment size="sm">
          <AttachmentMedia fileName="감사보고서.zip" />
          <AttachmentContent>
            <AttachmentTitle>감사보고서.zip</AttachmentTitle>
            <AttachmentDescription state="processing">바이러스 검사 중</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
        <Attachment size="sm">
          <AttachmentMedia fileName="계좌확인서.jpg" />
          <AttachmentContent>
            <AttachmentTitle>계좌확인서.jpg</AttachmentTitle>
            <AttachmentDescription state="error">용량 초과(20MB) — 재첨부 필요</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}
