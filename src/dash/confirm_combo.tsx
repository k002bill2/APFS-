/* 확정여부 콤보 버튼 — 선택 바(GridFrame contextActions)에서 체크한 행의 확정여부를 일괄 변경한다.
   붙은 세그먼트 [확정|미확정] 한 묶음. 활성 세그먼트(primary + 체크)는 **선택 행의 현재 값**을 보여준다:
   전부 같은 값이면 그 값, 섞였거나 값이 없으면 둘 다 비활성. 클릭은 상태 토글이 아니라 "이 값으로 변경" 액션이다
   (활성 세그먼트를 다시 눌러도 같은 값으로 재적용 — 호출부 toast가 결과를 알린다).
   접근성: 그룹 role=group + aria-label, 세그먼트는 aria-pressed로 현재 값을 알린다. */
import { Icon } from './icons';

export type ConfirmValue = '확정' | '미확정';
const OPTIONS: ConfirmValue[] = ['확정', '미확정'];

/** 선택 행 값들 → 콤보 활성값. 전부 같은 확정/미확정이면 그 값, 아니면 null */
export function uniformConfirm(vals: ReadonlyArray<string | null | undefined>): ConfirmValue | null {
  const set = new Set(vals);
  if (set.size !== 1) return null;
  const [only] = [...set];
  return only === '확정' || only === '미확정' ? only : null;
}

export function ConfirmCombo({ label, value, onPick }: { label?: string; value: ConfirmValue | null; onPick: (v: ConfirmValue) => void }) {
  return (
    <div role="group" aria-label={label ? `${label} 확정여부` : '확정여부'} className="inline-flex items-center gap-1.5">
      {label && <span className="text-muted-foreground font-semibold" style={{ fontSize: 12.5 }}>{label}</span>}
      <div className="inline-flex rounded-[9px] border border-border-strong bg-card">
        {OPTIONS.map((v, i) => {
          const on = value === v;
          return (
            <button key={v} type="button" aria-pressed={on} onClick={() => onPick(v)}
              /* 세그먼트 사이 구분선은 인라인 — border-0 + border-l 유틸을 겹치면 컴파일 CSS 순서에 따라 무음으로 사라진다(UI.Button 주석과 같은 함정) */
              style={{ border: 'none', borderLeft: i === 0 ? 'none' : '1px solid var(--border-strong)' }}
              className={[
                'relative focus-visible:z-10 inline-flex items-center gap-1 px-[11px] py-1.5 text-[12.5px] font-semibold font-[inherit] cursor-pointer whitespace-nowrap transition-colors duration-tok-fast ease-ds',
                i === 0 ? 'rounded-l-[8px]' : 'rounded-r-[8px]',
                on ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted',
              ].join(' ')}>
              {on && <Icon name="check" size={14} stroke={2.4} />}{v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
