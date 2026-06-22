/* sonner Toaster — APFS 토큰으로 테마. 전 CRUD 피드백(등록·수정·삭제)에 사용.
   theme prop은 앱의 light/dark 상태와 연동(app.tsx). 표면은 popover 토큰. */
import * as React from 'react';
import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          fontFamily: 'var(--font-sans)',
          fontSize: '13.5px',
        },
      }}
      {...props}
    />
  );
}

export { Toaster, toast };
