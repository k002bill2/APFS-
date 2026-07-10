# 캡처 기반 도메인 페이지 생성 (apfs-capture-schema) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `generic_list` 폴백을 **스키마 주도**로 개조하고, 현행시스템 캡처에서 화면당 `PageSchema`(TS)를 동결하는 스킬 `apfs-capture-schema`를 만들어, 메뉴 리프가 도메인별 컬럼·폼·더미데이터로 렌더되게 한다. (초기 스코프 = 핵심 소수 파일럿)

**Architecture:** 화면당 `src/dash/schemas/<route>.ts`(정적 PageSchema, zod 검증·동결) → `resolveSchema(route)`가 registry에서 조회(없으면 `DEFAULT_SCHEMA`=오늘 동작) → `GenericListPage`/`RowFormModal`이 스키마의 `columns`/`fields`를 **셀 타입 디스패처**로 렌더. complex(조건부·중첩·대사표) 화면은 스키마 트랙 밖, `risk.tsx`식 전용 페이지로 escalate.

**Tech Stack:** React 18 + TypeScript(esbuild, strict:false) · Vite · Tailwind 유틸 className · zod(경계 검증) · vitest(순수 로직 한정 신규) · 기존 UI 컴포넌트(`PageHeader/Card/StatusBadge/IconBtn/ColorChip/SegTabs/DeltaBadge/MiniBars`) + forest-green CSS 토큰.

## Global Constraints

- **회귀 0 불변식**: `resolveSchema`의 DEFAULT = 현 `generic_list` 동작(6열: 항목명·금액·변동률·상태·추이). 미등록 리프는 DEFAULT 폴백으로 안전 착지.
- **마스킹 fail-safe**: 셀/필드 렌더 디스패처의 **default = `MT`**(평문 절대 금지). `code`(영숫자 식별자)·`pii`(주민번호/계좌)는 1급 타입으로 **강제 마스킹**. `mn()`은 순수 숫자+서식기호에만. 표 헤더·축·탭·단위·StatusBadge·날짜 라벨은 **비마스킹**("축은 두고 데이터는 가린다").
- **파일 크기**: golden-principles — 함수 50줄·파일 800줄·네스팅 4 이내. `generic_list.tsx`(현 332줄)는 셀/필드 렌더러를 `schemas/renderers.tsx`로 추출해 얇게 유지.
- **불변성**: 항상 새 객체 생성(스프레드), 변경 금지.
- **빌드 게이트**: 이 프로젝트의 정본 게이트는 `npm run build`(vite/esbuild) green. 신규 `schemas/*.ts`는 타입 가능하므로 `npx tsc --noEmit`도 통과해야 함(레거시 에러와 구분: 새 파일만 깨끗).
- **반응형**: 페이지/모달/테이블 생성·수정 시 `responsive-ui` 스킬 체크리스트(모바일/태블릿/데스크톱) 필수.
- **커밋**: Conventional Commits. co-author 푸터는 수동 추가(`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`). 브랜치 `feat/design-sync`.
- **스코프 경계**: 파일럿 = 인프라 1회 + easy 화면 2개. complex 화면·전수(151장) OCR·라벨충돌 7건 전건 처리는 **이 plan 밖**(후속).

---

## File Structure

| 파일 | 책임 | 신규/수정 |
|------|------|-----------|
| `src/dash/schemas/types.ts` | PageSchema/ColumnSpec/FieldSpec/CellType 등 타입 + zod 스키마 | 신규 |
| `src/dash/schemas/_default.ts` | `DEFAULT_SCHEMA(route)` = 오늘 generic_list 동작 | 신규 |
| `src/dash/schemas/index.ts` | `buildRegistry`(중복키 throw) + `resolveSchema` + registry 등록 | 신규 |
| `src/dash/schemas/renderers.tsx` | `Cell`(셀 타입 디스패처) + `SchemaField`(폼 컨트롤 디스패처) + `cellKind`/`isMaskedType` 순수 헬퍼 | 신규 |
| `src/dash/schemas/<route>.ts` | 파일럿 화면 PageSchema(동결, provenance) ×2 | 신규 |
| `src/dash/schemas/*.test.ts` | resolveSchema·충돌·마스킹 디스패치 단위 테스트 | 신규 |
| `src/dash/generic_list.tsx` | 스키마 주도 렌더로 개조(컬럼/KPI/필터 스키마화) | 수정 |
| `src/dash/generic_list_modal.tsx` | `schema.fields` 순회 폼 + textarea/file/checkbox 컨트롤 | 수정 |
| `src/dash/data.ts` | 파일럿 화면이 라벨충돌이면 `path` 부여(해당 시) | 수정(조건부) |
| `vitest.config.ts` / `package.json` | vitest 설정 + `test` 스크립트(순수 로직 한정) | 신규/수정 |
| `.claude/skills/apfs-capture-schema/SKILL.md` | 스킬 SOP | 신규 |
| `.claude/hooks/skill-rules.json` | `apfs-capture-schema` 트리거 키워드 | 수정 |

