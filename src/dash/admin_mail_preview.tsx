/* 관리자 화면 공용 메일 미리보기 다이얼로그 — 사용자관리(온보딩 안내·OTP 재등록 안내)·사용자 초대(운용사)(초대 메일) 공용.
   출처: S0_101 `mailFrame`·S0_103 `mail`. 제목/수신/발신 헤더 + 본문(pre-line). ⚠ 실제 발송 없음(목업) — 링크 토큰·인증 정보는 ●●●●●● 로만 표시. */
import { useRef } from 'react';
import { UI } from './components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';

const { Button, StatusBadge } = UI;

export interface MailSpec { subject: string; to: string; body: string; stamp?: '발송됨' | '예시' }
export const MAIL_FROM = 'no-reply@apfs.example (발신전용)';
export const MASKED_LINK = 'https://apfs.example/…?token=●●●●●●';

export function MailPreviewDialog({ title, mail, onClose, action }: {
  title: string;
  mail: MailSpec;
  onClose: () => void;
  action?: { label: string; onClick: () => void };
}) {
  const dlgRef = useRef<DialogHandle>(null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[720px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">메일 미리보기 — 실제로 발송되지 않는 시연용 목업</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <div className="rounded-[10px] border border-border overflow-hidden">
            <div className="bg-muted" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span><b>제목:</b> {mail.subject}</span>
                {mail.stamp && <StatusBadge tone={mail.stamp === '발송됨' ? 'success' : 'info'} label={mail.stamp} size="sm" dot={false} />}
              </div>
              <div className="text-caption" style={{ marginTop: 4 }}><b>받는사람:</b> {mail.to} · <b>발신:</b> {MAIL_FROM}</div>
            </div>
            <div style={{ padding: '14px 16px', fontSize: 12.5, lineHeight: 1.75, whiteSpace: 'pre-line' }}>{mail.body}</div>
          </div>
          <p className="text-caption m-0 mt-3" style={{ fontSize: 12, lineHeight: 1.5 }}>실제로 발송되지 않는 시연용 미리보기입니다(목업). QR·비밀번호·OTP·링크 토큰은 표시하지 않습니다.</p>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            {action && <Button variant="primary" size="sm" leadingIcon="check" onClick={action.onClick}>{action.label}</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
