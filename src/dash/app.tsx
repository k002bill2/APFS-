/* 앱 루트 — 테마/역할/라우트 상태, 서브 대시보드 스텁, 마운트 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA, HistoryStore } from './data';
import { DesignSystem } from './designsystem';
import { Main } from './main';
import { Risk } from './risk';
import { RiskManage } from './risk_manage';
import { GpHealth } from './gp_health';
import { Accounting } from './accounting';
import { Schedule } from './schedule';
import { SubFund } from './subfund';
import { Pages as ReportMainPages } from './report_main';
import { Pages as ReportBucheoPages } from './report_bucheo';
import { Pages as ReportSutackPages } from './report_sutack';
import { Pages as AssetPages } from './asset';
import { GenericListPage } from './generic_list';
import { AssetFunding } from './asset_funding';
import { Pages as EditorPages } from './editor_page';
import { Toaster } from './ui/sonner';
import { TooltipProvider } from './ui/tooltip';
import { PageSkeleton } from './ui/skeleton';
const ReportMain = ReportMainPages.ReportMain;
const ReportBucheo = ReportBucheoPages.ReportBucheo;
const ReportSutack = ReportSutackPages.ReportSutack;
const AssetMain = AssetPages.AssetMain;
const EditorPage = EditorPages.EditorPage;

const { useState, useEffect } = React;
const { AppShell } = Shell;
const D = APFS_DATA;

const ls = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};

function App() {
  const [theme, setTheme] = useState(() => ls.get("apfs.theme", "light"));
  const [role, setRole] = useState(() => ls.get("apfs.role", "admin"));
  // 레거시 route 별칭: 마이그레이션 전 'performance'로 저장된 localStorage/방문기록을 새 한글 route로 승격
  // (안 하면 resolveSchema('performance')→DEFAULT_SCHEMA 폴백으로 영문 제네릭 표가 뜬다)
  const [route, setRoute] = useState(() => { const r = ls.get("apfs.route", "designsystem"); return r === "performance" ? "투자 성과·포트폴리오" : r; });
  const [lnbOpen, setLnbOpen] = useState(() => ls.get("apfs.lnb", "1") === "1");
  const [wide, setWide] = useState(() => ls.get("apfs.width", "fixed") === "full");
  const [navStyle, setNavStyle] = useState(() => ls.get("apfs.navstyle", "classic"));
  const [notifs, setNotifs] = useState(D.NOTIFS);
  // 라우트 로딩 스켈레톤 — 더미데이터라 실제 async가 없어, 전환마다 짧은 로딩창을 합성해
  // 전 페이지에 PageSkeleton을 노출한다(500ms). 초기 진입(loading 기본 true)에도 1회 뜬다.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.background = "";
    ls.set("apfs.theme", theme);
  }, [theme]);
  useEffect(() => ls.set("apfs.role", role), [role]);
  useEffect(() => ls.set("apfs.route", route), [route]);
  useEffect(() => { HistoryStore.push(route); }, [route]);   // 방문기록 적재(복원된 초기 라우트 포함)
  useEffect(() => {                                            // 라우트 전환마다 로딩 스켈레톤 노출
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [route]);
  useEffect(() => ls.set("apfs.lnb", lnbOpen ? "1" : "0"), [lnbOpen]);
  useEffect(() => ls.set("apfs.navstyle", navStyle), [navStyle]);
  useEffect(() => {
    document.documentElement.dataset.width = wide ? "full" : "fixed";
    ls.set("apfs.width", wide ? "full" : "fixed");
  }, [wide]);

  // 역할에 따라 접근 불가 라우트면 메인으로
  useEffect(() => {
    const menu = D.MENU.find((m) => m.path === route);
    if (menu && !menu.roles.includes(role)) setRoute("main");
  }, [role]);

  const onNav = (r) => {
    setRoute(r === "performance" ? "투자 성과·포트폴리오" : r);   // 레거시 route 별칭(방문기록 등 잔존 'performance' 승격)
    // 모션 축소 선호 시 부드러운 스크롤 대신 즉시 이동 (WCAG 2.3.3)
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  let page;
  if (route === "designsystem") page = <DesignSystem />;
  else if (route === "main") page = <Main onNav={onNav} navStyle={navStyle} onNavStyle={setNavStyle} />;
  else if (route === "risk") page = <Risk onNav={onNav} />;
  else if (route === "risk-manage") page = <RiskManage onNav={onNav} />;
  else if (route === "gp-health") page = <GpHealth onNav={onNav} />;
  else if (route === "accounting") page = <Accounting onNav={onNav} />;
  else if (route === "schedule") page = <Schedule onNav={onNav} />;
  else if (route === "subfund") page = <SubFund onNav={onNav} />;
  else if (route === "asset") page = <AssetMain onNav={onNav} />;
  else if (route === "asset-funding") page = <AssetFunding onNav={onNav} />;
  else if (route === "report") page = <ReportMain onNav={onNav} />;
  else if (route === "report-bucheo") page = <ReportBucheo onNav={onNav} />;
  else if (route === "report-sutack") page = <ReportSutack onNav={onNav} />;
  else if (route === "editor") page = <EditorPage onNav={onNav} />;
  // key=route: 스키마 페이지 간 이동 시 완전 리마운트 — 이전 페이지의 rows/필터/페이지 상태가
  // 새 스키마에 남아 미시드 컬럼이 undefined로 노출되던 문제 방지(즐겨찾기 FAB 딥링크로 상시 노출되는 경로)
  else page = <GenericListPage key={route} route={route} onNav={onNav} />;

  return (
    <TooltipProvider delayDuration={300}>
    <AppShell
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      role={role}
      onRole={setRole}
      route={route}
      onNav={onNav}
      lnbOpen={lnbOpen}
      onToggleLnb={() => setLnbOpen((o) => !o)}
      navStyle={navStyle}
      onNavStyle={setNavStyle}
      wide={wide}
      onToggleWide={() => setWide((x) => !x)}
      notifs={notifs}
      onReadAll={() => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))}>{loading ? <PageSkeleton /> : page}<Toaster theme={theme} /></AppShell>
    </TooltipProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
