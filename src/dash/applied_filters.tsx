/* 적용된 필터 칩 — GridFrame 툴바의 SSOT (2026-09-24 사용자 결정, 전 화면 공통).
   배치: 첫 줄에 들어가면 기본 필터 칩 뒤에 **인라인**, 넘칠 때만 툴바 아래 **둘째 줄**(GridFrame 이 폭 실측으로 결정).

   왜 둘째 줄인가: 기본 필터 칩(첫 줄)과 적용 칩이 한 줄에 섞이면 조건이 몇 개만 걸려도 툴바가
   여러 줄로 감기고 우측 액션(금액 단위·상세필터·새로고침)이 아래로 밀린다. 역할을 나눈다 —
   첫 줄 = "무엇을 볼지"(기본 필터 칩 + 액션, nowrap), 둘째 줄 = "무엇이 걸렸는지"(이 컴포넌트).

   규칙(합의 Q1·Q4·Q5·Q11·Q13·Q14):
   - 값이 있는 항목이 하나라도 있을 때만 나타난다. 보이는 캡션 없음, role="group" aria-label 만.
   - 칩 = 값만 표시(항목명은 title·aria-label 로 회수), 최대 240px 말줄임.
   - onClear 가 있는 칩만 ×. 해제 가능한 칩이 2개 이상이면 줄 끝에 `전체 해제` —
     각 칩의 onClear 를 차례로 부른다(화면마다 clearAll 을 만들지 않는다).
   - 둘째 줄은 감긴다(flex-wrap) — 해제 대상이라 스크롤 안에 숨기면 안 된다.
   ⚠ 칩 모양(color-mix primary 10%)과 '필터 제거' aria 는 이 파일에만 둔다 — 가드 applied_filters.test.ts. */
import { Icon } from './icons';

export interface AppliedFilter {
  /** 항목명 — 칩에는 안 보이고 title·aria-label 로 쓰인다 */
  label: string;
  /** 표시 값. 빈 문자열/공백이면 적용되지 않은 것으로 보고 칩을 만들지 않는다 */
  value: string;
  /** 없으면 × 없이 표시만 하고 전체 해제 대상에서도 빠진다 */
  onClear?: () => void;
}

export const activeFilters = (items: readonly AppliedFilter[] | undefined): AppliedFilter[] =>
  (items ?? []).filter((f) => f.value != null && String(f.value).trim() !== '');

function Chip({ f }: { f: AppliedFilter }) {
  const clearable = Boolean(f.onClear);
  return (
    /* 글자색 = primary 에 foreground 15% 를 섞는다 — primary 단독은 라이트에서 10% 틴트 위 4.35:1 로 AA(4.5) 미달이었다.
       foreground 는 라이트=어둡게·다크=밝게 섞이므로 한 식으로 두 테마 모두 대비가 오른다(2026-09-24 실측). */
    <span title={`${f.label}: ${f.value}`} className="inline-flex items-center gap-1.5 font-semibold"
      style={{ padding: clearable ? '5px 8px 5px 11px' : '5px 11px', borderRadius: 9, fontSize: 12.5, maxWidth: 240, color: 'color-mix(in srgb, var(--primary) 85%, var(--foreground))', background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{f.value}</span>
      {clearable && (
        <button type="button" onClick={f.onClear} aria-label={`${f.label} 필터 제거`}
          className="inline-flex items-center justify-center border-0 cursor-pointer shrink-0"
          style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
          <Icon name="x" size={13} stroke={2.4} />
        </button>
      )}
    </span>
  );
}

/** 칩 목록 + (해제 가능 ≥2) 전체 해제. 배치(첫 줄 인라인 / 둘째 줄)는 GridFrame 이 폭을 재서 정한다.
    눈에 보이는 캡션은 없다(2026-09-24 사용자 결정 — "적용된 필터" 문구 불필요). 스크린리더용 이름만 group 에 둔다.
    `measure` = 폭 측정용 사본: visibility:hidden 이라 포커스·읽기 대상에서 빠진다(절대배치는 GridFrame 래퍼가 맡는다). */
export function AppliedFilters({ items, layout, measure }: { items: readonly AppliedFilter[]; layout: 'inline' | 'row'; measure?: boolean }) {
  const on = activeFilters(items);
  if (on.length === 0) return null;
  const clearable = on.filter((f) => f.onClear);
  const list = (
    <>
      {on.map((f) => <Chip key={f.label} f={f} />)}
      {clearable.length >= 2 && (
        <button type="button" onClick={() => clearable.forEach((f) => f.onClear?.())}
          className="border-0 bg-transparent cursor-pointer text-muted-foreground hover:text-foreground underline-offset-2 hover:underline shrink-0"
          style={{ fontSize: 12.5, padding: '4px 6px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
          전체 해제
        </button>
      )}
    </>
  );
  if (measure) return <div aria-hidden="true" className="flex items-center gap-2 w-max" style={{ visibility: 'hidden' }}>{list}</div>;
  if (layout === 'inline') return <div role="group" aria-label="적용된 필터" className="flex items-center gap-2 w-max">{list}</div>;
  return (
    <div role="group" aria-label="적용된 필터" className="flex items-center flex-wrap gap-2"
      style={{ padding: '6px 18px', borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--muted) 35%, transparent)' }}>
      {list}
    </div>
  );
}