---

## Task 1: 테스트 인프라 + 스키마 타입/zod

**Files:**
- Create: `vitest.config.ts`, `src/dash/schemas/types.ts`, `src/dash/schemas/types.test.ts`
- Modify: `package.json` (devDependencies + `test` 스크립트)

**Interfaces:**
- Produces: `PageSchema`, `ColumnSpec`, `FieldSpec`, `CellType`, `FieldControl`, `KpiSpec`, `StatusDomainEntry`, `Provenance` 타입 + `PageSchemaZ`(zod) + `parsePageSchema(obj): PageSchema`.

- [ ] **Step 1: vitest 설치**

Run:
```bash
npm install -D vitest@^2
```
Expected: package.json devDependencies에 vitest 추가, exit 0.

- [ ] **Step 2: package.json에 test 스크립트 추가**

`package.json` scripts에 추가:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: vitest.config.ts 작성**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/dash/schemas/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: 실패하는 테스트 작성 (zod 검증)**

`src/dash/schemas/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parsePageSchema } from './types';

const valid = {
  route: '연도별투자현황', title: '연도별 투자현황', kind: 'list', entity: '모태펀드',
  columns: [{ key: 'fund', label: '모펀드', type: 'text' }],
  fields: [{ key: 'fund', label: '모펀드', control: 'text' }],
  provenance: { capturedAt: '2026-05-28', sourceSystem: 'BRIEF', captureFile: 'image1.png' },
};

describe('parsePageSchema', () => {
  it('유효 스키마를 통과시킨다', () => {
    expect(parsePageSchema(valid).route).toBe('연도별투자현황');
  });
  it('미지원 CellType을 거부한다', () => {
    expect(() => parsePageSchema({ ...valid, columns: [{ key: 'x', label: 'X', type: 'bogus' }] })).toThrow();
  });
  it('provenance 누락을 거부한다', () => {
    const { provenance, ...noProv } = valid as any;
    expect(() => parsePageSchema(noProv)).toThrow();
  });
});
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `parsePageSchema`/`./types` 모듈 없음.

- [ ] **Step 6: types.ts 구현**

`src/dash/schemas/types.ts`:
```ts
import { z } from 'zod';
import type { Tone } from '../components';

export const CELL_TYPES = ['text','code','pii','amount','rate','date','status','gp','number'] as const;
export type CellType = typeof CELL_TYPES[number];

export const FIELD_CONTROLS = ['text','number','select','date','textarea','file','checkbox','readonly'] as const;
export type FieldControl = typeof FIELD_CONTROLS[number];

export interface ColumnSpec { key: string; label: string; type: CellType; unit?: string; align?: 'left'|'right'|'center'; group?: string; }
export interface FieldSpec { key: string; label: string; control: FieldControl; required?: boolean; options?: string[]; pii?: boolean; }
export interface KpiSpec { key: string; label: string; icon: string; color: string; from: 'sum'|'avg'|'rate'; column: string; }
export interface StatusDomainEntry { label: string; tone: Tone; }
export interface Provenance { capturedAt: string; sourceSystem: string; captureFile: string; sourceUrl?: string; }
export interface PageSchema {
  route: string; title: string; kind: 'list'|'form'; entity: string;
  columns: ColumnSpec[]; fields: FieldSpec[];
  filters?: string[]; kpis?: KpiSpec[]; statusDomain?: StatusDomainEntry[];
  provenance: Provenance;
}

const ColumnZ = z.object({
  key: z.string(), label: z.string(), type: z.enum(CELL_TYPES),
  unit: z.string().optional(), align: z.enum(['left','right','center']).optional(), group: z.string().optional(),
});
const FieldZ = z.object({
  key: z.string(), label: z.string(), control: z.enum(FIELD_CONTROLS),
  required: z.boolean().optional(), options: z.array(z.string()).optional(), pii: z.boolean().optional(),
});
const KpiZ = z.object({ key: z.string(), label: z.string(), icon: z.string(), color: z.string(), from: z.enum(['sum','avg','rate']), column: z.string() });
const ProvenanceZ = z.object({ capturedAt: z.string(), sourceSystem: z.string(), captureFile: z.string(), sourceUrl: z.string().optional() });

export const PageSchemaZ = z.object({
  route: z.string(), title: z.string(), kind: z.enum(['list','form']), entity: z.string(),
  columns: z.array(ColumnZ), fields: z.array(FieldZ),
  filters: z.array(z.string()).optional(), kpis: z.array(KpiZ).optional(),
  statusDomain: z.array(z.object({ label: z.string(), tone: z.string() })).optional(),
  provenance: ProvenanceZ,
});

