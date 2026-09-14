/* 관리자 화면 3종(공통코드·메뉴·사용자 권한) 공용 셀 표현 — 목업 `dbadge ok/grey/blue`의 APFS 대응.
   StatusBadge(tone) 위에 얹는 얇은 래퍼라 색은 토큰만 쓴다(color-tokens). 배지 라벨은 상태 표식이라 비마스킹. */
import { UI } from './components';

const { StatusBadge } = UI;

/** 사용여부 여/부 — 여=success 배지, 부=중립(muted) 배지. 색만이 아니라 글자로도 구분된다(web-a11y 함정 F). */
export function UseBadge({ use, size = 'lg' }: { use: boolean; size?: 'sm' | 'md' | 'lg' }) {
  if (use) return <StatusBadge tone="success" label="여" size={size} dot={false} />;
  return (
    <span
      className={`inline-flex items-center rounded-[7px] font-bold leading-tight whitespace-nowrap bg-muted text-muted-foreground ${size === 'sm' ? 'px-[7px] py-[2px] text-[11px]' : size === 'lg' ? 'px-[10px] py-[4px] text-[13px]' : 'px-[9px] py-[3px] text-xs'}`}>
      부
    </span>
  );
}

/** 사용자 구분(농금원·운용사·수탁·부처) — 목업 `dbadge blue`. 값이 없으면 '-' 캡션. */
export function UTypeBadge({ value, size = 'lg' }: { value?: string; size?: 'sm' | 'md' | 'lg' }) {
  if (!value) return <span className="text-muted-foreground">-</span>;
  return <StatusBadge tone="info" label={value} size={size} dot={false} />;
}
