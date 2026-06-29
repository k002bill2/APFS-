/* 한국어 더미 데이터 — 백엔드 없이 화면 완결. PRD 근거 위젯만. */
import React from 'react';
const spark = (arr) => arr;

const KPI = [
  { id:"aum",  label:"총 AUM (운용자산)", value:"23,840", unit:"억원", accent:"var(--chart-3)", icon:"landmark",
    delta:+3.2, deltaLabel:"전월 대비", trend:spark([198,205,201,214,222,219,231,238]) , fr:"FR-5.5-01" },
  { id:"exec", label:"모태펀드 집행률", value:"78.0", unit:"%", accent:"var(--primary)", icon:"target",
    delta:+1.4, deltaLabel:"목표 80% 대비", trend:spark([62,66,69,71,72,74,76,78]), fr:"FR-5.1-07", progress:78 },
  { id:"irr",  label:"전체 평균 IRR", value:"+12.6", unit:"%", accent:"var(--chart-2)", icon:"trending",
    delta:+0.8, deltaLabel:"전분기 대비", trend:spark([9.1,9.8,10.4,10.9,11.2,11.8,12.1,12.6]), fr:"FR-5.4-03·5.7-03" },
  { id:"alert",label:"활성 조기경보", value:"14", unit:"건", accent:"var(--danger)", icon:"shield-alert",
    delta:-2, deltaLabel:"전주 대비", invertDelta:true, trend:spark([21,20,19,18,17,16,16,14]), fr:"FR-5.6", alarm:true },
  { id:"close",label:"마감 임박 (D-7 이내)", value:"6", unit:"건", accent:"var(--warning)", icon:"calendar",
    delta:+1, deltaLabel:"전일 대비", invertDelta:true, trend:spark([3,3,4,4,5,5,6,6]), fr:"FR-5.10-05·06" },
];

// 출자·집행 현황 (분기)
const EXEC_Q = [
  { name:"1Q", plan:5200, actual:4980, rate:71 },
  { name:"2Q", plan:5600, actual:5310, rate:74 },
  { name:"3Q", plan:6100, actual:5720, rate:76 },
  { name:"4Q", plan:6400, actual:5990, rate:78 },
];
const EXEC_Y = [
  { name:"2022", plan:18200, actual:15900, rate:66 },
  { name:"2023", plan:20400, actual:18100, rate:71 },
  { name:"2024", plan:22600, actual:20300, rate:74 },
  { name:"2025", plan:23800, actual:21400, rate:76 },
  { name:"2026", plan:24800, actual:22000, rate:78 },
];

// 상태 분포 도넛 (자펀드/운용사)
const STATUS_DONUT = [
  { key:"normal", name:"정상", value:182, color:"var(--success)" },
  { key:"watch",  name:"주의", value:41,  color:"var(--warning)" },
  { key:"warn",   name:"경고", value:14,  color:"var(--danger)" },
];

// 산업별 투자 비중 (트리맵)
const INDUSTRY = [
  { name:"스마트팜·시설원예", value:4820, color:"var(--chart-1)" },
  { name:"식품가공·푸드테크", value:3910, color:"var(--chart-4)" },
  { name:"수산·양식", value:2740, color:"var(--chart-2)" },
  { name:"농기자재·스마트농기계", value:2180, color:"var(--chart-3)" },
  { name:"종자·바이오", value:1760, color:"var(--chart-11)" },
  { name:"유통·물류", value:1340, color:"var(--chart-6)" },
  { name:"축산·대체단백", value:980,  color:"var(--chart-18)" },
  { name:"기타", value:610, color:"var(--chart-5)" },
];

