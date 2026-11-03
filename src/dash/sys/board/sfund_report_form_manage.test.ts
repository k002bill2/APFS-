/* 자펀드보고양식관리(운용사ERP)(ADM-012) — 배선 가드(소스 문자열). 업무 규칙은 sfund_report_form_model.test.ts. */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';
import { FORM_SCHEMA, VERSION_SCHEMA } from './sfund_report_form_schemas';

const page = readSrc('sfund_report_form_manage.tsx');
const modals = readSrc('sfund_report_form_modals.tsx');
const LABEL = '자펀드보고양식관리(운용사ERP)';

describe('자펀드보고양식관리(운용사ERP) 배선', () => {
  it('제목·crumbs 리프·favRoute = 메뉴 리프 라벨·path, app 이 이 화면으로 연결', () => {
    expect(readSrc('data.ts')).toContain(`{ label:"${LABEL}", path:"sfund-report-form-manage" }`);
    expect(page).toContain(`const LABEL = '${LABEL}'`);
    expect(page).toContain("crumbs={['홈', '관리자', '게시판', LABEL]}");
    expect(page).toContain("const ROUTE = 'sfund-report-form-manage'");
    expect(readSrc('app.tsx')).toContain('route === "sfund-report-form-manage") page = <SfundReportFormManage');
  });

  it('엑셀 파일명에 파일명 금지문자가 없다(괄호는 허용)', () => {
    expect(LABEL).not.toMatch(/[\\/:*?"<>|]/);
    expect(page).toContain('XLSX.writeFile(wb, `${LABEL}.xlsx`)');
  });

  it('단건 CRUD — 선택 UI 없음 · KPI 배지 행 없음 · 새 버전 등록 = 우클릭 메뉴 + 수정 모달 푸터(키보드 경로)', () => {
    expect(page).not.toMatch(/rowSelection=\{|kpis=\{/);   // 머리 주석의 "rowSelection 없음" 은 prop 이 아니다
    expect(page).toContain("{ label: '새 버전 등록'");
    expect(page).toContain('onRowDoubleClicked={rowEvents.onRowDoubleClicked}');
    expect(page).toContain('onCellKeyDown={rowEvents.onCellKeyDown}');   // 셀 Enter = 수정·다운로드·이력 동치
    expect(modals).toMatch(/footerStart=\{<Button [^>]*onClick=\{\(\) => setModal\(\{ kind: 'version', id: target\.id \}\)\}>새 버전 등록<\/Button>\}/);
    expect(modals).toContain('saveLabel="새 버전으로 등록"');   // 목업 저장 버튼 문구
  });

  it("버전 이력 배지 = SRP-007 과 같은 'N' + sr-only '최신 버전'(2026-10-30 사용자 결정)", () => {
    const badge = 'label={<>N<span className="sr-only"> 최신 버전</span></>}';
    expect(page).toContain(badge);
    expect(readSrc('report_guide.tsx')).toContain(badge);
    expect(page).not.toContain('label="최신"');
  });

  it('이력 칸 = 공용 LinkCell · 버전 이력 팝업 = SRP-007 공용 팝업 재사용', () => {
    expect(page).toMatch(/import \{ LinkCell \} from '\.\.\/\.\.\/link_cell'/);
    expect(modals).toMatch(/import \{ ReportGuideHistoryModal \} from '\.\.\/\.\.\/report_guide_history_modal'/);
  });

  it('모달 스키마는 레지스트리에 등록하지 않는다 · 필수 항목 = 목업', () => {
    expect(readSrc('index.ts')).not.toContain('sfund_report_form_schemas');
    expect(FORM_SCHEMA.fields.filter((f) => f.required).map((f) => f.key)).toEqual(['title']);
    expect(VERSION_SCHEMA.fields.filter((f) => f.required).map((f) => f.key)).toEqual(['ver', 'file']);
  });

  it('모달마다 key — 수정 → [새 버전 등록] 전환 시 RowFormModal 입력 state 재사용 금지', () => {
    expect(modals).toContain('key={`edit-${target.id}`}');
    expect(modals).toContain('key={`version-${target.id}`}');
  });

  it('색은 토큰만(hex 리터럴 없음) · 가운데 정렬 없음', () => {
    for (const s of [page, modals, readSrc('sfund_report_form_schemas.ts'), readSrc('sfund_report_form_model.ts')]) {
      expect(s).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
      expect(s).not.toMatch(/textAlign:\s*'center'|text-center/);
    }
  });
});

/* 삭제 후 modal 상태 잔존 회귀 — 확인창이 행 삭제와 함께 언마운트되면 지연된 onOpenChange(false) 가 오지 않는다(Codex P2) */
describe('자펀드보고양식 — 삭제는 모달 상태를 직접 비운다', () => {
  it('onDelete 가 setModal(null) 을 부른다', () => {
    expect(readSrc('sfund_report_form_manage.tsx')).toMatch(/onDelete: \(id: string\) => \{[^}]*setModal\(null\)/);
  });
});

