/* 테스트 전용 — 소스 파일을 basename 으로 찾는다. 페이지가 도메인 폴더(iam/·ews/·trs/ …)로
   나뉘어 있어 './x.tsx' 고정 경로를 쓰면 파일 이동 때마다 가드 테스트가 깨진다. 동명 파일이 둘 이상이면 throw. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename as baseOf } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DASH_DIR = fileURLToPath(new URL('.', import.meta.url));   // src/dash/

export function walkDash(dir: string = DASH_DIR): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walkDash(p) : [p];
  });
}

export function srcPath(basename: string): string {
  const hits = walkDash().filter((p) => baseOf(p) === basename);
  if (hits.length !== 1) throw new Error(`srcPath(${basename}): ${hits.length}건 일치`);
  return hits[0];
}

export const readSrc = (basename: string): string => readFileSync(srcPath(basename), 'utf8');

/** 인라인 필터 패널(`<FilterPanel …>…</FilterPanel>`, filter_panel.tsx) 소스 구간 — 상세필터 드로어(`<SheetContent>`) 대신 읽는다(2026-11-17).
    한 파일에 패널이 없으면 '' */
export function panelSrc(src: string): string {
  const a = src.indexOf('<FilterPanel');
  return a < 0 ? '' : src.slice(a, src.indexOf('</FilterPanel>', a));
}

/** 패널 칸 항목명 순서 — `<Panel* label="…"` (칩 label·칸 aria-label 과 같은 값) */
export const panelLabels = (src: string): string[] =>
  [...panelSrc(src).matchAll(/<Panel\w+ label="([^"]+)"/g)].map((m) => m[1]);