// 다가오는 일정/알림
const SCHEDULE = [
  { date:"2026-06-16", dday:"D-1", kind:"마감", tone:"danger", title:"5월 결산 전표 승인 마감", to:"회계·자금 마감" },
  { date:"2026-06-18", dday:"D-3", kind:"보고", tone:"warning", title:"수탁보고 — 2분기 운용현황 제출", to:"부처보고" },
  { date:"2026-06-19", dday:"D-4", kind:"점검", tone:"warning", title:"NICE 신용등급 변동 운용사 3건 소명", to:"조기경보" },
  { date:"2026-06-22", dday:"D-7", kind:"실사", tone:"info", title:"코어밸류파트너스 분기 현장실사", to:"운용사 건전성" },
  { date:"2026-06-25", dday:"D-10", kind:"가치평가", tone:"info", title:"상반기 공정가치 평가 결과 등록", to:"투자 성과" },
  { date:"2026-06-26", dday:"D-11", kind:"마감", tone:"warning", title:"6월 자금수지 정산 및 이체 승인", to:"회계·자금 마감" },
  { date:"2026-06-29", dday:"D-14", kind:"보고", tone:"info", title:"농식품부 정책자금 집행실적 보고", to:"부처보고" },
  { date:"2026-07-01", dday:"D-16", kind:"실사", tone:"info", title:"그린루트벤처스 사후관리 현장점검", to:"운용사 건전성" },
  { date:"2026-07-03", dday:"D-18", kind:"점검", tone:"warning", title:"의무투자비율 미달 자펀드 2건 점검", to:"투자 성과" },
  { date:"2026-07-06", dday:"D-21", kind:"마감", tone:"info", title:"2분기 운용보수 정산 마감", to:"운용사 건전성" },
  { date:"2026-07-10", dday:"D-25", kind:"가치평가", tone:"info", title:"신규 투자기업 5사 최초 평가 등록", to:"투자 성과" },
];

// 보조 KPI 미니카드
const MINI = [
  { id:"unapproved", label:"미승인(미결) 전표", value:"23", unit:"건", tone:"warning", fr:"FR-5.10-04", to:"회계·자금 마감" },
  { id:"noevidence", label:"증빙 미첨부 전표", value:"8",  unit:"건", tone:"danger",  fr:"부록A", to:"회계·자금 마감" },
  { id:"mandatory",  label:"의무투자비율 달성률", value:"94.2", unit:"%", tone:"success", fr:"FR-5.9-03", to:"투자 성과" },
];

// 영역 바로가기 카드 5종
const SHORTCUTS = [
  { id:"risk", title:"조기경보 리스크", desc:"운용사 상태·리스크 추이·위반 처리", metric:"경고 14건", tone:"danger", icon:"shield-alert", to:"risk" },
  { id:"gp",   title:"운용사 건전성", desc:"건전성·체크리스트·보수정산", metric:"운용사 38사", tone:"primary", icon:"building", to:"gp-health" },
  { id:"acct", title:"회계·자금 마감", desc:"일자별 마감·자금수지·전표 승인", metric:"미결 23건", tone:"warning", icon:"wallet", to:"accounting" },
  { id:"perf", title:"투자 성과·포트폴리오", desc:"IRR·산업/지역 비중·컴플라이언스", metric:"평균 +12.6%", tone:"success", icon:"trending", to:"performance" },
  { id:"sched",title:"오늘 일정·알림", desc:"마감 임박·보고·실사 일정", metric:"임박 6건", tone:"info", icon:"calendar", to:"schedule" },
];

// 리스크 지수 추이 (메인 보조 라인)
const RISK_TREND = [
  { name:"1월", v:38 },{ name:"2월", v:41 },{ name:"3월", v:46 },{ name:"4월", v:52 },
  { name:"5월", v:49 },{ name:"6월", v:58 },{ name:"7월", v:55 },{ name:"8월", v:61 },
  { name:"9월", v:57 },{ name:"10월", v:64 },{ name:"11월", v:60 },{ name:"12월", v:54 },
];
const RISK_THRESHOLD = 60;

