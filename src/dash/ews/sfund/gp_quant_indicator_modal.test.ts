/* 운용사 정량지표 등록/수정 모달 도구 위치 가드 — 2026-11-06 사용자 지시 + apfs-form-modal 규약 7.
   [행추가]는 운용사 유형 select 바로 뒤(ml-auto 없음), [행삭제]는 선택 시에만·danger, 그리드 아래 버튼 줄 없음.
   선례: acc/acc_modal_section_tools.test.ts */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';

describe('gp_quant_indicator_modal — 행추가는 운용사 유형 옆, 행삭제는 선택 시에만', () => {
  const src = readSrc('gp_quant_indicator_modal.tsx');
  const body = src.slice(src.indexOf('export function GpQuantIndicatorModal'));
  const selectAt = body.indexOf('<SearchableSelect');
  const addAt = body.indexOf('>행추가</Button>');
  const gridAt = body.indexOf('<AgGridReact');

  it('[행추가]가 운용사 유형 select 뒤·그리드 앞, 같은 줄에 ml-auto 없음', () => {
    expect(selectAt).toBeGreaterThan(-1);
    expect(addAt).toBeGreaterThan(selectAt);
    expect(gridAt).toBeGreaterThan(addAt);
    expect(body.slice(selectAt, addAt)).not.toMatch(/ml-auto|justify-between/);
  });

  it('[행삭제]는 selCount > 0 조건부·danger, [행추가] 뒤', () => {
    const condAt = body.indexOf('{selCount > 0 ?');
    const delM = body.match(/variant="primary" size="sm" leadingIcon="trash" style=\{\{ background: 'var\(--danger\)' \}\} onClick=\{deleteRows\}>행삭제</);
    expect(condAt).toBeGreaterThan(addAt);
    expect(delM).not.toBeNull();
    expect(body.indexOf(delM![0])).toBeGreaterThan(condAt);
    expect(body.indexOf(delM![0])).toBeLessThan(gridAt);
  });

  it('그리드 아래 버튼 줄·"체크박스로 행 선택" 캡션 없음', () => {
    const afterGrid = body.slice(gridAt);
    expect(afterGrid).not.toMatch(/>\s*행(추가|삭제)\s*<\/Button>/);   // 핸들러가 화살표 함수여도 잡히게 버튼 라벨로 검사
    expect(src).not.toMatch(/체크박스로 행 선택/);
  });
});
