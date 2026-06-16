/* 조기경보 리스크 관리 페이지 — FR-5.6 / FR-5.7
   운용사 리스크 지수 추이 · 조기경보 목록 · 상태 분포 · 운용사별 현황 */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA } from './data';

const { useState, useMemo } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, DeltaBadge, Card, ChartCard, SegTabs,
  FilterChip, Button, IconBtn, EmptyState, CountPill, toneVar,
} = UI;
const { Sparkline, Donut, LineTrend, HBars, useMeasure, fmtEok } = Charts;
const D = APFS_DATA;
const h = React.createElement;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ───────────────────────────────────────────────
   로컬 더미 데이터
─────────────────────────────────────────────── */
const KPI_RISK = [
  {
    id: "total",
    label: "총 활성 경보",
    value: 14,
    unit: "건",
    icon: "shield-alert",
    accent: "var(--danger)",
    delta: -2,
    deltaLabel: "전주 대비",
    invert: true,
    trend: [21, 20, 19, 18, 17, 16, 16, 14],
  },
  {
    id: "warn",
    label: "경고 등급",
    value: 5,
    unit: "건",
    icon: "alert-triangle",
    accent: "var(--danger)",
    delta: +1,
    deltaLabel: "전주 대비",
    invert: true,
    trend: [3, 3, 3, 4, 4, 4, 4, 5],
  },
  {
    id: "watch",
    label: "주의 등급",
    value: 9,
    unit: "건",
    icon: "eye",
    accent: "var(--warning)",
    delta: -3,
    deltaLabel: "전주 대비",
    invert: true,
    trend: [14, 13, 12, 11, 11, 10, 12, 9],
  },
  {
    id: "new",
    label: "이번 주 신규",
    value: 3,
    unit: "건",
    icon: "bell",
    accent: "var(--info)",
    delta: 0,
    deltaLabel: "전주 대비",
    invert: false,
    trend: [2, 4, 1, 3, 2, 5, 2, 3],
  },
];

/* 처리 단계 (5단계) */
const STEPS = ["감지", "분류", "배정", "처리", "완료"];

/* 조기경보 목록 */
const ALERTS = [
  {
    id: "AL-001",
    gp: "그린루트벤처스",
    gpCode: "GR",
    gpColor: "var(--chart-1)",
    type: "신용등급하락",
    grade: "경고",
    gradeTone: "danger",
    date: "2026-06-14",
    step: 2, // 배정(index 2)
    manager: "김민준",
    desc: "NICE CB 신용등급 B+ → B 하락",
  },
  {
    id: "AL-002",
    gp: "코어밸류파트너스",
    gpCode: "CV",
    gpColor: "var(--chart-3)",
    type: "재무지표악화",
    grade: "주의",
    gradeTone: "warning",
    date: "2026-06-10",
    step: 3, // 처리(index 3)
    manager: "이서연",
    desc: "부채비율 전기 대비 28%p 증가",
  },
  {
    id: "AL-003",
    gp: "아그리벤처스",
    gpCode: "AV",
    gpColor: "var(--chart-4)",
    type: "법규위반",
    grade: "경고",
    gradeTone: "danger",
    date: "2026-06-08",
    step: 1, // 분류(index 1)
    manager: "박지호",
    desc: "자본시장법 의무보고 미제출",
  },
  {
    id: "AL-004",
    gp: "푸드인베스트",
    gpCode: "FI",
    gpColor: "var(--chart-5)",
    type: "운용인력변동",
    grade: "주의",
    gradeTone: "warning",
    date: "2026-06-07",
    step: 3, // 처리(index 3)
    manager: "최유진",
    desc: "대표 GP 교체 신고 접수",
  },
  {
    id: "AL-005",
    gp: "그린루트벤처스",
    gpCode: "GR",
    gpColor: "var(--chart-1)",
    type: "재무지표악화",
    grade: "주의",
    gradeTone: "warning",
    date: "2026-06-05",
    step: 4, // 완료(index 4)
    manager: "김민준",
    desc: "자기자본 20% 이상 감소 감지",
  },
  {
    id: "AL-006",
    gp: "바이오팜캐피탈",
    gpCode: "BP",
    gpColor: "var(--chart-2)",
    type: "신용등급하락",
    grade: "경고",
    gradeTone: "danger",
    date: "2026-06-03",
    step: 2, // 배정(index 2)
    manager: "정하늘",
    desc: "한국신용평가 등급 BB → BB- 하락",
  },
  {
    id: "AL-007",
    gp: "아그리벤처스",
    gpCode: "AV",
    gpColor: "var(--chart-4)",
    type: "운용인력변동",
    grade: "주의",
    gradeTone: "warning",
    date: "2026-05-30",
    step: 4, // 완료(index 4)
    manager: "박지호",
    desc: "운용역 2인 동시 이직 보고",
  },
  {
    id: "AL-008",
    gp: "코어밸류파트너스",
    gpCode: "CV",
    gpColor: "var(--chart-3)",
    type: "법규위반",
    grade: "경고",
    gradeTone: "danger",
    date: "2026-05-28",
    step: 4, // 완료(index 4)
    manager: "이서연",
    desc: "회계감사 의견 '한정' 수령",
  },
];

