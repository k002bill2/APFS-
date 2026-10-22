/* 수탁보고 > 자펀드 수탁 조회 3리프 — 공용 골격 TablesPage(risk_tables_page.tsx)의 화면별 설정.
   검색조건 항목·순서·기본값은 목업 검색박스 원문 그대로, 데이터는 trust_sub_data.ts SSOT.
   같은 골격의 모태펀드 수탁 3리프(S3_102·104·106)는 trs/mfund/trust_mother_table_pages.tsx.

   | 리프                | 원본   | 표                                   | 검색조건(→ 행 필터 키)                     |
   |---------------------|--------|--------------------------------------|--------------------------------------------|
   | 실물검증비교조회    | S3_101 | 투자자산(합계) · 미투자자산 거래(0건) · 미투자자산(합계) | 자펀드(—) · 기준년월(—)      |
   | 유가증권비교조회    | 신규   | S3_101 투자자산 구조 1장(0건)        | 자펀드(—) · 기준년월(—)                    |
   | 공통코드조회        | S3_100 | 코드 목록                            | 코드구분(grp — 원문 LISTS 키)              |
   (—) = 행에 대응 키 없음 → `· 데이터 연동 후 적용`. 원문 `조회` 버튼은 두지 않는다(즉시 반영).

   공통코드 2리프(이 파일 공통코드조회 · 모태수탁 공통코드)가 스키마 트랙이 아닌 이유: 목록이 **코드구분 선택으로 통째로 바뀌는** 화면이다(원문 `LISTS[코드구분]`,
   기본값 유형분류/거래구분, 나머지 구분은 원문 빈 상태 문구). 스키마 필터는 기본값이 없고, 코드구분은 컬럼에 없어
   filter_field 가 자유 텍스트로 격하하며, select 로 만들려고 fields 를 채우면 원문에 없는 등록 버튼이 생긴다.
   그래서 화면에 그리지 않는 분류 키(grp)를 행에 싣고 TablesPage 의 "시드된 키" 필터로 원문 동작을 그대로 재현한다.
   계좌정보 비교조회(trust_mother_table_pages.tsx)도 같은 이유(스키마 필터엔 기간·기본값이 없다)로 TablesPage 를 쓴다. */
import React from 'react';
import { TablesPage } from '../../risk_tables_page';
import type { TablesPageConfig } from '../../risk_tables_page';
import { VERIFY_TABLES, VERIFY_FUND, VERIFY_BASE_YM, SECURITIES_COMPARE, CODE_TABLE, CODE_GROUPS, CODE_DEFAULT } from '../trust_sub_data';

type P = { onNav?: (r: string) => void };
const SYSTEM = '수탁보고';

const VERIFY: TablesPageConfig = {
  system: SYSTEM, group: '자펀드 수탁', label: '실물검증비교조회', route: 'trust-physical-compare',
  tables: VERIFY_TABLES, unit: true,
  filters: [
    /* 원문 자펀드 select 옵션 1개('전체' 없음) — 조회 대상 파라미터(행에 자펀드 칸 없음) */
    { label: '자펀드', kind: 'select', def: VERIFY_FUND, options: [VERIFY_FUND], allLabel: null },
    { label: '기준년월', kind: 'month', def: VERIFY_BASE_YM },
  ],
};

const SECURITIES_COMPARE_PAGE: TablesPageConfig = {
  system: SYSTEM, group: '자펀드 수탁', label: '유가증권비교조회', route: 'trust-securities-compare',
  tables: [SECURITIES_COMPARE], unit: true,
  /* 형제 S3_101 검색조건 항목 준용 — 자펀드 옵션은 원천이 없어 비운다(형제 화면의 자펀드 값을 끌어오지 않는다) */
  filters: [
    { label: '자펀드', kind: 'select', def: '', options: [] },
    { label: '기준년월', kind: 'month', def: '' },
  ],
};

const COMMON_CODE: TablesPageConfig = {
  system: SYSTEM, group: '자펀드 수탁', label: '공통코드조회', route: 'trust-common-code',
  tables: [CODE_TABLE],
  filters: [{ label: '코드구분', kind: 'select', def: CODE_DEFAULT, options: CODE_GROUPS, allLabel: null, key: 'grp' }],
};

/** 실물검증비교조회 — S3_101 */
export function PhysicalVerifyCompare({ onNav }: P) { return <TablesPage cfg={VERIFY} onNav={onNav} />; }
/** 유가증권비교조회 — 신규(현행 목업 없음) */
export function SecuritiesCompare({ onNav }: P) { return <TablesPage cfg={SECURITIES_COMPARE_PAGE} onNav={onNav} />; }
/** 공통코드조회 — S3_100 */
export function TrustCommonCode({ onNav }: P) { return <TablesPage cfg={COMMON_CODE} onNav={onNav} />; }
