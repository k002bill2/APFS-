/* 앱 루트 — 테마/역할/라우트 상태, 서브 대시보드 스텁, 마운트 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA, HistoryStore } from './data';
import { DesignSystem } from './designsystem';
import { Main } from './main';
import { EarlyWarningManage } from './early_warning_manage';   // 조기경보 관리(관리형 리스트, S2_51). 구 risk_manage.tsx(FR-5.6 운영 콘솔)는 미라우팅
import { ViolationManage } from './violation_manage';   // 법률/규약위반사항 관리(관리형 리스트, S2_53 + 등록화면 S2_54 를 팝업으로 흡수)
import { ShareholderManage } from './shareholder_manage';   // 운용사 주주변동관리(관리형 리스트, S2_55 + 등록화면 S2_56 을 팝업으로 흡수)
import { LitigationManage } from './litigation_manage';   // 운용사 소송관리(관리형 리스트, S2_57 + 등록화면 S2_58 을 팝업으로 흡수)
import { WorkforceManage } from './workforce_manage';   // 운용인력 변동관리(관리형 리스트, S2_59 + 등록화면 S2_60 을 팝업으로 흡수)
import { EwResultManage } from './ew_result_manage';   // 조기경보 결과정보 관리(섹션 2개 적층 + 생성·확정·마감 워크플로, S2_61 + 생성확인 S2_62)
import { Schedule } from './schedule';
import { SubFundManage } from './subfund_manage';   // 자펀드관리(관리형 리스트, 구조도 v1.4). 구 subfund.tsx(FR-5.3 대시보드)는 미라우팅
import { Pages as ReportBucheoPages } from './report_bucheo';
import { GenericListPage, findMenuContext } from './generic_list';
import { AssetFunding } from './asset_funding';
import { InvestmentReviewManage } from './investment_review_manage';   // 투자심의관리(관리형 리스트, S1_01). GenericListPage 폴백 앞 분기
// 자펀드수탁관리 실물검증(S1_26)+확정(S1_27) — 원문 2개를 가진 리프는 탭 묶음 래퍼로 분기한다(asset_leaf_tabs.tsx)
import { CustodyLeaf } from './asset_leaf_tabs';
import { OccasionalReportManage } from './occasional_report_manage';     // 수시보고(S1_04) — 일일보고 조회 탭 삭제(2026-09-24)로 단일 화면
import { RegularReportManage } from './regular_report_manage';           // 정기보고(S1_06) — 회수내역 탭 삭제(2026-09-24)로 단일 화면
import { GeneralMeetingManage } from './general_meeting_manage';         // 조합원총회(S1_07). 동상
import { FundCashForecastManage } from './fund_cash_forecast_manage';    // 조합예상자금 정보보고(S1_08). 동상
import { ReportFormManage } from './report_form_manage';                 // 보고양식관리(S1_09). 동상
import { ReportUpdateInfoManage } from './report_update_info_manage';    // 보고 업데이트정보(S1_10). 동상
// 자펀드 관리 8리프(2026-09-12 typed 페이지 전환, S1_14~S1_27). 동상 — GenericListPage 폴백 앞 분기
import { GpContributionManage } from './gp_contribution_manage';           // (운용사)출자배분관리(S1_14)
import { MemberInfoManage } from './member_info_manage';                   // 조합원정보등록(S1_15)
import { FundMemberManage } from './fund_member_manage';                   // 자펀드별조합원관리(S1_18)
import { ApfsContributionManage } from './apfs_contribution_manage';       // (농금원)출자배분관리(S1_21)
import { FundInvestStatus } from './fund_invest_status';                   // 투자실적 현황(자펀드)(S1_24)
import { FundStats } from './fund_stats';                                  // 종합통계(S1_25)
// 관리자 3리프(2026-09-14 typed 페이지 전환, 공통관리 S0_106·S0_105·S0_102). 동상 — GenericListPage 폴백 앞 분기
import { CodeManage } from './code_manage';                                  // 공통코드 관리(S0_106, master-detail)
import { MenuManage } from './menu_manage';                                  // 메뉴 관리(S0_105, 계층 트리)
import { UserPermissionManage } from './user_permission_manage';             // 사용자 권한 관리(S0_102, 권한 매트릭스)
import { ProgramManage } from './program_manage';                            // 프로그램 관리(S0_105 PROGRAMS 근거, 읽기 전용 목록)
import { UserManage } from './user_manage';                                  // 사용자 관리(S0_101)
import { UserInviteManage } from './user_invite_manage';                     // 사용자 초대(운용사)(S0_103)
import { PermissionHistory } from './permission_history';                    // 권한 변경이력(S0_107)
import { AuditLog } from './audit_log';                                      // 감사로그(S0_104)
import { LoginDemo } from './login_demo';                                    // 로그인(S0_001, Shell 없는 UI 데모)
import { OnboardingIssue } from './onboarding_issue';                        // 발급 온보딩(S0_002, 동상)
import { OnboardingInvite } from './onboarding_invite';                      // 초대 온보딩(S0_003, 동상)
import { MonthlyReportWindow } from './monthly_report';                      // 월간보고 상세(S1_06_01) — 정기보고에서 여는 팝업 창
/* 원문이 **한 화면에 여러 표/여러 조회기준**이라 PageSchema(columns 1벌)로 담기지 않는 4리프.
   나머지 9리프는 페이지 코드 0줄(스키마 주도 GenericListPage + 원문 리터럴 sample)로 남는다.
   근거는 각 파일 헤더 주석 참조(2026-09-15 source-fidelity 정정). */
