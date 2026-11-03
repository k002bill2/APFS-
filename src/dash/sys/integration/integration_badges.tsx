/* 연동 모니터링(ADM-005) — 그리드 셀·상세 팝업이 함께 쓰는 배지 2종. 목업 `cdTag`·`sttsTag`(+ '변경전 → 후' 셀) 대응.
   톤 근거는 integration_monitor_model.ts(STTS_TONE·cdTone) — 목업 tag 색을 StatusBadge tone 으로 1:1 옮긴 것이다. */
import { UI } from '../../components';
import { cdText, cdTone, STTS_TONE } from './integration_monitor_model';
import type { PrcsStatus } from './integration_monitor_data';

const { StatusBadge } = UI;

type Size = 'md' | 'lg';

/** 응답코드 — '0 · 성공'(success) / 오류코드(danger) */
export function CdBadge({ cd, size = 'lg' }: { cd: string; size?: Size }) {
  return <StatusBadge tone={cdTone(cd)} label={cdText(cd)} size={size} />;
}

/** 처리상태 1개 — 값 없음(최초 적재의 변경전)은 '-' 캡션 */
export function SttsBadge({ s, size = 'lg' }: { s: PrcsStatus | null; size?: Size }) {
  if (!s) return <span className="text-caption">-</span>;
  return <StatusBadge tone={STTS_TONE[s]} label={s} size={size} />;
}

/** 변경전 → 변경후 */
export function TransitionBadges({ bef, aft, size = 'lg' }: { bef: PrcsStatus | null; aft: PrcsStatus; size?: Size }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <SttsBadge s={bef} size={size} />
      <span className="text-caption" aria-hidden>→</span>
      <span className="sr-only">에서</span>
      <SttsBadge s={aft} size={size} />
    </span>
  );
}