// 알림센터
const NOTIFS = [
  { id:1, tone:"danger", icon:"shield-alert", title:"신용등급 하락 감지 — 그린루트벤처스", time:"12분 전", read:false, cat:"조기경보" },
  { id:2, tone:"warning", icon:"file", title:"전표 승인 요청 7건 도착", time:"38분 전", read:false, cat:"회계" },
  { id:3, tone:"info", icon:"calendar", title:"수탁보고 제출 마감 D-3", time:"1시간 전", read:false, cat:"보고" },
  { id:4, tone:"success", icon:"check", title:"코어밸류파트너스 분기보고 검증 완료", time:"3시간 전", read:true, cat:"자펀드" },
  { id:5, tone:"info", icon:"building", title:"신규 자펀드 1건 등록원부 반영", time:"어제", read:true, cat:"부처보고" },
];

// RBAC 역할 (3등급)
const ROLES = [
  { id:"admin",   name:"시스템 관리자", short:"관리자", desc:"전 기능·관리자 시스템 접근" },
  { id:"manager", name:"투자운용 실무자", short:"실무자", desc:"업무 처리·승인 요청·보고 등록" },
  { id:"viewer",  name:"조회 권한자", short:"조회자", desc:"대시보드·통계 조회 전용" },
];

// LNB — PRD 부록A 전체 메뉴 체계 (대분류→중분류→메뉴 3단계)
const MENU = [
  { id:"home", label:"대시보드", icon:"home", path:"main", roles:["admin","manager","viewer"] },

  { id:"asset", label:"투자자산관리", icon:"landmark", path:"asset", roles:["admin","manager","viewer"], children:[
    { label:"모태펀드관리", sub:true, children:[
      { label:"자펀드 공고 정보관리" },
      { label:"모태펀드 조성 및 출자현황", path:"asset-funding" },
    ]},
    { label:"조합관리", sub:true, children:[
      { label:"자펀드정보관리" },
      { label:"조합원정보조회" },
      { label:"자펀드별조합원조회" },
    ]},
    { label:"사후보고관리", sub:true, badge:4, children:[
      { label:"투심보고 확정 및 승인", badge:2 },
      { label:"투심보고 통계" },
      { label:"내부 투자심의 구성관리" },
      { label:"체크리스트 관리" },
      { label:"수시보고 확인", badge:1 },
      { label:"정기보고", badge:1 },
      { label:"조합원총회" },
      { label:"조합예상자금요청보고" },
    ]},
    { label:"자펀드관리", sub:true, badge:1, children:[
      { label:"자펀드 관리", path:"subfund" },
      { label:"출자/분배조회(자펀드)", badge:1 },
      { label:"출자/분배조회(농금원)" },
      { label:"자펀드 투자실적현황" },
      { label:"자펀드 수탁관리", badge:1 },
      { label:"종합통계(확정)" },
    ]},
    { label:"투자기업정보", sub:true, children:[
      { label:"투자기업정보(통합)" },
      { label:"투자기업명세서(통합)" },
      { label:"투자기업고용현황(통합)" },
      { label:"전체 투자실적" },
      { label:"투자실적현황(투자기업)" },
      { label:"투자금 회수현황" },
      { label:"우수투자기업 관리" },
    ]},
    { label:"운용사 모니터링", sub:true, badge:1, children:[
      { label:"운용사 명세서" },
      { label:"운용사 재무정보 조회" },
      { label:"투자금 실사보고 조회", badge:1 },
      { label:"사후관리기록 관리" },
      { label:"관리보수/성과보수 조회" },
      { label:"자펀드 전체 보고현황" },
    ]},
  ]},

  { id:"risk", label:"조기경보", icon:"shield-alert", path:"risk", badge:14, urgent:true, roles:["admin","manager","viewer"], children:[
    { label:"조기경보", sub:true, badge:9, children:[
      { label:"조기경보 관리", path:"risk-manage", badge:9 },
      { label:"운용사별 조기경보 조회" },
      { label:"자펀드별 조기경보 조회" },
      { label:"법률/규약위반사항 관리", badge:2 },
      { label:"운용사 주주변동관리" },
      { label:"운용사 소송관리" },
      { label:"운용인력 변동관리", badge:1 },
      { label:"조기경보 결과정보 관리" },
      { label:"조기경보 전월 비교 조회" },
    ]},
    { label:"기업정보", sub:true, children:[
      { label:"투자기업정보(NICE 평가정보)" },
      { label:"투자기업신용정보 조회" },
    ]},
    { label:"자펀드정보", sub:true, children:[
      { label:"운용사 정량지표 관리" },
      { label:"운용사 유형별 정량지표 변동 조회" },
      { label:"운용사 재무정보 비교 조회" },
      { label:"자펀드 수익률정보 비교 조회" },
      { label:"자펀드 종합등급 변동 조회" },
    ]},
    { label:"가치평가", sub:true, badge:3, children:[
      { label:"모태펀드 가치평가 결과조회" },
      { label:"투자조합 가치평가 결과조회" },
      { label:"피투자회사 가치평가 결과조회" },
      { label:"자펀드 투자자산 및 거래내역 조회" },
      { label:"예외사항레포트", badge:1 },
      { label:"평가시점 데이터 확인" },
      { label:"Portfolio Report" },
      { label:"투자기업별(계약별) IRR" },
      { label:"투자기업별 IRR" },
      { label:"자펀드별 IRR" },
    ]},
  ]},

  { id:"gp", label:"자펀드 보고", icon:"building", path:"gp-health", roles:["admin","manager","viewer"], children:[
    { label:"운영기관정보", sub:true, badge:3, children:[
      { label:"운용사별공통코드정보" },
      { label:"운용사정보", badge:1 },
      { label:"운용사인력현황", badge:1 },
      { label:"공동 GP 펀드별인력현황", badge:1 },
      { label:"운용사계정과목" },
      { label:"운용사재무정보" },
      { label:"운용사정량지표보고내역" },
    ]},
    { label:"조합정보", sub:true, badge:6, children:[
      { label:"조합정보", badge:1 },
      { label:"조합원정보", badge:1 },
      { label:"조합 투자운용인력", badge:1 },
      { label:"조합 월별/반기별보고현황", badge:1 },
      { label:"조합재무현황" },
      { label:"조합계좌현황" },
      { label:"조합 Call 요청일정및보고", badge:1 },
      { label:"조합출자/분배현황", badge:1 },
      { label:"조합원총회", badge:1 },
      { label:"조합 관리보수 및 성과보수내역", badge:1 },
      { label:"조합수시보고내역", badge:1 },
      { label:"조합유가증권투자현황(상장주식)" },
    ]},
    { label:"투자자산", sub:true, badge:3, children:[
      { label:"투자기업정보", badge:1 },
      { label:"투자기업고용현황(반기별)" },
      { label:"투자기업재무정보" },
      { label:"투자기업주주명부" },
      { label:"투자자금실사보고", badge:1 },
      { label:"프로젝트정보" },
      { label:"투자기업투심현황", badge:1 },
      { label:"투자약정정보", badge:1 },
      { label:"투자거래정보" },
    ]},
    { label:"월간보고조회", sub:true, badge:1, children:[{ label:"조합별 월간보고 현황", badge:1 }] },
    { label:"반기보고조회", sub:true, badge:1, children:[{ label:"조합별 반기보고 현황", badge:1 }] },
    { label:"실물검증", sub:true, badge:1, children:[{ label:"조합별 실물검증 결과 보고", badge:1 }] },
    { label:"파일", sub:true, badge:1, children:[{ label:"보고 파일 조회", badge:1 }] },
  ]},

  { id:"acct", label:"회계", icon:"wallet", path:"accounting", roles:["admin","manager"], badge:23, children:[
    { label:"기초관리", sub:true, children:[
      { label:"계정과목관리" },{ label:"결산양식관리" },
    ]},
    { label:"전표관리", sub:true, badge:23, children:[
      { label:"일반전표관리", badge:23 },
      { label:"삭제전표조회" },
      { label:"미결계정관리", badge:8 },
      { label:"전표증빙미첨부관리", badge:8 },
      { label:"일마감" },{ label:"전표검색" },
    ]},
    { label:"장부조회", sub:true, children:[
      { label:"일/월계표" },{ label:"계정별보조부" },
      { label:"총계정원장" },{ label:"재무상태표" },
      { label:"손익계산서" },{ label:"합계잔액시산표" },
    ]},
    { label:"결산관리", sub:true, children:[
      { label:"결산전표관리" },{ label:"회기생성/전기이월" },
    ]},
    { label:"자금관리", sub:true, children:[
      { label:"계좌관리" },{ label:"계좌잔액" },
      { label:"자금일보" },{ label:"출자금현황 정보관리" },
    ]},
    { label:"고정자산", sub:true, children:[
      { label:"유무형자산관리" },{ label:"감가상각비처리" },
    ]},
    { label:"설정", sub:true, children:[
      { label:"휴일관리" },{ label:"회계거래처관리" },
    ]},
  ]},

  { id:"report", label:"보고관리", icon:"file", path:"report", roles:["admin","manager"], children:[
    { label:"부처보고", path:"report-bucheo", children:[
      { label:"모태펀드", sub:true, children:[{ label:"연도별투자현황" }] },
      { label:"등록원부", sub:true, children:[{ label:"등록원부관리", path:"report-sutack" }] },
    ]},
    { label:"수탁보고", path:"report-sutack" },
  ]},

  { id:"trustee", label:"수탁보고", icon:"file-check", path:"report-sutack", roles:["admin","manager"], children:[
    { label:"자펀드수탁", sub:true, children:[
      { label:"실물자료관리(업로드)" },
      { label:"실물검증비교조회" },
      { label:"유가증권관리(업로드)" },
      { label:"유가증권비교조회" },
      { label:"자펀드코드 조회" },
    ]},
    { label:"모태펀드수탁", sub:true, children:[
      { label:"계좌정보관리" },
      { label:"계좌정보비교조회" },
      { label:"입출금정보관리" },
      { label:"입출금정보비교조회" },
    ]},
  ]},

  { id:"admin", label:"관리자", icon:"settings", roles:["admin"], children:[
    { label:"시스템관리", sub:true, children:[
      { label:"공통코드관리" },{ label:"메뉴관리" },{ label:"도움말 관리" },
    ]},
    { label:"사용자관리", sub:true, children:[
      { label:"사용자관리" },{ label:"사용자권한관리" },
    ]},
    { label:"외부연동", sub:true, children:[
      { label:"자펀드코드관리(운용사 ERP&수탁기관)" },
      { label:"연계 모니터링(API)" },
      { label:"자펀드보고양식관리(운용사 ERP)" },
    ]},
    { label:"보안", sub:true, children:[
      { label:"개인정보 접속관리" },
      { label:"사용자별 권한조회" },
      { label:"사용자별 로그조회" },
    ]},
    { label:"게시판", sub:true, children:[{ label:"게시판관리" }] },
  ]},
];

