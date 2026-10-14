/* 수탁보고 > 모태펀드 수탁 조회 3리프 — 공용 골격 TablesPage(risk_tables_page.tsx)의 화면별 설정.
   검색조건 항목·순서·기본값은 목업 검색박스 원문 그대로, 데이터는 trust_mother_data.ts SSOT.
   같은 골격의 자펀드 수탁 3리프는 trust/sfund/trust_sub_table_pages.tsx.

   | 리프                | 원본   | 표                                   | 검색조건(→ 행 필터 키)                     |
   |---------------------|--------|--------------------------------------|--------------------------------------------|
   | 모태수탁 공통코드   | S3_102 | 코드 목록                            | 코드구분(grp — 원문 LISTS 키)              |
   | 계좌정보 비교조회   | S3_104 | 단일 헤더 18열                       | 개시일(st 기간)                            |
   | 입출금정보 비교조회 | S3_106 | 거래금액 원금·손익 2단 헤더          | 거래일자(dt 기간)                          |
   원문 `조회` 버튼은 두지 않는다(즉시 반영).

   스키마 트랙이 아닌 이유: 공통코드는 목록이 **코드구분 선택으로 통째로 바뀌는** 화면이라 화면에 그리지 않는 분류 키(grp)를
   행에 싣고 TablesPage 의 "시드된 키" 필터로 재현한다(상세는 trust_sub_table_pages.tsx 머리말).
   계좌정보 비교조회도 스키마 필터엔 기간·기본값이 없어(원문은 개시일 2026-07-13 ~ 2026-08-13) 여기 둔다. */
import React from 'react';
import { TablesPage } from '../../risk_tables_page';
import type { TablesPageConfig } from '../../risk_tables_page';
import { MOTHER_CODE_TABLE, MOTHER_CODE_GROUPS, MOTHER_CODE_DEFAULT, ACCOUNT_TABLE, ACCOUNT_RANGE, CASHFLOW_TABLE, CASHFLOW_RANGE } from './trust_mother_data';

type P = { onNav?: (r: string) => void };
const SYSTEM = '수탁보고';

const MOTHER_CODE: TablesPageConfig = {
  system: SYSTEM, group: '모태펀드 수탁', label: '모태수탁 공통코드', route: 'trust-mother-common-code',
  tables: [MOTHER_CODE_TABLE],
  filters: [{ label: '코드구분', kind: 'select', def: MOTHER_CODE_DEFAULT, options: MOTHER_CODE_GROUPS, allLabel: null, key: 'grp' }],
};

const ACCOUNT: TablesPageConfig = {
  system: SYSTEM, group: '모태펀드 수탁', label: '계좌정보 비교조회', route: 'trust-account-compare',
  tables: [ACCOUNT_TABLE], unit: true,
  filters: [{ label: '개시일', kind: 'dayRange', def: ACCOUNT_RANGE, key: 'st' }],
};

const CASHFLOW: TablesPageConfig = {
  system: SYSTEM, group: '모태펀드 수탁', label: '입출금정보 비교조회', route: 'trust-cashflow-compare',
  tables: [CASHFLOW_TABLE], unit: true,
  filters: [{ label: '거래일자', kind: 'dayRange', def: CASHFLOW_RANGE, key: 'dt' }],
};

/** 모태수탁 공통코드 — S3_102 */
export function MotherTrustCode({ onNav }: P) { return <TablesPage cfg={MOTHER_CODE} onNav={onNav} />; }
/** 계좌정보 비교조회 — S3_104 */
export function AccountCompare({ onNav }: P) { return <TablesPage cfg={ACCOUNT} onNav={onNav} />; }
/** 입출금정보 비교조회 — S3_106 */
export function CashflowCompare({ onNav }: P) { return <TablesPage cfg={CASHFLOW} onNav={onNav} />; }
