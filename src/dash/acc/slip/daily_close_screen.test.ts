/* 일마감(ACC-007) 화면 계약 — 소스 문자열 가드. 상세필터가 없는 화면이라 acc_skill_rules 가드 ①(!filterOpen)에서 빠지므로
   단축키·잔여폭 컬럼·truncate 셀·오류 단일 표시를 여기서 지킨다. */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';

const src = readSrc('daily_close_manage.tsx');
const bulk = readSrc('daily_close_bulk_modal.tsx');
const colBlock = src.slice(src.indexOf('const COLUMNS'), src.indexOf('];', src.indexOf('const COLUMNS')));

describe('일마감 화면 계약', () => {
  it('목록 단축키(인쇄·내보내기)는 모달이 열린 동안 꺼진다', () => {
    expect(src).toMatch(/const listKeys = modal === null;/);
    expect(src).toMatch(/useHotkey\(HOTKEYS\.print\.combo, printGrid, \{ enabled: listKeys, skipInDialog: true \}\)/);
    expect(src).toMatch(/useHotkey\(HOTKEYS\.export\.combo, [^\n]*\{ enabled: listKeys, skipInDialog: true \}\)/);
  });
  it('AUTO_SIZE_CONTENT 그리드 — 잔여폭 흡수 컬럼은 비고 1개', () => {
    expect(src).toContain('autoSizeStrategy={AUTO_SIZE_CONTENT}');
    const flex = colBlock.split('\n').filter((l) => /flex: 1\b/.test(l));
    expect(flex).toHaveLength(1);
    expect(flex[0]).toMatch(/headerName: '비고', flex: 1, minWidth: \d+, width: \d+, suppressAutoSize: true/);
    expect(flex[0]).not.toContain('maxWidth');
  });
  it('긴 텍스트(계정구분·비고)는 truncate span 렌더러', () => {
    expect(src).toMatch(/const textCell = [^\n]*className="min-w-0 truncate"/);
    for (const h of ['계정구분', '비고']) expect(colBlock).toMatch(new RegExp(`headerName: '${h}'[^\\n]*cellRenderer: textCell`));
  });
  it('일괄 마감 — 점검 미리보기는 참조 안정 콜백 · 오류는 모달 인라인 한 곳', () => {
    expect(src).toMatch(/const bulkPlanFor = useCallback\(/);
    expect(src).toContain('plan={bulkPlanFor}');
    expect(bulk).not.toContain('onError');
    expect(bulk).toContain('role="alert"');
  });
  it('비고 저장 — 변경이 없어도 같은 저장 안내(설계서에 없는 문구 금지)', () => {
    expect(src).not.toContain('NO_CHANGE');
    expect(src).toMatch(/if \(r\) apply\(r\);[^\n]*\n\s*toast\.success\(REMARK_SAVED\);/);
  });
});