// 투자 포트폴리오 — 자펀드/투자자산 (성과·포트폴리오 서브페이지)
const PORTFOLIO = [
  { code:"SF", codeColor:"var(--chart-1)", name:"스마트팜 그로스 1호", meta:"VC-SF01 · 벤처조합 · 스마트팜",
    value:"284,200", change:+1.24, risk:"MEDIUM", riskTone:"info", hist:[3,4,3,5,6,5,7,8] },
  { code:"GB", codeColor:"var(--chart-3)", name:"그린바이오 투자조합", meta:"PEF-042 · 사모펀드 · 종자·바이오",
    value:"215,000", change:-0.12, risk:"LOW", riskTone:"success", hist:[6,6,5,6,6,5,6,6] },
  { code:"FV", codeColor:"var(--chart-4)", name:"수산벤처 2호", meta:"VC-FV02 · 벤처조합 · 수산·양식",
    value:"128,440", change:+4.88, risk:"HIGH", riskTone:"warning", hist:[2,2,3,3,2,4,5,7] },
  { code:"FT", codeColor:"var(--chart-5)", name:"푸드테크 액셀러레이터", meta:"AGF-110 · 개인투자조합 · 푸드테크",
    value:"96,800", change:+2.05, risk:"MEDIUM", riskTone:"info", hist:[4,5,4,6,5,6,6,7] },
  { code:"MF", codeColor:"var(--chart-2)", name:"농식품 모태 직접출자", meta:"GSB-10Y · 직접출자 · 고정수익",
    value:"1,040,000", change:0.0, risk:"ULTRA-LOW", riskTone:"success", hist:[6,6,6,6,6,6,6,6] },
];

