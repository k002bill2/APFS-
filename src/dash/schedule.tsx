/* 일정·알림 센터 — PRD 부록 A / APFS 스케줄 관리 서브페이지
   ES module: export { Schedule }. React.createElement 전용 (JSX 금지). */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA } from './data';

const { useState, useEffect, useMemo, useCallback } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, Card, ChartCard, SegTabs,
  FilterChip, Button, IconBtn, EmptyState, CountPill, toneVar,
} = UI;
const D = APFS_DATA;
const h = React.createElement;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ─────────────────────────────────────────────
   로컬 더미 데이터 (D.SCHEDULE / D.NOTIFS 보강)
───────────────────────────────────────────── */
const SCHEDULE_EXT = [
  { date: "2026-06-16", dday: "D-1",  kind: "마감",    tone: "danger",  title: "5월 결산 전표 승인 마감",              to: "회계·자금 마감",   owner: "이수현", time: "17:00" },
  { date: "2026-06-18", dday: "D-3",  kind: "보고",    tone: "warning", title: "수탁보고 — 2분기 운용현황 제출",       to: "부처보고",        owner: "김도현", time: "09:00" },
  { date: "2026-06-19", dday: "D-4",  kind: "점검",    tone: "warning", title: "NICE 신용등급 변동 운용사 3건 소명",    to: "조기경보",        owner: "박지우", time: "14:00" },
  { date: "2026-06-22", dday: "D-7",  kind: "실사",    tone: "warning", title: "코어밸류파트너스 분기 현장실사",         to: "운용사 건전성",   owner: "이수현", time: "10:00" },
  { date: "2026-06-25", dday: "D-10", kind: "가치평가", tone: "info",   title: "상반기 공정가치 평가 결과 등록",         to: "투자 성과",       owner: "최유진", time: "16:00" },
  { date: "2026-06-26", dday: "D-11", kind: "마감",    tone: "info",    title: "6월 자금수지 정산 및 이체 승인",        to: "회계·자금 마감",  owner: "김도현", time: "17:30" },
  { date: "2026-06-29", dday: "D-14", kind: "보고",    tone: "info",    title: "농식품부 정책자금 집행실적 보고",        to: "부처보고",        owner: "박지우", time: "11:00" },
  { date: "2026-07-01", dday: "D-16", kind: "실사",    tone: "info",    title: "그린루트벤처스 사후관리 현장점검",       to: "운용사 건전성",   owner: "이수현", time: "10:30" },
  { date: "2026-07-03", dday: "D-18", kind: "점검",    tone: "info",    title: "의무투자비율 미달 자펀드 2건 점검",     to: "투자 성과",       owner: "최유진", time: "14:00" },
  { date: "2026-07-06", dday: "D-21", kind: "마감",    tone: "info",    title: "2분기 운용보수 정산 마감",              to: "운용사 건전성",   owner: "김도현", time: "18:00" },
  { date: "2026-07-10", dday: "D-25", kind: "가치평가", tone: "info",   title: "신규 투자기업 5사 최초 평가 등록",       to: "투자 성과",       owner: "최유진", time: "15:00" },
];

const NOTIFS_EXT = [
  { id: 1, tone: "danger",  icon: "shield-alert", title: "신용등급 하락 감지 — 그린루트벤처스",    time: "12분 전",  read: false, cat: "조기경보" },
  { id: 2, tone: "warning", icon: "file",         title: "전표 승인 요청 7건 도착",               time: "38분 전",  read: false, cat: "회계" },
  { id: 3, tone: "info",    icon: "calendar",     title: "수탁보고 제출 마감 D-3",                time: "1시간 전", read: false, cat: "보고" },
  { id: 4, tone: "success", icon: "check",        title: "코어밸류파트너스 분기보고 검증 완료",     time: "3시간 전", read: true,  cat: "자펀드" },
  { id: 5, tone: "info",    icon: "building",     title: "신규 자펀드 1건 등록원부 반영",          time: "어제",     read: true,  cat: "부처보고" },
  { id: 6, tone: "warning", icon: "trending",     title: "스마트팜 그로스 1호 가치평가 입력 요청", time: "어제",     read: true,  cat: "가치평가" },
  { id: 7, tone: "danger",  icon: "clock",        title: "5월 결산 마감 D-1 — 즉시 조치 필요",    time: "2일 전",   read: true,  cat: "마감" },
];

