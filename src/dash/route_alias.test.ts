import { describe, it, expect, beforeEach } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROUTE_ALIAS, aliasRoute, aliasRoutes } from './route_alias';
import { APFS_DATA, MenuStore, HistoryStore } from './data';
import { resolveSchema } from './schemas';

/* 2026-10-14 한글 route·파일명 전면 영문화의 회귀 가드.
   한글 route 가 되살아나면 해시 URL 이 %EC… 로 깨지고, 옛 키 별칭이 끊기면 즐겨찾기·방문기록이 조용히 사라진다. */
type Node = { label: string; path?: string; children?: Node[] };
const leaves: Node[] = [];
const walk = (n: Node[]) => n.forEach((x) => (x.children ? walk(x.children) : leaves.push(x)));
walk(APFS_DATA.MENU as Node[]);
const navKey = (l: Node) => l.path || l.label;
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;
/* 메뉴 밖이지만 app.tsx 가 직접 분기하는 route(별칭 대상으로 쓰인다) */
const APP_ONLY = ['main', 'login', 'onboarding-issue', 'onboarding-invite', 'report-form', 'report-update-info', 'custody-confirm'];

describe('route 는 영문이다', () => {
  it('모든 메뉴 리프의 nav 키에 한글이 없다(라벨은 한글 그대로)', () => {
    const bad = leaves.filter((l) => HANGUL.test(navKey(l))).map((l) => `${l.label} → ${navKey(l)}`);
    expect(bad).toEqual([]);
  });
  it('src/dash 아래에 한글 파일명이 없다', () => {
    const hangul: string[] = [];
    const scan = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) scan(p);
        else if (/[가-힣]/.test(f)) hangul.push(p);
      }
    };
    scan(new URL('.', import.meta.url).pathname);
    expect(hangul).toEqual([]);
  });
  it('스키마 route(폼 모달 id 포함)와 스키마 식별자에 한글이 없다', () => {
    const bad: string[] = [];
    const scan = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) { scan(p); continue; }
        if (!/\.tsx?$/.test(f) || f.endsWith('.test.ts')) continue;
        readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
          if (/\broute\s*:\s*['"`][^'"`]*[가-힣]/.test(line) || /import \{ schema as [^}]*[가-힣]/.test(line))
            bad.push(`${p}:${i + 1}`);
        });
      }
    };
    scan(new URL('.', import.meta.url).pathname);
    expect(bad).toEqual([]);
  });
});

describe('ROUTE_ALIAS — 옛 route 승격', () => {
  const live = new Set(leaves.map(navKey));
  it('모든 별칭 대상은 영문이고, 별칭의 별칭이 아니다(aliasRoute 는 1-hop)', () => {
    for (const [from, to] of Object.entries(ROUTE_ALIAS)) {
      expect(to, from).not.toMatch(/[가-힣]/);
      expect(ROUTE_ALIAS[to], `${from} → ${to} 연쇄`).toBeUndefined();
    }
  });
  it('모든 별칭 대상은 살아 있는 메뉴 리프·등록 스키마·앱 전용 route 다', () => {
    for (const [from, to] of Object.entries(ROUTE_ALIAS)) {
      const alive = live.has(to) || APP_ONLY.includes(to) || resolveSchema(to).provenance.sourceSystem !== 'DEFAULT';
      expect(alive, `${from} → ${to}`).toBe(true);
    }
  });
  it('대표 옛 키가 새 route 로 승격된다', () => {
    expect(aliasRoute('자펀드 보고 조회')).toBe('gp-report-query');
    expect(aliasRoute('조합 수시보고 내역')).toBe('gp-report-query');
    expect(aliasRoute('투자 성과·포트폴리오')).toBe('portfolio-performance');
    expect(aliasRoute('performance')).toBe('portfolio-performance');
    expect(aliasRoute('gp-spec')).toBe('gp-spec');
  });
  it('aliasRoutes 는 승격 후 중복을 앞의 것만 남긴다', () => {
    expect(aliasRoutes(['운용사 명세서', 'gp-spec', 'asset-funding'])).toEqual(['gp-spec', 'asset-funding']);
  });
});

describe('저장소 — 옛 한글 키로 저장된 즐겨찾기·방문기록', () => {
  beforeEach(() => {
    const mem = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  });
  it('즐겨찾기(apfs.menu.v3.fav)의 옛 키를 읽을 때 새 route 로 승격하고 메뉴 항목으로 해석된다', () => {
    localStorage.setItem('apfs.menu.v3.fav', JSON.stringify(['자펀드 보고 조회', '운용사 명세서']));
    expect(MenuStore.get('fav')).toEqual(['gp-report-query', 'gp-spec']);
    expect(MenuStore.resolve(MenuStore.get('fav')!).map((o: { label: string }) => o.label)).toEqual(['수시보고 제출현황', '운용사 명세서']);
  });
  it('방문기록(apfs.history.v1)의 옛 키도 승격된다', () => {
    localStorage.setItem('apfs.history.v1', JSON.stringify(['투자기업정보(통합)', 'investee-profile']));
    expect(HistoryStore.get()).toEqual(['investee-profile']);
  });
});
