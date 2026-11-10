/* 공용 골격 ↔ 도메인 경계 가드(2026-11-10 — 다른 과제용 복제 apfs_fork 의 전제).
   도메인 폴더(공용 폴더 CORE_DIRS 밖의 최상위 폴더 전부 — APFS 는 acc·aut·brf·ews·frt·iam·sfr·sys·trs)
   밖의 실코드는 도메인을 import 하지 않는다.
   도메인을 아는 곳은 아래 조립 지점(composition root)뿐이다 — 복제본은 이 파일들만 새로 쓰고
   나머지 공용 파일은 APFS 와 동일하게 유지해 경로 한정 diff 로 수정을 옮긴다.
   APFS 전용 문구(GNB 제목·로고 alt·하드코딩 페이지 제목)와 상세 팝업 키·매핑도 공용 파일에 두지 않는다. */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { relative, resolve, dirname, sep } from 'node:path';
import { walkDash, DASH_DIR } from './test_src';

/* 공용 골격 폴더. 이 밖의 최상위 폴더는 전부 도메인으로 본다 — 새 도메인 폴더가 생겨도 자동으로 가드 대상이 되고,
   도메인 이름이 다른 복제 과제에서도 이 파일을 그대로 쓴다(공용 파일 바이트 동일 유지). */
const CORE_DIRS = ['assets', 'fields', 'motion', 'schemas', 'ui'];

/* 조립 지점 → 허용하는 도메인 import(정규식). 여기 없는 공용 파일은 도메인 import 0건이어야 한다. */
const COMPOSITION_ROOTS: Record<string, RegExp> = {
  'app.tsx': /.*/,                              // 라우트 분기
  'schemas/index.ts': /.*/,                     // 스키마 레지스트리
  'schemas/detail_popups.ts': /.*/,             // 상세 팝업 레지스트리(키 → 컴포넌트)
  'shell.tsx': /^\.\/frt\/widget\/main_widgets$/, // 메뉴 선택 모달(MenuPickerModal)이 위젯 목록을 쓴다
};

const rel = (p: string) => relative(DASH_DIR, p).split(sep).join('/');
const inDomain = (relPath: string) => relPath.includes('/') && !relPath.startsWith('..') && !CORE_DIRS.includes(relPath.split('/')[0]);
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

const coreFiles = walkDash()
  .filter((p) => /\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p))
  .filter((p) => !inDomain(rel(p)));

const IMPORT_RE = /(?:from\s+|import\s*\(\s*|import\s+)['"](\.[^'"]+)['"]/g;

function domainImports(file: string): string[] {
  const src = stripComments(readFileSync(file, 'utf8'));
  return [...src.matchAll(IMPORT_RE)]
    .map((m) => m[1])
    .filter((spec) => inDomain(rel(resolve(dirname(file), spec))));
}

describe('공용 골격은 도메인을 모른다', () => {
  it('검사 대상이 비어 있지 않다(빈 통과 방지)', () => {
    const names = coreFiles.map(rel);
    expect(names.length).toBeGreaterThan(100);
    for (const must of ['generic_list.tsx', 'grid_frame.tsx', 'shell.tsx', 'schemas/types.ts']) expect(names).toContain(must);
  });

  it('조립 지점 목록이 실존한다(목록 부패 방지)', () => {
    for (const f of Object.keys(COMPOSITION_ROOTS)) expect(existsSync(resolve(DASH_DIR, f)), f).toBe(true);
  });

  it('조립 지점 밖 공용 파일은 도메인 폴더를 import 하지 않는다', () => {
    const offenders = coreFiles.flatMap((f) => {
      const allow = COMPOSITION_ROOTS[rel(f)];
      return domainImports(f).filter((spec) => !allow || !allow.test(spec)).map((spec) => `${rel(f)} → ${spec}`);
    });
    expect(offenders).toEqual([]);
  });

  it('schemas/types.ts 는 상세 팝업 키를 직접 나열하지 않는다', () => {
    const src = stripComments(readFileSync(resolve(DASH_DIR, 'schemas/types.ts'), 'utf8'));
    expect(src).not.toMatch(/DETAIL_POPUPS\s*=\s*\[/);
  });

  it('shell.tsx 에 APFS 전용 문구·페이지 제목 맵이 없다(data.ts 가 갖는다)', () => {
    const src = stripComments(readFileSync(resolve(DASH_DIR, 'shell.tsx'), 'utf8'));
    expect(src).not.toMatch(/농림수산식품모태펀드|농업정책보험금융원/);
    expect(src).not.toMatch(/const pages\s*:/);
  });
});
