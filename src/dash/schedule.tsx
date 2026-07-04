/* 일정·알림 센터 — PRD 부록 A / APFS 스케줄 관리 서브페이지
   ES module: export { Schedule }. JSX (Vite). */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';

const { useState, useEffect, useMemo, useCallback } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, Card, ChartCard, SegTabs,
  FilterChip, Button, IconBtn, EmptyState, CountPill, toneVar,
} = UI;
const D = APFS_DATA;
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
  return (
    <div
      className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3.5 shadow-sm flex-1 min-w-0"><ColorChip icon={icon} color={c} size={40} iconSize={20} /><div className="min-w-0"><div className="t-label text-[12px]"><MT>{label}</MT></div><div className="flex items-baseline gap-1 mt-0.5"><span className="text-[22px] font-bold tabular" style={{ color: c }}>{mn(value)}</span><span className="text-[12px] font-semibold text-muted-foreground">{unit}</span></div></div></div>
  );
}

/* ─────────────────────────────────────────────
   카드뷰 — 일정 카드 한 줄
───────────────────────────────────────────── */
function ScheduleCard({ item, onAdd }) {
  const tone = ddayTone(item);
  const kindIcon = KIND_ICON[item.kind] || "calendar";
  const kindColor = KIND_COLOR[item.kind] || "var(--info)";
  return (
    <div
      className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm hover:shadow-md transition-shadow"
      style={{ animation: "dashFade .35s var(--ease) both" }}><div
        className="shrink-0 flex flex-col items-center justify-center rounded-[9px] w-14 h-14"
        style={{
          background: toneVar(tone)[1],
          border: `1px solid color-mix(in srgb,${toneVar(tone)[0]} 25%,transparent)`,
        }}><span className="text-[10px] font-bold" style={{ color: toneVar(tone)[0] }}>{item.kind}</span><span
          className="text-[15px] font-extrabold tabular leading-tight"
          style={{ color: toneVar(tone)[0] }}>{mn(item.dday)}</span></div><div className="shrink-0"><ColorChip icon={kindIcon} color={kindColor} size={36} iconSize={18} /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-[14px] font-bold text-foreground truncate"><MT>{item.title}</MT></span><StatusBadge tone="info" label={item.to} size="sm" /></div><div
          className="flex items-center gap-3 mt-1 text-[12px] text-muted-foreground"><Icon name="calendar" size={12} stroke={2} /><span>{mn(fmtDate(item.date))}</span>{item.time && <><Icon name="clock" size={12} stroke={2} /><span>{mn(item.time)}</span></>}{item.owner && <><Icon name="user" size={12} stroke={2} /><span><MT>{item.owner}</MT></span></>}</div></div><div className="shrink-0 flex items-center gap-1.5"><IconBtn icon="bell" label="알림 추가" size={32} onClick={onAdd} /><Button variant="ghost" size="sm" leadingIcon="plus">추가</Button></div></div>
  );
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

  return (
    <div style={{ animation: "dashFade .35s var(--ease) both" }}><div className="flex items-center justify-between mb-3"><span className="text-[15px] font-bold text-foreground">2026년 6월</span><div className="flex items-center gap-1"><IconBtn icon="chevron-left" label="이전 달" size={30} /><IconBtn icon="chevron-right" label="다음 달" size={30} /></div></div><div className="grid grid-cols-7 mb-1">{DAYS_KR.map((d, i) => <div
          key={d}
          className="text-center text-[11px] font-bold py-1"
          style={{ color: i === 0 ? "var(--danger)" : i === 6 ? "var(--accent)" : "var(--muted-foreground)" }}>{d}</div>)}</div><div className="grid grid-cols-7 gap-1">{cells.map((day, i) => {
          if (!day) return <div key={"e" + i} />;
          const isToday = day === today;
          const hasDates = byDate[day];
          const dots = hasDates ? hasDates.slice(0, 3) : [];
          const isSelected = selectedDate === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(isSelected ? null : day)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`6월 ${day}일${isToday ? " 오늘" : ""}${hasDates ? ", 일정 있음" : ""}`}
              className="flex flex-col items-center justify-start pt-1.5 rounded-[8px] min-h-[52px] cursor-pointer border transition-all duration-150"
              style={{
                background: isToday ? "var(--primary)" : isSelected ? "color-mix(in srgb,var(--primary) 12%,transparent)" : "var(--card)",
                border: isToday ? "none" : isSelected ? "1px solid color-mix(in srgb,var(--primary) 35%,transparent)" : "1px solid var(--border)",
              }}><span
                className="text-[12px] font-bold leading-tight"
                style={{ color: isToday ? "var(--primary-foreground)" : (i % 7 === 0 ? "var(--danger)" : i % 7 === 6 ? "var(--accent)" : "var(--foreground)") }}>{day}</span>{dots.length > 0 && <div className="flex gap-[3px] mt-1">{dots.map((item, di) => <span
                  key={di}
                  className="w-[5px] h-[5px] rounded-full"
                  style={{ background: toneVar(ddayTone(item))[0] }} />)}</div>}</button>
          );
        })}</div>{/* 선택 날짜 일정 목록 */
      selectedDate && selectedItems.length > 0 && <div
        className="mt-4 pt-4 border-t border-border"
        style={{ animation: "dashFade .25s var(--ease) both" }}><div className="text-[13px] font-bold mb-2 text-foreground">{`6월 ${selectedDate}일 일정`}</div><div className="flex flex-col gap-2">{selectedItems.map((item, i) => <div
            key={i}
            className="flex items-center gap-2.5 rounded-[8px] px-3 py-2 border border-border"
            style={{ background: toneVar(ddayTone(item))[1] }}><ColorChip
              icon={KIND_ICON[item.kind] || "calendar"}
              color={KIND_COLOR[item.kind] || "var(--info)"}
              size={28}
              iconSize={14} /><div className="flex-1 min-w-0"><div className="text-[12.5px] font-semibold truncate text-foreground"><MT>{item.title}</MT></div><span className="text-[11px] text-muted-foreground">{item.time ? mn(item.time) : ""}</span></div></div>)}</div></div>}{selectedDate && selectedItems.length === 0 && <div
        className="mt-3 text-center text-[12.5px] text-muted-foreground py-4 border-t border-border">{`6월 ${selectedDate}일에 일정이 없습니다.`}</div>}</div>
  );
}

