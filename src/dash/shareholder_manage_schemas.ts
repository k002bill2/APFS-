/* 운용사 주주변동관리 — 편집 팝업 폼 스키마 2종 (주주변동 등록 / 주주변동 해제등록).
   필드 순서·라벨·옵션·placeholder 는 목업 `S2_55_주주변동관리.html` 의 `openReg()`·`openRelease()`
   (= S2_56 등록화면 팝업 정의를 그대로 이식한 것) 실측 그대로다. 창작 항목 없음.

   ⚠️ schemas/index.ts ALL 에 등록하지 않는다 — 라우트 가능한 페이지가 아니라 이 화면이 직접
   소비하는 모달 전용 스키마다(등록하면 route 충돌 가능). 대신 모듈 스코프에서 parsePageSchema 로
   zod 검증해, 없는 control 을 쓰면 import 시점에 즉시 실패한다(violation_manage_schemas 와 동형). */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

/* ── 공통코드 옵션 — 목업 select 의 option 집합 그대로 ── */
export const OPT_GP = ['(주)아이비케이캐피탈'];                       // 운용사(등록 폼 · 필터 공용)
export const OPT_VT = ['주주변동', '법인-개인주주변동'];              // 변동구분

const PROVENANCE = {
  capturedAt: '2026-09-22',
  sourceSystem: 'FFMS(S2) 조기경보시스템 KRDS TO-BE',
  captureFile: 'S2_55_주주변동관리.html',
};

/* 리스트 컬럼은 페이지(shareholder_manage.tsx)가 AG Grid ColDef 로 직접 소유한다.
   PageSchemaZ 가 columns 를 필수로 요구해 모달 스키마에도 대표 컬럼만 선언한다(렌더엔 미사용). */
const REP_COLUMNS: PageSchema['columns'] = [
  { key: 'ym', label: '기준년월', type: 'date' },
  { key: 'gp', label: '운용사', type: 'gp' },
  { key: 'g', label: '구분', type: 'status' },
];

/* ① 주주변동 등록 — 목업 `openReg()` 의 modal-body row() 호출 순서 그대로(6항목).
   ⚠ 목업에 `*`(필수) 표기가 **한 항목도 없다** → 임의로 required 를 만들지 않는다.
     조건부 필수(형제 화면 S2_53 의 `syncFundReq`)도 이 원문엔 없다.
   ⚠ 항목 6개는 RowFormModal 의 2단 wide 경계(`fields.length > 6`)에 **걸리지 않는다** →
     1단 좁은 모달(max-w-[460px])이 규격이다. long:true 는 그 안에서 컨트롤 폭 100% 만 켠다. */
export const SHAREHOLDER_SCHEMA: PageSchema = parsePageSchema({
  route: '운용사 주주변동관리/등록', title: '주주변동 등록', kind: 'form', entity: '주주변동',
  columns: REP_COLUMNS,
  fields: [
    /* 목업 `<input id="rm-ym" readonly placeholder="YYYY-MM">` + bindPick(ym,'month') = 월 그리드 픽커.
       우리 대응물은 control:'month'(PeriodPicker mode='month', 값 'YYYY-MM') — 손입력이 아니라 선택이다. */
    { key: 'ym', label: '등록년월', control: 'month' },
    /* 변동일자 = 그리드의 `주주변동일자`(목업 DATA 키 `cd`) — 새 컬럼이 아니다. */
    { key: 'cd', label: '변동일자', control: 'date' },
    { key: 'gp', label: '운용사', control: 'select', options: OPT_GP },
    { key: 'vt', label: '변동구분', control: 'select', options: OPT_VT },
    { key: 'cont', label: '변동내역', control: 'textarea', long: true, placeholder: '변동 내역 입력' },
    /* 변동사유는 **그리드 컬럼이 아니다**(목업 thead 8컬럼에 없다) — 행 상태로만 보존한다. */
    { key: 'reason', label: '변동사유', control: 'textarea', long: true, placeholder: '변동 사유 입력' },
  ],
  provenance: PROVENANCE,
});

/* ② 주주변동 해제등록 — 목업 `openRelease()` 그대로(선택 대상 readonly · 해제일자*).
   ⚠ 목업엔 **해제사유 입력이 없다** — 형제 화면(S2_53)엔 있지만 이 원문엔 없어 만들지 않는다.
   선택 대상은 화면 상태에서 주입하는 읽기전용 값이다(입력 대상 아님). */
export const RELEASE_SCHEMA: PageSchema = parsePageSchema({
  route: '운용사 주주변동관리/해제등록', title: '주주변동 해제등록', kind: 'form', entity: '주주변동',
  columns: REP_COLUMNS,
  fields: [
    { key: 'target', label: '선택 대상', control: 'readonly' },
    { key: 'rd', label: '해제일자', control: 'date', required: true },
  ],
  provenance: PROVENANCE,
});
