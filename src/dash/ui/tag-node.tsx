'use client';

import * as React from 'react';

import type { TTagElement } from 'platejs';
import type { PlateElementProps } from 'platejs/react';

import {
  PlateElement,
  useFocused,
  useReadOnly,
  useSelected,
} from 'platejs/react';

import { cn } from '@/lib/utils';
import { safeUrl } from '../fields/safeUrl';

export function TagElement(props: PlateElementProps<TTagElement>) {
  const { element } = props;
  const selected = useSelected();
  const focused = useFocused();
  const readOnly = useReadOnly();

  const badge = (
    <div
      className={cn(
        'shrink-0 break-normal rounded-full border px-2.5 align-middle font-semibold text-sm transition-colors focus:outline-none',
        'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/60',
        selected && focused && 'ring-2 ring-ring ring-offset-0',
        'flex items-center gap-1.5'
      )}
    >
      {element.value as string}
    </div>
  );

  // Vite 프로젝트 — Next.js <Link> 대신 평범한 <a>. url 있는 태그는 읽기전용에서만 링크로 렌더.
  // href는 safeUrl(nav)로 sanitize — 가져오기(import)로 주입된 javascript:/data: 스킴 클릭 실행 차단.
  const href = safeUrl(element.url, 'nav');
  const content =
    readOnly && href ? (
      <a href={href}>{badge}</a>
    ) : (
      badge
    );

  return (
    <PlateElement
      {...props}
      className="m-0.5 inline-flex cursor-pointer select-none"
      attributes={{
        ...props.attributes,
        draggable: true,
      }}
    >
      {content}
      {props.children}
    </PlateElement>
  );
}
