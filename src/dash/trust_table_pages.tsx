/* 수탁보고 조회 6리프 — 공용 골격 TablesPage(risk_tables_page.tsx)의 화면별 설정.
   검색조건 항목·순서·기본값은 목업 검색박스 원문 그대로, 데이터는 trust_sub_data.ts · trust_mother_data.ts SSOT.

   | 리프                | 원본   | 표                                   | 검색조건(→ 행 필터 키)                     |
   |---------------------|--------|--------------------------------------|--------------------------------------------|
   | 실물검증비교조회    | S3_101 | 투자자산(합계) · 미투자자산 거래(0건) · 미투자자산(합계) | 자펀드(—) · 기준년월(—)      |
   | 유가증권비교조회    | 신규   | S3_101 투자자산 구조 1장(0건)        | 자펀드(—) · 기준년월(—)                    |
   | 공통코드조회        | S3_100 | 코드 목록                            | 코드구분(grp — 원문 LISTS 키)              |
   | 모태수탁 공통코드   | S3_102 | 코드 목록                            | 코드구분(grp — 원문 LISTS 키)              |
   | 계좌정보 비교조회   | S3_104 | 단일 헤더 18열                       | 개시일(st 기간)                            |
   | 입출금정보 비교조회 | S3_106 | 거래금액 원금·손익 2단 헤더          | 거래일자(dt 기간)                          |
   (—) = 행에 대응 키 없음 → `· 데이터 연동 후 적용`. 원문 `조회` 버튼은 두지 않는다(즉시 반영).

   공통코드 2리프가 스키마 트랙이 아닌 이유: 목록이 **코드구분 선택으로 통째로 바뀌는** 화면이다(원문 `LISTS[코드구분]`,
   기본값 유형분류/거래구분, 나머지 구분은 원문 빈 상태 문구). 스키마 필터는 기본값이 없고, 코드구분은 컬럼에 없어
   filter_field 가 자유 텍스트로 격하하며, select 로 만들려고 fields 를 채우면 원문에 없는 등록 버튼이 생긴다.
   그래서 화면에 그리지 않는 분류 키(grp)를 행에 싣고 TablesPage 의 "시드된 키" 필터로 원문 동작을 그대로 재현한다.
   계좌정보 비교조회도 같은 이유(스키마 필터엔 기간·기본값이 없다 — 원문은 개시일 2026-07-13 ~ 2026-08-13)로 여기 둔다. */
import React from 'react';
import { UI } from './components';
import { TablesPage } from './risk_tables_page';
import type { TablesPageConfig } from './risk_tables_page';
import { VERIFY_TABLES, VERIFY_FUND, VERIFY_BASE_YM, SECURITIES_COMPARE, NEW_SCREEN_CAPTION, CODE_TABLE, CODE_GROUPS, CODE_DEFAULT } from './trust_sub_data';
import { MOTHER_CODE_TABLE, MOTHER_CODE_GROUPS, MOTHER_CODE_DEFAULT, ACCOUNT_TABLE, ACCOUNT_RANGE, CASHFLOW_TABLE, CASHFLOW_RANGE } from './trust_mother_data';

const { StatusBadge } = UI;
type P = { onNav?: (r: string) => void };
const SYSTEM = '수탁보고';

/** 원문 툴바 머리 줄 — `대사 결과` + 태그 `운용사 · 수탁기관 대사` */
function VerifyIntro() {
  return (
    <div className="flex items-center gap-2" style={{ padding: '12px 18px 0' }}>
      <span className="font-bold" style={{ fontSize: 14 }}>대사 결과</span>
      <StatusBadge tone="success" label="운용사 · 수탁기관 대사" size="sm" dot={false} />
    </div>
  );
}

/** 신규 화면 안내(브리프 규칙 3) — 원천 목업이 없다는 사실을 화면에 밝힌다 */
export function NewScreenNotice({ sibling }: { sibling: string }) {
  return (
    <div role="note" className="flex items-center gap-2 flex-wrap" style={{ margin: '12px 18px 0', padding: '10px 14px', borderRadius: 10, fontSize: 13,
      background: 'color-mix(in srgb, var(--warning) 10%, transparent)', color: 'var(--warning-text)' }}>
      <span className="font-bold">{NEW_SCREEN_CAPTION}</span>
      <span>· 형제 화면 {sibling} 구조를 준용했다. ⓘ 표시 항목은 추정이다.</span>
    </div>
  );
}

