/* shadcn/ui Attachment — 표시 전용(display-only)으로 적응 이식. 정본은 채팅 composer용
   업로드 상태 컴포넌트지만, 여기서는 "이미 첨부된 파일을 상태·아이콘·액션과 함께 표시"하는
   부분만 떼어 APFS 토큰으로 재작성했다(업로드 로직 없음 — 그건 FilePond가 담당).
   APFS 규약: bg-card/border-border/rounded-card 토큰, opacity 모디파이어 미사용, shadcn ring 없음.
   파트: Attachment(root) · AttachmentGroup · AttachmentMedia · AttachmentContent
        · AttachmentTitle · AttachmentDescription · AttachmentActions · AttachmentAction. */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { File, FileText, FileSpreadsheet, FileImage, FileArchive, Check, TriangleAlert, LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AttachmentState = 'idle' | 'uploading' | 'processing' | 'error' | 'done';

/* 파일명 확장자 → 아이콘 + 색 토큰 매핑 */
function glyphFor(name = '') {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return { Icon: FileText, cls: 'text-danger' };
  if (['xls', 'xlsx', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, cls: 'text-success' };
  if (['doc', 'docx', 'hwp', 'hwpx', 'txt'].includes(ext)) return { Icon: FileText, cls: 'text-info' };
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return { Icon: FileImage, cls: 'text-secondary' };
  if (['zip', 'rar', '7z'].includes(ext)) return { Icon: FileArchive, cls: 'text-warning' };
  return { Icon: File, cls: 'text-muted-foreground' };
}

const attachmentVariants = cva(
  'group/att relative flex gap-3 rounded-card border border-border bg-card text-sm transition-colors',
  {
    variants: {
      size: { default: 'items-center p-2.5', sm: 'items-center gap-2.5 p-2' },
      orientation: { horizontal: '', vertical: 'flex-col items-start' },
    },
    defaultVariants: { size: 'default', orientation: 'horizontal' },
  },
);

function AttachmentGroup({
  className,
  orientation = 'vertical',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'vertical' | 'horizontal' }) {
  return (
    <div
      role="list"
      data-slot="attachment-group"
      className={cn('flex gap-2', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap', className)}
      {...props}
    />
  );
}

const Attachment = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof attachmentVariants>
>(({ className, size, orientation, ...props }, ref) => (
  <div ref={ref} role="listitem" data-slot="attachment" className={cn(attachmentVariants({ size, orientation }), className)} {...props} />
));
Attachment.displayName = 'Attachment';

/* AttachmentMedia — children이 있으면 그대로, 없으면 fileName 확장자로 아이콘 자동 선택 */
function AttachmentMedia({
  className,
  fileName,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { fileName?: string }) {
  const { Icon, cls } = glyphFor(fileName);
  return (
    <div
      data-slot="attachment-media"
      className={cn('flex size-9 shrink-0 items-center justify-center rounded-card-sm bg-muted [&_svg]:size-[18px]', className)}
      {...props}
    >
      {children ?? <Icon className={cls} strokeWidth={1.8} />}
    </div>
  );
}

function AttachmentContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="attachment-content" className={cn('flex min-w-0 flex-1 flex-col gap-0.5', className)} {...props} />;
}

function AttachmentTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('truncate text-[13px] font-medium leading-snug text-foreground', className)} {...props} />;
}

const stateMeta: Record<AttachmentState, { Icon: React.ComponentType<any>; cls: string; spin?: boolean } | null> = {
  idle: null,
  done: { Icon: Check, cls: 'text-success' },
  error: { Icon: TriangleAlert, cls: 'text-danger' },
  uploading: { Icon: LoaderIcon, cls: 'text-muted-foreground', spin: true },
  processing: { Icon: LoaderIcon, cls: 'text-muted-foreground', spin: true },
};

function AttachmentDescription({
  className,
  state = 'idle',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & { state?: AttachmentState }) {
  const meta = stateMeta[state];
  return (
    <p className={cn('my-0 flex items-center gap-1 truncate text-[12px] leading-normal text-muted-foreground', className)} {...props}>
      {meta && <meta.Icon className={cn('size-3 shrink-0', meta.cls, meta.spin && 'animate-spin')} />}
      {children}
    </p>
  );
}

function AttachmentActions({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="attachment-actions" className={cn('flex shrink-0 items-center gap-0.5', className)} {...props} />;
}

const AttachmentAction = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      // ⚠️ bg-transparent 필수 — preflight:false라 미지정 시 브라우저 기본 버튼 배경(회색 ButtonFace)이 노출된다.
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-card-sm border-0 bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  ),
);
AttachmentAction.displayName = 'AttachmentAction';

export {
  Attachment,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentActions,
  AttachmentAction,
};
