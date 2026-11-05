/* 전표검색(ACC-008) 화면 계약 — 소스 문자열 가드. 그리드 20열 순서(slide 10) · 차변·대변만 우측 · 검증·토스트 문구 연결. */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';

const src = readSrc('journal_search_manage.tsx');
/* columnDefs 블록만 — EXPORT_COLS 는 field: 를 쓰지 않는다 */
const colBlock = src.slice(src.indexOf('const columnDefs'), src.indexOf('];', src.indexOf('const columnDefs')));
const colLines = colBlock.split('\n').filter((l) => l.includes("field: '"));

describe('전표검색 화면 계약', () => {
  it('그리드 20열 — slide 10 순서', () => {
    const fields = colLines.map((l) => /field: '([^']+)'/.exec(l)![1]);
    expect(fields).toEqual([
      'fundAccount', 'writtenDate', 'seq', 'journalNo', 'memo', 'accountCode', 'accountName', 'subItem', 'debit', 'credit',
      'partner', 'dept', 'writer', 'slipKind', 'origin', 'slipNo', 'plDept', 'plEmployee', 'createdBy', 'updatedBy',
    ]);
    expect((src.match(/field: '/g) ?? []).length).toBe(20);
  });
  it("우측 정렬(rightAligned)은 차변·대변뿐", () => {
    const right = colLines.filter((l) => l.includes("'rightAligned'")).map((l) => /field: '([^']+)'/.exec(l)![1]);
    expect(right).toEqual(['debit', 'credit']);
    expect((src.match(/rightAligned/g) ?? []).length).toBe(2);
  });
  it('상세필터 즉시 반영 — 기간·금액·금액(외화)을 applied 로 각자 검증, 실패면 결과 0건 · [필터 적용] = 닫기(2026-11-03)', () => {
    expect(src).toContain('validateRange(applied.from, applied.to)');
    expect(src).toContain('validateAmountRange(applied.amountMin, applied.amountMax)');
    expect(src).toContain('validateForeignAmountRange(applied.foreignAmountMin, applied.foreignAmountMax)');
    expect(src).toMatch(/rangeBad \? \[\] : filterLines\(rows, applied\)/);
    expect(src).toMatch(/onClick=\{\(\) => setFilterOpen\(false\)\}>필터 적용</);
    expect(src).not.toMatch(/commitFilter|enterCommits|setDraft|toast\.error\(err\)/);
  });
  it('상세필터 20항목 — slide 11 정의표 순서', () => {
    const drawer = src.slice(src.indexOf('<SheetContent'), src.indexOf('</SheetContent>'));
    const labels = [...drawer.matchAll(/<DrawerField label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual([
      '계정구분', '기간', '작성자', '계정과목', '거래처', '적요', '전표번호', '작성부서', '전표구분', '전표발생구분',
      '상단적요', '금액', '통화', '금액(외화)', '손익부서', '손익사원', '증빙구분', '증빙파일명', '증빙미첨부사유', '거래처 사업자등록번호',
    ]);
  });
  it('E02·E05 토스트 문구', () => {
    expect(src).toContain("toast.success('조회되었습니다')");
    expect(src).toContain("toast.success('Excel로 내보냈습니다')");
  });
  it('Enter 상세 열기는 IME 조합·조합키를 거른다', () => {
    expect(src).toMatch(/ev\.isComposing \|\| ev\.altKey \|\| ev\.ctrlKey \|\| ev\.metaKey \|\| ev\.shiftKey/);
  });
  it('E03 전표상세 = 그리드 도구 미노출 + [복사](onCopy) → exit 뒤 복사 등록(mode copy)', () => {
    /* 상세: readOnly + hideGridTools + onCopy 는 의도만 기록(상세 exit 중 state 변경 금지) */
    expect(src).toMatch(/readOnly hideGridTools onSave=\{\(j\) => j\}\s+onCopy=\{\(\) => \{ copyPendingRef\.current = true; \}\}/);
    /* 상세 onClose(exit 종료 뒤)에서만 복사 등록을 연다 */
    expect(src).toMatch(/if \(copyPendingRef\.current\) \{ copyPendingRef\.current = false; setModal\(\{ kind: 'copy', row \}\); return; \}/);
    expect(src).toContain("entry={{ mode: 'copy', source: modal.row.journal }}");
    /* 공용 화면: [복사]는 readOnly·비삭제·onCopy 일 때만, 콜백 뒤 ref.close() */
    const screen = readSrc('journal_entry_screen.tsx');
    expect(screen).toContain('const showCopy = forceReadOnly && !deleted && !!onCopy;');
    /* ACC-008 경로(readOnly + hideGridTools)가 그리드 도구 미노출 조건에 남아 있어야 한다 — viewOnlyGrid = 삭제전표 상세·증빙첨부 */
    expect(screen).toContain('const viewOnlyGrid = !!deleted || evidence;');
    expect(screen).toContain('const noGridTools = viewOnlyGrid || (forceReadOnly && hideGridTools);');
    expect(screen).toMatch(/onClick=\{\(\) => \{ onCopy\?\.\(\); dlgRef\.current\?\.close\(\); \}\}>복사<\/Button>/);
  });
});
