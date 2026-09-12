/* 앱 루트 — 테마/역할/라우트 상태, 서브 대시보드 스텁, 마운트 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA, HistoryStore } from './data';
import { DesignSystem } from './designsystem';
import { Main } from './main';
import { RiskManage } from './risk_manage';
import { Schedule } from './schedule';
import { SubFundManage } from './subfund_manage';   // 자펀드관리(관리형 리스트, 구조도 v1.4). 구 subfund.tsx(FR-5.3 대시보드)는 미라우팅
import { Pages as ReportBucheoPages } from './report_bucheo';
import { GenericListPage, findMenuContext } from './generic_list';
import { AssetFunding } from './asset_funding';
import { InvestmentReviewManage } from './investment_review_manage';   // 투자심의관리(관리형 리스트, S1_01). GenericListPage 폴백 앞 분기
import { OccasionalReportManage } from './occasional_report_manage';   // 수시보고(관리형 리스트, S1_04). 동상
import { RegularReportManage } from './regular_report_manage';           // 정기보고(S1_06). 동상
import { GeneralMeetingManage } from './general_meeting_manage';         // 조합원총회(S1_07). 동상
import { FundCashForecastManage } from './fund_cash_forecast_manage';    // 조합예상자금 정보보고(S1_08). 동상
import { ReportFormManage } from './report_form_manage';                 // 보고양식관리(S1_09). 동상
import { ReportUpdateInfoManage } from './report_update_info_manage';    // 보고 업데이트정보(S1_10). 동상
import { Pages as EditorPages } from './editor_page';
import { Toaster } from './ui/sonner';
import { TooltipProvider } from './ui/tooltip';
import { PageSkeleton } from './ui/skeleton';
import { MotionConfig } from 'motion/react';
const ReportBucheo = ReportBucheoPages.ReportBucheo;
const EditorPage = EditorPages.EditorPage;

// 삭제된 서브 대시보드 route → 대체 페이지(main) 별칭.
// localStorage(apfs.route)·방문기록에 잔존한 옛 route로 진입하면 GenericListPage 폴백(영문 제네릭 표)으로
// 떨어지므로, 여기서 안전 홈(main)으로 승격한다. 'performance'는 개명(한글 route)이라 별도 매핑.
const ROUTE_ALIAS: Record<string, string> = {
  performance: "투자 성과·포트폴리오",
  "투자심의 관리": "investment-review",   // 리프에 path 부여 전 잔존한 한글 route(localStorage·방문기록) 승격
  "수시보고": "occasional-report",        // 동상(2026-09-12 typed 페이지 전환)
  // 사후보고관리 5리프(2026-09-12 typed 페이지 전환, S1_06~S1_10) — 리프에 path 부여 전 잔존 한글 route 승격
  "정기보고": "regular-report",
  "조합원총회": "general-meeting",
  "조합예상자금 정보보고": "fund-cash-forecast",
  "보고양식관리": "report-form",
  "보고 업데이트정보": "report-update-info",
  asset: "main", risk: "main", "gp-health": "main",
  accounting: "main", report: "main", "report-sutack": "main",
};
const aliasRoute = (r: string) => ROUTE_ALIAS[r] || r;

// MENU 트리에 없는 앱 전용 라우트(대시보드·데모·에디터·일정)의 한글 제목 — aria-live 통지용.
// 스키마/메뉴 리프 라우트는 findMenuContext가 한글 label을 돌려주므로 여기서 제외.
// (schedule은 MENU path에 없어 findMenuContext가 영문 'schedule'로 폴백 → 여기서 한글 지정)
const APP_ROUTE_TITLES: Record<string, string> = {
  main: "메인 대시보드", designsystem: "디자인 시스템", editor: "문서 편집기", schedule: "일정 관리",
};
const routeTitleFor = (r: string) => APP_ROUTE_TITLES[r] || findMenuContext(r).title;

const { useState, useEffect, useRef } = React;
const { AppShell } = Shell;
const D = APFS_DATA;

const ls = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};

function App() {
  const [theme, setTheme] = useState(() => ls.get("apfs.theme", "light"));
  // 삭제/개명된 route는 ROUTE_ALIAS로 승격(잔존 localStorage/방문기록 방어) — 안 하면 GenericListPage 폴백(영문 제네릭 표)
  const [route, setRoute] = useState(() => aliasRoute(ls.get("apfs.route", "designsystem")));
  const [lnbOpen, setLnbOpen] = useState(() => ls.get("apfs.lnb", "1") === "1");
  const [wide, setWide] = useState(() => ls.get("apfs.width", "fixed") === "full");
  const [navStyle, setNavStyle] = useState(() => ls.get("apfs.navstyle", "classic"));
  const [notifs, setNotifs] = useState(D.NOTIFS);
  // 라우트 로딩 스켈레톤 — 더미데이터라 실제 async가 없어, 전환마다 짧은 로딩창을 합성해
  // 전 페이지에 PageSkeleton을 노출한다(500ms). 초기 진입(loading 기본 true)에도 1회 뜬다.
  // 단, 초기 진입은 index.html boot 스플래시(격자 스피너)와 중복이라 스피너 없이 스켈레톤만 —
  // 스피너 오버레이는 라우트 전환(routeChanged)에서만 노출한다(스피너 2연속 방지).
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(false);
  const [routeChanged, setRouteChanged] = useState(false);
  // 라우트 전환 통지(SR) — 상태로 관리해 로딩 완료 시점에 1회만 채운다(렌더 중 즉시 채웠다
  // effect가 지우는 이중 통지 방지). 초기 마운트/로딩 중엔 빈 문자열.
  const [routeAnnounce, setRouteAnnounce] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.background = "";
    ls.set("apfs.theme", theme);
  }, [theme]);
  useEffect(() => ls.set("apfs.route", route), [route]);
  useEffect(() => { HistoryStore.push(route); }, [route]);   // 방문기록 적재(복원된 초기 라우트 포함)
  useEffect(() => {                                            // 라우트 전환마다 로딩 스켈레톤 노출
    const changed = mountedRef.current;                        // 초기 마운트 false, 이후 전환 true
    setRouteChanged(changed);
    mountedRef.current = true;
    setLoading(true);
    setRouteAnnounce("");                                      // 로딩 중엔 통지 비움
    const t = setTimeout(() => {
      setLoading(false);
      // 로딩 완료 후 실제 전환에서만 1회 통지(초기 마운트 제외) — 이중 통지 방지.
      if (changed) setRouteAnnounce(`${routeTitleFor(route)} 페이지 열림`);
    }, 500);
    return () => clearTimeout(t);
  }, [route]);
  useEffect(() => ls.set("apfs.lnb", lnbOpen ? "1" : "0"), [lnbOpen]);
  useEffect(() => ls.set("apfs.navstyle", navStyle), [navStyle]);
  useEffect(() => {
    document.documentElement.dataset.width = wide ? "full" : "fixed";
    ls.set("apfs.width", wide ? "full" : "fixed");
  }, [wide]);

  const onNav = (r) => {
    setRoute(aliasRoute(r));   // 삭제/개명된 route는 ROUTE_ALIAS로 승격(잔존 딥링크·방문기록 방어)
    // 모션 축소 선호 시 부드러운 스크롤 대신 즉시 이동 (WCAG 2.3.3)
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  let page;
  if (route === "designsystem") page = <DesignSystem />;
  else if (route === "main") page = <Main onNav={onNav} navStyle={navStyle} onNavStyle={setNavStyle} />;
  else if (route === "risk-manage") page = <RiskManage onNav={onNav} />;
  else if (route === "schedule") page = <Schedule onNav={onNav} />;
  else if (route === "subfund") page = <SubFundManage onNav={onNav} />;
  else if (route === "asset-funding") page = <AssetFunding onNav={onNav} />;
  else if (route === "investment-review") page = <InvestmentReviewManage onNav={onNav} />;
  else if (route === "occasional-report") page = <OccasionalReportManage onNav={onNav} />;
  else if (route === "regular-report") page = <RegularReportManage onNav={onNav} />;
  else if (route === "general-meeting") page = <GeneralMeetingManage onNav={onNav} />;
  else if (route === "fund-cash-forecast") page = <FundCashForecastManage onNav={onNav} />;
  else if (route === "report-form") page = <ReportFormManage onNav={onNav} />;
  else if (route === "report-update-info") page = <ReportUpdateInfoManage onNav={onNav} />;
  else if (route === "report-bucheo") page = <ReportBucheo onNav={onNav} />;
  else if (route === "editor") page = <EditorPage onNav={onNav} />;
  // key=route: 스키마 페이지 간 이동 시 완전 리마운트 — 이전 페이지의 rows/필터/페이지 상태가
  // 새 스키마에 남아 미시드 컬럼이 undefined로 노출되던 문제 방지(즐겨찾기 FAB 딥링크로 상시 노출되는 경로)
  else page = <GenericListPage key={route} route={route} onNav={onNav} />;

  return (
    // reducedMotion="user": OS 저모션 선호 시 Motion의 transform/scale은 끄고 opacity는 유지.
    // (tokens.css의 CSS animation 차단 규칙은 JS 구동 Motion에 무효 → 여기가 유일한 관문)
    <MotionConfig reducedMotion="user">
    <TooltipProvider delayDuration={300}>
    {/* 라우트 전환 통지 라이브리전 — 상시 DOM 존재(SR 등록), 내용만 전환 후 채움 */}
    <div aria-live="polite" className="sr-only">{routeAnnounce}</div>
    <AppShell
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      route={route}
      onNav={onNav}
      lnbOpen={lnbOpen}
      onToggleLnb={() => setLnbOpen((o) => !o)}
      navStyle={navStyle}
      onNavStyle={setNavStyle}
      wide={wide}
      onToggleWide={() => setWide((x) => !x)}
      notifs={notifs}
      onReadAll={() => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))}>{loading ? <PageSkeleton withSpinner={routeChanged} /> : page}<Toaster theme={theme} /></AppShell>
    </TooltipProvider>
    </MotionConfig>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
