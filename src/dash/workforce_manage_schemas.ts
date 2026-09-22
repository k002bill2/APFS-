/* 운용인력 변동관리 — 등록 팝업 폼 스키마 1개 + 공통코드 옵션.
   필드 순서·라벨·옵션·placeholder 는 목업 `S2_59_운용인력변동관리.html` 의 `openReg()`
   (= S2_60 등록화면 팝업 정의와 항목 7개가 동일함을 실측 확인) 그대로다. 창작 항목 없음.

   ⚠️ schemas/index.ts ALL 에 등록하지 않는다 — 라우트 가능한 페이지가 아니라 이 화면이 직접
   소비하는 모달 전용 스키마다(등록하면 route 충돌 가능). 대신 모듈 스코프에서 parsePageSchema 로
   zod 검증해, 없는 control 을 쓰면 import 시점에 즉시 실패한다(litigation/shareholder 와 동형).

   ⚠️ **해제등록 스키마는 없다** — 형제 `litigation_manage_schemas.ts` 는 원문에 팝업 정의가 없어
     S2_55 의 `RELEASE_SCHEMA`(해제일자 date 입력)를 차용했지만, **S2_59 는 원문에 정의가 있다**:
     `role="alertdialog"` · "선택한 N건의 운용인력을 해제 처리하시겠습니까? 해제일자는 오늘 날짜로
     기록됩니다." · 푸터 `취소`+`해제등록`(danger). 입력 필드가 **없는** 확인 다이얼로그이므로
     스키마를 만들지 않고 AlertDialog 로 구현한다(→ workforce_form_modal.tsx ②).

   ⚠️ **복귀일자 ≠ 해제일자(원문 불일치, 해소하지 않음)** — 등록 폼에는 `복귀일자`(backdate)가 있고
     그리드에는 `해제일자`(rdate)가 있다. 해제일자는 해제등록 액션이 오늘 날짜로 채우고, 복귀일자는
     폼에만 존재해 그리드 컬럼이 없다(목업 thead 에도 없다). 원문 그대로 보존한다 — 둘을 같은 값으로
     묶거나 컬럼을 추가하는 쪽이 창작이다. `운용인력변동내용`(detail)도 같은 처지다(폼 전용). */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

/* ── 공통코드 옵션 — 목업 select 의 option 집합 그대로. 등록 폼과 상세필터 드로어가 공유한다 ── */
export const OPT_HR = ['대표펀드매니저', '운용인력'];   // 인력구분(목업 openReg 의 select 순서 그대로 — 그리드 DATA 순서와 다르다)
export const OPT_GP = ['트리거투자운용', '한국투자파트너스', 'IMM인베스트먼트'];
export const OPT_FUND = ['트리거-글로벌PEX투자조합', '한투 청년농식품투자조합', 'IMM 농식품 스마트투자조합'];

const PROVENANCE = {
  capturedAt: '2026-09-22',
  sourceSystem: 'FFMS(S2) 조기경보시스템 KRDS TO-BE',
  captureFile: 'S2_59_운용인력변동관리.html',
};

/* 리스트 컬럼은 페이지(workforce_manage.tsx)가 AG Grid ColDef 로 직접 소유한다.
   PageSchemaZ 가 columns 를 필수로 요구해 모달 스키마에도 대표 컬럼만 선언한다(렌더엔 미사용). */
const REP_COLUMNS: PageSchema['columns'] = [
  { key: 'ym', label: '기준년월', type: 'date' },
  { key: 'mgr', label: '운용사', type: 'gp' },
  { key: 'gubun', label: '구분', type: 'status' },
];

/* 운용인력변동 등록 — 목업 `openReg()` 의 modal-body row()/rowF() 호출 순서 그대로(7항목).
   ⚠ required 는 **4/7 만**이다 — 목업이 앞 4개(등록년월·인력구분·운용사·자펀드)에만
     `<span class="req">*</span>` 를 달았다. 나머지 3개(운용인력변동일자·복귀일자·운용인력변동내용)에는
     없다. 형제 litigation(5항목 전부 필수)을 베껴 전부 required 로 밀지 않는다.
   ⚠ 항목 7개는 RowFormModal 의 2단 wide 경계(`fields.length > 6`)를 **넘는다** →
     2단 wide 모달(max-w-[880px])이 규격이다. litigation 은 5항목이라 1단 좁은 모달이었다 — 여기가 다르다.
     `long:true` 인 textarea 는 그 2단 그리드에서 `sm:col-span-2`(전체 폭)를 차지한다. */
export const WORKFORCE_SCHEMA: PageSchema = parsePageSchema({
  route: '운용인력 변동관리/등록', title: '운용인력변동 등록', kind: 'form', entity: '운용인력변동',
  columns: REP_COLUMNS,
  fields: [
    /* 목업 `<input id="rg-ym" value="2026-07" readonly>` + openM(월 그리드 픽커) = 월 선택.
       우리 대응물은 control:'month'(PeriodPicker mode='month', 값 'YYYY-MM') — 손입력이 아니라 선택이다. */
    { key: 'ym', label: '등록년월', control: 'month', required: true },
    { key: 'hr', label: '인력구분', control: 'select', options: OPT_HR, required: true },
    { key: 'mgr', label: '운용사', control: 'select', options: OPT_GP, required: true, lookup: true },
    { key: 'fund', label: '자펀드', control: 'select', options: OPT_FUND, required: true, lookup: true },
    { key: 'cdate', label: '운용인력변동일자', control: 'date' },
    { key: 'backdate', label: '복귀일자', control: 'date' },
    { key: 'detail', label: '운용인력변동내용', control: 'textarea', long: true, placeholder: '운용인력 변동 내용을 입력하세요' },
  ],
  provenance: PROVENANCE,
});
