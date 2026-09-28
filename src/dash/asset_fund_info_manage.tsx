/* 자펀드정보관리 — 투자자산관리 > 조합관리. **통합 그리드**(2026-09-28 사용자 결정):
   v1.4 자펀드관리(자펀드관리_목업.html — 35열·심사단계 워크플로우·팝업 3종)에 S2_73 자펀드 정보(투자기준 11열 + 수정 팝업)를 합친다.

   합성 방식 — 페이지를 복제하지 않는다
   - 본체 = SubFundManage(subfund_manage.tsx)의 확장 슬롯 `ext`: 제목·크럼·시드 행·추가 열·결성 행 추가 액션만 여기서 준다.
     route `subfund`(자펀드 관리 리프)는 ext 없이 그대로 v1.4 단독 화면이다.
   - 추가 열 = S2_73 원문 헤더 중 v1.4 에 없는 것(운용사유형·공동GP여부·투자기간 2단·의무투자·일정규모이하투자·투자비율(%) 2단·미투자자산운용비율).
     라벨·그룹은 FUND_INFO_TABLE.cols 에서 파생(SSOT — 원문 순서 그대로). No·사업연도·차수·운용사·자펀드·조합등록일자는 v1.4 열과 같은 개념이라 합친다.
   - 시드 = v1.4 DEMO 5행 + S2_73 원문 DATA 1행(미시간, 결성). S2_73 원문 값은 asset_fund_info_data.ts 에서 바꾸지 않고 여기서 매핑만 한다.
     v1.4 행의 투자기준 칸은 미입력('-') — 결성 행의 `자펀드 정보 수정`(S2_75 팝업)으로 채운다.
   - 원문 S2_73 `등록` 버튼은 v1.4 `제안서접수 등록`으로 흡수된다(자펀드는 결성돼야 등재 — 투자기준은 결성 행에서만 입력).
   - 원문 구분(운용사/자펀드) 검색은 v1.4 상세필터 `자펀드`가 대신한다. KPI 배지 행 없음(HITL '미포함'). */
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import { UI } from './components';
import type { Tone } from './components';
import { SubFundManage, DEMO, txt, date, num } from './subfund_manage';
import type { SubFundRow, SubFundExt } from './subfund_manage';
import { FUND_INFO_TABLE } from './asset_fund_info_data';
import { formFromRow, newGpRow } from './asset_fund_info_data';
import type { FundInfoForm } from './asset_fund_info_data';
import { AssetFundInfoModal } from './asset_fund_info_modal';
import type { Row } from './risk_table_meta';

const { StatusBadge } = UI;
const LABEL = '자펀드정보관리';

/* S2_73 원문 값은 문자열('60') — 그리드 숫자 열(콤마·'-')로 쓰려고 매핑 시에만 숫자화한다 */
const toNum = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* 추가 열 = S2_73 헤더 중 v1.4 에 없는 키(원문 순서). 숫자 키는 Excel 숫자셀 대상 */
const EXTRA_KEYS: readonly string[] = ['otype', 'cogp', 'ps', 'pe', 'must', 'small', 'r1', 'r2', 'r3', 'r4', 'nia'];
const NUM_EXTRA = ['must', 'small', 'r1', 'r2', 'r3', 'r4', 'nia'];

function buildExtraColumns(): (ColDef<SubFundRow> | ColGroupDef<SubFundRow>)[] {
  const out: (ColDef<SubFundRow> | ColGroupDef<SubFundRow>)[] = [];
  let grpIdx = 0;
  for (const c of FUND_INFO_TABLE.cols.filter((c) => EXTRA_KEYS.includes(c.key))) {
    const key = c.key as keyof SubFundRow;
    const col: ColDef<SubFundRow> =
      c.kind === 'badge'
        ? { ...txt(key, c.label, 104, true), cellRenderer: (p: any) => (p.node.rowPinned ? null : p.value == null ? '-'
            : <StatusBadge tone={(c.tones?.[String(p.value)] ?? 'muted') as Tone} label={String(p.value)} size="lg" />) }
        : c.kind === 'date' ? date(key, c.label)
        /* nia 헤더(미투자자산운용비율(상장주식, %))는 fitCellContents 로도 말줄임이 나 minWidth 로 하한을 준다(런타임 확인 2026-09-28) */
        : c.kind === 'number' ? (c.key === 'nia' ? { ...num(key, c.label, 240), minWidth: 240 } : num(key, c.label, c.key === 'small' ? 132 : 88))
        : txt(key, c.label, 112, true);
    const last = out[out.length - 1];
    if (c.group && last && 'children' in last && last.headerName === c.group) last.children.push(col);
    else if (c.group) out.push({ headerName: c.group, marryChildren: true, headerClass: grpIdx++ % 2 ? 'apfs-grp-b' : 'apfs-grp-a', children: [col] });
    else out.push(col);
  }
  return out;
}

