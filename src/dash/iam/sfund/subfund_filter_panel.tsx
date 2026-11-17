/* 자펀드 인라인 필터 패널(2026-11-09 사용자 지시 — 자펀드정보관리에서 상세필터 드로어를 없애고 칩 줄 위에 펼쳐 둔다.
   2026-11-17 전 화면 확대 — 칸 모양·키 처리는 공용 filter_panel 로 옮겼고 여기는 항목 선언만 남는다).
   SubFundManage(자펀드 관리·자펀드정보관리 공용)가 GridFrame filterPanel 로 넘긴다.
   - 항목·순서 = 드로어와 같다(검색어 + 목업 검색박스 10항목). 심사단계는 툴바 칩이라 넣지 않는다(filter_chip_drawer_dup 규약).
   - 칸 모양(캡션 없는 placeholder·120px·고른 값은 칩에만·닫힌 select 방향키)은 filter_panel 머리말이 정본.
   - 즉시 반영(apfs-detail-filter) — 값 state 는 SubFundManage 가 소유하고 여기선 그리기만 한다.
   - 모펀드·계정구분·담당자 2종은 숨은 행 속성(SubFundRow mf·ag·manager·risk), 기준일자는 등록일시 ≤ 값으로 거른다(2026-11-16). */
import { FilterPanel, PanelSearch, PanelSelect, PanelPeriod } from '../../filter_panel';
import { OPT_AG, OPT_FG, OPT_FS, OPT_MANAGER, OPT_MF, CUR_YEAR } from './subfund_manage_schemas';

export interface SubFundFilterValues {
  text: string; mf: string; fund: string; ag: string; type: string; year: string;
  rt: string; manager: string; risk: string; st: string; asOf: string;
}
export type SubFundFilterKey = keyof SubFundFilterValues;

const RT = ['정기', '수시'];

export function SubFundFilterPanel({ values, onChange, fundOptions, managerOptions = OPT_MANAGER }: {
  values: SubFundFilterValues;
  onChange: (key: SubFundFilterKey, v: string) => void;
  fundOptions: readonly string[];
  /** 담당자 선택지 — 기본 명단 ∪ 행에 저장된 이름(SubFundManage 가 만든다) */
  managerOptions?: readonly string[];
}) {
  const select = (key: SubFundFilterKey, label: string, options: readonly string[]) => (
    <PanelSelect label={label} value={values[key]} onChange={(v) => onChange(key, v)} options={options} />
  );
  return (
    <FilterPanel label="자펀드 검색 조건">
      <PanelSearch value={values.text} onChange={(v) => onChange('text', v)} />
      {select('mf', '모펀드', OPT_MF)}
      {select('fund', '자펀드', fundOptions)}
      {select('ag', '계정구분', OPT_AG)}
      {select('type', '자펀드구분', OPT_FG)}
      <PanelPeriod label="사업연도" mode="year" value={values.year} onChange={(v) => onChange('year', v)} yearRange={[2000, CUR_YEAR + 1]} />
      {select('rt', '정기/수시', RT)}
      {select('manager', '심사담당자', managerOptions)}
      {select('risk', '리스크담당자', managerOptions)}
      {select('st', '조합상태', OPT_FS)}
      <PanelPeriod label="기준일자" mode="day" value={values.asOf} onChange={(v) => onChange('asOf', v)} />
    </FilterPanel>
  );
}
