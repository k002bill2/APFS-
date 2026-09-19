import * as React from 'react';
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentDescription,
} from 'apfs-dashboard-offline';

/* AttachmentDescription — 보조 설명 슬롯(<p> 12px muted). state 로 앞쪽 상태 아이콘이 붙는다:
   idle(없음) · done(체크/success) · error(경고/danger) · uploading·processing(스피너, 회전).
   <p> 이지만 my-0 이 붙어 있어 preflight:false UA 마진 함정에서 자유롭다. */

const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };
const box: React.CSSProperties = { width: 360, color: 'var(--foreground)' };

const ROWS: Array<{ n: string; s: 'idle' | 'done' | 'uploading' | 'processing' | 'error'; d: string }> = [
  { n: '정기보고서_2026Q2.pdf', s: 'idle', d: 'PDF · 3.2MB (상태 표시 없음)' },
  { n: '자금집행내역.xlsx', s: 'done', d: '업로드 완료 · 2026-08-12' },
  { n: '조합규약_개정본.hwp', s: 'uploading', d: '업로드 중 · 64%' },
  { n: '감사보고서_일괄.zip', s: 'processing', d: '바이러스 검사 중' },
  { n: '계좌확인서.jpg', s: 'error', d: '용량 초과(20MB) — 재첨부 필요' },
];

export function StateAxis() {
  return (
    <div style={box}>
      <div style={cap}>state 5종 — idle · done · uploading · processing · error</div>
      <AttachmentGroup>
        {ROWS.map((r) => (
          <Attachment key={r.n} size="sm">
            <AttachmentMedia fileName={r.n} />
            <AttachmentContent>
              <AttachmentTitle>{r.n}</AttachmentTitle>
              <AttachmentDescription state={r.s}>{r.d}</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        ))}
      </AttachmentGroup>
    </div>
  );
}

export function ErrorState() {
  return (
    <div style={box}>
      <div style={cap}>오류 상태 — danger 색 경고 아이콘</div>
      <AttachmentGroup>
        <Attachment>
          <AttachmentMedia fileName="투자심의보고서.pdf" />
          <AttachmentContent>
            <AttachmentTitle>투자심의보고서.pdf</AttachmentTitle>
            <AttachmentDescription state="error">암호화된 파일이라 미리보기를 만들 수 없습니다</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}

export function MetaLine() {
  return (
    <div style={box}>
      <div style={cap}>메타 정보 라인 — 확장자 · 용량 · 제출일</div>
      <AttachmentGroup>
        <Attachment>
          <AttachmentMedia fileName="출자확약서_일괄.xlsx" />
          <AttachmentContent>
            <AttachmentTitle>출자확약서_일괄.xlsx</AttachmentTitle>
            <AttachmentDescription state="done">XLSX · 420KB · 2026-06-12 제출 · 검토 완료</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}
