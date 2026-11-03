/* 게시판관리(ADM-013) — 게시글 미리보기(읽기 전용). 출처: 게시판관리.html `openPreview`.
   목업 그대로 한 화면: 제목 · 메타(게시대상·게시기간·작성자) · 본문(없으면 '(본문 없음)') · 첨부.
   - 본문은 board_model.bodyParagraphs 의 문단 텍스트만 그린다(서식 없음) — 저장된 HTML 을 DOM 에 주입하지 않는다(XSS).
   - 첨부는 목업의 FILE 칩 대신 공용 Attachment 카드(표시 전용 — 다운로드 없음). 목업은 첫 파일 1건만 보였다.
   - 46px 패밀리 크롬(apfs-form-modal "모달 크롬"), 하단 [닫기]. */
import { useRef } from 'react';
import type { ReactNode } from 'react';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import { Attachment, AttachmentGroup, AttachmentMedia, AttachmentContent, AttachmentTitle } from '../../ui/attachment';
import { parseFileNames } from '../../fields/file_names';
import { bodyParagraphs } from './board_model';
import type { PostRow } from './board_data';

const { Button } = UI;

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return <span><b className="font-semibold text-foreground">{label}</b> {children}</span>;
}

export function BoardPreviewModal({ row, onClose }: { row: PostRow; onClose: () => void }) {
  const dlgRef = useRef<DialogHandle>(null);
  const paras = bodyParagraphs(row.body);
  const files = parseFileNames(row.file);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[720px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <DialogTitle>미리보기</DialogTitle>
          <DialogDescription className="sr-only">게시 화면에 보일 제목·게시대상·게시기간·작성자·본문·첨부</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <h3 className="text-lg font-bold" style={{ margin: 0, lineHeight: 1.4 }}>{row.title}</h3>
          <div className="flex flex-wrap text-muted-foreground border-b border-border" style={{ gap: '6px 18px', fontSize: 13, padding: '8px 0 12px' }}>
            <Meta label="게시대상">{row.aud.join(', ')}</Meta>
            <Meta label="게시기간"><span className="tabular">{row.from} ~ {row.to}</span></Meta>
            <Meta label="작성자">{row.writer}</Meta>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.8, padding: '16px 0' }}>
            {paras.length
              ? paras.map((t, i) => <p key={i} style={{ margin: 0 }}>{t}</p>)
              : <p className="text-caption" style={{ margin: 0 }}>(본문 없음)</p>}
          </div>
          {files.length > 0 && (
            <AttachmentGroup>
              {files.map((n, i) => (
                <Attachment key={n + i} size="sm" className="h-[34px] py-0" style={{ maxWidth: 420 }}>
                  <AttachmentMedia fileName={n} className="size-6" />
                  <AttachmentContent><AttachmentTitle>{n}</AttachmentTitle></AttachmentContent>
                </Attachment>
              ))}
            </AttachmentGroup>
          )}
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
