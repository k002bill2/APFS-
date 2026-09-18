import * as React from 'react';
import {
  Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent,
  AttachmentTitle, AttachmentDescription,
} from 'apfs-dashboard-offline';
import { Paperclip } from 'lucide-react';

/* AttachmentMedia — 36px 정사각 썸네일 슬롯. children 이 없으면 fileName 확장자로 아이콘·색을 자동 선택한다
   (glyphFor: pdf=danger, xls/xlsx/csv=success, doc/docx/hwp/txt=info, 이미지=secondary, zip=warning, 그 외=muted).
   children 을 주면 그 내용이 그대로 들어간다(커스텀 아이콘·미리보기 이미지). */

const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };
const box: React.CSSProperties = { width: 340, color: 'var(--foreground)' };

const EXTS = [
  { n: '투자심의보고서.pdf', d: 'PDF — danger 톤' },
  { n: '자금집행내역.xlsx', d: 'XLSX — success 톤' },
  { n: '조합규약.hwp', d: 'HWP — info 톤' },
  { n: '현장실사_사진.png', d: 'PNG — secondary 톤' },
  { n: '감사보고서_일괄.zip', d: 'ZIP — warning 톤' },
  { n: '수신자료.dat', d: '미지정 확장자 — muted 톤' },
];

export function ExtensionGlyphs() {
  return (
    <div style={box}>
      <div style={cap}>확장자별 자동 아이콘·색</div>
      <AttachmentGroup>
        {EXTS.map((f) => (
          <Attachment key={f.n} size="sm">
            <AttachmentMedia fileName={f.n} />
            <AttachmentContent>
              <AttachmentTitle>{f.n}</AttachmentTitle>
              <AttachmentDescription>{f.d}</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        ))}
      </AttachmentGroup>
    </div>
  );
}

export function CustomMedia() {
  return (
    <div style={box}>
      <div style={cap}>children 직접 지정 — 커스텀 아이콘 / 텍스트 배지</div>
      <AttachmentGroup>
        <Attachment size="sm">
          <AttachmentMedia><Paperclip style={{ color: 'var(--primary)' }} /></AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>외부 링크 자료</AttachmentTitle>
            <AttachmentDescription>확장자 없는 첨부에 커스텀 아이콘</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
        <Attachment size="sm">
          <AttachmentMedia>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)' }}>DART</span>
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>전자공시 연계 자료</AttachmentTitle>
            <AttachmentDescription>출처 배지를 썸네일 자리에 표기</AttachmentDescription>
          </AttachmentContent>
        </Attachment>
      </AttachmentGroup>
    </div>
  );
}