/* 운용사별 경보 건수 (HBars용) */
const GP_BARS = [
  { name: "그린루트벤처스", value: 5, max: 5, color: "var(--chart-1)" },
  { name: "아그리벤처스",   value: 4, max: 5, color: "var(--chart-4)" },
  { name: "코어밸류파트너스", value: 3, max: 5, color: "var(--chart-3)" },
  { name: "바이오팜캐피탈", value: 2, max: 5, color: "var(--chart-2)" },
  { name: "푸드인베스트",   value: 1, max: 5, color: "var(--chart-5)" },
];

/* 경보 유형 FilterChip 목록 */
const TYPES = [
  { id: "신용등급하락", label: "신용등급 하락" },
  { id: "재무지표악화", label: "재무지표 악화" },
  { id: "법규위반",     label: "법규위반" },
  { id: "운용인력변동", label: "운용인력 변동" },
];

/* ───────────────────────────────────────────────
   KPI 미니카드
─────────────────────────────────────────────── */
function RiskKpiCard({ kpi }) {
  return h("div", {
    className: "rounded-card border border-border bg-card shadow-sm px-[18px] py-[14px] flex flex-col gap-2 min-w-0",
  },
    h("div", { className: "flex items-center justify-between gap-2" },
      h("div", { className: "flex items-center gap-2 min-w-0" },
        h(ColorChip, { icon: kpi.icon, color: kpi.accent, size: 32, iconSize: 17 }),
        h("span", { className: "t-label truncate" }, kpi.label)),
      h("div", { className: "shrink-0 w-[70px]" },
        h(Sparkline, { data: kpi.trend, color: kpi.accent, id: kpi.id, height: 32 }))),
    h("div", { className: "flex items-baseline gap-1.5" },
      h("span", { className: "t-display tabular", style: { fontSize: 26, letterSpacing: "-.01em", color: kpi.accent } }, kpi.value),
      h("span", { className: "text-[12.5px] font-semibold", style: { color: "var(--muted-foreground)" } }, kpi.unit)),
    h(DeltaBadge, { value: kpi.delta, label: kpi.deltaLabel, invert: kpi.invert }));
}

/* ───────────────────────────────────────────────
   5단계 처리 스텝퍼
─────────────────────────────────────────────── */
function StepBadge({ stepIndex }) {
  return h("div", { className: "inline-flex items-center gap-[3px]" },
    STEPS.map((s, i) => {
      const done = i < stepIndex;
      const active = i === stepIndex;
      const future = i > stepIndex;
      return h("div", {
        key: i,
        className: "inline-flex flex-col items-center gap-[2px]",
      },
        h("div", {
          style: {
            width: i === stepIndex ? 20 : 14,
            height: 5,
            borderRadius: 3,
            background: active
              ? "var(--primary)"
              : done
              ? "color-mix(in srgb,var(--primary) 40%,transparent)"
              : "var(--border)",
            transition: "width .2s",
          },
        }),
        active && h("span", {
          className: "text-[9.5px] font-bold whitespace-nowrap",
          style: { color: "var(--primary)", lineHeight: 1 },
        }, s));
    }),
    h("span", {
      className: "ml-1 text-[11px] font-semibold",
      style: { color: stepIndex === 4 ? "var(--success)" : "var(--muted-foreground)" },
    }, STEPS[stepIndex]));
}

