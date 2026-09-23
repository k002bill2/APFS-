/* 수탁보고 관리형 화면 — 행 등록/수정 폼 스키마 4종(실물자료·유가증권 공용 / 자펀드코드 / 계좌정보 / 입출금정보).

   ⚠ 원문 목업에는 이 폼들이 **없다**(원문 [수정]은 토스트뿐 · 자펀드코드는 셀 편집 · 계좌정보/입출금은 업로드 폼뿐).
     2026-09-23 사용자 결정 — 관리형 화면은 체크박스 선택 → 선택 바 [수정]·[삭제](목업 배치를 따르지 않는다).
     그래서 항목은 **각 화면 목록 컬럼을 그대로** 폼으로 옮긴 것이다(창작 항목 없음 · No 는 자동 부여라 제외).
   ⚠ schemas/index.ts ALL 에 등록하지 않는다 — 라우트가 아니라 화면 전용 모달 스키마다. 모듈 스코프 parsePageSchema 로
     import 시점에 zod 검증한다(형제 shareholder_manage_schemas 와 동형). */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';
import { BIG_LABEL, MID_LABEL } from './trust_sub_data';

const prov = (captureFile: string) => ({ capturedAt: '2026-09-23', sourceSystem: 'FFMS(S3) 자산수탁 KRDS TO-BE', captureFile });

