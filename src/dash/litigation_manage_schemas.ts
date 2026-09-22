/* 운용사 소송관리 — 편집 팝업 폼 스키마 2종 (소송 등록·수정 / 소송 해제등록).
   필드 순서·라벨·옵션·placeholder 는 목업 `S2_57_소송관리.html` 의 `openReg()`
   (= S2_58 등록화면 팝업 정의를 그대로 흡수한 것) 실측 그대로다. 창작 항목 없음.

   ⚠️ schemas/index.ts ALL 에 등록하지 않는다 — 라우트 가능한 페이지가 아니라 이 화면이 직접
   소비하는 모달 전용 스키마다(등록하면 route 충돌 가능). 대신 모듈 스코프에서 parsePageSchema 로
   zod 검증해, 없는 control 을 쓰면 import 시점에 즉시 실패한다(violation/shareholder 와 동형).

   ⚠️ **가정(원문 미정의)** — 해제등록 팝업은 S2_57 원문에 **정의가 없다**. 목업 `$('release')` 는
     `toast(n+'건 해제등록 처리 (목업)')` 로 토스트만 띄우고 끝난다. 그런데 그리드에 `해제일자`
     컬럼이 있어 어딘가에서 값이 와야 하므로, **형제 화면 S2_55(주주변동관리)의 `RELEASE_SCHEMA`
     규격**(선택 대상 readonly + 해제일자 required)을 그대로 차용했다. 창작이 아니라 차용임을
     여기 명시해 둔다 — 원문 팝업 정의가 확보되면 이 스키마를 그쪽으로 교체한다. */
import { parsePageSchema } from './schemas/types';
import type { PageSchema } from './schemas/types';

/* ── 공통코드 옵션 — 목업 select/radio 의 option 집합 그대로 ── */
export const OPT_GP = ['캐피탈원(주)'];          // 운용사(등록 폼 · 필터 공용 — 목업 확인된 1개뿐)
export const OPT_CONF = ['확정', '미확정'];      // 확정구분(목업 radio name="rm-fix")

const PROVENANCE = {
  capturedAt: '2026-09-22',
  sourceSystem: 'FFMS(S2) 조기경보시스템 KRDS TO-BE',
  captureFile: 'S2_57_소송관리.html',
};

/* 리스트 컬럼은 페이지(litigation_manage.tsx)가 AG Grid ColDef 로 직접 소유한다.
   PageSchemaZ 가 columns 를 필수로 요구해 모달 스키마에도 대표 컬럼만 선언한다(렌더엔 미사용). */
const REP_COLUMNS: PageSchema['columns'] = [
  { key: 'ym', label: '기준년월', type: 'date' },
  { key: 'mgr', label: '운용사', type: 'gp' },
  { key: 'gubun', label: '구분', type: 'status' },
];

/* ① 소송 등록/수정 — 목업 `openReg(idx)` 의 modal-body row() 호출 순서 그대로(5항목).
   제목은 호출 시점에 따라 모달 title prop 으로 바꾼다(등록/수정).
   ⚠ 목업은 5항목 **전부** `<span class="req">*</span>` 를 달고 있다 → required 를 빼거나 더하지 않는다.
   ⚠ 항목 5개는 RowFormModal 의 2단 wide 경계(`fields.length > 6`)에 **걸리지 않는다** →
     1단 좁은 모달(max-w-[460px])이 규격이다. long:true 는 그 안에서 컨트롤 폭 100% 만 켠다. */
export const LITIGATION_SCHEMA: PageSchema = parsePageSchema({
  route: '운용사 소송관리/등록', title: '소송 등록', kind: 'form', entity: '소송',
  columns: REP_COLUMNS,
  fields: [
    /* 목업 `<input id="rm-ym" readonly>` + openM(월 그리드 픽커) = 월 선택.
       우리 대응물은 control:'month'(PeriodPicker mode='month', 값 'YYYY-MM') — 손입력이 아니라 선택이다. */
    { key: 'ym', label: '등록년월', control: 'month', required: true },
    { key: 'mgr', label: '운용사', control: 'select', options: OPT_GP, required: true, lookup: true },
    { key: 'sdate', label: '소송일자', control: 'date', required: true },
    { key: 'conf', label: '확정구분', control: 'radio', options: OPT_CONF, required: true },
    { key: 'detail', label: '소송내용', control: 'textarea', long: true, placeholder: '소송 내용을 입력하세요', required: true },
  ],
  provenance: PROVENANCE,
});

/* ② 소송 해제등록 — **원문 미정의 → 형제 S2_55 RELEASE_SCHEMA 규격 차용**(파일 상단 '가정' 참조).
   ⚠ 해제사유 입력은 두지 않는다 — S2_55 에도 없고(S2_53 에만 있다) 이 원문엔 팝업 자체가 없어
     항목을 늘리는 쪽이 창작이다.
   선택 대상은 화면 상태에서 주입하는 읽기전용 값이다(입력 대상 아님). */
export const RELEASE_SCHEMA: PageSchema = parsePageSchema({
  route: '운용사 소송관리/해제등록', title: '소송 해제등록', kind: 'form', entity: '소송',
  columns: REP_COLUMNS,
  fields: [
    { key: 'target', label: '선택 대상', control: 'readonly' },
    { key: 'rdate', label: '해제일자', control: 'date', required: true },
  ],
  provenance: PROVENANCE,
});
