/* HTML 내보내기 편집 chrome 누수 가드(2026-10-27).
   증상: 내보낸 HTML 표 첫 칸마다 행 이동 그립(SVG 점 6개)이 그려지고, 셀마다 빈 리사이즈 핸들 div 가 남았다.
   원인: exportHtml 은 렌더된 DOM 을 클론해 편집 chrome 을 지우는데, 제거 목록에 표 행 그립·열/행 리사이즈·
        이미지 리사이즈 핸들이 빠져 있었다(표 리사이즈·행 dnd 를 붙일 때 목록 갱신 누락).
   가드: 목록을 여기 다시 적지 않고 RichTextElements 의 ResizeHandle className 을 직접 뽑아 대조한다 —
        다음에 핸들을 추가해도 제거 목록에 안 넣으면 이 테스트가 깨진다. */
import { describe, it, expect } from 'vitest';
import { readSrc } from '../test_src';

const elements = readSrc('RichTextElements.tsx');
const field = readSrc('RichTextField.tsx');

// exportHtml 의 편집 chrome 제거 셀렉터(드래그 핸들이 든 querySelectorAll 한 줄)
const stripped = (): string[] => {
  const m = field.match(/clone\.querySelectorAll\('([^']*\.apfs-rt-draghandle[^']*)'\)/);
  if (!m) throw new Error('exportHtml 제거 셀렉터 없음');
  return m[1].split(',').map((s) => s.trim().replace(/^\./, ''));
};

// 셀·이미지 안에 렌더되는 편집 전용 핸들 클래스 — ResizeHandle 전부 + 표 행 이동 그립
const editHandles = (): string[] => {
  const resize = [...elements.matchAll(/<ResizeHandle\b[\s\S]*?className="([^"\s]+)/g)].map((m) => m[1]);
  return [...new Set([...resize, 'apfs-rt-rowgrip'])];
};

describe('HTML 내보내기 — 편집 chrome 제거', () => {
  it('ResizeHandle 을 하나 이상 찾는다(정규식이 조용히 0건 통과하지 않게)', () => {
    expect(editHandles().length).toBeGreaterThanOrEqual(4);
  });

  it('리사이즈 핸들·행 그립은 모두 제거 목록에 있다', () => {
    const list = stripped();
    expect(editHandles().filter((c) => !list.includes(c))).toEqual([]);
  });
});