import { AllReportStatus } from './all_report_status';              // 자펀드 전체 보고현황(S1_44) — 표 6개
import { InvesteeProfile } from './investee_profile';               // 투자기업정보(통합)(S1_30) — 기업개요 kv + 재무제표 + 주주명부
import { InvesteeInvestStats } from './investee_invest_stats';      // 투자실적현황(투자기업)(S1_34) — 집계 매트릭스 3장
import { InvestRecoveryDetail } from './invest_recovery_detail';    // 투자금 회수현황(S1_36) — 조회기준 2모드(컬럼·데이터 동시 전환)
import { GpEarlyWarning } from './gp_early_warning';                // 운용사별 조기경보 조회(S2_47) — 운용사구분 4종 그리드 + 재무정보 팝업
import { FundEarlyWarning } from './fund_early_warning';            // 자펀드별 조기경보 조회(S2_49) — 한도관리 2단 헤더 그리드 + 자펀드수익률 팝업
import { EwMonthCompare } from './ew_month_compare';              // 조기경보 전월 비교 조회(S2_63) — 당월/전월 대조 그리드 + 등급·변동 필터
/* 조기경보 > 기업정보·자펀드정보·가치평가 17리프(2026-09-23 목업 S2_65~S2_92 이식). 2단 헤더·합계행·다중 표·탭 통합·근거 팝업이
   있는 15리프는 전용 페이지(아래), 단일 헤더·flat 2리프(운용사 재무정보 비교 조회·평가시점 데이터 확인)는 스키마 주도 GenericListPage.
   표 데이터·컬럼 SSOT = risk_*_data.ts, 표 규약 = risk_grid.tsx, 바깥 양식 = risk_page_kit.tsx. */
import { CorpNiceInfo, CorpCreditInfo } from './corp_info_page';      // 투자기업정보(NICE평가정보)(S2_65·66·67 탭 3) · 투자기업신용정보 조회(S2_69·68 탭 2)
import { IrrByContract, IrrByInvestee, IrrBySubfund } from './irr_pages';   // IRR 3종(S2_87·91·89) + 근거 팝업(S2_88·92·90)
import { GpQuantIndicatorManage } from './gp_quant_indicator_manage';      // 운용사 정량지표 관리(S2_70 + 등록 S2_71·수정 S2_72 팝업)
import { GpTypeIndicatorTrend } from './gp_type_indicator_trend';          // 운용사 유형별 정량지표 변동 조회(S2_78 — 평균 카드 + 추이 차트 2섹션)
import { SubfundGradeTrend } from './subfund_grade_trend';                  // 자펀드 종합등급 변동 조회(S2_79 — 등급표 2 + 정상 비중 도넛)
import { MotherFundValuation } from './mother_fund_valuation';              // 모태펀드 가치평가 결과조회(S2_80 — 결과(입력칸 3) + 2단 헤더 상세)
import { SubfundReturnCompare, FundValuationResult, InvesteeValuationResult, SubfundAssetTx, ValuationExceptionReport, PortfolioReport } from './risk_table_pages';   // S2_77·81·82·84·85·83(표 1~4장 공용 골격)
/* 부처보고(2)·수탁보고(11) 13리프(2026-09-23 목업 S4_108·03/04_연도별투자현황·S3_98~S3_106 이식). 연도별투자현황은 기존 report-bucheo 분기,
   나머지 12리프도 전용 페이지(아래) — 계좌정보 비교조회(S3_104)는 단일 헤더지만 원문 검색이 기본값 있는 기간이라 스키마 필터로 못 담는다.
   표 규약·바깥 양식은 조기경보 17리프와 같은 risk_grid.tsx · risk_page_kit.tsx 를 재사용한다. */