/** 자산분류·유형분류 표시값 = 원문 render() 형식 `코드 (한글명)` — 행 값과 같은 문자열을 옵션으로 쓴다 */
export const BIG_DISPLAY = Object.entries(BIG_LABEL).map(([k, v]) => `${k} (${v})`);
export const MID_DISPLAY = Object.entries(MID_LABEL).map(([k, v]) => `${k} (${v})`);
/** 'B (채권)' → 'B' — 검색조건 매칭용 숨은 키(bigCode·midCode) 재계산 */
export const displayCode = (s: string): string => s.match(/^(\w+)\s*\(/)?.[1] ?? '';

/* ① 실물자료·유가증권 — 목록 14열에서 No 성격의 순번 제외 없이 원문 순서 그대로(순번은 원문 데이터 항목이라 둔다) */
export const PHYSICAL_FORM: PageSchema = parsePageSchema({
  route: '실물자료관리(업로드)/폼', title: '실물자료 수정', kind: 'form', entity: '실물자료',
  columns: [{ key: 'union', label: '조합명', type: 'text' }],
  fields: [
    { key: 'custodian', label: '수탁기관', control: 'text' },
    { key: 'ym', label: '기준년월', control: 'month' },
    { key: 'seq', label: '순번', control: 'number' },
    { key: 'big', label: '자산분류(대분류)', control: 'select', options: BIG_DISPLAY },
    { key: 'mid', label: '유형분류(중분류)', control: 'select', options: MID_DISPLAY },
    { key: 'union', label: '조합명', control: 'text', required: true },
    { key: 'item', label: '종목명', control: 'text', long: true },
    { key: 'code', label: '종목코드', control: 'text' },
    { key: 'biz', label: '사업자번호', control: 'text' },
    { key: 'acct', label: '계좌번호', control: 'text' },
    { key: 'shares', label: '잔여주수', control: 'number' },
    { key: 'balance', label: '보유잔액', control: 'number' },
    { key: 'interest', label: '이자', control: 'number' },
  ],
  provenance: prov('S3_98_실물자료_조회__월별_.html'),
});

/* ② 자펀드코드 — 원문 셀 편집 4칸(조합이름·수탁기관조합코드·자조합수탁·모태수탁). 체크박스 2칸은 on/off → switch(Y/N) */
export const FUND_CODE_FORM: PageSchema = parsePageSchema({
  route: '자펀드코드 조회/폼', title: '자펀드코드 수정', kind: 'form', entity: '자펀드코드',
  columns: [{ key: 'nm', label: '조합이름', type: 'text' }],
  fields: [
    { key: 'nm', label: '조합이름', control: 'text', required: true, long: true },
    { key: 'code', label: '수탁기관조합코드', control: 'text', required: true },
    { key: 'sub', label: '자조합수탁', control: 'switch', options: ['Y', 'N'] },
    { key: 'mo', label: '모태수탁', control: 'switch', options: ['Y', 'N'] },
  ],
  provenance: prov('S3_99_조합코드_관리.html'),
});

/* ③ 계좌정보 — 목록 컬럼 = S3_104 계좌정보조회 18열(No 제외 17). 분류값은 원문 값이 1건뿐이라 선택지를 만들지 않고 텍스트로 받는다 */
export const ACCOUNT_FORM: PageSchema = parsePageSchema({
  route: '계좌정보 관리/폼', title: '계좌정보 등록', kind: 'form', entity: '계좌정보',
  columns: [{ key: 'acc', label: '계좌번호', type: 'text' }],
  fields: [
    { key: 'acc', label: '계좌번호', control: 'text', required: true },
    { key: 'pnm', label: '상품명', control: 'text', long: true },
    { key: 'gcd', label: '계좌구분코드', control: 'text' },
    { key: 'g', label: '계좌구분', control: 'text' },
    { key: 'jcd', label: '계정구분코드', control: 'text' },
    { key: 'j', label: '계정구분', control: 'text' },
    { key: 'kcd', label: '계좌종류코드', control: 'text' },
    { key: 'k', label: '계좌종류', control: 'text' },
    { key: 'st', label: '개시일', control: 'date' },
    { key: 'en', label: '종료일', control: 'date' },
    { key: 'rate', label: '이율(%)', control: 'text' },
    { key: 'won', label: '원본액', control: 'number' },
    { key: 'fcd', label: '금융기관코드', control: 'text' },
    { key: 'fnm', label: '금융기관명', control: 'text' },
    { key: 'subj', label: '계정과목', control: 'text' },
    { key: 'reg', label: '등록일자', control: 'date' },
    { key: 'memo', label: '비고', control: 'textarea' },
  ],
  provenance: prov('S3_103_계좌정보관리.html'),
});

/* ④ 입출금정보 — 목록 컬럼 = S3_106 입출금정보조회 19열(No 제외 18). 2단 헤더 '거래금액' 아래 두 칸은 평면 폼이라 접두사를 붙인다.
   입출금구분은 원문 ioTag 가 구분하는 두 값(입금·출금)만 선택지로 둔다 */
export const CASHFLOW_FORM: PageSchema = parsePageSchema({
  route: '입출금 정보관리/폼', title: '입출금정보 등록', kind: 'form', entity: '입출금정보',
  columns: [{ key: 'acct', label: '계좌번호', type: 'text' }],
  fields: [
    { key: 'acct', label: '계좌번호', control: 'text', required: true },
    { key: 'dt', label: '거래일자', control: 'date', required: true },
    { key: 'seq', label: '거래순번', control: 'number' },
    { key: 'tc', label: '거래구분코드', control: 'text' },
    { key: 'td', label: '거래구분', control: 'text' },
    { key: 'ic', label: '입출금구분코드', control: 'text' },
    { key: 'io', label: '입출금구분', control: 'select', options: ['입금', '출금'] },
    { key: 'prin', label: '거래금액 원금', control: 'number' },
    { key: 'pl', label: '거래금액 손익', control: 'number' },
    { key: 'bal', label: '거래후잔액', control: 'number' },
    { key: 'pc', label: '거래처코드', control: 'text' },
    { key: 'party', label: '거래처', control: 'text' },
    { key: 'cp', label: '상대계좌', control: 'text' },
    { key: 'inv', label: '출자금액', control: 'number' },
    { key: 'rp', label: '회수원금', control: 'number' },
    { key: 'rpl', label: '회수손익', control: 'number' },
    { key: 'rd', label: '등록일자', control: 'date' },
    { key: 'memo', label: '적요', control: 'textarea' },
  ],
  provenance: prov('S3_105_입출금정보관리.html'),
});
