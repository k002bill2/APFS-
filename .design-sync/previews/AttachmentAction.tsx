import * as React from 'react';
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction,
} from 'apfs-dashboard-offline';
import { Download, Eye, X, RotateCw, Upload } from 'lucide-react';

/* AttachmentAction — 28px 정사각 아이콘 버튼(type=button 기본).
   ⚠ bg-transparent 가 클래스에 박혀 있다 — preflight:false 라 이게 없으면 UA 기본 회색 버튼면이 드러난다.
   hover 시 bg-muted + text-foreground, disabled 는 pointer-events 차단 + 흐림. */

const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };
const box: React.CSSProperties = { width: 380, color: 'var(--foreground)' };

export function IconVariants() {
  return (
    <div style={box}>
      <div style={cap}>아이콘별 액션 — 미리보기 · 내려받기 · 재시도 · 해제</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="투자심의보고서.pdf" />
          <AttachmentContent><AttachmentTitle>투자심의보고서.pdf</AttachmentTitle></AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="미리보기" title="미리보기"><Eye /></AttachmentAction>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
            <AttachmentAction aria-label="재시도" title="재시도"><RotateCw /></AttachmentAction>
            <AttachmentAction aria-label="첨부 해제" title="첨부 해제"><X /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function DisabledAction() {
  return (
    <div style={box}>
      <div style={cap}>비활성 액션 — 마감된 보고는 해제 불가</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="확정결산_2026Q1.xlsx" />
          <AttachmentContent>
            <AttachmentTitle>확정결산_2026Q1.xlsx</AttachmentTitle>
            <AttachmentDescription state="done">마감 완료 · 수정 불가</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="내려받기" title="내려받기"><Download /></AttachmentAction>
            <AttachmentAction aria-label="첨부 해제" title="마감되어 해제할 수 없습니다" disabled><X /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function SingleAction() {
  return (
    <div style={box}>
      <div style={cap}>단일 액션 — 재업로드</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia fileName="수탁기관_계좌확인서.png" />
          <AttachmentContent>
            <AttachmentTitle>수탁기관_계좌확인서.png</AttachmentTitle>
            <AttachmentDescription state="error">계좌 정보 불일치 — 재제출 필요</AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction aria-label="재업로드" title="재업로드"><Upload /></AttachmentAction>
          </AttachmentActions>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}