import { RegistryLedgerManage } from './registry_ledger';                    // 등록원부관리(S4_108 — 목록 + 팝업 6종)
import { PhysicalDataManage, SecuritiesManage } from './trust_physical_upload';   // 실물자료관리(업로드)(S3_98) · 유가증권관리(업로드)(신규)
import { PhysicalVerifyCompare, SecuritiesCompare, TrustCommonCode, MotherTrustCode, AccountCompare, CashflowCompare } from './trust_table_pages';   // S3_101 · 신규 · S3_100 · S3_102 · S3_104 · S3_106
import { AssetFundInfoManage } from './asset_fund_info_manage';           // 자펀드정보관리(S2_73 2단 헤더 목록 + 등록 S2_74·수정 S2_75 팝업)
import { ReviewStats } from './review_stats';                            // 투심보고 통계(S1_28 — 단일 표 27열 + 기본값 검색조건·금액 단위)
import { TrustFundCode } from './trust_fund_code';                            // 자펀드코드 조회(S3_99 — 편집형 목록)
import { AccountInfoManage, CashflowInfoManage } from './trust_upload_forms'; // 계좌정보 관리(S3_103) · 입출금 정보관리(S3_105) — 업로드 폼
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
  "정기보고회수내역": "regular-report",   // 정기보고 리프의 옛 두 번째 탭 — 탭 삭제(2026-09-24 사용자 결정)로 정기보고로 승격
  "조합원총회": "general-meeting",
  "조합예상자금 정보보고": "fund-cash-forecast",
  "보고양식관리": "report-form",
  "보고 업데이트정보": "report-update-info",
  // 자펀드 관리 8리프(2026-09-12 typed 페이지 전환, S1_14~S1_27) — 리프에 path 부여 전 잔존 한글 route 승격
  "(운용사)출자배분관리": "gp-contribution",
  "조합원정보등록": "member-info",
  "자펀드별조합원관리": "fund-member",
  "(농금원)출자배분관리": "apfs-contribution",
  "투자실적 현황(자펀드)": "fund-invest-status",
  "종합통계": "fund-stats",
  "자펀드수탁관리(실물검증)": "custody-verify",
  "자펀드수탁관리(확정)": "custody-confirm",
  // 관리자 3리프(2026-09-14 typed 페이지 전환, S0_106·S0_105·S0_102) — 리프에 path 부여 전 잔존 한글 route(구조표 라벨)와
  // 브리프가 지정한 짧은 한글 별칭(코드관리·메뉴관리·권한관리) 모두 승격
  "공통코드 관리": "code-manage", "코드관리": "code-manage",
  "메뉴 관리": "menu-manage", "메뉴관리": "menu-manage",
  "사용자 권한 관리": "user-permission-manage", "권한관리": "user-permission-manage",
  "프로그램 관리": "program-manage", "프로그램관리": "program-manage",
  "사용자 관리": "user-manage", "사용자관리": "user-manage",
  "사용자 초대(운용사)": "user-invite-gp",
  "권한 변경이력": "permission-history",
  "감사로그": "audit-log",
  "로그인": "login",
  "발급온보딩": "onboarding-issue", "발급 온보딩": "onboarding-issue",
  "초대온보딩": "onboarding-invite", "초대 온보딩": "onboarding-invite",
  asset: "main", risk: "main", "gp-health": "main",
  accounting: "main", report: "main", "report-sutack": "main",
};
const aliasRoute = (r: string) => ROUTE_ALIAS[r] || r;
// 메뉴 항목은 해시 URL로도 직접 열 수 있다. 기존 localStorage 복원은 해시가 없을 때만 보조한다.
const hashRoute = () => {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '');
    // 브라우저는 한글 해시를 퍼센트 인코딩해 노출한다(`#/권한관리` → `#/%EA%B6%8C...`).
    // 디코드하지 않으면 ROUTE_ALIAS·MENU 어느 것과도 매칭되지 않아 화면이 폴백으로 떨어지고,
    // 그 인코딩 문자열이 localStorage(apfs.route)에 저장돼 해시 없는 다음 방문까지 오염된다.
    // NFC 정규화는 외부에서 복사된 NFD 한글 URL 방어(메뉴 label 은 NFC).
    try { return decodeURIComponent(raw).normalize('NFC'); } catch (e) { return raw; }   // 잘못된 % 시퀀스는 원문 유지
  } catch (e) { return ''; }
};

