/* 메뉴 트리 실측 추출 — gen_doc.py 가 `npx vite-node` 로 실행한다(TS 모듈을 그대로 import 하려고 vite-node).
   argv[2] 경로에 { tree, typed, schemaRoutes } JSON 을 쓴다.
   - tree: APFS_DATA.MENU 대분류 > 중분류 > 리프. 리프 type = typed(app.tsx 전용 분기) | schema(레지스트리) | default(미구현)
   - typed: app.tsx 의 `route === "…"` 분기 전부(메뉴 밖 라우트 포함)
   - schemaRoutes: ALL_SCHEMAS 등록 route 전부
   scripts/menu-doc/extract_app_menu.mjs 는 MENU 리터럴만 평탄화하고 화면 유형을 가르지 않아 따로 둔다. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APFS_DATA } from '../../src/dash/data';
import { ALL_SCHEMAS } from '../../src/dash/schemas';

const app = fs.readFileSync(fileURLToPath(new URL('../../src/dash/app.tsx', import.meta.url)), 'utf8');
const typed = [...new Set([...app.matchAll(/route === "([^"]+)"/g)].map((m) => m[1]))];
const schemaRoutes = ALL_SCHEMAS.map((s: any) => s.route);
const typeOf = (path: string) => (typed.includes(path) ? 'typed' : schemaRoutes.includes(path) ? 'schema' : 'default');

const tree = (APFS_DATA.MENU as any[]).map((t) => ({
  id: t.id, label: t.label, path: t.path,
  mids: (t.children || []).map((m: any) => ({
    label: m.label,
    leaves: m.children.map((l: any) => ({ label: l.label, path: l.path, type: typeOf(l.path) })),
  })),
}));
fs.writeFileSync(process.argv[2], JSON.stringify({ tree, typed, schemaRoutes }, null, 1));