// 퀵메뉴 — 메인 상단 정적 카드 섹션 (자주 쓰는 업무 바로가기 6종, 기능 설명 포함)
const QUICKMENU = [
  { label: "투자등록", desc: "신규 출자·투자 건 등록 및 심의 요청", icon: "plus", to: "performance", tone: "primary" },
  { label: "보고서 제출", desc: "운용사 정기·수시 보고서 작성·제출", icon: "file", to: "gp-health", tone: "info" },
  { label: "조기경보 확인", desc: "리스크 경보 모니터링 및 위반 처리", icon: "shield-alert", to: "risk", tone: "danger", urgent: true, badge: 14 },
  { label: "운용사 평가", desc: "건전성·체크리스트 기반 정기 평가", icon: "activity", to: "risk", tone: "warning" },
  { label: "회계 마감", desc: "일자별 자금수지·전표 검토·승인", icon: "wallet", to: "accounting", tone: "success" },
  { label: "문서함", desc: "수신 문서·결재함 조회 및 처리", icon: "inbox", to: "gp-health", tone: "info" },
];

// 즐겨찾기 — LNB 상단 고정 (사용자가 핀한 업무 딥링크)
const FAVORITES = [
  { label: "투자등록 신청", icon: "plus", to: "performance" },
  { label: "조합 등록/변경 신청", icon: "file", to: "gp-health" },
  { label: "전문인력 확인서 출력", icon: "download", to: "accounting" },
];