/* ─────────────────────────────────────────────
   타임라인뷰
───────────────────────────────────────────── */
function TimelineView({ items }) {
  // 날짜별 그룹
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    items.forEach((item) => {
      if (!map[item.date]) map[item.date] = [];
      map[item.date].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  return (
    <div
      className="flex flex-col gap-0"
      style={{ animation: "dashFade .35s var(--ease) both" }}>{grouped.map(([date, entries], gi: number) => <div key={date} className="flex gap-0"><div className="flex flex-col items-center mr-3" style={{ width: 32 }}><div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-[11px] bg-muted text-muted-foreground border-2 border-border">{mn(fmtDate(date).split("(")[0])}</div>{gi < grouped.length - 1 && <div
            className="flex-1 w-px bg-border my-1"
            style={{ minHeight: 16 }} />}</div><div className="flex-1 pb-4"><div
            className="text-[12px] font-bold mb-1.5 mt-1 text-muted-foreground">{mn(fmtDate(date))}</div><div className="flex flex-col gap-2">{entries.map((item, ii) => {
              const tone = ddayTone(item);
              const [c, soft] = toneVar(tone);
              return (
                <div
                  key={ii}
                  className="flex items-start gap-2.5 rounded-[8px] px-3 py-2.5 border border-border"
                  style={{ background: soft, borderColor: `color-mix(in srgb,${c} 22%,transparent)` }}><span
                    className="w-2 h-2 rounded-full shrink-0 mt-[6px]"
                    style={{ background: c }} /><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="text-[13px] font-semibold text-foreground"><MT>{item.title}</MT></span><StatusBadge tone={tone} label={item.dday} size="sm" /><StatusBadge tone="info" label={item.kind} icon={KIND_ICON[item.kind]} size="sm" /></div><div
                      className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">{item.time && <><Icon name="clock" size={11} stroke={2} /><span>{mn(item.time)}</span></>}{item.owner && <><Icon name="user" size={11} stroke={2} /><span><MT>{item.owner}</MT></span></>}<Icon name="arrow-right" size={11} stroke={2} /><span><MT>{item.to}</MT></span></div></div></div>
              );
            })}</div></div></div>)}</div>
  );
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

  return (
    <div
      className="flex flex-col rounded-card border border-border bg-card shadow-sm overflow-hidden"
      style={{ minHeight: 400 }}><div
        className="flex items-center justify-between px-4 py-3 border-b border-border"><div className="flex items-center gap-2"><ColorChip icon="bell" color="var(--accent)" size={30} iconSize={15} /><span className="text-[14px] font-bold text-foreground">최근 알림</span>{unread > 0 && <CountPill count={unread} urgent={true} />}</div>{unread > 0 && <button
          onClick={markAllRead}
          className="text-[11.5px] font-semibold cursor-pointer text-primary"
          style={{ background: "none", border: "none" }}>모두 읽음</button>}</div><div
        className="flex flex-col divide-y border-border">{items.map((n) => {
          const [c, soft] = toneVar(n.tone);
          return (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className="w-full text-left flex items-start gap-2.5 px-4 py-3 cursor-pointer transition-colors"
              style={{
                background: n.read ? "transparent" : soft,
                border: "none",
                borderBottom: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => { if (n.read) e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 50%,transparent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = n.read ? "transparent" : soft; }}>{!n.read && <span className="sr-only">안읽음 </span>}<span
                className="shrink-0 flex items-center justify-center rounded-[8px] mt-0.5"
                style={{ width: 28, height: 28, background: `color-mix(in srgb,${c} 16%,transparent)`, color: c }}><Icon name={n.icon} size={14} stroke={2} /></span><div className="flex-1 min-w-0"><div
                  className={cx("text-[12.5px] font-semibold leading-snug truncate", !n.read && "text-foreground")}
                  style={{ color: n.read ? "var(--muted-foreground)" : "var(--foreground)" }}><MT>{n.title}</MT></div><div className="flex items-center gap-2 mt-0.5"><span className="text-[10.5px] text-muted-foreground">{mn(n.time)}</span><StatusBadge tone={n.tone} label={n.cat} size="sm" /></div></div>{!n.read && <span
                className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                style={{ background: c }} />}</button>
          );
        })}</div><div className="px-4 py-3 border-t border-border mt-auto"><Button
          variant="ghost"
          size="sm"
          leadingIcon="external"
          style={{ width: "100%", justifyContent: "center" }}>알림 전체 보기</Button></div></div>
  );
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
        const diff = (d.getTime() - today.getTime()) / 86400000;
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
    const diff = (d.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 6;
  }).length;

  const thisMonthReports = SCHEDULE_EXT.filter((item) => {
    const d = new Date(item.date);
    return d.getFullYear() === 2026 && d.getMonth() === 5 && item.kind === "보고";
  }).length;

  const pendingDueDiligence = SCHEDULE_EXT.filter((item) => item.kind === "실사").length;

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={["홈", "일정·알림 센터"]}
        title="일정 · 알림 센터"
        sub="마감 임박·보고·실사·가치평가 일정 통합 뷰 — 2026-06-16 기준"
        actions={<><Button
            variant="outline"
            size="sm"
            leadingIcon="chevron-left"
            onClick={() => onNav && onNav("main")}>메인으로</Button><Button variant="primary" size="sm" leadingIcon="download">내보내기</Button></>} /><div className="flex gap-3 flex-wrap mb-4"><KpiCard
          icon="clock"
          color="var(--danger)"
          label="이번 주 마감"
          value={thisWeekDeadlines}
          unit="건"
          tone="danger" /><KpiCard
          icon="file"
          color="var(--info)"
          label="이번 달 보고"
          value={thisMonthReports}
          unit="건"
          tone="info" /><KpiCard
          icon="search"
          color="var(--accent)"
          label="미완료 실사"
          value={pendingDueDiligence}
          unit="건"
          tone="warning" /></div><div
        className="flex items-center gap-3 flex-wrap mb-3 rounded-card border border-border bg-card px-4 py-2.5 shadow-sm"><div className="flex items-center gap-1.5 flex-wrap">{ALL_KINDS.map((k) => {
            const active = kindFilter === k;
            const dot = k !== "전체" ? KIND_COLOR[k] : undefined;
            return (
              <FilterChip
                key={k}
                active={active}
                dot={active && dot ? dot : undefined}
                onClick={() => setKindFilter(k)}>{k}</FilterChip>
            );
          })}</div><div className="w-px h-5 bg-border mx-1" /><SegTabs
          options={PERIODS}
          value={periodFilter}
          onChange={setPeriodFilter}
          size="sm" /><div className="flex-1" /><SegTabs
          options={[
            { value: "card",     label: "카드뷰" },
            { value: "calendar", label: "캘린더뷰" },
            { value: "timeline", label: "타임라인뷰" },
          ]}
          value={view}
          onChange={setView}
          size="sm" /></div><div
        className="grid gap-4"
        style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)" }}><div className="min-w-0">{/* 카드뷰 */
          view === "card" && <div className="flex flex-col gap-2">{filtered.length === 0
              ? <EmptyState msg="해당 기간·종류에 일정이 없습니다" icon="calendar" height={200} />
              : filtered.map((item, i) => <ScheduleCard key={i} item={item} onAdd={() => {}} />)}</div>}{/* 캘린더뷰 */
          view === "calendar" && <div className="rounded-card border border-border bg-card shadow-sm p-4"><CalendarView items={SCHEDULE_EXT} /></div>}{/* 타임라인뷰 */
          view === "timeline" && <div className="rounded-card border border-border bg-card shadow-sm p-4"><div className="text-[13px] font-semibold mb-3 text-muted-foreground">{mn(filtered.length) + "건 · " + periodFilter}</div>{filtered.length === 0
              ? <EmptyState msg="해당 기간·종류에 일정이 없습니다" icon="calendar" height={160} />
              : <TimelineView items={filtered} />}</div>}</div><div className="min-w-0"><NotifPanel
            notifs={notifs}
            onReadAll={() => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })))} /><div className="mt-4 rounded-card border border-border bg-card shadow-sm p-4"><div className="flex items-center gap-2 mb-3"><ColorChip icon="plus" color="var(--primary)" size={30} iconSize={15} /><span className="text-[14px] font-bold text-foreground">일정 추가</span></div><div className="flex flex-col gap-2">{[
                { label: "마감 일정", icon: "clock",    color: "var(--danger)" },
                { label: "보고 일정", icon: "file",     color: "var(--info)" },
                { label: "실사 일정", icon: "search",   color: "var(--accent)" },
                { label: "점검 일정", icon: "check-circle", color: "var(--warning)" },
              ].map((item) => <button
                key={item.label}
                className="flex items-center gap-2 w-full text-left rounded-[8px] px-3 py-2 cursor-pointer border border-border transition-all duration-150"
                style={{ background: "var(--card)", border: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 60%,transparent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}><ColorChip icon={item.icon} color={item.color} size={26} iconSize={13} /><span className="text-[12.5px] font-semibold text-foreground">{item.label}</span><span className="ml-auto"><Icon
                    name="chevron-right"
                    size={14}
                    stroke={2}
                    style={{ color: "var(--muted-foreground)" }} /></span></button>)}</div></div><div className="mt-4 rounded-card border border-border bg-card shadow-sm p-4"><div className="flex items-center gap-2 mb-3"><ColorChip icon="chart" color="var(--secondary)" size={30} iconSize={15} /><span className="text-[14px] font-bold text-foreground">종류별 현황</span></div><div className="flex flex-col gap-2">{["마감", "보고", "실사", "점검", "가치평가"].map((kind) => {
                const cnt = SCHEDULE_EXT.filter((s) => s.kind === kind).length;
                const color = KIND_COLOR[kind];
                const maxCnt = SCHEDULE_EXT.length;
                return (
                  <div key={kind} className="flex items-center gap-2"><Icon
                      name={KIND_ICON[kind]}
                      size={13}
                      stroke={2}
                      style={{ color, flexShrink: 0 }} /><span className="text-[12px] font-semibold w-16 shrink-0 text-muted-foreground">{kind}</span><div
                      className="flex-1 rounded-full overflow-hidden bg-muted"
                      style={{ height: 6 }}><div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: (cnt / maxCnt * 100) + "%", background: color }} /></div><span className="text-[11.5px] font-bold tabular shrink-0" style={{ color }}>{mn(cnt) + "건"}</span></div>
                );
              })}</div></div></div></div></div>
  );
}

export { Schedule };