// MENU 트리에 없는 앱 전용 라우트(대시보드·데모·에디터·일정)의 한글 제목 — aria-live 통지용.
// 스키마/메뉴 리프 라우트는 findMenuContext가 한글 label을 돌려주므로 여기서 제외.
// (schedule은 MENU path에 없어 findMenuContext가 영문 'schedule'로 폴백 → 여기서 한글 지정)
const APP_ROUTE_TITLES: Record<string, string> = {
  main: "메인 대시보드", designsystem: "디자인 시스템", editor: "문서 편집기", schedule: "일정 관리",
  login: "로그인", "onboarding-issue": "발급 온보딩", "onboarding-invite": "초대 온보딩",
  "monthly-report": "월간보고",
};
// 팝업 창 전용 route — 메인 창과 localStorage 를 공유하므로 apfs.route·방문기록에 남기지 않는다
// (남기면 메인 창을 새로고침했을 때 팝업 화면이 열린다).
const POPUP_ROUTES = new Set(["monthly-report"]);
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
  const [route, setRoute] = useState(() => aliasRoute(hashRoute() || ls.get("apfs.route", "designsystem")));
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
  useEffect(() => {
    if (!POPUP_ROUTES.has(route)) ls.set("apfs.route", route);
    try {
      const nextHash = `#/${route}`;
      if (window.location.hash !== nextHash) window.history.replaceState(null, '', nextHash);
    } catch (e) {}
  }, [route]);
  useEffect(() => {
    const onHashChange = () => {
      const next = hashRoute();
      if (next) setRoute(aliasRoute(next));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => { if (!POPUP_ROUTES.has(route)) HistoryStore.push(route); }, [route]);   // 방문기록 적재(복원된 초기 라우트 포함)
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
  else if (route === "risk-manage") page = <EarlyWarningManage onNav={onNav} />;
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
  else if (route === "gp-contribution") page = <GpContributionManage onNav={onNav} />;
  else if (route === "member-info") page = <MemberInfoManage onNav={onNav} />;
  else if (route === "fund-member") page = <FundMemberManage onNav={onNav} />;
  else if (route === "apfs-contribution") page = <ApfsContributionManage onNav={onNav} />;
  else if (route === "fund-invest-status") page = <FundInvestStatus onNav={onNav} />;
  else if (route === "fund-stats") page = <FundStats onNav={onNav} />;
  else if (route === "custody-verify") page = <CustodyLeaf key={route} onNav={onNav} />;
  // 딥링크 별칭 '자펀드수탁관리(확정)' → custody-confirm — 자펀드 수탁관리 리프의 확정 탭으로 연다
  else if (route === "custody-confirm") page = <CustodyLeaf key={route} onNav={onNav} initial="confirm" />;
  else if (route === "code-manage") page = <CodeManage onNav={onNav} />;
  else if (route === "menu-manage") page = <MenuManage onNav={onNav} />;
  else if (route === "user-permission-manage") page = <UserPermissionManage onNav={onNav} />;
  else if (route === "program-manage") page = <ProgramManage onNav={onNav} />;
  else if (route === "user-manage") page = <UserManage onNav={onNav} />;
  else if (route === "user-invite-gp") page = <UserInviteManage onNav={onNav} />;
  else if (route === "permission-history") page = <PermissionHistory onNav={onNav} />;
  else if (route === "audit-log") page = <AuditLog onNav={onNav} />;
  else if (route === "report-bucheo") page = <ReportBucheo onNav={onNav} />;
  else if (route === "editor") page = <EditorPage onNav={onNav} />;
  else if (route === "자펀드정보관리") page = <AssetFundInfoManage onNav={onNav} />;
  else if (route === "투심보고 통계") page = <ReviewStats onNav={onNav} />;
  else if (route === "전체 보고현황") page = <AllReportStatus onNav={onNav} />;
  else if (route === "투자기업정보(통합)") page = <InvesteeProfile onNav={onNav} />;
  else if (route === "투자실적 현황(투자기업)") page = <InvesteeInvestStats onNav={onNav} />;
  else if (route === "투자금 회수현황") page = <InvestRecoveryDetail onNav={onNav} />;
  else if (route === "법률/규약위반사항 관리") page = <ViolationManage onNav={onNav} />;
  else if (route === "운용사 주주변동관리") page = <ShareholderManage onNav={onNav} />;
  else if (route === "운용사 소송관리") page = <LitigationManage onNav={onNav} />;
  else if (route === "운용인력 변동관리") page = <WorkforceManage onNav={onNav} />;
  else if (route === "조기경보 결과정보 관리") page = <EwResultManage onNav={onNav} />;
  else if (route === "운용사별 조기경보 조회") page = <GpEarlyWarning onNav={onNav} />;
  else if (route === "자펀드별 조기경보 조회") page = <FundEarlyWarning onNav={onNav} />;
  else if (route === "조기경보 전월 비교 조회") page = <EwMonthCompare onNav={onNav} />;
  else if (route === "투자기업정보(NICE평가정보)") page = <CorpNiceInfo onNav={onNav} />;
  else if (route === "투자기업신용정보 조회") page = <CorpCreditInfo onNav={onNav} />;
  else if (route === "투자기업별(계약별) IRR") page = <IrrByContract onNav={onNav} />;
  else if (route === "투자기업별 IRR") page = <IrrByInvestee onNav={onNav} />;
  else if (route === "자펀드별 IRR") page = <IrrBySubfund onNav={onNav} />;
  else if (route === "운용사 정량지표 관리") page = <GpQuantIndicatorManage onNav={onNav} />;
  else if (route === "운용사 유형별 정량지표 변동 조회") page = <GpTypeIndicatorTrend onNav={onNav} />;
  else if (route === "자펀드 수익률정보 비교 조회") page = <SubfundReturnCompare onNav={onNav} />;
  else if (route === "자펀드 종합등급 변동 조회") page = <SubfundGradeTrend onNav={onNav} />;
  else if (route === "모태펀드 가치평가 결과조회") page = <MotherFundValuation onNav={onNav} />;
  else if (route === "투자조합 가치평가 결과조회") page = <FundValuationResult onNav={onNav} />;
  else if (route === "피투자회사 가치평가 결과조회") page = <InvesteeValuationResult onNav={onNav} />;
  else if (route === "자펀드 투자자산 및 거래내역 조회") page = <SubfundAssetTx onNav={onNav} />;
  else if (route === "예외사항리포트") page = <ValuationExceptionReport onNav={onNav} />;
  else if (route === "Portfolio Report") page = <PortfolioReport onNav={onNav} />;
  else if (route === "등록원부관리") page = <RegistryLedgerManage onNav={onNav} />;
  else if (route === "실물자료관리(업로드)") page = <PhysicalDataManage onNav={onNav} />;
  else if (route === "실물검증비교조회") page = <PhysicalVerifyCompare onNav={onNav} />;
  else if (route === "유가증권관리(업로드)") page = <SecuritiesManage onNav={onNav} />;
  else if (route === "유가증권비교조회") page = <SecuritiesCompare onNav={onNav} />;
  else if (route === "공통코드조회") page = <TrustCommonCode onNav={onNav} />;
  else if (route === "자펀드코드 조회") page = <TrustFundCode onNav={onNav} />;
  else if (route === "모태수탁 공통코드") page = <MotherTrustCode onNav={onNav} />;
  else if (route === "계좌정보 관리") page = <AccountInfoManage onNav={onNav} />;
  else if (route === "계좌정보 비교조회") page = <AccountCompare onNav={onNav} />;
  else if (route === "입출금 정보관리") page = <CashflowInfoManage onNav={onNav} />;
  else if (route === "입출금정보 비교조회") page = <CashflowCompare onNav={onNav} />;
  // key=route: 스키마 페이지 간 이동 시 완전 리마운트 — 이전 페이지의 rows/필터/페이지 상태가
  // 새 스키마에 남아 미시드 컬럼이 undefined로 노출되던 문제 방지(즐겨찾기 FAB 딥링크로 상시 노출되는 경로)
  else page = <GenericListPage key={route} route={route} onNav={onNav} />;

  // 로그인·온보딩 3종은 메뉴 Shell/LNB의 자식이 아닌 독립 데모 route다(GNB/LNB 없이 단독 표시).
  // 월간보고(monthly-report)도 Shell 없이 단독 표시한다 — 정기보고에서 window.open 으로 여는 팝업 창 내용이다.
  // 실제 인증·계정 활성화·권한 판정은 수행하지 않는다.
  // Shell 밖이라도 MotionConfig 는 감싼다 — ui/checkbox·radio-group 의 scale 팝은 JS 구동 Motion 이라
  // tokens.css 의 prefers-reduced-motion 차단이 닿지 않고, 이 래퍼가 유일한 저모션 관문이다(Codex 리뷰 2026-09-19).
  const authPage =
    route === "login" ? <LoginDemo onNav={onNav} /> :
    route === "onboarding-issue" ? <OnboardingIssue onNav={onNav} /> :
    route === "onboarding-invite" ? <OnboardingInvite onNav={onNav} /> :
    route === "monthly-report" ? <MonthlyReportWindow onNav={onNav} /> : null;
  if (authPage) return <MotionConfig reducedMotion="user">{authPage}</MotionConfig>;

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