const REGION_BARS = [
  { name:"수도권", plan:5200, actual:4760 },
  { name:"강원", plan:1800, actual:1520 },
  { name:"충청", plan:3900, actual:3610 },
  { name:"전라", plan:4400, actual:4180 },
  { name:"경상", plan:4100, actual:3720 },
  { name:"제주", plan:1200, actual:1040 },
];

const NOTIF_CENTER = {
  todo: {
    delayed: [
      { title:"2분기 운용현황 수탁보고 초안 작성", due:"2026.06.10", dday:"D+9" },
      { title:"그린루트벤처스 실사 결과 정리", due:"2026.06.14", dday:"D+5" },
    ],
    progress: [
      { title:"5월 결산 전표 검토·승인", due:"2026.06.21", dday:"D-2", near:true },
      { title:"신규 자펀드 등록원부 반영 확인", due:"2026.07.02", dday:"D-13" },
      { title:"포트폴리오 리밸런싱 검토", start:"2026.06.19", dday:"마감 미정" },
    ],
    upcoming: [
      { title:"3분기 투자심의 자료 준비", start:"2026.06.30", dday:"D-11" },
    ],
  },
  approval: [
    { tag:"결재", tone:"danger",  title:"물품구매 신청의 건", form:"물품구매", by:"김정원", date:"2026-06-15" },
    { tag:"합의", tone:"info",    title:"코어밸류파트너스 출자약정 변경", form:"계약변경", by:"이서준", date:"2026-06-14" },
    { tag:"결재", tone:"danger",  title:"로고스벤처투자조합 1호 운용지시", form:"운용지시서", by:"홍길동", date:"2026-06-13" },
    { tag:"반려", tone:"warning", title:"5월 출장 정산의 건", form:"일반기안서", by:"박도윤", date:"2026-06-11" },
    { tag:"참조", tone:"info",    title:"휴가 및 휴직 신청 가이드 안내", form:"일반기안서", by:"홍길동", date:"2026-06-10" },
    { tag:"의결", tone:"success", title:"㈜컬리 회수위원회 의견서", form:"회수위원회", by:"홍길동", date:"2026-06-09" },
  ],
  schedule: {
    today: [
      { tag:"회의", tone:"info",    title:"농협 운용현황 점검 회의", by:"김정원", time:"AM 09:00", day:19 },
      { tag:"출장", tone:"warning", title:"부산 자펀드 운용사 실사", by:"이서준", time:"PM 02:00", day:19 },
      { tag:"휴가", tone:"success", title:"연차", by:"박도윤", time:"", day:19 },
    ],
    week: [
      { tag:"보고", tone:"danger", title:"수탁보고 — 2분기 운용현황 제출", by:"김정원", time:"AM 10:00", date:"06.20 금", day:20 },
      { tag:"회의", tone:"info",   title:"3분기 투자심의위원회", by:"운용본부", time:"PM 03:00", date:"06.23 월", day:23 },
      { tag:"휴가", tone:"success", title:"오전반차", by:"강현우", time:"", date:"06.24 화", day:24 },
    ],
  },
  notice: [
    { tag:"긴급공지", tone:"danger", title:"휴가 및 휴직 결재선 및 신청 가이드", by:"경영지원실", date:"2026-06-15" },
    { tag:"긴급공지", tone:"danger", title:"창립기념일 휴무 안내", by:"경영지원실", date:"2026-06-12" },
    { tag:"공지", tone:"info", title:"인사발령 공지", by:"인사팀", date:"2026-06-10" },
    { tag:"공지", tone:"info", title:"증명서 발급 신청 안내", by:"인사팀", date:"2026-06-09" },
    { tag:"공지", tone:"info", title:"투자관리시스템 정기점검 안내", by:"정보화팀", date:"2026-06-08" },
  ],
  bank: [
    { tag:"보완요청", tone:"warning", title:"로고스벤처투자조합 1호 회수 1,000,000,000원 운용지시 보완 요청", fund:"로고스벤처투자조합 1호", by:"홍길동", date:"2026-06-15" },
    { tag:"처리완료", tone:"success", title:"로고스벤처투자조합 1호 투자 1,000,000,000원 운용지시 처리 완료", fund:"로고스벤처투자조합 1호", by:"홍길동", date:"2026-06-13" },
    { tag:"환전", tone:"info", title:"로고스벤처투자조합 1호 환율(1,200원) 확정", fund:"로고스벤처투자조합 1호", by:"홍길동", date:"2026-06-11" },
  ],
  system: [
    { tag:"준법", tone:"danger",  title:"투자전확인서류(IL0203) 제출 기한 임박", code:"IL0203", date:"2026-06-15" },
    { tag:"준법", tone:"warning", title:"개인투자행위제한 준수서약서 갱신 필요", code:"PG0357", date:"2026-06-12" },
    { tag:"운영", tone:"info",    title:"이해충돌 체크리스트 담당자 지정 요청", code:"PG0356", date:"2026-06-11" },
    { tag:"운영", tone:"info",    title:"오류보고 1건 담당자 미지정", code:"KiiPS", date:"2026-06-10" },
    { tag:"준법", tone:"warning", title:"투자후확인서류(IL0121) 검토 대기", code:"IL0121", date:"2026-06-09" },
  ],
};

