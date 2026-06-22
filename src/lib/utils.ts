import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * cn — shadcn/ui 표준 className 병합 유틸.
 * clsx(조건부/배열/객체 평탄화) → twMerge(충돌 Tailwind 유틸 뒤 값 우선 해소).
 * 기존 src/dash/components.tsx의 cx()는 clsx 단계만 수행(twMerge 없음)하므로,
 * shadcn 컴포넌트(cva 기본 variant + 호출자 className override)에는 반드시 cn을 쓴다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
