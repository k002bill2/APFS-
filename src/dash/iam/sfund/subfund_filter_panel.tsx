/* 자펀드 인라인 필터 패널(2026-11-09 사용자 지시 — 자펀드정보관리에서 상세필터 드로어를 없애고 칩 줄 위에 펼쳐 둔다).
   SubFundManage 가 ext.inlineFilters 일 때 GridFrame filterPanel 로 넘긴다. 자펀드 관리(route subfund)는 드로어 그대로.
   - 항목·순서 = 드로어와 같다(검색어 + 목업 검색박스 10항목). 심사단계는 툴바 칩이라 넣지 않는다(filter_chip_drawer_dup 규약).
   - 캡션 없이 항목명을 placeholder·접근名으로 쓴다(사용자 이미지). 값을 고르면 항목명 대신 값이 보인다.
   - 즉시 반영(apfs-detail-filter) — 값 state 는 SubFundManage 가 소유하고 여기선 그리기만 한다.
   - 미연동 항목(모펀드·계정구분·담당자 2종·기준일자)은 행을 거르지 않는다. 드로어의 '· 데이터 연동 후 적용' 캡션 자리가 없어
     칸 title(호버)로 알린다 — Radix Tooltip 은 남은 레이어가 Esc 를 먹는 함정이 있어 쓰지 않는다.
   - 칸 폭 고정(120px, ≤640px 은 2열) + flex-wrap — 화면 폭 따라 줄이 바뀐다(6+5 를 고정하지 않는다).
     120 = 잘림 없는 최소(2026-11-09 사용자 "너비를 더 줄여줘" → 실측: '리스크담당자' 116 · 기준일자 값+달력 119).
     더 줄이면 항목명·날짜가 잘린다. 고른 긴 값(펀드명 등)은 잘려도 DrawerSelect title 로 회수된다. */
import { UI } from '../../components';
import { Icon } from '../../icons';
import { drawerInputStyle } from '../../schemas/renderers';
import { DrawerSelect } from '../../drawer_select';
import { PeriodPicker } from '../../ui/period-picker';
import { OPT_AG, OPT_FG, OPT_FS, OPT_MANAGER, OPT_MF, CUR_YEAR } from './subfund_manage_schemas';

export interface SubFundFilterValues {
  text: string; mf: string; fund: string; ag: string; type: string; year: string;
  rt: string; manager: string; risk: string; st: string; asOf: string;
}
export type SubFundFilterKey = keyof SubFundFilterValues;

const NOOP_TIP = '데이터 연동 후 적용';
const CELL = 'w-[120px] max-[640px]:w-[calc(50%-4px)]';
const RT = ['정기', '수시'];

export function SubFundFilterPanel({ values, onChange, fundOptions }: {
  values: SubFundFilterValues;
  onChange: (key: SubFundFilterKey, v: string) => void;
  fundOptions: readonly string[];
}) {
  const select = (key: SubFundFilterKey, label: string, options: readonly string[], noop?: boolean) => (
    <div className={CELL} title={noop ? NOOP_TIP : undefined}>
      <DrawerSelect value={values[key]} onChange={(v) => onChange(key, v)} options={options} placeholder={label} ariaLabel={label} fill />
    </div>
  );
  return (
    <div role="group" aria-label="자펀드 검색 조건" className="flex flex-wrap" style={{ gap: 8 }}>
      {/* 아이콘은 입력 뒤에 둔다 — ClearableInput 래퍼(.t-clear)가 position:relative 라 앞에 두면 입력 배경이 덮는다 */}
      <div className={CELL + ' relative'}>
        <UI.ClearableInput type="text" value={values.text} onValueChange={(v) => onChange('text', v)} placeholder="검색어" aria-label="검색어"
          clearLabel="검색어 지우기" style={{ ...drawerInputStyle('text'), width: '100%', minWidth: 0, paddingLeft: 32 }} />
        <Icon name="search" size={15} className="text-muted-foreground"
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
      </div>
      {select('mf', '모펀드', OPT_MF, true)}
      {select('fund', '자펀드', fundOptions)}
      {select('ag', '계정구분', OPT_AG, true)}
      {select('type', '자펀드구분', OPT_FG)}
      <div className={CELL}>
        <PeriodPicker mode="year" value={values.year} onChange={(v) => onChange('year', v)} ariaLabel="사업연도" placeholder="사업연도" yearRange={[2000, CUR_YEAR + 1]} />
      </div>
      {select('rt', '정기/수시', RT)}
      {select('manager', '심사담당자', OPT_MANAGER, true)}
      {select('risk', '리스크담당자', OPT_MANAGER, true)}
      {select('st', '조합상태', OPT_FS)}
      <div className={CELL} title={NOOP_TIP}>
        <PeriodPicker mode="day" value={values.asOf} onChange={(v) => onChange('asOf', v)} ariaLabel="기준일자" placeholder="기준일자" />
      </div>
    </div>
  );
}