const CAT_ICON: Record<string,string> = { "투자자산관리":"landmark", "조기경보":"shield-alert", "운용사 보고":"building", "회계 관리":"wallet", "부처보고":"file", "통계조회":"chart", "관리자":"settings" };
const MENU_FULL = [
  { cat:"투자자산관리", to:"performance", subs:[
    { name:"모태/자펀드 관리", leaves:["출자 약정 관리","출자 집행","회수 관리"] },
    { name:"사후관리",         leaves:["정기보고 점검","현장 실사","시정 조치"] },
    { name:"투자기업 정보",     leaves:["기업 현황","재무제표 조회","투자 이력"] },
  ]},
  { cat:"조기경보", to:"risk", urgent:true, subs:[
    { name:"리스크 모니터링", leaves:["지표 대시보드","알림 설정",{label:"경보 이력",badge:14}] },
    { name:"가치평가 관리",   leaves:["평가 등록","평가 검토","평가 확정"] },
  ]},
  { cat:"운용사 보고", to:"gp-health", subs:[
    { name:"운용기관 정보",  leaves:["등록 현황","인력 현황","변경 신청"] },
    { name:"재무·조합 정보", leaves:["재무제표","조합 현황","출자자 명부"] },
    { name:"자펀드 검증",    leaves:["결성 검증","운용 검증","청산 검증"] },
  ]},
  { cat:"회계 관리", to:"accounting", subs:[
    { name:"자금관리",  leaves:["입출금 내역","자금 계획","이체 승인"] },
    { name:"분개·전표", leaves:["전표 입력","전표 조회","분개 관리"] },
    { name:"결산관리",  leaves:["월 결산","분기 결산","연 결산"] },
  ]},
  { cat:"부처보고", to:"gp-health", subs:[
    { name:"등록원부 관리", leaves:["원부 등록","원부 변경","원부 조회"] },
    { name:"수탁보고",      leaves:["정기 보고","수시 보고","보고 이력"] },
  ]},
  { cat:"통계조회", to:"performance", subs:[
    { name:"투자 성과",   leaves:["포트폴리오 현황","수익률 분석","벤치마크 비교"] },
    { name:"통계 리포트", leaves:["정형 보고서","맞춤 통계","데이터 다운로드"] },
  ]},
  { cat:"관리자", to:"main", subs:[
    { name:"통합 모니터링", leaves:["시스템 현황","접속 로그","알림 관리"] },
    { name:"권한 관리",     leaves:["사용자 관리","역할 관리","메뉴 권한"] },
    { name:"시스템 관리",   leaves:["코드 관리","공통 설정","배치 관리"] },
  ]},
];
const ALLMENU: any[] = [];
MENU_FULL.forEach((c, ci) => c.subs.forEach((g, gi) => g.leaves.forEach((lf: any, li) => {
  const o = typeof lf === "string" ? { label: lf } : lf;
  ALLMENU.push({ key: "c" + ci + "-" + gi + "-" + li, label: o.label, to: c.to, icon: CAT_ICON[c.cat], cat: c.cat, sub: g.name, urgent: c.urgent || o.urgent, badge: o.badge });
})));
const DEFAULT_FAV = ["c0-0-0", "c1-0-0", "c3-1-0"];

