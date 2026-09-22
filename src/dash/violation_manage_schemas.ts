/* 법률/규약위반사항 관리 — 편집 팝업 폼 스키마 2종 (위반사항 등록·수정 / 위반사항 해제등록).
   필드 순서·라벨·옵션은 목업 `S2_53_법률_규약위반사항_관리.html`의 `openReg()`·`openRelease()`
   (= S2_54 등록화면 팝업 정의를 그대로 이식한 것) 실측 그대로다. 창작 항목 없음.

   ⚠️ schemas/index.ts ALL 에 등록하지 않는다 — 라우트 가능한 페이지가 아니라 이 화면이 직접
   소비하는 모달 전용 스키마다(등록하면 route 충돌 가능). 대신 모듈 스코프에서 parsePageSchema 로
   zod 검증해, 없는 control 을 쓰면 import 시점에 즉시 실패한다(subfund_manage_schemas 와 동형). */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

/* ── 공통코드 옵션 — 목업 select 의 option 집합 그대로 ── */
export const OPT_ORG = ['MOAF', '중소기업청', '농림수산식품부', '금융감독원', '해양수산부'];   // 적발기관
export const OPT_LAW = ['법령', '규약'];                                                    // 법령/규약위반
export const OPT_GP = ['주식회사 에쓰비인베스트먼트'];                                        // 운용사
export const OPT_FUND = ['에쓰비 농식품투자조합'];                                            // 자펀드
export const OPT_DISC = ['X', 'O'];                                                         // 공시여부
export const OPT_ACT = ['주의촉구', '경고', '시정명령', '기타'];                              // 조치구분
/* 위반형태 — 목업 `VF_LIST` 19종 순서 그대로 */
export const OPT_VF = [
  '경영지배목적', '납입자본금', '담보제공(채무보증)', '별도조건설정', '보고의무', '비업무용부동산',
  '사무실', '선관주의의무위반', '임원', '임직원대출', '자금중개', '전문인력', '제3자를위한주식취득',
  '조합거래', '주요주주/조합출자자거래', '특수관계인', '허위보고', '투자비율위반', '기타',
];

/* 검색박스 `구분` — **검색 대상 종류**를 고르는 값이다(그리드의 `구분`=등록/해제 컬럼이 아니다).
   목업 `LISTS` 키와 동일. */
export const OPT_SEARCH_KIND = ['운용사', '자펀드'] as const;
export type SearchKind = typeof OPT_SEARCH_KIND[number];

/* 조건부 필수(목업 `syncFundReq`) — 법령/규약위반이 '규약'이면 자펀드까지 필수, '법령'이면 운용사까지만.
   RowFormModal 은 정적 schema.fields[].required 만 보므로 이 규칙은 전용 모달이 런타임에 적용한다.
   키·판정값을 스키마 옆에 두어 모달이 문자열을 다시 적지 않게 한다. */
export const FUND_REQUIRED_WHEN = { key: 'fund', gateKey: 'law', gateValue: '규약' } as const;

const PROVENANCE = {
  capturedAt: '2026-09-22',
  sourceSystem: 'FFMS(S2) 조기경보시스템 KRDS TO-BE',
  captureFile: 'S2_53_법률_규약위반사항_관리.html',
};

/* 리스트 컬럼은 페이지(violation_manage.tsx)가 AG Grid ColDef 로 직접 소유한다.
   PageSchemaZ 가 columns 를 필수로 요구해 모달 스키마에도 대표 컬럼만 선언한다(렌더엔 미사용). */
const REP_COLUMNS: PageSchema['columns'] = [
  { key: 'ym', label: '기준년월', type: 'date' },
  { key: 'gp', label: '운용사', type: 'gp' },
  { key: 'gb', label: '구분', type: 'status' },
];

/* ① 위반사항 등록/수정 — 목업 `openReg(idx)` 의 modal-body row() 호출 순서 그대로(15항목).
   제목은 호출 시점에 따라 모달 title prop 으로 바꾼다(등록/수정). */
export const VIOLATION_SCHEMA: PageSchema = parsePageSchema({
  route: '법률/규약위반사항 관리/등록', title: '법률/규약위반사항 등록', kind: 'form', entity: '위반사항',
  columns: REP_COLUMNS,
  fields: [
    { key: 'ym', label: '등록년월', control: 'month', required: true },
    { key: 'org', label: '적발기관', control: 'select', options: OPT_ORG, required: true },
    { key: 'law', label: '법령/규약위반', control: 'select', options: OPT_LAW, required: true },
    { key: 'gp', label: '운용사', control: 'select', options: OPT_GP, required: true, lookup: true },
    /* 자펀드는 **조건부 필수**(FUND_REQUIRED_WHEN) — 정적 required 로 선언하지 않는다.
       법령 위반이면 운용사까지만 필수이므로 여기서 true 로 박으면 저장이 막힌다.
       ⚠ 첫 옵션이 **빈 값**이어야 한다(목업 DATA 1·3행처럼 자펀드 없는 법령 위반이 정상 상태다).
         빈 선택지가 없으면 값이 ''인 행을 수정으로 열 때 네이티브 <select> 가 목록에 없는 ''를 못 그려
         **첫 옵션(에쓰비…)을 선택된 것처럼 표시**하는데 실제 state 는 '' 이라 화면과 값이 어긋난다. */
    { key: 'fund', label: '자펀드', control: 'select', options: ['', ...OPT_FUND], lookup: true },
    { key: 'disc', label: '공시여부', control: 'select', options: OPT_DISC },
    { key: 'rep', label: '대표자', control: 'text', placeholder: '대표자명' },
    { key: 'chk', label: '점검구분', control: 'text', placeholder: '점검구분' },
    { key: 'vf', label: '위반형태', control: 'select', options: OPT_VF },
    { key: 'vc', label: '위반내용', control: 'textarea', long: true, placeholder: '위반내용 입력' },
    { key: 'act', label: '조치구분', control: 'select', options: OPT_ACT },
    { key: 'ac', label: '조치내용', control: 'textarea', long: true, placeholder: '조치내용 입력' },
    { key: 'od', label: '시정명령일자', control: 'date' },
    { key: 'pd', label: '완료예정일자', control: 'date' },
    { key: 'cd', label: '시정완료일자', control: 'date' },
  ],
  provenance: PROVENANCE,
});

/* ② 위반사항 해제등록 — 목업 `openRelease()` 그대로(선택 건수 readonly · 해제일자* · 해제사유).
   선택 건수는 화면 상태에서 주입하는 읽기전용 값이다(입력 대상 아님). */
export const RELEASE_SCHEMA: PageSchema = parsePageSchema({
  route: '법률/규약위반사항 관리/해제등록', title: '위반사항 해제등록', kind: 'form', entity: '위반사항',
  columns: REP_COLUMNS,
  fields: [
    { key: 'count', label: '선택 건수', control: 'readonly' },
    { key: 'rd', label: '해제일자', control: 'date', required: true },
    { key: 'reason', label: '해제사유', control: 'textarea', long: true, placeholder: '시정완료 등 해제 사유' },
  ],
  provenance: PROVENANCE,
});
