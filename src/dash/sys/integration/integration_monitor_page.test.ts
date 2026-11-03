import { describe, it, expect } from 'vitest';
import { readSrc } from '../../test_src';

/* 탭 전환 = 필터 맥락 전환 — 적용 칩 묶음이 탭마다 달라(요청기간 ↔ 발생기간) 공용 칩 행이 이를 '방금 건 필터'로 보고
   3초 툴팁을 띄우면, 그 툴팁 레이어가 직후에 연 상세 팝업의 첫 Esc 를 가져간다(2026-11-02 실측: 연계처리이력 → 연계일련번호
   클릭 → Esc 1회로 안 닫힘). 탭 id 를 GridFrame filterScope 로 넘겨 칩 행을 탭마다 새로 마운트한다. */
describe('연동 모니터링 — 탭 전환이 칩 툴팁을 띄우지 않는다', () => {
  it('페이지가 활성 탭을 filterScope 로 넘긴다', () => {
    expect(readSrc('integration_monitor.tsx')).toContain('filterScope={tab}');
  });
  it('GridFrame 이 filterScope 를 칩 행 key 로 쓴다', () => {
    expect(readSrc('grid_frame.tsx')).toContain('<FilterChipRow key={filterScope}');
  });
});