/* ─────────────────────────────────────────────
   유틸
───────────────────────────────────────────── */
const KIND_ICON = {
  마감: "clock",
  보고: "file",
  실사: "search",
  점검: "check-circle",
  가치평가: "trending",
};
const KIND_COLOR = {
  마감:    "var(--danger)",
  보고:    "var(--info)",
  실사:    "var(--accent)",
  점검:    "var(--warning)",
  가치평가:"var(--secondary)",
};

function ddayTone(item) {
  const n = parseInt(item.dday.replace("D-", ""), 10);
  if (n <= 3) return "danger";
  if (n <= 7) return "warning";
  return "info";
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${["일","월","화","수","목","금","토"][d.getDay()]})`;
}

/* ─────────────────────────────────────────────
   KPI 카드 (요약 3개)
───────────────────────────────────────────── */
function KpiCard({ icon, color, label, value, unit, tone }) {
  const [c, soft] = toneVar(tone || "info");
  return h("div", {
    className: "flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3.5 shadow-sm flex-1 min-w-0",
  },
    h(ColorChip, { icon, color: c, size: 40, iconSize: 20 }),
    h("div", { className: "min-w-0" },
      h("div", { className: "t-label text-[12px]" }, label),
      h("div", { className: "flex items-baseline gap-1 mt-0.5" },
        h("span", { className: "text-[22px] font-bold tabular", style: { color: c } }, value),
        h("span", { className: "text-[12px] font-semibold text-muted-foreground" }, unit))));
}

/* ─────────────────────────────────────────────
   카드뷰 — 일정 카드 한 줄
───────────────────────────────────────────── */
function ScheduleCard({ item, onAdd }) {
  const tone = ddayTone(item);
  const kindIcon = KIND_ICON[item.kind] || "calendar";
  const kindColor = KIND_COLOR[item.kind] || "var(--info)";
  return h("div", {
    className: "flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-shadow",
    style: { animation: "dashFade .35s var(--ease) both" },
  },
    /* D-day 배지 */
    h("div", {
      className: "shrink-0 flex flex-col items-center justify-center rounded-[9px] w-14 h-14",
      style: {
        background: toneVar(tone)[1],
        border: `1px solid color-mix(in srgb,${toneVar(tone)[0]} 25%,transparent)`,
      },
    },
      h("span", { className: "text-[10px] font-bold", style: { color: toneVar(tone)[0] } }, item.kind),
      h("span", { className: "text-[15px] font-extrabold tabular leading-tight", style: { color: toneVar(tone)[0] } }, item.dday)),

    /* 종류 아이콘 칩 */
    h("div", { className: "shrink-0" },
      h(ColorChip, { icon: kindIcon, color: kindColor, size: 36, iconSize: 18 })),

    /* 중앙 정보 */
    h("div", { className: "flex-1 min-w-0" },
      h("div", { className: "flex items-center gap-2 flex-wrap" },
        h("span", { className: "text-[14px] font-bold text-foreground truncate" }, item.title),
        h(StatusBadge, { tone: "info", label: item.to, size: "sm" })),
      h("div", { className: "flex items-center gap-3 mt-1 text-[12px] text-muted-foreground" },
        h(Icon, { name: "calendar", size: 12, stroke: 2 }),
        h("span", null, fmtDate(item.date)),
        item.time && h(React.Fragment, null,
          h(Icon, { name: "clock", size: 12, stroke: 2 }),
          h("span", null, item.time)),
        item.owner && h(React.Fragment, null,
          h(Icon, { name: "user", size: 12, stroke: 2 }),
          h("span", null, item.owner)))),

    /* 우측 버튼 */
    h("div", { className: "shrink-0 flex items-center gap-1.5" },
      h(IconBtn, { icon: "bell", label: "알림 추가", size: 32, onClick: onAdd }),
      h(Button, { variant: "ghost", size: "sm", leadingIcon: "plus" }, "추가")));
}

/* ─────────────────────────────────────────────
   캘린더뷰 — 2026년 6월
───────────────────────────────────────────── */
function CalendarView({ items }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const YEAR = 2026, MONTH = 6; // June
  const firstDay = new Date(YEAR, MONTH - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(YEAR, MONTH, 0).getDate();
  const today = 16; // 오늘 2026-06-16

  // 날짜별 일정 맵
  const byDate = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      const d = new Date(item.date);
      if (d.getFullYear() === YEAR && d.getMonth() + 1 === MONTH) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(item);
      }
    });
    return map;
  }, [items]);

  const selectedItems = selectedDate ? (byDate[selectedDate] || []) : [];
  const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"];

  // 그리드 셀 (총 firstDay + daysInMonth, 7열)
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  return h("div", { style: { animation: "dashFade .35s var(--ease) both" } },
    /* 월 헤더 */
    h("div", { className: "flex items-center justify-between mb-3" },
      h("span", { className: "text-[15px] font-bold text-foreground" }, "2026년 6월"),
      h("div", { className: "flex items-center gap-1" },
        h(IconBtn, { icon: "chevron-left", label: "이전 달", size: 30 }),
        h(IconBtn, { icon: "chevron-right", label: "다음 달", size: 30 }))),

    /* 요일 헤더 */
    h("div", { className: "grid grid-cols-7 mb-1" },
      DAYS_KR.map((d, i) => h("div", {
        key: d,
        className: "text-center text-[11px] font-bold py-1",
        style: { color: i === 0 ? "var(--danger)" : i === 6 ? "var(--accent)" : "var(--muted-foreground)" },
      }, d))),

    /* 날짜 그리드 */
    h("div", { className: "grid grid-cols-7 gap-1" },
      cells.map((day, i) => {
        if (!day) return h("div", { key: "e" + i });
        const isToday = day === today;
        const hasDates = byDate[day];
        const dots = hasDates ? hasDates.slice(0, 3) : [];
        const isSelected = selectedDate === day;
        return h("button", {
          key: day,
          onClick: () => setSelectedDate(isSelected ? null : day),
          className: "flex flex-col items-center justify-start pt-1.5 rounded-[8px] min-h-[52px] cursor-pointer border transition-all duration-150",
          style: {
            background: isToday ? "var(--primary)" : isSelected ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "var(--card)",
            border: isToday ? "none" : isSelected ? "1px solid color-mix(in srgb,var(--primary) 35%,transparent)" : "1px solid var(--border)",
          },
        },
          h("span", {
            className: "text-[12px] font-bold leading-tight",
            style: { color: isToday ? "#fff" : (i % 7 === 0 ? "var(--danger)" : i % 7 === 6 ? "var(--accent)" : "var(--foreground)") },
          }, day),
          dots.length > 0 && h("div", { className: "flex gap-[3px] mt-1" },
            dots.map((item, di) => h("span", {
              key: di,
              className: "w-[5px] h-[5px] rounded-full",
              style: { background: toneVar(ddayTone(item))[0] },
            }))));
      })),

    /* 선택 날짜 일정 목록 */
    selectedDate && selectedItems.length > 0 && h("div", {
      className: "mt-4 pt-4 border-t border-border",
      style: { animation: "dashFade .25s var(--ease) both" },
    },
      h("div", { className: "text-[13px] font-bold mb-2 text-foreground" }, `6월 ${selectedDate}일 일정`),
      h("div", { className: "flex flex-col gap-2" },
        selectedItems.map((item, i) => h("div", {
          key: i,
          className: "flex items-center gap-2.5 rounded-[8px] px-3 py-2 border border-border",
          style: { background: toneVar(ddayTone(item))[1] },
        },
          h(ColorChip, { icon: KIND_ICON[item.kind] || "calendar", color: KIND_COLOR[item.kind] || "var(--info)", size: 28, iconSize: 14 }),
          h("div", { className: "flex-1 min-w-0" },
            h("div", { className: "text-[12.5px] font-semibold truncate text-foreground" }, item.title),
            h("span", { className: "text-[11px] text-muted-foreground" }, item.time || "")))))),
    selectedDate && selectedItems.length === 0 && h("div", {
      className: "mt-3 text-center text-[12.5px] text-muted-foreground py-4 border-t border-border",
    }, `6월 ${selectedDate}일에 일정이 없습니다.`));
}

/* ─────────────────────────────────────────────
   타임라인뷰
───────────────────────────────────────────── */
function TimelineView({ items }) {
  // 날짜별 그룹
  const grouped = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return h("div", { className: "flex flex-col gap-0", style: { animation: "dashFade .35s var(--ease) both" } },
    grouped.map(([date, entries], gi) => h("div", { key: date, className: "flex gap-0" },
      /* 세로 타임라인 선 */
      h("div", { className: "flex flex-col items-center mr-3", style: { width: 32 } },
        h("div", {
          className: "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px]",
          style: { background: "var(--muted)", color: "var(--muted-foreground)", border: "2px solid var(--border)" },
        }, fmtDate(date).split("(")[0]),
        gi < grouped.length - 1 && h("div", {
          className: "flex-1 w-px",
          style: { background: "var(--border)", minHeight: 16, margin: "4px 0" },
        })),

      /* 날짜 묶음 */
      h("div", { className: "flex-1 pb-4" },
        h("div", { className: "text-[12px] font-bold mb-1.5 mt-1", style: { color: "var(--muted-foreground)" } }, fmtDate(date)),
        h("div", { className: "flex flex-col gap-2" },
          entries.map((item, ii) => {
            const tone = ddayTone(item);
            const [c, soft] = toneVar(tone);
            return h("div", {
              key: ii,
              className: "flex items-start gap-2.5 rounded-[8px] px-3 py-2.5 border border-border",
              style: { background: soft, borderColor: `color-mix(in srgb,${c} 22%,transparent)` },
            },
              h("span", {
                className: "w-2 h-2 rounded-full shrink-0 mt-[6px]",
                style: { background: c },
              }),
              h("div", { className: "flex-1 min-w-0" },
                h("div", { className: "flex items-center gap-2 flex-wrap" },
                  h("span", { className: "text-[13px] font-semibold text-foreground" }, item.title),
                  h(StatusBadge, { tone, label: item.dday, size: "sm" }),
                  h(StatusBadge, { tone: "info", label: item.kind, icon: KIND_ICON[item.kind], size: "sm" })),
                h("div", { className: "flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground" },
                  item.time && h(React.Fragment, null,
                    h(Icon, { name: "clock", size: 11, stroke: 2 }),
                    h("span", null, item.time)),
                  item.owner && h(React.Fragment, null,
                    h(Icon, { name: "user", size: 11, stroke: 2 }),
                    h("span", null, item.owner)),
                  h(Icon, { name: "arrow-right", size: 11, stroke: 2 }),
                  h("span", null, item.to))));
          }))))));
}

/* ─────────────────────────────────────────────
   알림 사이드 패널
───────────────────────────────────────────── */
function NotifPanel({ notifs, onReadAll }) {
  const [items, setItems] = useState(notifs);
  const unread = items.filter((n) => !n.read).length;

  const markRead = useCallback((id) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (onReadAll) onReadAll();
  }, [onReadAll]);

  return h("div", { className: "flex flex-col rounded-card border border-border bg-card shadow-sm overflow-hidden", style: { minHeight: 400 } },
    /* 헤더 */
    h("div", { className: "flex items-center justify-between px-4 py-3 border-b border-border" },
      h("div", { className: "flex items-center gap-2" },
        h(ColorChip, { icon: "bell", color: "var(--accent)", size: 30, iconSize: 15 }),
        h("span", { className: "text-[14px] font-bold text-foreground" }, "최근 알림"),
        unread > 0 && h(CountPill, { count: unread, urgent: true })),
      unread > 0 && h("button", {
        onClick: markAllRead,
        className: "text-[11.5px] font-semibold cursor-pointer",
        style: { color: "var(--primary)", background: "none", border: "none" },
      }, "모두 읽음")),

    /* 알림 목록 */
    h("div", { className: "flex flex-col divide-y", style: { borderColor: "var(--border)" } },
      items.map((n) => {
        const [c, soft] = toneVar(n.tone);
        return h("button", {
          key: n.id,
          onClick: () => markRead(n.id),
          className: "w-full text-left flex items-start gap-2.5 px-4 py-3 cursor-pointer transition-colors",
          style: {
            background: n.read ? "transparent" : soft,
            border: "none",
            borderBottom: "1px solid var(--border)",
          },
          onMouseEnter: (e) => { if (n.read) e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 50%,transparent)"; },
          onMouseLeave: (e) => { e.currentTarget.style.background = n.read ? "transparent" : soft; },
        },
          h("span", {
            className: "shrink-0 flex items-center justify-center rounded-[8px] mt-0.5",
            style: { width: 28, height: 28, background: `color-mix(in srgb,${c} 16%,transparent)`, color: c },
          }, h(Icon, { name: n.icon, size: 14, stroke: 2 })),
          h("div", { className: "flex-1 min-w-0" },
            h("div", { className: cx("text-[12.5px] font-semibold leading-snug truncate", !n.read && "text-foreground"), style: { color: n.read ? "var(--muted-foreground)" : "var(--foreground)" } }, n.title),
            h("div", { className: "flex items-center gap-2 mt-0.5" },
              h("span", { className: "text-[10.5px] text-muted-foreground" }, n.time),
              h(StatusBadge, { tone: n.tone, label: n.cat, size: "sm" }))),
          !n.read && h("span", {
            className: "w-2 h-2 rounded-full shrink-0 mt-1.5",
            style: { background: c },
          }));
      })),

    /* 하단 링크 */
    h("div", { className: "px-4 py-3 border-t border-border mt-auto" },
      h(Button, { variant: "ghost", size: "sm", leadingIcon: "external", style: { width: "100%", justifyContent: "center" } }, "알림 전체 보기")));
}

/* ─────────────────────────────────────────────
   메인 페이지 컴포넌트
───────────────────────────────────────────── */
function Schedule({ onNav }) {
  const [view, setView] = useState("card");        // card | calendar | timeline
  const [kindFilter, setKindFilter] = useState("전체");
  const [periodFilter, setPeriodFilter] = useState("이번 달");
  const [notifs, setNotifs] = useState(NOTIFS_EXT);

  const ALL_KINDS = ["전체", "마감", "보고", "실사", "점검", "가치평가"];
  const PERIODS = [
    { value: "이번 주", label: "이번 주" },
    { value: "이번 달", label: "이번 달" },
    { value: "다음 달", label: "다음 달" },
  ];

  // 기간 필터
  const periodFiltered = useMemo(() => {
    return SCHEDULE_EXT.filter((item) => {
      const d = new Date(item.date);
      const today = new Date("2026-06-16");
      if (periodFilter === "이번 주") {
        const diff = (d - today) / 86400000;
        return diff >= 0 && diff <= 6;
      }
      if (periodFilter === "이번 달") {
        return d.getFullYear() === 2026 && d.getMonth() === 5; // June
      }
      if (periodFilter === "다음 달") {
        return d.getFullYear() === 2026 && d.getMonth() === 6; // July
      }
      return true;
    });
  }, [periodFilter]);

  // 종류 필터
  const filtered = useMemo(() => {
    if (kindFilter === "전체") return periodFiltered;
    return periodFiltered.filter((item) => item.kind === kindFilter);
  }, [periodFiltered, kindFilter]);

  // KPI 계산
  const thisWeekDeadlines = SCHEDULE_EXT.filter((item) => {
    const d = new Date(item.date);
    const today = new Date("2026-06-16");
    const diff = (d - today) / 86400000;
    return diff >= 0 && diff <= 6;
  }).length;

  const thisMonthReports = SCHEDULE_EXT.filter((item) => {
    const d = new Date(item.date);
    return d.getFullYear() === 2026 && d.getMonth() === 5 && item.kind === "보고";
  }).length;

  const pendingDueDiligence = SCHEDULE_EXT.filter((item) => item.kind === "실사").length;

  return h("div", {
    className: "max-w-[1320px] mx-auto",
    style: { animation: "dashFade .35s var(--ease) both" },
  },
    /* 페이지 헤더 */
    h(PageHeader, {
      crumbs: ["홈", "일정·알림 센터"],
      title: "일정 · 알림 센터",
      sub: "마감 임박·보고·실사·가치평가 일정 통합 뷰 — 2026-06-16 기준",
      actions: h(React.Fragment, null,
        h(Button, { variant: "outline", size: "sm", leadingIcon: "chevron-left", onClick: () => onNav && onNav("main") }, "메인으로"),
        h(Button, { variant: "primary", size: "sm", leadingIcon: "download" }, "내보내기")),
    }),

    /* ── KPI 3열 ── */
    h("div", { className: "flex gap-3 flex-wrap mb-4" },
      h(KpiCard, { icon: "clock",    color: "var(--danger)",  label: "이번 주 마감",  value: thisWeekDeadlines,    unit: "건", tone: "danger" }),
      h(KpiCard, { icon: "file",     color: "var(--info)",    label: "이번 달 보고",  value: thisMonthReports,     unit: "건", tone: "info" }),
      h(KpiCard, { icon: "search",   color: "var(--accent)",  label: "미완료 실사",   value: pendingDueDiligence,  unit: "건", tone: "warning" })),

    /* ── 필터 바 ── */
    h("div", {
      className: "flex items-center gap-3 flex-wrap mb-3 rounded-card border border-border bg-card px-4 py-2.5 shadow-sm",
    },
      /* 종류 FilterChip */
      h("div", { className: "flex items-center gap-1.5 flex-wrap" },
        ALL_KINDS.map((k) => {
          const active = kindFilter === k;
          const dot = k !== "전체" ? KIND_COLOR[k] : undefined;
          return h(FilterChip, {
            key: k, active, dot: active && dot ? dot : undefined,
            onClick: () => setKindFilter(k),
          }, k);
        })),

      h("div", { className: "w-px h-5 bg-border mx-1" }),

      /* 기간 SegTabs */
      h(SegTabs, {
        options: PERIODS, value: periodFilter, onChange: setPeriodFilter, size: "sm",
      }),

      h("div", { className: "flex-1" }),

      /* 뷰 전환 */
      h(SegTabs, {
        options: [
          { value: "card",     label: "카드뷰" },
          { value: "calendar", label: "캘린더뷰" },
          { value: "timeline", label: "타임라인뷰" },
        ],
        value: view,
        onChange: setView,
        size: "sm",
      })),

    /* ── 메인 2열 레이아웃 ── */
    h("div", {
      className: "grid gap-4",
      style: { gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)" },
    },
      /* 왼쪽: 메인 콘텐츠 */
      h("div", { className: "min-w-0" },
        /* 카드뷰 */
        view === "card" && h("div", { className: "flex flex-col gap-2" },
          filtered.length === 0
            ? h(EmptyState, { msg: "해당 기간·종류에 일정이 없습니다", icon: "calendar", height: 200 })
            : filtered.map((item, i) => h(ScheduleCard, {
                key: i, item,
                onAdd: () => {},
              }))),

        /* 캘린더뷰 */
        view === "calendar" && h("div", {
          className: "rounded-card border border-border bg-card shadow-sm p-4",
        }, h(CalendarView, { items: SCHEDULE_EXT })),

        /* 타임라인뷰 */
        view === "timeline" && h("div", {
          className: "rounded-card border border-border bg-card shadow-sm p-4",
        },
          h("div", { className: "text-[13px] font-semibold mb-3 text-muted-foreground" },
            filtered.length + "건 · " + periodFilter),
          filtered.length === 0
            ? h(EmptyState, { msg: "해당 기간·종류에 일정이 없습니다", icon: "calendar", height: 160 })
            : h(TimelineView, { items: filtered }))),

      /* 오른쪽: 알림 패널 */
      h("div", { className: "min-w-0" },
        h(NotifPanel, {
          notifs,
          onReadAll: () => setNotifs((ns) => ns.map((n) => ({ ...n, read: true }))),
        }),

        /* 빠른 일정 추가 카드 */
        h("div", {
          className: "mt-4 rounded-card border border-border bg-card shadow-sm p-4",
        },
          h("div", { className: "flex items-center gap-2 mb-3" },
            h(ColorChip, { icon: "plus", color: "var(--primary)", size: 30, iconSize: 15 }),
            h("span", { className: "text-[14px] font-bold text-foreground" }, "일정 추가")),
          h("div", { className: "flex flex-col gap-2" },
            [
              { label: "마감 일정", icon: "clock",    color: "var(--danger)" },
              { label: "보고 일정", icon: "file",     color: "var(--info)" },
              { label: "실사 일정", icon: "search",   color: "var(--accent)" },
              { label: "점검 일정", icon: "check-circle", color: "var(--warning)" },
            ].map((item) => h("button", {
              key: item.label,
              className: "flex items-center gap-2 w-full text-left rounded-[8px] px-3 py-2 cursor-pointer border border-border transition-all duration-150",
              style: { background: "var(--card)", border: "none" },
              onMouseEnter: (e) => { e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 60%,transparent)"; },
              onMouseLeave: (e) => { e.currentTarget.style.background = "var(--card)"; },
            },
              h(ColorChip, { icon: item.icon, color: item.color, size: 26, iconSize: 13 }),
              h("span", { className: "text-[12.5px] font-semibold text-foreground" }, item.label),
              h("span", { className: "ml-auto" }, h(Icon, { name: "chevron-right", size: 14, stroke: 2, style: { color: "var(--muted-foreground)" } })))))),

        /* 종류별 현황 요약 */
        h("div", {
          className: "mt-4 rounded-card border border-border bg-card shadow-sm p-4",
        },
          h("div", { className: "flex items-center gap-2 mb-3" },
            h(ColorChip, { icon: "chart", color: "var(--secondary)", size: 30, iconSize: 15 }),
            h("span", { className: "text-[14px] font-bold text-foreground" }, "종류별 현황")),
          h("div", { className: "flex flex-col gap-2" },
            ["마감", "보고", "실사", "점검", "가치평가"].map((kind) => {
              const cnt = SCHEDULE_EXT.filter((s) => s.kind === kind).length;
              const color = KIND_COLOR[kind];
              const maxCnt = SCHEDULE_EXT.length;
              return h("div", { key: kind, className: "flex items-center gap-2" },
                h(Icon, { name: KIND_ICON[kind], size: 13, stroke: 2, style: { color, flexShrink: 0 } }),
                h("span", { className: "text-[12px] font-semibold w-16 shrink-0 text-muted-foreground" }, kind),
                h("div", {
                  className: "flex-1 rounded-full overflow-hidden",
                  style: { height: 6, background: "var(--muted)" },
                },
                  h("div", {
                    className: "h-full rounded-full transition-all duration-500",
                    style: { width: (cnt / maxCnt * 100) + "%", background: color },
                  })),
                h("span", { className: "text-[11.5px] font-bold tabular shrink-0", style: { color } }, cnt + "건"));
            }))))));
}

export { Schedule };
