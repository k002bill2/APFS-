/* 자펀드 인라인 필터 패널(2026-11-09 사용자 지시 — 자펀드정보관리에서 상세필터 드로어를 없애고 칩 줄 위에 펼쳐 둔다).
   SubFundManage 가 ext.inlineFilters 일 때 GridFrame filterPanel 로 넘긴다. 자펀드 관리(route subfund)는 드로어 그대로.
   - 항목·순서 = 드로어와 같다(검색어 + 목업 검색박스 10항목). 심사단계는 툴바 칩이라 넣지 않는다(filter_chip_drawer_dup 규약).
   - 캡션 없이 항목명을 placeholder·접근名으로 쓴다(사용자 이미지).
   - 선택 칸 10개는 고른 뒤에도 항목명(placeholder)을 고정으로 보인다(2026-11-09 사용자 "선택해도 placeholder 가 다시 보이게 —
     선택항목은 아래 필터칩에 들어가기 때문" → 2026-11-10 "공통 컴포넌트는 수정하지 말고 여기 있는 애들 선택 후에도
     placeholder 고정" 으로 전 칸 확대). 그래서 칸엔 늘 '' 를 넘기고 onChange 만 실제 값을 올린다 — 제어형 select 라
     고른 직후 React 가 DOM 을 '' 로 되돌린다(공용 DrawerSelect·PeriodPicker 는 그대로). 고른 값은 아래 적용 칩에만 보인다
     (칸이 전부 행을 거르고 칩을 만든다). 직접 치는 검색어만 친 글자를 그대로 둔다. 펼친 목록엔 현재 값 표시가 없다. 닫힌 select 의 방향키는 값 대신 목록을 연다(openListOnNavKey).
   - 즉시 반영(apfs-detail-filter) — 값 state 는 SubFundManage 가 소유하고 여기선 그리기만 한다.
   - 모펀드·계정구분·담당자 2종은 숨은 행 속성(SubFundRow mf·ag·manager·risk), 기준일자는 등록일시 ≤ 값으로 거른다
     (2026-11-16 사용자 지시 — 종전엔 행을 거르지 않아 칩 대신 DS 툴팁으로 미연동을 알렸다. 칸에 값이 안 보이는 패널이라
     칩이 유일한 '걸렸다' 신호다 — 툴팁은 걷었다).
   - 칸 폭 고정(120px, ≤640px 은 2열) + flex-wrap — 화면 폭 따라 줄이 바뀐다(6+5 를 고정하지 않는다).
     120 = 잘림 없는 최소(2026-11-09 사용자 "너비를 더 줄여줘" → 실측: '리스크담당자' 116 · 기준일자 값+달력 119).
     더 줄이면 항목명이 잘린다(칸엔 고른 값이 안 보이므로 값 잘림은 없다). */
import { UI } from '../../components';
import { Icon } from '../../icons';
import { drawerInputStyle } from '../../schemas/renderers';
import { DrawerSelect } from '../../drawer_select';
import { PeriodPicker } from '../../ui/period-picker';
import type { KeyboardEvent } from 'react';
import { OPT_AG, OPT_FG, OPT_FS, OPT_MANAGER, OPT_MF, CUR_YEAR } from './subfund_manage_schemas';

export interface SubFundFilterValues {
  text: string; mf: string; fund: string; ag: string; type: string; year: string;
  rt: string; manager: string; risk: string; st: string; asOf: string;
}
export type SubFundFilterKey = keyof SubFundFilterValues;

const CELL = 'w-[120px] max-[640px]:w-[calc(50%-4px)]';
const RT = ['정기', '수시'];

/* 닫힌 네이티브 select 의 방향키·Home/End·PageUp/Down — Windows·Linux Chromium 은 목록을 열지 않고 값을 바로 바꾼다.
   칸엔 늘 '' 를 넘기므로 값이 되돌아가 ↓ 를 반복해도 첫 옵션만 걸린다(2026-11-10 Codex P2) → 그 키는 막고 목록을 연다
   (macOS 는 원래 연다). 열린 목록에선 방향키가 이동만 하고 Enter 로 고른다. Alt+↓·F4·Space 는 브라우저 기본 그대로.
   목록을 **연 뒤에만** 키를 막는다 — showPicker 미지원·실패(사용자 활성화 없음 등)면 키를 삼키지 않고 브라우저 기본 동작으로 둔다(Codex P2 2차) */
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp']);
const openListOnNavKey = (e: KeyboardEvent<HTMLElement>) => {
  const t = e.target as HTMLSelectElement & { showPicker?: () => void };
  if (!(t instanceof HTMLSelectElement) || e.altKey || !NAV_KEYS.has(e.key) || typeof t.showPicker !== 'function') return;
  try { t.showPicker(); } catch { return; }
  e.preventDefault();
};

export function SubFundFilterPanel({ values, onChange, fundOptions, managerOptions = OPT_MANAGER }: {
  values: SubFundFilterValues;
  onChange: (key: SubFundFilterKey, v: string) => void;
  fundOptions: readonly string[];
  /** 담당자 선택지 — 기본 명단 ∪ 행에 저장된 이름(SubFundManage 가 만든다) */
  managerOptions?: readonly string[];
}) {
  /* 칸 표시값 — 늘 '' (항목명 고정). 실제 값은 onChange 로만 올라간다 */
  const select = (key: SubFundFilterKey, label: string, options: readonly string[]) => (
    <div className={CELL}>
      <DrawerSelect value="" onChange={(v) => onChange(key, v)} options={options} placeholder={label} ariaLabel={label} fill />
    </div>
  );
  return (
    /* 컨테이너는 초점을 받지 않는다 — 자식 select 의 키를 capture 단계에서 가로채기만 한다(openListOnNavKey) */
    <div role="group" aria-label="자펀드 검색 조건" className="flex flex-wrap" style={{ gap: 8 }} onKeyDownCapture={openListOnNavKey}>
      {/* 아이콘은 입력 뒤에 둔다 — ClearableInput 래퍼(.t-clear)가 position:relative 라 앞에 두면 입력 배경이 덮는다 */}
      <div className={CELL + ' relative'}>
        <UI.ClearableInput type="text" value={values.text} onValueChange={(v) => onChange('text', v)} placeholder="검색어" aria-label="검색어"
          clearLabel="검색어 지우기" style={{ ...drawerInputStyle('text'), width: '100%', minWidth: 0, paddingLeft: 32 }} />
        <Icon name="search" size={15} className="text-muted-foreground"
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      </div>
      {select('mf', '모펀드', OPT_MF)}
      {select('fund', '자펀드', fundOptions)}
      {select('ag', '계정구분', OPT_AG)}
      {select('type', '자펀드구분', OPT_FG)}
      <div className={CELL}>
        <PeriodPicker mode="year" value="" onChange={(v) => onChange('year', v)} ariaLabel="사업연도" placeholder="사업연도" yearRange={[2000, CUR_YEAR + 1]} />
      </div>
      {select('rt', '정기/수시', RT)}
      {select('manager', '심사담당자', managerOptions)}
      {select('risk', '리스크담당자', managerOptions)}
      {select('st', '조합상태', OPT_FS)}
      <div className={CELL}>
        <PeriodPicker mode="day" value="" onChange={(v) => onChange('asOf', v)} ariaLabel="기준일자" placeholder="기준일자" />
      </div>
    </div>
  );
}