/* ───────────────────────────────────────────────
   메인 Risk 페이지
─────────────────────────────────────────────── */
function Risk({ onNav }) {
  const [period, setPeriod] = useState("월간");
  const [activeTypes, setActiveTypes] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);

  const toggleType = (id) =>
    setActiveTypes((prev) => ({ ...prev, [id]: !prev[id] }));

  const anyTypeActive = Object.values(activeTypes).some(Boolean);

  const filteredAlerts = useMemo(() => {
    if (!anyTypeActive) return ALERTS;
    return ALERTS.filter((a) => activeTypes[a.type]);
  }, [activeTypes, anyTypeActive]);

  return h("div", {
    className: "max-w-[1320px] mx-auto",
    style: { animation: "dashFade .35s var(--ease) both" },
  },

    /* ── PageHeader ── */
    h(PageHeader, {
      crumbs: ["홈", "조기경보", "리스크 모니터링"],
      title: "조기경보 리스크 관리",
      sub: "운용사 리스크 지수 추이 · 조기경보 발생 현황 · 5단계 처리 — 2026-06-16 기준",
      actions: h(React.Fragment, null,
        h(Button, {
          variant: "outline",
          size: "sm",
          leadingIcon: "chevron-left",
          onClick: () => onNav("main"),
        }, "메인으로"),
        h(Button, {
          variant: "primary",
          size: "sm",
          leadingIcon: "download",
        }, "내보내기")),
    }),

    /* ── 필터 바 ── */
    h("div", {
      className: "flex items-center gap-3 flex-wrap mb-4 px-0.5",
    },
      h("span", { className: "t-label text-[12.5px]" }, "기간"),
      h(SegTabs, {
        options: [
          { value: "주간", label: "주간" },
          { value: "월간", label: "월간" },
          { value: "분기별", label: "분기별" },
        ],
        value: period,
        onChange: setPeriod,
        size: "sm",
      }),
      h("div", { style: { width: 1, height: 20, background: "var(--border)" } }),
      h("span", { className: "t-label text-[12.5px]" }, "유형"),
      TYPES.map((t) =>
        h(FilterChip, {
          key: t.id,
          active: !!activeTypes[t.id],
          onClick: () => toggleType(t.id),
          dot: activeTypes[t.id] ? "var(--primary)" : undefined,
        }, t.label)),
      anyTypeActive && h("button", {
        onClick: () => setActiveTypes({}),
        className: "text-[12px] font-semibold cursor-pointer",
        style: { color: "var(--muted-foreground)", background: "none", border: "none", padding: 0 },
      }, "필터 초기화")),

    /* ── KPI 미니카드 4열 ── */
    h("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4" },
      KPI_RISK.map((kpi) => h(RiskKpiCard, { key: kpi.id, kpi }))),

    /* ── 리스크 지수 추이 (전체 너비) ── */
    h(ChartCard, {
      title: "리스크 지수 추이",
      sub: "월별 리스크 지수 · 임계선 60 초과 시 즉시 대응",
      icon: "trending",
      accent: "var(--danger)",
      right: h("div", { className: "flex items-center gap-2" },
        h("span", {
          className: "inline-flex items-center gap-1.5 text-[12px] font-semibold",
          style: { color: "var(--danger)" },
        },
          h("span", {
            style: {
              display: "inline-block",
              width: 18,
              height: 2,
              borderTop: "2px dashed var(--danger)",
              borderRadius: 2,
            },
          }),
          "임계선 60"),
        h(IconBtn, { icon: "more", label: "더보기", size: 34 })),
    },
      h(LineTrend, {
        data: D.RISK_TREND,
        threshold: D.RISK_THRESHOLD,
        height: 220,
        color: "var(--danger)",
      })),

    /* ── 조기경보 목록 테이블 ── */
    h("div", {
      className: "rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mt-4 mb-4",
    },
      /* 카드 헤더 */
      h("div", { className: "flex items-center justify-between gap-3 flex-wrap px-5 sm:px-6 pt-5 pb-4 border-b border-border" },
        h("div", { className: "flex items-center gap-2.5" },
          h(ColorChip, { icon: "shield-alert", color: "var(--danger)", size: 34, iconSize: 18 }),
          h("div", null,
            h("div", { className: "t-cardtitle" }, "조기경보 목록"),
            h("div", { className: "t-caption mt-px" },
              h("span", { style: { color: "var(--danger)", fontWeight: 700 } }, filteredAlerts.length + "건"),
              " 표시 중 (전체 ", ALERTS.length, "건)"))),
        h("div", { className: "flex items-center gap-2" },
          h(StatusBadge, { tone: "danger", label: "경고 " + ALERTS.filter((a) => a.gradeTone === "danger").length + "건" }),
          h(StatusBadge, { tone: "warning", label: "주의 " + ALERTS.filter((a) => a.gradeTone === "warning").length + "건" }),
          h(IconBtn, { icon: "refresh", label: "새로고침", size: 34 }),
          h(IconBtn, { icon: "download", label: "내보내기", size: 34 }))),

      /* 테이블 */
      h("div", { className: "overflow-x-auto" },
        h("table", { className: "w-full border-collapse min-w-[880px]" },
          h("thead", null,
            h("tr", { style: { background: "color-mix(in srgb,var(--muted) 60%,transparent)" } },
              [
                ["운용사", "left", "pl-5 sm:pl-6"],
                ["경보 유형", "left", ""],
                ["등급", "left", ""],
                ["발생일", "left", ""],
                ["처리 상태", "left", ""],
                ["담당자", "left", ""],
                ["", "right", "pr-5 sm:pr-6"],
              ].map(([label, align, extra], i) =>
                h("th", {
                  key: i,
                  className: cx(
                    "t-label font-semibold px-4 py-3 whitespace-nowrap",
                    align === "right" ? "text-right" : "text-left",
                    extra),
                }, label)))),
          h("tbody", null,
            filteredAlerts.length === 0
              ? h("tr", null,
                  h("td", { colSpan: 7, style: { padding: 0 } },
                    h(EmptyState, { msg: "선택한 유형의 경보가 없습니다", icon: "shield", height: 120 })))
              : filteredAlerts.map((row, i) =>
                  h("tr", {
                    key: row.id,
                    className: "border-t border-border transition-colors cursor-pointer",
                    style: { background: selectedRow === row.id ? "color-mix(in srgb,var(--primary) 5%,transparent)" : "transparent" },
                    onClick: () => setSelectedRow(selectedRow === row.id ? null : row.id),
                    onMouseEnter: (e) => {
                      if (selectedRow !== row.id)
                        e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)";
                    },
                    onMouseLeave: (e) => {
                      if (selectedRow !== row.id)
                        e.currentTarget.style.background = "transparent";
                    },
                  },
                    /* 운용사 */
                    h("td", { className: "px-4 pl-5 sm:pl-6 py-3.5 whitespace-nowrap" },
                      h("div", { className: "flex items-center gap-2.5" },
                        h("span", {
                          className: "inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-white text-[11px] font-bold shrink-0",
                          style: { background: row.gpColor },
                        }, row.gpCode),
                        h("div", null,
                          h("div", { className: "text-[13.5px] font-semibold", style: { color: "var(--foreground)" } }, row.gp),
                          h("div", { className: "t-caption text-[11px]" }, row.id)))),
                    /* 경보 유형 */
                    h("td", { className: "px-4 py-3.5 whitespace-nowrap" },
                      h("div", null,
                        h("div", { className: "text-[13px] font-semibold", style: { color: "var(--foreground)" } }, row.type),
                        h("div", { className: "t-caption text-[11px] mt-0.5 max-w-[200px] truncate" }, row.desc))),
                    /* 등급 */
                    h("td", { className: "px-4 py-3.5 whitespace-nowrap" },
                      h(StatusBadge, { tone: row.gradeTone, label: row.grade, size: "md" })),
                    /* 발생일 */
                    h("td", { className: "px-4 py-3.5 whitespace-nowrap tabular text-[13px]", style: { color: "var(--muted-foreground)" } }, row.date),
                    /* 처리 상태 스텝퍼 */
                    h("td", { className: "px-4 py-3.5" },
                      h(StepBadge, { stepIndex: row.step })),
                    /* 담당자 */
                    h("td", { className: "px-4 py-3.5 whitespace-nowrap" },
                      h("div", { className: "flex items-center gap-1.5" },
                        h("span", {
                          className: "inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold shrink-0",
                          style: { background: "var(--muted-foreground)", fontSize: 10 },
                        }, row.manager[0]),
                        h("span", { className: "text-[13px] font-medium", style: { color: "var(--foreground)" } }, row.manager))),
                    /* 액션 */
                    h("td", { className: "px-4 pr-5 sm:pr-6 py-3.5 text-right whitespace-nowrap" },
                      h(Button, {
                        variant: "outline",
                        size: "sm",
                        leadingIcon: "external",
                        onClick: (e) => { e.stopPropagation(); },
                      }, "상세보기")))))),

        /* 푸터 */
        h("div", { className: "flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 py-3.5 border-t border-border" },
          h("span", { className: "t-caption" },
            "총 ", h("b", { style: { color: "var(--foreground)" } }, ALERTS.length + "건"),
            " 중 ", filteredAlerts.length + "건 표시"),
          h("div", { className: "flex items-center gap-1.5" },
            h(IconBtn, { icon: "chevron-left", label: "이전", size: 32 }),
            h("span", {
              className: "inline-flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-bold",
              style: { background: "color-mix(in srgb,var(--primary) 12%,transparent)", color: "var(--primary)" },
            }, "1"),
            h(IconBtn, { icon: "chevron-right", label: "다음", size: 32 }))))),

    /* ── 하단 2열: 도넛 + HBars ── */
    h("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4" },

      /* 왼쪽: 상태 분포 도넛 */
      h(ChartCard, {
        title: "운용사 상태 분포",
        sub: "전체 237개 운용사 · 자펀드 기준",
        icon: "pie-chart",
        accent: "var(--primary)",
        right: h(IconBtn, { icon: "more", label: "더보기", size: 34 }),
        footer: h("div", { className: "flex items-center gap-5 flex-wrap" },
          D.STATUS_DONUT.map((d) =>
            h("div", { key: d.key, className: "flex items-center gap-1.5" },
              h("span", {
                className: "w-2.5 h-2.5 rounded-full shrink-0",
                style: { background: d.color },
              }),
              h("span", { className: "t-caption text-[12px]" }, d.name),
              h("span", { className: "text-[13px] font-bold tabular", style: { color: d.color } }, d.value)))),
      },
        h(Donut, {
          data: D.STATUS_DONUT,
          height: 220,
        })),

      /* 오른쪽: 조기경보 건수 상위 운용사 */
      h(ChartCard, {
        title: "운용사별 조기경보 현황",
        sub: "경보 건수 상위 5개 운용사",
        icon: "building",
        accent: "var(--warning)",
        right: h("div", { className: "flex items-center gap-1" },
          h(StatusBadge, { tone: "warning", label: "이번 달", size: "sm" }),
          h(IconBtn, { icon: "more", label: "더보기", size: 34 })),
      },
        h(HBars, {
          data: GP_BARS,
          height: 220,
        }))),

  ); // end root div
}

export { Risk };