/* S2_73 원문 DATA 1행 → 통합 행. 원문에 없는 v1.4 칸은 N/A(숫자 null · 텍스트 '-') */
const src = FUND_INFO_TABLE.rows[0];
const N = null;
const FUND_INFO_ROW: SubFundRow = {
  id: src.id, no: DEMO.length + 1, y: String(src.y), rt: '-', ch: String(src.ch), stg: '결성',
  ctype: '-', cg: '-', cs: '-', gp1: String(src.gp), gp2: '-', fn: String(src.fn), fd: '-', rd: String(src.rd),
  yrs: N, dur: N, mat: '-', rate: N, lgp: N, lmo: '-', c1: N, c2: N, c3: N, v1: N, v2: N, v3: N, p1: N, p2: N,
  rec: N, ti: N, tir: N, mi: N, mir: N, dist: N, mul: N, st: '-', liq: '-',
  otype: String(src.otype), cogp: String(src.cogp), ps: String(src.ps), pe: String(src.pe),
  must: toNum(src.must), small: toNum(src.small), r1: toNum(src.r1), r2: toNum(src.r2), r3: toNum(src.r3), r4: toNum(src.r4), nia: toNum(src.nia),
};

/* 통합 행 → S2_75 팝업 입력 행(원문 openEditFund(r) 가 읽는 키: fn·ps·pe·must·gp·otype) */
const toModalRow = (r: SubFundRow): Row => ({
  id: r.id, fn: r.fn, ps: r.ps ?? '', pe: r.pe ?? '', must: r.must == null ? '' : String(r.must), gp: r.gp1 === '-' ? '' : r.gp1, otype: r.otype ?? '',
});
/* 초기 폼 = 이 팝업으로 저장한 적 있으면 그 폼 그대로(결산월·연수·한도 기간·운용사 전 행/전 칸 보존 — Codex P2 2차),
   처음이면 원문 openEditFund(r)(formFromRow) + 업무집행조합원2 를 공동GP 2행째로 */
const formOf = (r: SubFundRow): FundInfoForm => {
  if (r.extForm) return r.extForm as FundInfoForm;
  const f = formFromRow(toModalRow(r));
  return r.gp2 && r.gp2 !== '-' ? { ...f, gps: [...f.gps, newGpRow({ name: r.gp2 })] } : f;
};
/* 팝업 저장 → 행 패치. 한도관리 비율=의무투자, 운용사 표 → 업무집행조합원1(대표)·2(다음 행)·운용사유형(대표의 구분),
   이름 있는 운용사 2개 이상=공동GP(O). 이름 빈 행은 무시(빈 행 추가만으로 공동GP 가 되지 않게 — Codex P2 2026-09-28).
   비운 칸은 미입력(undefined/'-')으로 되돌린다 */
const patchFromForm = (f: FundInfoForm): Partial<SubFundRow> => {
  const named = f.gps.filter((g) => g.name.trim());
  const rep = named.find((g) => g.rep) ?? named[0];
  const second = named.find((g) => g !== rep);
  return {
    ps: f.start || undefined, pe: f.end || undefined, must: toNum(f.limits[0]?.rate),
    gp1: rep ? rep.name.trim() : '-', gp2: second ? second.name.trim() : '-',
    otype: rep?.otype || undefined, cogp: named.length > 1 ? 'O' : 'X',
    extForm: f,   // 열로 투영되지 않는 항목까지 원본 폼째 보관 → formOf 가 복원
  };
};

/* 모듈 상수 — 렌더마다 새 객체면 SubFundManage 의 columnDefs 가 재생성된다(apfs-aggrid 계약 6) */
const EXT: SubFundExt = {
  crumbs: ['홈', '투자자산관리', '조합관리', LABEL],
  title: LABEL,
  favRoute: LABEL,
  seed: [...DEMO, FUND_INFO_ROW],
  extraColumns: buildExtraColumns(),
  extraNumKeys: NUM_EXTRA,
  formedAction: {
    label: '자펀드 정보 수정',
    render: (row, onSave, onClose) => (
      <AssetFundInfoModal mode="edit" row={toModalRow(row)} initialForm={formOf(row)} fundOptions={[row.fn]}
        onSave={(f) => onSave(patchFromForm(f))} onClose={onClose} />
    ),
  },
};

export function AssetFundInfoManage({ onNav }: { onNav?: (r: string) => void }) {
  return <SubFundManage onNav={onNav} ext={EXT} />;
}
