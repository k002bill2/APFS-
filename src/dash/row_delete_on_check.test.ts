/* 반복행 편집 표의 행삭제 규칙 가드(2026-11-09 사용자 지시 — "행삭제는 체크박스 체크시 나타나게해 이건 룰로 모두 적용하게 해").
   행을 지우는 도구는 **선택 체크박스로 고른 행이 있을 때만** 나타난다(0건이면 DOM 에 없음). 상시 [행삭제]·행마다 붙은 휴지통 아이콘·
   행 클릭 선택은 쓰지 않는다. 정본 선례: gp_quant_indicator_modal(운용사 정량지표) · journal_entry_screen(전표 분개) ·
   partner_form_modal(계좌 [삭제]) · closing_form_manage(선택 바). 규칙 문서: .claude/rules/frontend-design-defaults.md 16 · apfs-form-modal 규약 7.
   제외: fields/RichText*(에디터 표 도구 — 반복행 폼이 아니다). 우클릭 메뉴 '행 삭제'(asset_funding — 체크박스 열이 없는 화면, 09-17 결정)는
   버튼이 아니라 이 가드에 걸리지 않는다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { walkDash, DASH_DIR } from './test_src';

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const EXEMPT = /fields[\\/]RichText/;
const SRC = walkDash()
  .filter((p) => p.endsWith('.tsx') && !EXEMPT.test(p))
  .map((p) => ({ file: relative(DASH_DIR, p), src: strip(readFileSync(p, 'utf8')) }));

/* 게이트 = 체크 건수 > 0 조건(`sel.size > 0 &&` · `selCount > 0 ?` · `selIds.length > 0 ? (`) — 버튼 **앞** 800자 안 */
const GATE = /(\.size|\.length|[Cc]ount)\w*\s*>\s*0\s*(&&|\?)/;
const DELETE_BTN = />행삭제<\/Button>/g;

describe('반복행 편집 — [행삭제]는 체크했을 때만', () => {
  it('[행삭제] 버튼을 쓰는 화면이 실제로 수집된다(0건 통과 방지)', () => {
    expect(SRC.filter(({ src }) => /행삭제<\/Button>/.test(src)).length).toBeGreaterThanOrEqual(4);
  });

  it('[행삭제]는 체크 건수 게이트 안에서만 렌더한다', () => {
    const hits = SRC.flatMap(({ file, src }) => [...src.matchAll(DELETE_BTN)]
      .filter((m) => !GATE.test(src.slice(Math.max(0, (m.index ?? 0) - 800), m.index)))
      .map((m) => `${file}:${src.slice(0, m.index).split('\n').length}`));
    expect(hits).toEqual([]);
  });

  it('행마다 붙은 휴지통 버튼(표 셀 안 trash IconBtn)이 없다', () => {
    const hits = SRC.filter(({ src }) => /<td[^>]*>\s*<IconBtn[^>]*icon="trash"/.test(src)).map(({ file }) => file);
    expect(hits).toEqual([]);
  });
});

/* 규칙이 하네스·문서에 남아 있는지(2026-11-09 사용자 "전체 스킬이나 룰, 문서에 저장해놔야해") — 한 곳이라도 지워지면
   다음 작업자가 옛 서술(행별 휴지통 열 등)을 따라 되살린다. 파일 → 그 파일 안 규칙 문구 */
describe('행삭제 규칙이 룰·스킬·문서에 남아 있다', () => {
  const ROOT = join(DASH_DIR, '..', '..');
  const DOCS: Record<string, string> = {
    '.claude/rules/frontend-design-defaults.md': '16. 반복행 편집 표의 상시 `[행삭제]`',
    '.claude/skills/apfs-form-modal/SKILL.md': '행삭제 = 체크했을 때만',
    '.claude/skills/apfs-aggrid/SKILL.md': '[행삭제]는 체크했을 때만',
    '.claude/skills/apfs-grid/SKILL.md': '행을 체크했을 때만 선택 바에 나타난다',
    '.claude/skills/apfs-manage-page/SKILL.md': '[행삭제]는 첫 열 체크박스로 고른 행이 있을 때만',
    '.claude/skills/dashboard-ui/SKILL.md': '반복행 행삭제 = 체크했을 때만',
    '.claude/hooks/skill-rules.json': '"행삭제", "행 삭제"',
    'docs/design-rules/REPORT-opus55-design-defaults.md': '| 16 | 반복행 상시 [행삭제]',
    'scripts/uiux-doc/common_sections.py': "고른 행이 있을 때만 'N건 선택됨 · [행삭제]'",
    'CLAUDE.md': '금지 패턴 16개',
  };
  it.each(Object.entries(DOCS))('%s', (file, marker) => {
    expect(readFileSync(join(ROOT, file), 'utf8')).toContain(marker);
  });
});
