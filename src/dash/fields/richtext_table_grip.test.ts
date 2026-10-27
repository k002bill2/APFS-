/* 에디터 표 그립 배치 가드(2026-10-27).
   증상: "표가 드래그 이동이 안 된다" 리포트 2회(07-07, 10-27). 기능은 정상 — 그립 위치가 문제였다.
   ① 07-07: 행 그립(첫 셀 왼쪽 -24px)이 블록 핸들 레인(left:-22, w18)을 차지해 표 이동 그립과 겹침.
   ② 07-07 수정이 표 그립을 표 위 모서리(top:-24)로 빼자, 블록 간격(~12px)이 좁아 앞 블록(제목) 줄 옆에
      붙어 그 블록 핸들처럼 보였고, 블록 핸들 자리엔 행 그립이 떠서 그걸 잡으면 표 밖 드롭은 무반응.
   규칙(Plate 공식 표와 동일): 표 이동 = 다른 블록과 같은 레인, 행 이동 = 표 왼쪽 테두리 위.
   좌표 기준: 블록 핸들은 .apfs-rt-blockdrag, 행 그립은 첫 셀(td) 기준 absolute — 표가 블록 래퍼 폭을
   그대로 채우므로(가로 margin 0) 두 원점의 x 가 같다. */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../test_src';

const css = readSrc('richtext.css');

// 줄 머리에서 시작하는 단독 셀렉터 블록의 본문(다른 셀렉터에 섞인 동명 클래스 제외)
const block = (selector: string): string => {
  const m = css.match(new RegExp(`^${selector.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`, 'm'));
  if (!m) throw new Error(`${selector} 규칙 없음`);
  return m[1];
};
// px 값 하나(padding-left 같은 접두 속성은 제외)
const px = (body: string, prop: string): number => {
  const m = body.match(new RegExp(`(?:^|[;\\s{])${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`));
  if (!m) throw new Error(`${prop} 값 없음`);
  return Number(m[1]);
};

describe('에디터 표 그립 배치', () => {
  it('표 이동 그립은 다른 블록 핸들과 같은 레인 — is-table 전용 top/left 오버라이드 금지', () => {
    expect(css).not.toMatch(/\.is-table[^{]*\.apfs-rt-draghandle[^{]*\{[^}]*(?:^|[;\s{])(?:top|left)\s*:/m);
  });

  it('행 그립은 블록 핸들 레인과 겹치지 않는다', () => {
    const lane = block('.apfs-rt-draghandle');
    const laneEnd = px(lane, 'left') + px(lane, 'width');
    expect(px(block('.apfs-rt-rowgrip'), 'left')).toBeGreaterThanOrEqual(laneEnd);
  });

  it('행 그립은 셀 글자를 가리지 않는다 — 셀 왼쪽 패딩 안에서 끝남', () => {
    const grip = block('.apfs-rt-rowgrip');
    const cell = css.match(/\.apfs-rt-table td, \.apfs-prose \.apfs-rt-table th \{[^}]*padding:\s*\d+px\s+(\d+)px/);
    if (!cell) throw new Error('셀 padding 규칙 없음');
    expect(px(grip, 'left') + px(grip, 'width')).toBeLessThanOrEqual(Number(cell[1]));
  });
});