export function parsePageSchema(obj: unknown): PageSchema {
  return PageSchemaZ.parse(obj) as PageSchema;
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 8: 커밋**

```bash
git add vitest.config.ts package.json package-lock.json src/dash/schemas/types.ts src/dash/schemas/types.test.ts
git commit -m "feat(schemas): PageSchema 타입 + zod 검증 + vitest 인프라

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: DEFAULT 스키마 + registry + resolveSchema (회귀 0)

**Files:**
- Create: `src/dash/schemas/_default.ts`, `src/dash/schemas/index.ts`, `src/dash/schemas/index.test.ts`

**Interfaces:**
- Consumes: `PageSchema` (Task 1).
- Produces: `DEFAULT_SCHEMA(route: string): PageSchema`, `buildRegistry(list: PageSchema[]): Record<string, PageSchema>`, `resolveSchema(route: string): PageSchema`.

- [ ] **Step 1: 실패 테스트 작성**

`src/dash/schemas/index.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveSchema, buildRegistry } from './index';
import { DEFAULT_SCHEMA } from './_default';

describe('resolveSchema', () => {
  it('미등록 route는 DEFAULT(오늘 동작) 스키마를 반환한다', () => {
    const s = resolveSchema('존재하지않는메뉴');
    expect(s.columns.map(c => c.key)).toEqual(DEFAULT_SCHEMA('x').columns.map(c => c.key));
    expect(s.title).toBe('존재하지않는메뉴');
  });
});

