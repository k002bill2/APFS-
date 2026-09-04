/* CountUp — KPI 숫자 카운트업(원본 Animate UI Counting Number 재현).
   소비: components.tsx StatCard의 kpi.value.

   안전 규약(금융 수치라 오포맷 금지):
   - 마스크 ON이면 애니메이션 없이 mn(value) 정적 표시(가려진 숫자가 굴러가는 모순 방지).
   - value는 이미 포맷된 문자열("23,840","78%","2조 3,840억원"…). 숫자 그룹이 '정확히 1개'인 단순
     값만 애니메이션하고, 복합(숫자 2개 이상)·비수치는 정적으로 폴백(중간 프레임 오포맷 방지).
   - 콤마 그룹핑·소수 자릿수·접두/접미(단위)는 원본 문자열 그대로 재현.
   - 화면 진입 시 1회만(useInView once). 저모션이면 즉시 최종값. */
import React from 'react';
import { useMotionValue, useTransform, useInView, useReducedMotion, animate, motion } from 'motion/react';
import { mn, useMask } from '../mask';

const { useEffect, useRef } = React;

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function CountUp({ value, duration = 1 }: { value: any; duration?: number }) {
  const masked = useMask();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });

  const raw = String(value);
  const groups = raw.match(/\d[\d,]*(?:\.\d+)?/g);
  const single = groups && groups.length === 1 ? groups[0] : null;
  const target = single ? parseFloat(single.replace(/,/g, '')) : NaN;

  const hasComma = !!single && single.includes(',');
  const decimals = single && single.includes('.') ? single.split('.')[1].length : 0;
  const idx = single ? raw.indexOf(single) : -1;
  const prefix = single ? raw.slice(0, idx) : '';
  const suffix = single ? raw.slice(idx + single.length) : '';

  const mvRaw = useMotionValue(0);
  const text = useTransform(mvRaw, (v) => {
    const fixed = v.toFixed(decimals);
    const [ip, dp] = fixed.split('.');
    const intOut = hasComma ? groupThousands(ip) : ip;
    return dp != null ? `${intOut}.${dp}` : intOut;
  });

  const animate_ok = !masked && single != null && Number.isFinite(target);

  useEffect(() => {
    if (!animate_ok) return;
    if (reduce) { mvRaw.set(target); return; }
    if (!inView) return;
    const controls = animate(mvRaw, target, { duration, ease: [0.4, 0, 0.2, 1] });
    return () => controls.stop();
  }, [animate_ok, inView, reduce, target, duration, mvRaw]);

  // 애니메이션 대상이 아니면(마스크 ON·복합·비수치) 정적 mn() 그대로
  if (!animate_ok) return <>{mn(value)}</>;

  return (
    <span ref={ref}>
      {prefix}
      <motion.span>{text}</motion.span>
      {suffix}
    </span>
  );
}