const VERIFY: TablesPageConfig = {
  system: SYSTEM, group: '자펀드 수탁', label: '실물검증비교조회', route: '실물검증비교조회',
  tables: VERIFY_TABLES, unit: true, intro: <VerifyIntro />,
  filters: [
    /* 원문 자펀드 select 옵션 1개('전체' 없음) — 조회 대상 파라미터(행에 자펀드 칸 없음) */
    { label: '자펀드', kind: 'select', def: VERIFY_FUND, options: [VERIFY_FUND], allLabel: null },
    { label: '기준년월', kind: 'month', def: VERIFY_BASE_YM },
  ],
};

const SECURITIES_COMPARE_PAGE: TablesPageConfig = {
  system: SYSTEM, group: '자펀드 수탁', label: '유가증권비교조회', route: '유가증권비교조회',
  tables: [SECURITIES_COMPARE], unit: true,
  intro: <NewScreenNotice sibling="실물검증 조회(S3_101)" />,
  /* 형제 S3_101 검색조건 항목 준용 — 자펀드 옵션은 원천이 없어 비운다(형제 화면의 자펀드 값을 끌어오지 않는다) */
  filters: [
    { label: '자펀드', kind: 'select', def: '', options: [] },
    { label: '기준년월', kind: 'month', def: '' },
  ],
};

const COMMON_CODE: TablesPageConfig = {
  system: SYSTEM, group: '자펀드 수탁', label: '공통코드조회', route: '공통코드조회',
  tables: [CODE_TABLE],
  filters: [{ label: '코드구분', kind: 'select', def: CODE_DEFAULT, options: CODE_GROUPS, allLabel: null, key: 'grp' }],
};

const MOTHER_CODE: TablesPageConfig = {
  system: SYSTEM, group: '모태펀드 수탁', label: '모태수탁 공통코드', route: '모태수탁 공통코드',
  tables: [MOTHER_CODE_TABLE],
  filters: [{ label: '코드구분', kind: 'select', def: MOTHER_CODE_DEFAULT, options: MOTHER_CODE_GROUPS, allLabel: null, key: 'grp' }],
};

const ACCOUNT: TablesPageConfig = {
  system: SYSTEM, group: '모태펀드 수탁', label: '계좌정보 비교조회', route: '계좌정보 비교조회',
  tables: [ACCOUNT_TABLE], unit: true,
  filters: [{ label: '개시일', kind: 'dayRange', def: ACCOUNT_RANGE, key: 'st' }],
};

const CASHFLOW: TablesPageConfig = {
  system: SYSTEM, group: '모태펀드 수탁', label: '입출금정보 비교조회', route: '입출금정보 비교조회',
  tables: [CASHFLOW_TABLE], unit: true,
  filters: [{ label: '거래일자', kind: 'dayRange', def: CASHFLOW_RANGE, key: 'dt' }],
};

/** 실물검증비교조회 — S3_101 */
export function PhysicalVerifyCompare({ onNav }: P) { return <TablesPage cfg={VERIFY} onNav={onNav} />; }
/** 유가증권비교조회 — 신규(현행 목업 없음) */
export function SecuritiesCompare({ onNav }: P) { return <TablesPage cfg={SECURITIES_COMPARE_PAGE} onNav={onNav} />; }
/** 공통코드조회 — S3_100 */
export function TrustCommonCode({ onNav }: P) { return <TablesPage cfg={COMMON_CODE} onNav={onNav} />; }
/** 모태수탁 공통코드 — S3_102 */
export function MotherTrustCode({ onNav }: P) { return <TablesPage cfg={MOTHER_CODE} onNav={onNav} />; }
/** 계좌정보 비교조회 — S3_104 */
export function AccountCompare({ onNav }: P) { return <TablesPage cfg={ACCOUNT} onNav={onNav} />; }
/** 입출금정보 비교조회 — S3_106 */
export function CashflowCompare({ onNav }: P) { return <TablesPage cfg={CASHFLOW} onNav={onNav} />; }
