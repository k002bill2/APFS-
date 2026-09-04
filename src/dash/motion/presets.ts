/* Motion 프리셋 — Animate UI(animate-ui.com) 원본 spring 계수를 한 곳에 상수화.
   소비: ui/*(Radix 래퍼 spring 전환), components(버튼 press), 신규 인터랙션.

   ⚠ reduced-motion: 이 transition들은 JS(WAAPI/rAF) 구동이라 tokens.css의
   `*{animation-duration:.001ms}` CSS 규칙이 무효하다. 저모션은 app.tsx 루트의
   <MotionConfig reducedMotion="user">가 담당(transform/scale은 끄고 opacity는 유지).

   ⚠ Tweaks 패널의 --dur* 노브는 duration 기반이라 spring(stiffness/damping)에 연동되지 않는다.
   → spring화된 컴포넌트는 의도적으로 Tweaks 속도 조정 대상에서 제외한다(명시 결정, 2026-09-04). */
import type { Transition, Variants } from 'motion/react';

const EASE_DS: [number, number, number, number] = [0.4, 0, 0.2, 1]; // = --ease / ease-ds

/* spring 계수 — researcher가 조사한 Animate UI 원본값 */
export const spring = {
  content: { type: 'spring', stiffness: 300, damping: 25 }, // tooltip/popover/hovercard 앵커 팝
  dialog: { type: 'spring', stiffness: 150, damping: 25 }, // dialog / alert-dialog 콘텐츠
  panel: { type: 'spring', stiffness: 150, damping: 22 }, // sheet / accordion
  flip: { type: 'spring', stiffness: 280, damping: 20 }, // flip / 3D
  control: { type: 'spring', stiffness: 320, damping: 28 }, // switch/checkbox/버튼 press
} satisfies Record<string, Transition>;

/* tween — 순수 opacity·원본이 spring 아닌 경우 */
export const tween = {
  overlay: { duration: 0.2, ease: EASE_DS }, // 모달/시트 백드롭 페이드
  ds: { duration: 0.18, ease: EASE_DS }, // 범용 ease-ds
  dropdown: { duration: 0.2, ease: EASE_DS }, // 원본 dropdown은 spring 아님
} satisfies Record<string, Transition>;

/* 팝오버 계열 공통 variants — Content에 transformOrigin(radix popper 변수)과 함께 사용 */
export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

/* 버튼 hover/press — 원본 hoverScale 1.05 / tapScale 0.95.
   APFS 툴바는 버튼 밀착이라 hover는 1.03으로 낮춤(겹침 완화, reflow 없음). */
export const btnInteraction = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: spring.control,
} as const;