describe('buildRegistry', () => {
  it('중복 route는 빌드타임 에러를 던진다', () => {
    const base = DEFAULT_SCHEMA('a');
    expect(() => buildRegistry([{ ...base, route: 'dup' }, { ...base, route: 'dup' }])).toThrow(/Duplicate/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `./index`, `./_default` 없음.

- [ ] **Step 3: DEFAULT_SCHEMA 구현 (현 generic_list 6열을 그대로 표현)**

`src/dash/schemas/_default.ts`:
```ts
import type { PageSchema } from './types';

// 현 generic_list.tsx 고정 컬럼/폼을 스키마로 표현 = 회귀 0 기준선
export function DEFAULT_SCHEMA(route: string): PageSchema {
  return {
    route, title: route, kind: 'list', entity: route,
    columns: [
      { key: 'name', label: '항목명', type: 'text', align: 'left' },
      { key: 'amount', label: '금액 (백만원)', type: 'amount', align: 'right' },
      { key: 'change', label: '변동률', type: 'rate', align: 'center' },
      { key: 'status', label: '상태', type: 'status', align: 'center' },
      { key: 'trend', label: '추이', type: 'number', align: 'center' },
    ],
    fields: [
      { key: 'name', label: '항목명', control: 'text', required: true },
      { key: 'category', label: '구분', control: 'text' },
      { key: 'amount', label: '금액 (백만원)', control: 'number' },
      { key: 'change', label: '변동률 (%)', control: 'number' },
      { key: 'status', label: '상태', control: 'select', options: ['정상','진행중','검토중','보류','완료'] },
    ],
    filters: ['투자성과','리스크','회계마감','운용사보고'],
    statusDomain: [
      { label: '정상', tone: 'success' }, { label: '진행중', tone: 'warning' },
      { label: '검토중', tone: 'info' }, { label: '보류', tone: 'danger' }, { label: '완료', tone: 'primary' },
    ],
    provenance: { capturedAt: '', sourceSystem: 'DEFAULT', captureFile: '' },
  };
}
```

- [ ] **Step 4: index.ts (registry + resolveSchema) 구현**

`src/dash/schemas/index.ts`:
```ts
import type { PageSchema } from './types';
import { DEFAULT_SCHEMA } from './_default';
// 파일럿 스키마는 Task 8에서 여기 import & ALL 배열에 추가한다.

const ALL: PageSchema[] = [];

export function buildRegistry(list: PageSchema[]): Record<string, PageSchema> {
  const m: Record<string, PageSchema> = {};
  for (const s of list) {
    if (m[s.route]) throw new Error(`Duplicate schema route: ${s.route}`);
    m[s.route] = s;
  }
  return m;
}

const REGISTRY = buildRegistry(ALL);

export function resolveSchema(route: string): PageSchema {
  return REGISTRY[route] ?? DEFAULT_SCHEMA(route);
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/dash/schemas/_default.ts src/dash/schemas/index.ts src/dash/schemas/index.test.ts
git commit -m "feat(schemas): resolveSchema + DEFAULT(회귀0) + 중복키 빌드에러

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: 마스킹 디스패치 순수 헬퍼 (fail-safe)

**Files:**
- Create: `src/dash/schemas/dispatch.ts`, `src/dash/schemas/dispatch.test.ts`

**Interfaces:**
- Consumes: `CellType` (Task 1).
- Produces: `RenderKind` 타입 + `renderKind(type: CellType): RenderKind` — CellType→렌더 분류 **단일 진실(SSOT)**. text/code/pii/미지 → `'maskedText'`(평문 누출 차단). Cell(Task 4)이 이 함수를 사용하므로 테스트가 실제 마스킹 동작을 보호한다.

- [ ] **Step 1: 실패 테스트 (마스킹 정책 고정)**

`src/dash/schemas/dispatch.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderKind } from './dispatch';

describe('renderKind 마스킹 fail-safe 정책', () => {
  it('text/code/pii/미지 타입 → maskedText (평문 누출 차단)', () => {
    for (const t of ['text','code','pii'] as const) expect(renderKind(t)).toBe('maskedText');
    expect(renderKind('bogus' as any)).toBe('maskedText');
  });
  it('amount/date/number → numeric (mn 대상)', () => {
    for (const t of ['amount','date','number'] as const) expect(renderKind(t)).toBe('numeric');
  });
  it('status/rate/gp → 전용 렌더 분류', () => {
    expect(renderKind('status')).toBe('status');
    expect(renderKind('rate')).toBe('rate');
    expect(renderKind('gp')).toBe('gp');
  });
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test` · Expected: FAIL (`./dispatch` 없음).

- [ ] **Step 3: dispatch.ts 구현**

`src/dash/schemas/dispatch.ts`:
```ts
import type { CellType } from './types';

export type RenderKind = 'status' | 'rate' | 'gp' | 'numeric' | 'maskedText';

// CellType → 렌더 분류 단일 진실. 텍스트/코드/pii/미지는 항상 maskedText로 수렴(fail-safe).
export function renderKind(type: CellType): RenderKind {
  switch (type) {
    case 'status': return 'status';
    case 'rate':   return 'rate';
    case 'gp':     return 'gp';
    case 'amount':
    case 'date':
    case 'number': return 'numeric';
    case 'text':
    case 'code':
    case 'pii':
    default:       return 'maskedText';
  }
}
```

- [ ] **Step 4: 통과 확인** — Run: `npm test` · Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/dash/schemas/dispatch.ts src/dash/schemas/dispatch.test.ts
git commit -m "feat(schemas): 셀 타입 마스킹 디스패치 헬퍼(fail-safe 정책)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 렌더러 (Cell 디스패처 + SchemaField)

**Files:**
- Create: `src/dash/schemas/renderers.tsx`

**Interfaces:**
- Consumes: `ColumnSpec`, `FieldSpec`, `StatusDomainEntry` (Task 1), `renderKind` (Task 3), 기존 `UI`(StatusBadge/ColorChip/DeltaBadge), `mn`/`MT`(mask), `Tone`(components). **modal은 import하지 않는다(순환 차단)** — status tone은 로컬 `toneFor`로 해결.
- Produces: `Cell({ col, value, color, statusDomain }): JSX`, `SchemaField({ field, value, onChange }): JSX`.

- [ ] **Step 1: renderers.tsx 구현 (renderKind 사용, default=MT 강제, modal 의존 없음)**

`src/dash/schemas/renderers.tsx`:
```tsx
import React from 'react';
import { UI } from '../components';
import { mn, MT } from '../mask';
import { renderKind } from './dispatch';
import type { ColumnSpec, FieldSpec, StatusDomainEntry } from './types';
import type { Tone } from '../components';

const { StatusBadge, ColorChip, DeltaBadge } = UI;

// status tone을 스키마의 statusDomain에서 해결(모달 의존 제거 → 순환 차단).
function toneFor(label: string, domain?: StatusDomainEntry[]): Tone {
  return domain?.find((d) => d.label === label)?.tone ?? 'info';
}

export function Cell({ col, value, color, statusDomain }: { col: ColumnSpec; value: any; color?: string; statusDomain?: StatusDomainEntry[] }) {
  switch (renderKind(col.type)) {
    case 'status':     return <StatusBadge tone={toneFor(String(value), statusDomain)} label={String(value)} size="sm" />;
    case 'rate':       return <DeltaBadge value={Number(value)} />;
    case 'gp':         return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ColorChip icon="building" color={color || 'var(--chart-1)'} size={26} iconSize={14} /><MT>{String(value)}</MT></span>;
    case 'numeric':    return <span className="tabular">{mn(typeof value === 'number' ? value.toLocaleString() : String(value))}</span>;
    // maskedText (text/code/pii) + 미지 타입 → 항상 MT (평문 누출 차단)
    default:           return <MT>{String(value)}</MT>;
  }
}

export function SchemaField({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (v: string) => void }) {
  const base: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '8px 11px', fontSize: 13.5, font: 'inherit', border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)' };
  switch (field.control) {
    case 'textarea': return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} style={{ ...base, resize: 'vertical' }} />;
    case 'select':   return <select value={value} onChange={(e) => onChange(e.target.value)} style={base}>{(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    case 'number':   return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
    case 'date':     return <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
    case 'checkbox': return <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />;
    case 'file':     return <input type="file" style={{ ...base, padding: 6 }} />;
    case 'readonly': return <div style={{ ...base, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{value || '—'}</div>;
    default:         return <input value={value} onChange={(e) => onChange(e.target.value)} style={base} />;
  }
}
```

> 주의: Cell의 분기는 `renderKind`(Task 3, SSOT)를 그대로 사용하므로 Task 3 테스트가 실제 마스킹 동작을 보호한다(정책-구현 일치). 미지 타입은 `renderKind`가 `maskedText`로 수렴 → Cell `default`가 `MT`.

- [ ] **Step 2: 빌드/타입 확인**

Run: `npx tsc --noEmit src/dash/schemas/renderers.tsx 2>&1 | grep "schemas/renderers" || echo "new file clean"`
Run: `npm run build`
Expected: build exit 0 (`✓ built`).

- [ ] **Step 3: 커밋**

```bash
git add src/dash/schemas/renderers.tsx
git commit -m "feat(schemas): Cell 타입 디스패처 + SchemaField (default=MT)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: generic_list.tsx 스키마 주도 개조 (회귀 0)

**Files:**
- Modify: `src/dash/generic_list.tsx` (헤더/행 렌더: `generic_list.tsx:204-248`, KPI/필터: `:109,:171-176`, 더미생성: `:43-58`)

**Interfaces:**
- Consumes: `resolveSchema` (Task 2), `Cell` (Task 4), `PageSchema`/`ColumnSpec`.
- Produces: (없음 — 페이지 컴포넌트)

- [ ] **Step 1: resolveSchema + 스키마 기반 더미생성으로 교체**

`generic_list.tsx` 상단에 import 추가:
```tsx
import { resolveSchema } from './schemas';
import { Cell } from './schemas/renderers';
import type { PageSchema, ColumnSpec } from './schemas/types';
```
`GenericListPage` 본문 시작부(`:106` 부근)에서 스키마 조회:
```tsx
const { title, crumbs, parent } = findMenuContext(route);
const schema = resolveSchema(route);
```
`makeRows`(`:43-58`)를 스키마 컬럼 기반 결정적 생성기로 교체:
```tsx
function makeRows(schema: PageSchema, n: number): Row[] {
  return Array.from({ length: n }, (_, i) => {
    const k = i % 5;
    const base: Row = {
      id: 'R' + String(i + 1).padStart(3, '0'),
      icon: ROW_ICONS[k], color: ROW_COLORS[k],
      name: '항목명 ' + String(i + 1).padStart(3, '0'),
      category: schema.entity, amount: 1200 * (i + 1) + ((i * 137) % 800),
      change: Number((((i * 13) % 200) / 10 - 8).toFixed(1)),
      status: (schema.statusDomain?.[i % (schema.statusDomain.length || 1)]?.label) ?? ROW_STATUS[i % 5],
      trend: [3, 5, 4, 7, 6].map((v, j) => v + ((i + j * 2) % 4)),
    };
    // 스키마 컬럼별 결정적 값 채움(텍스트/코드 컬럼은 라벨+index)
    const extra: Record<string, any> = {};
    for (const c of schema.columns) {
      if (['name','amount','change','status','trend'].includes(c.key)) continue;
      extra[c.key] = c.type === 'amount' || c.type === 'number' || c.type === 'rate'
        ? (i + 1) * 100 + (i * 7) % 90
        : c.label + ' ' + String(i + 1).padStart(3, '0');
    }
    return { ...base, ...extra } as Row;
  });
}
```
`useState`(`:107`)를 `useState<Row[]>(() => makeRows(schema, 23))`로 변경.

- [ ] **Step 2: 고정 thead/tbody를 schema.columns 디스패치로 교체**

`:210` 고정 헤더 배열을 스키마 컬럼으로:
```tsx
<tr style={{ background: "color-mix(in srgb, var(--muted) 55%, transparent)" }}>
  <th style={{ padding: cellPad, width: 44 }}>
    <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="전체 선택" style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
  </th>
  {schema.columns.map((c) => (
    <th key={c.key} style={{ padding: cellPad, textAlign: (c.align || 'left') as any, fontSize: 12, fontWeight: 700, color: "var(--caption)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>
      {c.label}{c.unit ? ` (${c.unit})` : ''}
    </th>
  ))}
  <th style={{ padding: cellPad, width: 56 }} />
</tr>
```
`:216-241` 행 본문의 고정 셀들을 컬럼 디스패치로:
```tsx
{pageRows.map((r) => {
  const sel = selected.has(r.id);
  return (
    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)", background: sel ? "color-mix(in srgb, var(--primary) 6%, transparent)" : undefined, transition: "background .12s" }}
      onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "color-mix(in srgb, var(--muted) 40%, transparent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = sel ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent"; }}>
      <td style={{ padding: cellPad }}>
        <input type="checkbox" checked={sel} onChange={() => toggleRow(r.id)} aria-label={r.name + " 선택"} style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
      </td>
      {schema.columns.map((c) => (
        <td key={c.key} style={{ padding: cellPad, textAlign: (c.align || 'left') as any, whiteSpace: c.type === 'amount' ? 'nowrap' : undefined }}>
          {c.key === 'trend'
            ? <MiniBars data={r.trend} color={r.color} />
            : <Cell col={c} value={(r as any)[c.key]} color={r.color} statusDomain={schema.statusDomain} />}
        </td>
      ))}
      <td style={{ padding: cellPad, textAlign: "right" }}>
        <IconBtn icon="file" label={r.name + " 상세·수정"} size={32} onClick={() => setModal({ mode: "edit", row: r })} />
      </td>
    </tr>
  );
})}
```
빈 상태 `colSpan`은 `schema.columns.length + 2`로 변경.

- [ ] **Step 3: 카드 제목/필터 칩을 스키마화**

`<h3>` 제목을 `<MT>{schema.title}</MT>`로, 새로고침 핸들러의 `makeRows(23)`→`makeRows(schema, 23)`, 필터칩 초기값 `useState`(`:109`)를 `schema.filters ?? []`로 변경.

- [ ] **Step 4: 빌드 + 회귀(Red-Green) 확인**

Run: `npm run build`
Expected: exit 0.
Run: `npm run dev` 후 전용 라우트가 없는 임의 메뉴 리프 클릭 → **개조 전과 동일한 6열·필터·KPI** 표시(회귀 0). 콘솔 오류 0.

- [ ] **Step 5: 반응형 확인 (responsive-ui 스킬)**

`responsive-ui` 스킬 체크리스트 적용: 모바일(가로스크롤 테이블), 태블릿, 데스크톱 브레이크포인트에서 헤더·툴바·페이지네이션 깨짐 없음 확인.

- [ ] **Step 6: 커밋**

```bash
git add src/dash/generic_list.tsx
git commit -m "refactor(generic_list): 스키마 주도 컬럼/더미 렌더 (DEFAULT=회귀0)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: generic_list_modal.tsx 스키마 폼 개조

**Files:**
- Modify: `src/dash/generic_list_modal.tsx` (`Row` 타입 유지, 폼 본문 `:108-137`, submit `:67-80`)

**Interfaces:**
- Consumes: `SchemaField` (Task 4), `PageSchema`/`FieldSpec`.
- Produces: `RowFormModal`가 `schema: PageSchema` prop를 받아 `schema.fields` 순회 렌더.

- [ ] **Step 1: RowFormModal 시그니처에 schema 추가 + 동적 폼 상태**

`RowFormModal` props에 `schema: PageSchema` 추가. 고정 useState 5개를 동적 맵으로 교체:
```tsx
import { SchemaField } from './schemas/renderers';
import type { PageSchema } from './schemas/types';

export function RowFormModal({ mode, initial, schema, onSave, onClose, onDelete }: {
  mode: 'create' | 'edit'; initial?: Row; schema: PageSchema;
  onSave: (row: Row) => void; onClose: () => void; onDelete?: () => void;
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of schema.fields) seed[f.key] = initial ? String((initial as any)[f.key] ?? '') : (f.control === 'select' ? (f.options?.[0] ?? '') : '');
    return seed;
  });
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));
```

- [ ] **Step 2: 폼 본문을 schema.fields 순회로 교체**

`:108-137` 폼 div 내부:
```tsx
<div style={{ padding: 18, overflowY: "auto" }}>
  {schema.fields.map((f) => (
    <Field key={f.key} label={f.label + (f.required ? ' *' : '')}>
      <SchemaField field={f} value={vals[f.key] ?? ''} onChange={(v) => { set(f.key, v); if (err) setErr(''); }} />
    </Field>
  ))}
  {err && <span style={{ fontSize: 11.5, color: "var(--danger)", display: "block" }}>{err}</span>}
</div>
```

- [ ] **Step 3: submit을 동적 필드 기반으로 교체**

```tsx
const submit = () => {
  const req = schema.fields.find((f) => f.required && !String(vals[f.key] ?? '').trim());
  if (req) { setErr(`${req.label}을(를) 입력하세요.`); return; }
  onSave({
    id: initial?.id ?? '',
    icon: initial?.icon ?? 'layers', color: initial?.color ?? 'var(--chart-1)',
    name: (vals.name ?? '').trim(),
    category: (vals.category ?? schema.entity).trim(),
    amount: Number(vals.amount) || 0, change: Number(vals.change) || 0,
    status: vals.status ?? (schema.statusDomain?.[0]?.label ?? '정상'),
    trend: initial?.trend ?? [4, 6, 5, 8, 7],
    ...vals,
  } as Row);
};
```

- [ ] **Step 4: 호출부(generic_list.tsx) 갱신**

`generic_list.tsx`의 `<RowFormModal ... />`에 `schema={schema}` prop 추가.

- [ ] **Step 5: 빌드 + dev 확인**

Run: `npm run build` · Expected: exit 0.
Run: `npm run dev` → 신규 등록/수정 모달이 스키마 필드대로 렌더(textarea/file 포함), 필수검증 동작, 저장/삭제 동작.

- [ ] **Step 6: 반응형 확인 (responsive-ui)** — 모달이 모바일 폭에서 스크롤·버튼 정렬 정상.

- [ ] **Step 7: 커밋**

```bash
git add src/dash/generic_list_modal.tsx src/dash/generic_list.tsx
git commit -m "refactor(modal): schema.fields 순회 폼 + textarea/file/checkbox 컨트롤

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 스킬 apfs-capture-schema

**Files:**
- Create: `.claude/skills/apfs-capture-schema/SKILL.md`
- Modify: `.claude/hooks/skill-rules.json`

**Interfaces:**
- Consumes: 위 스키마 인프라(Task 1-6)를 산출물 포맷으로 참조.
- Produces: (스킬 — 런타임 아님)

- [ ] **Step 1: SKILL.md 작성**

`.claude/skills/apfs-capture-schema/SKILL.md`:
```markdown
---
name: apfs-capture-schema
description: 현행시스템 화면 캡처(이미지)에서 실제 컬럼·필드·값도메인을 추출해 src/dash/schemas/<route>.ts(PageSchema)로 동결하고, 스키마 주도 GenericListPage에 배선하는 절차. 페이지를 캡처 기반 도메인 데이터/양식으로 만들 때 사용.
---

# apfs-capture-schema

현행시스템 캡처 → 검수된 정적 PageSchema → 스키마 주도 페이지. 추측 금지, 캡처 실측이 진실.

## 입력
- 캡처 이미지 경로 1~5장 (예: /tmp/apfs_caps/<SYS>/word/media/imageN.png)
- 대상 메뉴 리프 label (미지정 시 추출 후 매핑 제안)

## SOP
1. **분류**: 캡처를 flat-list / form / complex(조건부·중첩 헤더·대사표) 로 분류.
   complex면 즉시 중단하고 "전용 typed 페이지(risk.tsx식)로 escalate" 안내 — 스키마 트랙 밖.
2. **추출(비전 1패스)**: Read로 이미지 열람.
   - 상단 조회 컨트롤 → `filters`
   - 표 컬럼 → `columns[]`: type 매핑(금액→amount, 비율/변동→rate, 날짜→date, 상태/등급→status(+statusDomain), 운용사/기관→gp, **영숫자 코드/ID→code**, **주민번호/계좌→pii**, 그 외→text), `unit`/`align`/중첩이면 `group`
   - 입력 컨트롤 → `fields[]`: control 매핑(textarea/file/select(+options)/date/checkbox/readonly)
   - 1~2행 → 샘플 인지용(스키마엔 저장 안 함; 더미는 런타임 생성)
   - OS 파일다이얼로그 오버레이·가로스크롤 잘림 영역은 제외하고 플래그
3. **검수·동결**: 추출 결과를 캡처 이미지와 1회 대조 → `provenance{capturedAt,sourceSystem,captureFile}` 채움 → `src/dash/schemas/<route>.ts`로 저장(parsePageSchema/zod 통과 필수).
4. **충돌검사·배선**: 라벨이 중복 리프면 data.ts에 `path` 부여(필수) 후 그 path를 route로. schemas/index.ts의 ALL 배열에 import 추가(중복키면 buildRegistry가 빌드에러).
5. **검증**: `npm test`(스키마 zod) + `npm run build` + `npm run dev` 시각 확인(라이트/다크) + responsive-ui 체크.

## 산출물
- 검수된 `src/dash/schemas/<route>.ts`
- (complex일 때) 전용 페이지 escalate 안내
- data.ts path/registry 등록 diff

## 마스킹 규칙 (CRITICAL)
- type=code/pii/text → 자동 MT 마스킹. mn은 숫자 전용. default도 MT(평문 누출 금지).
- 표 헤더·단위·탭·StatusBadge·날짜 라벨은 비마스킹.
```

- [ ] **Step 2: skill-rules.json에 트리거 추가**

`.claude/hooks/skill-rules.json`의 스킬 트리거 맵에 추가(기존 구조를 따름):
```json
"apfs-capture-schema": {
  "keywords": ["캡처","현행시스템","실화면","필드 추출","페이지 생성","스키마","OCR","조회 화면","FFMS","RISK","REPORT","TRUST","BRIEF","실물검증","공고문"]
}
```

- [ ] **Step 3: JSON 유효성 확인**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude/hooks/skill-rules.json','utf8')); console.log('valid')"`
Expected: `valid`.

- [ ] **Step 4: 커밋**

```bash
git add .claude/skills/apfs-capture-schema/SKILL.md .claude/hooks/skill-rules.json
git commit -m "feat(skill): apfs-capture-schema (캡처→PageSchema 동결 SOP)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: 파일럿 — easy 화면 2개 추출·동결·배선

**Files:**
- Create: `src/dash/schemas/연도별투자현황.ts`, `src/dash/schemas/펀드개요.ts` (실제 매핑 라벨로 명명)
- Modify: `src/dash/schemas/index.ts` (ALL 배열에 추가), `src/dash/data.ts`(라벨충돌 시 path)

**Interfaces:**
- Consumes: `parsePageSchema`(검증), `PageSchema`.
- Produces: registry 등록 2건.

> 파일럿 대상: BRIEF '연도별투자현황'(easy flat-list), REPORT '펀드개요'(easy form) — 추출 난이도 easy·오버레이 없음·전용 route 미겹침. 실제 라벨/캡처는 추출 시 확정.

- [ ] **Step 1: apfs-capture-schema 스킬로 화면 1 추출**

`apfs-capture-schema` 스킬 invoke → 캡처 `/tmp/apfs_caps/BRIEF/word/media/image1.png` + 리프 label로 SOP 1-3 수행 → `src/dash/schemas/연도별투자현황.ts` 작성:
```ts
import type { PageSchema } from './types';
export const schema: PageSchema = {
  route: '연도별투자현황', title: '연도별 투자현황', kind: 'list', entity: '모태펀드',
  columns: [ /* 캡처 실측 컬럼: 예) {key:'year',label:'연도',type:'text'}, {key:'commit',label:'약정',type:'amount',unit:'백만원',align:'right'}, ... */ ],
  fields: [ /* 캡처 실측 입력필드 */ ],
  filters: [ /* 상단 조회 컨트롤 */ ],
  statusDomain: [ /* 있으면 */ ],
  provenance: { capturedAt: '2026-05-28', sourceSystem: 'BRIEF', captureFile: 'image1.png' },
};
```
(컬럼/필드는 캡처 실측으로 채운다 — 플레이스홀더 금지, 스킬 SOP가 산출.)

- [ ] **Step 2: 화면 2 추출 (form)** — REPORT 캡처로 동일하게 `src/dash/schemas/펀드개요.ts` 작성(kind:'form').

- [ ] **Step 3: registry 등록**

`src/dash/schemas/index.ts`:
```ts
import { schema as s1 } from './연도별투자현황';
import { schema as s2 } from './펀드개요';
const ALL: PageSchema[] = [s1, s2];
```

- [ ] **Step 4: 스키마 검증 테스트 추가**

`src/dash/schemas/pilot.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parsePageSchema } from './types';
import { schema as s1 } from './연도별투자현황';
import { schema as s2 } from './펀드개요';
describe('파일럿 스키마 zod 검증', () => {
  it('연도별투자현황', () => expect(parsePageSchema(s1).route).toBe('연도별투자현황'));
  it('펀드개요', () => expect(parsePageSchema(s2).kind).toBe('form'));
});
```

- [ ] **Step 5: 라벨충돌 검사·path 배선**

대상 라벨이 중복 리프(사용자관리/수탁보고/조기경보/조합원총회/조합정보/투자기업정보/회계)에 해당하면 `data.ts`에 부모 접두 `path` 부여 후 그 path를 route로. 해당 없으면 스킵.

- [ ] **Step 6: 전체 검증**

Run: `npm test` · Expected: PASS(전체).
Run: `npm run build` · Expected: exit 0.
Run: `npm run dev` → 두 리프 클릭 시 **도메인 컬럼·폼**으로 렌더(generic 6열 아님). 라이트/다크 대비 + responsive-ui 체크 + 콘솔 0.

- [ ] **Step 7: 커밋**

```bash
git add src/dash/schemas/연도별투자현황.ts src/dash/schemas/펀드개요.ts src/dash/schemas/index.ts src/dash/schemas/pilot.test.ts src/dash/data.ts
git commit -m "feat(schemas): 파일럿 2화면(연도별투자현황·펀드개요) 캡처 실측 스키마

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## 검증 요약 (전 Task 공통 게이트)

| 주장 | 증거 명령 |
|------|-----------|
| 순수 로직 정확 | `npm test` → 0 failures |
| 빌드 무결 | `npm run build` → exit 0, `✓ built` |
| 신규 타입 무결 | `npx tsc --noEmit` → schemas/ 에러 0 |
| 회귀 0 | dev: 미등록 리프 = 개조 전과 동일 (Red-Green) |
| 마스킹 누출 0 | Task3 테스트 + dev: code/pii 컬럼 회색바 |
| 반응형 | responsive-ui 체크리스트 (모바일/태블릿/데스크톱) |