export const MenuStore = {
  _key: (kind: string) => "apfs.menu.v2." + kind,
  get(kind: string) {
    try { const v = JSON.parse(localStorage.getItem(this._key(kind)) || "null"); if (Array.isArray(v)) return v; } catch (e) {}
    return null;
  },
  keysOr(kind: string, def: string[]) { return this.get(kind) || def; },
  set(kind: string, keys: string[]) {
    try { localStorage.setItem(this._key(kind), JSON.stringify(keys)); } catch (e) {}
    window.dispatchEvent(new CustomEvent("apfs-menu-change", { detail: { kind } }));
  },
  resolve(keys: string[]) { return keys.map((k) => ALLMENU.find((o) => o.key === k)).filter(Boolean); },
};

export function useMenuSel(kind: string, def: string[]) {
  const { useState: uS, useEffect: uE } = React;
  const [keys, setKeys] = uS<string[]>(() => MenuStore.keysOr(kind, def));
  uE(() => {
    setKeys(MenuStore.keysOr(kind, def));
    const f = (e: Event) => { const ce = e as CustomEvent; if (!ce.detail || ce.detail.kind === kind) setKeys(MenuStore.keysOr(kind, def)); };
    window.addEventListener("apfs-menu-change", f);
    return () => window.removeEventListener("apfs-menu-change", f);
  }, [kind]);
  return keys;
}

export const APFS_DATA = { KPI, EXEC_Q, EXEC_Y, STATUS_DONUT, INDUSTRY, SCHEDULE, MINI, SHORTCUTS,
  RISK_TREND, RISK_THRESHOLD, REGION_BARS, NOTIFS, NOTIF_CENTER, ROLES, MENU, PORTFOLIO, QUICKMENU, FAVORITES,
  ALLMENU, DEFAULT_FAV };
