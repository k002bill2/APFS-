/* 부처보고·수탁보고 페이지 — FR-5.8 / 5.9
   APFS forest-green 토큰 + Tailwind 유틸리티. JSX 없음. */
(function (w) {
  const React = w.React;
  const { useState, useMemo } = React;
  const Icon = w.Icon;
  const { PageHeader } = w.Shell;
  const {
    ColorChip, StatusBadge, DeltaBadge, Card, ChartCard, SegTabs,
    FilterChip, Button, IconBtn, EmptyState, CountPill, toneVar,
  } = w.UI;
  const { ComposedBars } = w.Charts;
  const D = w.APFS_DATA;
  const h = React.createElement;
  const cx = (...a) => a.filter(Boolean).join(" ");

  /* ─────────────────────────────────────────────
     로컬 더미 데이터
  ───────────────────────────────────────────── */

  // 부처보고 목록
  const MINISTRY_REPORTS = [
    {
      id: "MR01", name: "2분기 운용현황 보고", type: "정기", org: "농식품부",
      date: "2026-06-18", status: "접수", manager: "김재현", action: "접수",
    },
    {
      id: "MR02", name: "투자기업 육성실적 보고", type: "정기", org: "농금원",
      date: "2026-07-10", status: "작성중", manager: "이미나", action: "작성",
    },
    {
      id: "MR03", name: "모태펀드 집행실적 보고", type: "정기", org: "농식품부",
      date: "2026-06-29", status: "승인대기", manager: "김재현", action: "보기",
    },
    {
      id: "MR04", name: "수시보고 — 운용사 조기경보 처리결과", type: "수시", org: "농금원",
      date: "2026-06-12", status: "확정", manager: "박수진", action: "조회",
    },
    {
      id: "MR05", name: "1분기 확정 보고", type: "정기", org: "농식품부",
      date: "2026-04-15", status: "확정(Lock)", manager: "시스템", action: "-",
    },
  ];

  // 수탁보고 검증 목록
  const CUSTODY_VERIFICATIONS = [
    {
      id: "CV01", vtype: "실물자료", fund: "스마트팜 그로스 1호 (SF-01)", uploadDate: "2026-06-13",
      result: "일치", status: "완료", mismatch: false,
    },
    {
      id: "CV02", vtype: "유가증권", fund: "그린바이오 투자조합 (GB-042)", uploadDate: "2026-06-14",
      result: "불일치", status: "검토중", mismatch: true,
    },
    {
      id: "CV03", vtype: "계좌정보", fund: "수산벤처 2호 (FV-02)", uploadDate: "2026-06-14",
      result: "일치", status: "완료", mismatch: false,
    },
    {
      id: "CV04", vtype: "입출금정보", fund: "푸드테크 액셀러레이터 (FT-110)", uploadDate: "2026-06-15",
      result: "불일치", status: "진행중", mismatch: true,
    },
    {
      id: "CV05", vtype: "실물자료", fund: "농식품 모태 직접출자 (GSB-10Y)", uploadDate: "2026-06-12",
      result: "일치", status: "완료", mismatch: false,
    },
    {
      id: "CV06", vtype: "유가증권", fund: "코어밸류파트너스 3호 (CV-03)", uploadDate: "2026-06-15",
      result: "일치", status: "진행중", mismatch: false,
    },
  ];

  // 등록원부 목록
  const REGISTRY_FUNDS = [
    {
      code: "VC-SF01", name: "스마트팜 그로스 1호", gp: "스마트팜벤처파트너스",
      regDate: "2022-03-14", lastModified: "2026-06-10", version: "v4.2", status: "현행",
    },
    {
      code: "PEF-042", name: "그린바이오 투자조합", gp: "그린루트벤처스",
      regDate: "2021-07-22", lastModified: "2026-05-28", version: "v6.0", status: "현행",
    },
    {
      code: "VC-FV02", name: "수산벤처 2호", gp: "블루오션파트너스",
      regDate: "2023-01-09", lastModified: "2026-04-30", version: "v2.1", status: "개정검토",
    },
    {
      code: "AGF-110", name: "푸드테크 액셀러레이터", gp: "코어밸류파트너스",
      regDate: "2023-09-18", lastModified: "2026-06-05", version: "v1.3", status: "현행",
    },
    {
      code: "GSB-10Y", name: "농식품 모태 직접출자", gp: "농금원(직접)",
      regDate: "2020-01-15", lastModified: "2026-06-01", version: "v8.5", status: "현행",
    },
  ];

  // 수정이력 타임라인
  const REGISTRY_HISTORY = [
    { date: "2026-06-10", fund: "스마트팜 그로스 1호", change: "출자금액 정정 (284,200 → 284,800백만원)", by: "김재현" },
    { date: "2026-06-05", fund: "푸드테크 액셀러레이터", change: "운용사 연락처 업데이트", by: "이미나" },
    { date: "2026-05-28", fund: "그린바이오 투자조합", change: "조합원 지분 변경 반영 (v5.9→v6.0)", by: "박수진" },
  ];

  // 연도별 투자/회수 현황 (ComposedBars용)
  const INVEST_HISTORY = [
    { name: "2021", plan: 15800, actual: 12400, rate: 59 },
    { name: "2022", plan: 18200, actual: 15900, rate: 66 },
    { name: "2023", plan: 20400, actual: 18100, rate: 71 },
    { name: "2024", plan: 22600, actual: 20300, rate: 74 },
    { name: "2025", plan: 24800, actual: 21400, rate: 78 },
  ];

  /* ─────────────────────────────────────────────
     헬퍼: 상태 → tone
  ───────────────────────────────────────────── */
  function reportTone(status) {
    if (status === "작성중") return "info";
    if (status === "접수") return "warning";
    if (status === "승인대기") return "warning";
    if (status === "확정") return "success";
    if (status === "확정(Lock)") return "cyan";
    return "info";
  }

  function custodyTone(status) {
    if (status === "완료") return "success";
    if (status === "검토중") return "danger";
    if (status === "진행중") return "warning";
    return "info";
  }

  function registryTone(status) {
    if (status === "현행") return "success";
    if (status === "개정검토") return "warning";
    return "info";
  }

  function resultTone(result) {
    return result === "일치" ? "success" : "danger";
  }

  /* ─────────────────────────────────────────────
     4단계 승인 스텝퍼
  ───────────────────────────────────────────── */
  const STEPS = ["작성", "접수", "승인", "확정"];

  function Stepper({ activeStep }) {
    return h("div", { className: "flex items-center gap-0", "aria-label": "보고 승인 단계" },
      STEPS.map((label, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        const [color] = toneVar(active ? "primary" : done ? "success" : "info");
        return h(React.Fragment, { key: label },
          h("div", { className: "flex flex-col items-center gap-1" },
            h("div", {
              className: "inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold transition-all",
              style: {
                background: done
                  ? "color-mix(in srgb,var(--success) 15%,transparent)"
                  : active
                    ? "color-mix(in srgb,var(--primary) 15%,transparent)"
                    : "var(--muted)",
                color: done ? "var(--success)" : active ? "var(--primary)" : "var(--muted-foreground)",
                border: active ? "2px solid var(--primary)" : done ? "2px solid var(--success)" : "2px solid var(--border)",
              },
            },
              done
                ? h(Icon, { name: "check", size: 14, stroke: 2.5 })
                : h("span", null, i + 1)
            ),
            h("span", {
              className: "text-[11px] font-semibold whitespace-nowrap",
              style: {
                color: active ? "var(--primary)" : done ? "var(--success)" : "var(--muted-foreground)",
              },
            }, label)
          ),
          i < STEPS.length - 1 && h("div", {
            className: "flex-1 h-[2px] mx-2 rounded-full",
            style: {
              minWidth: 32,
              background: done
                ? "var(--success)"
                : "var(--border)",
            },
          })
        );
      })
    );
  }

  /* ─────────────────────────────────────────────
     보고 일정 카드
  ───────────────────────────────────────────── */
  function ScheduleCard({ item }) {
    const [color, softBg] = toneVar(item.tone);
    return h("div", {
      className: "flex items-start gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm",
    },
      h("div", {
        className: "inline-flex items-center justify-center shrink-0 rounded-[8px] text-[10px] font-bold w-10 h-10",
        style: { background: softBg, color },
      }, item.dday),
      h("div", { className: "min-w-0 flex-1" },
        h("div", { className: "text-[13px] font-semibold truncate", style: { color: "var(--foreground)" } }, item.title),
        h("div", { className: "flex items-center gap-1.5 mt-0.5" },
          h("span", {
            className: "inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold",
            style: { background: softBg, color },
          }, item.kind),
          h("span", { className: "t-caption text-[11px]" }, item.date)
        )
      )
    );
  }

  /* ─────────────────────────────────────────────
     부처보고 탭 콘텐츠
  ───────────────────────────────────────────── */
  function MinistryTab() {
    // 현재 승인 단계: 접수 단계(index 1) 활성화
    const activeStep = 1;

    return h("div", { className: "flex flex-col gap-4" },
      /* 스텝퍼 */
      h("div", {
        className: "rounded-card border border-border bg-card px-6 py-5 shadow-sm flex items-center gap-2",
      },
        h("div", { className: "flex-1 flex items-center gap-4" },
          h(ColorChip, { icon: "file", color: "var(--primary)", size: 32, iconSize: 17 }),
          h("div", null,
            h("div", { className: "text-[14px] font-bold", style: { color: "var(--foreground)" } }, "보고 승인 흐름"),
            h("div", { className: "t-caption text-[11.5px]" }, "2분기 운용현황 보고 현재 진행 단계")
          )
        ),
        h("div", { className: "flex items-center gap-2 shrink-0" },
          h(Stepper, { activeStep })
        )
      ),

      /* 보고서 테이블 */
      h("div", { className: "rounded-card-lg border border-border bg-card shadow-sm overflow-hidden" },
        h("div", { className: "flex items-center justify-between gap-4 px-5 py-4 border-b border-border" },
          h("div", { className: "flex items-center gap-2" },
            h("h3", { className: "text-[16px] font-bold" }, "보고서 목록"),
            h(CountPill, { count: MINISTRY_REPORTS.length })
          ),
          h("div", { className: "flex items-center gap-2" },
            h(Button, { variant: "primary", size: "sm", leadingIcon: "plus" }, "신규 보고 등록"),
            h(IconBtn, { icon: "download", label: "내보내기", size: 34 })
          )
        ),

        h("div", { className: "overflow-x-auto" },
          h("table", { className: "w-full border-collapse min-w-[760px]" },
            h("thead", null,
              h("tr", { style: { background: "color-mix(in srgb,var(--muted) 60%,transparent)" } },
                [
                  ["보고서명", "left"],
                  ["보고유형", "center"],
                  ["보고기관", "center"],
                  ["보고일", "center"],
                  ["상태", "center"],
                  ["담당자", "center"],
                  ["액션", "right"],
                ].map(([label, align], i) =>
                  h("th", {
                    key: i,
                    className: cx(
                      "t-label font-semibold px-4 py-3 whitespace-nowrap",
                      align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
                      i === 0 && "pl-6"
                    ),
                  }, label)
                )
              )
            ),
            h("tbody", null,
              MINISTRY_REPORTS.map((r) =>
                h("tr", {
                  key: r.id,
                  className: "border-t border-border transition-colors",
                  onMouseEnter: (e) => (e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)"),
                  onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"),
                },
                  h("td", { className: "px-4 pl-6 py-3.5" },
                    h("div", { className: "text-[13.5px] font-semibold", style: { color: "var(--foreground)" } }, r.name)
                  ),
                  h("td", { className: "px-4 py-3.5 text-center" },
                    h("span", {
                      className: "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                      style: {
                        background: r.type === "수시"
                          ? "color-mix(in srgb,var(--warning) 14%,transparent)"
                          : "color-mix(in srgb,var(--info) 14%,transparent)",
                        color: r.type === "수시" ? "var(--warning)" : "var(--info)",
                      },
                    }, r.type)
                  ),
                  h("td", { className: "px-4 py-3.5 text-center text-[13px] font-semibold", style: { color: "var(--foreground)" } }, r.org),
                  h("td", { className: "px-4 py-3.5 text-center t-caption tabular text-[12.5px]" }, r.date),
                  h("td", { className: "px-4 py-3.5 text-center" },
                    h(StatusBadge, { tone: reportTone(r.status), label: r.status, size: "sm" })
                  ),
                  h("td", { className: "px-4 py-3.5 text-center text-[13px] font-semibold", style: { color: "var(--foreground)" } }, r.manager),
                  h("td", { className: "px-4 pr-5 py-3.5 text-right" },
                    r.action === "-"
                      ? h("span", { className: "t-caption text-[12px]" }, "—")
                      : h(Button, {
                          variant: r.action === "작성" ? "primary" : "outline",
                          size: "sm",
                        }, r.action)
                  )
                )
              )
            )
          )
        )
      )
    );
  }

  /* ─────────────────────────────────────────────
     수탁보고 탭 콘텐츠
  ───────────────────────────────────────────── */
  function CustodyTab() {
    return h("div", { className: "rounded-card-lg border border-border bg-card shadow-sm overflow-hidden" },
      h("div", { className: "flex items-center justify-between gap-4 px-5 py-4 border-b border-border" },
        h("div", { className: "flex items-center gap-2" },
          h("h3", { className: "text-[16px] font-bold" }, "수탁 데이터 검증 현황"),
          h(CountPill, { count: CUSTODY_VERIFICATIONS.filter((c) => c.mismatch).length, urgent: true })
        ),
        h("div", { className: "flex items-center gap-2" },
          h(Button, { variant: "outline", size: "sm", leadingIcon: "upload" }, "데이터 업로드"),
          h(IconBtn, { icon: "refresh", label: "재검증", size: 34 })
        )
      ),

      h("div", { className: "overflow-x-auto" },
        h("table", { className: "w-full border-collapse min-w-[740px]" },
          h("thead", null,
            h("tr", { style: { background: "color-mix(in srgb,var(--muted) 60%,transparent)" } },
              [
                ["검증유형", "left"],
                ["대상 자펀드", "left"],
                ["업로드일", "center"],
                ["비교검증결과", "center"],
                ["상태", "center"],
                ["액션", "right"],
              ].map(([label, align], i) =>
                h("th", {
                  key: i,
                  className: cx(
                    "t-label font-semibold px-4 py-3 whitespace-nowrap",
                    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
                    i === 0 && "pl-6"
                  ),
                }, label)
              )
            )
          ),
          h("tbody", null,
            CUSTODY_VERIFICATIONS.map((r) =>
              h("tr", {
                key: r.id,
                className: "border-t border-border transition-colors",
                style: r.mismatch
                  ? { background: "color-mix(in srgb,var(--danger) 6%,transparent)" }
                  : undefined,
                onMouseEnter: (e) => {
                  if (!r.mismatch) e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = r.mismatch
                    ? "color-mix(in srgb,var(--danger) 6%,transparent)"
                    : "transparent";
                },
              },
                h("td", { className: "px-4 pl-6 py-3.5" },
                  h("div", { className: "flex items-center gap-2" },
                    r.mismatch && h(Icon, { name: "alert-circle", size: 15, style: { color: "var(--danger)", flexShrink: 0 } }),
                    h("span", { className: "text-[13.5px] font-semibold", style: { color: "var(--foreground)" } }, r.vtype)
                  )
                ),
                h("td", { className: "px-4 py-3.5 text-[13px]", style: { color: "var(--foreground)" } }, r.fund),
                h("td", { className: "px-4 py-3.5 text-center t-caption tabular text-[12.5px]" }, r.uploadDate),
                h("td", { className: "px-4 py-3.5 text-center" },
                  h(StatusBadge, { tone: resultTone(r.result), label: r.result, size: "sm",
                    icon: r.result === "일치" ? "check-circle" : "x-circle" })
                ),
                h("td", { className: "px-4 py-3.5 text-center" },
                  h(StatusBadge, { tone: custodyTone(r.status), label: r.status, size: "sm" })
                ),
                h("td", { className: "px-4 pr-5 py-3.5 text-right" },
                  h(Button, {
                    variant: r.mismatch ? "outline" : "ghost",
                    size: "sm",
                    style: r.mismatch ? { color: "var(--danger)", borderColor: "var(--danger)" } : undefined,
                  }, r.mismatch ? "불일치 검토" : "상세 보기")
                )
              )
            )
          )
        )
      )
    );
  }

  /* ─────────────────────────────────────────────
     등록원부 탭 콘텐츠
  ───────────────────────────────────────────── */
  function RegistryTab() {
    return h("div", { className: "flex flex-col gap-4" },
      /* 원부 테이블 */
      h("div", { className: "rounded-card-lg border border-border bg-card shadow-sm overflow-hidden" },
        h("div", { className: "flex items-center justify-between gap-4 px-5 py-4 border-b border-border" },
          h("div", { className: "flex items-center gap-2" },
            h("h3", { className: "text-[16px] font-bold" }, "등록원부 관리"),
            h(CountPill, { count: REGISTRY_FUNDS.length })
          ),
          h("div", { className: "flex items-center gap-2" },
            h(Button, { variant: "primary", size: "sm", leadingIcon: "plus" }, "원부 등록"),
            h(IconBtn, { icon: "download", label: "일괄 다운로드", size: 34 })
          )
        ),

        h("div", { className: "overflow-x-auto" },
          h("table", { className: "w-full border-collapse min-w-[860px]" },
            h("thead", null,
              h("tr", { style: { background: "color-mix(in srgb,var(--muted) 60%,transparent)" } },
                [
                  ["자펀드코드", "left"],
                  ["자펀드명", "left"],
                  ["운용사", "left"],
                  ["등록일", "center"],
                  ["최종수정일", "center"],
                  ["버전", "center"],
                  ["상태", "center"],
                  ["다운로드", "right"],
                ].map(([label, align], i) =>
                  h("th", {
                    key: i,
                    className: cx(
                      "t-label font-semibold px-4 py-3 whitespace-nowrap",
                      align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
                      i === 0 && "pl-6"
                    ),
                  }, label)
                )
              )
            ),
            h("tbody", null,
              REGISTRY_FUNDS.map((r) =>
                h("tr", {
                  key: r.code,
                  className: "border-t border-border transition-colors",
                  onMouseEnter: (e) => (e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)"),
                  onMouseLeave: (e) => (e.currentTarget.style.background = "transparent"),
                },
                  h("td", { className: "px-4 pl-6 py-3.5 tabular text-[12.5px] font-mono font-semibold", style: { color: "var(--accent)" } }, r.code),
                  h("td", { className: "px-4 py-3.5 text-[13.5px] font-semibold", style: { color: "var(--foreground)" } }, r.name),
                  h("td", { className: "px-4 py-3.5 text-[13px]", style: { color: "var(--muted-foreground)" } }, r.gp),
                  h("td", { className: "px-4 py-3.5 text-center t-caption tabular text-[12px]" }, r.regDate),
                  h("td", { className: "px-4 py-3.5 text-center t-caption tabular text-[12px]" }, r.lastModified),
                  h("td", { className: "px-4 py-3.5 text-center text-[12.5px] font-bold tabular", style: { color: "var(--primary)" } }, r.version),
                  h("td", { className: "px-4 py-3.5 text-center" },
                    h(StatusBadge, { tone: registryTone(r.status), label: r.status, size: "sm" })
                  ),
                  h("td", { className: "px-4 pr-5 py-3.5 text-right" },
                    h(IconBtn, { icon: "download", label: `${r.name} 다운로드`, size: 32 })
                  )
                )
              )
            )
          )
        )
      ),

      /* 수정이력 타임라인 */
      h("div", { className: "rounded-card border border-border bg-card px-5 py-4 shadow-sm" },
        h("div", { className: "flex items-center gap-2 mb-4" },
          h(ColorChip, { icon: "clock", color: "var(--info)", size: 28, iconSize: 15 }),
          h("h4", { className: "text-[14px] font-bold" }, "최근 수정이력")
        ),
        h("div", { className: "flex flex-col" },
          REGISTRY_HISTORY.map((item, i) =>
            h("div", {
              key: i,
              className: cx("flex items-start gap-3 pb-4", i < REGISTRY_HISTORY.length - 1 && "border-b border-border mb-4"),
            },
              h("div", { className: "flex flex-col items-center shrink-0" },
                h("div", {
                  className: "w-2 h-2 rounded-full mt-1.5",
                  style: { background: "var(--primary)" },
                }),
                i < REGISTRY_HISTORY.length - 1 && h("div", {
                  className: "w-px flex-1 mt-1",
                  style: { background: "var(--border)", minHeight: 20 },
                })
              ),
              h("div", { className: "min-w-0 flex-1" },
                h("div", { className: "flex items-center gap-2 flex-wrap" },
                  h("span", { className: "text-[12.5px] font-bold", style: { color: "var(--foreground)" } }, item.fund),
                  h("span", { className: "t-caption tabular text-[11.5px]" }, item.date)
                ),
                h("div", { className: "text-[12.5px] mt-0.5", style: { color: "var(--muted-foreground)" } }, item.change),
                h("div", { className: "t-caption text-[11px] mt-0.5" }, "처리: ", item.by)
              )
            )
          )
        )
      )
    );
  }

  /* ─────────────────────────────────────────────
     KPI 카드 (단순 수치 표시)
  ───────────────────────────────────────────── */
  function KpiBox({ icon, color, label, value, sub, tone }) {
    const [c, softBg] = toneVar(tone || "primary");
    return h("div", {
      className: "rounded-card border border-border bg-card px-5 py-4 shadow-sm flex items-center gap-4",
    },
      h("div", {
        className: "inline-flex items-center justify-center shrink-0 rounded-[12px]",
        style: { width: 44, height: 44, background: softBg, color: c },
      }, h(Icon, { name: icon, size: 22, stroke: 2 })),
      h("div", { className: "min-w-0 flex-1" },
        h("div", { className: "t-label text-[11.5px] mb-0.5" }, label),
        h("div", { className: "text-[22px] font-extrabold tabular leading-tight", style: { color: "var(--foreground)" } }, value),
        sub && h("div", { className: "t-caption text-[11.5px] mt-0.5" }, sub)
      )
    );
  }

  /* ─────────────────────────────────────────────
     메인 컴포넌트: Report
  ───────────────────────────────────────────── */
  function Report({ onNav }) {
    const [tab, setTab] = useState("ministry");

    // 보고 일정 필터 (kind === "보고")
    const scheduleItems = useMemo(
      () => (D.SCHEDULE || []).filter((s) => s.kind === "보고"),
      []
    );

    const tabOptions = [
      { value: "ministry", label: "부처보고" },
      { value: "custody", label: "수탁보고" },
      { value: "registry", label: "등록원부" },
    ];

    return h("div", {
      className: "max-w-[1320px] mx-auto",
      style: { animation: "dashFade .35s var(--ease) both" },
    },
      /* ── PageHeader ── */
      h(PageHeader, {
        crumbs: ["홈", "부처보고", "보고 관리"],
        title: "부처보고·수탁보고",
        sub: "보고서 제출, 수탁 데이터 검증, 등록원부 관리 — 2026-06-16 기준",
        actions: h(React.Fragment, null,
          h(Button, {
            variant: "outline",
            size: "sm",
            leadingIcon: "chevron-left",
            onClick: () => onNav && onNav("main"),
          }, "메인으로"),
          h(Button, { variant: "primary", size: "sm", leadingIcon: "download" }, "전체 내보내기")
        ),
      }),

      /* ── KPI 3열 ── */
      h("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4" },
        h(KpiBox, {
          icon: "file",
          tone: "primary",
          label: "이번 분기 보고서",
          value: "4건",
          sub: "제출완료 3 / 미제출 1",
        }),
        h(KpiBox, {
          icon: "shield",
          tone: "warning",
          label: "수탁보고 검증",
          value: "진행중 2건",
          sub: "불일치 항목 재검토 중",
        }),
        h(KpiBox, {
          icon: "clock",
          tone: "info",
          label: "등록원부 최종갱신",
          value: "2026-06-10",
          sub: "스마트팜 그로스 1호",
        })
      ),

      /* ── 탭 + 콘텐츠 ── */
      h("div", { className: "flex flex-col gap-4 mb-4" },
        h("div", { className: "flex items-center gap-3" },
          h(SegTabs, {
            options: tabOptions,
            value: tab,
            onChange: setTab,
            size: "md",
          })
        ),
        tab === "ministry" && h(MinistryTab),
        tab === "custody" && h(CustodyTab),
        tab === "registry" && h(RegistryTab)
      ),

      /* ── 하단 2열: 연도별 차트 + 보고 일정 ── */
      h("div", { className: "grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4" },

        /* 연도별 투자현황 */
        h(ChartCard, {
          title: "연도별 투자·집행 현황",
          sub: "계획 대비 실적 (억원)",
          icon: "chart",
          accent: "var(--primary)",
          minH: 240,
        },
          h("div", { style: { height: 200 } },
            h(ComposedBars, {
              data: INVEST_HISTORY,
              height: 200,
              planColor: "var(--chart-3)",
              actualColor: "var(--primary)",
            })
          ),
          h("div", { className: "flex items-center gap-4 mt-2 px-1" },
            h("div", { className: "flex items-center gap-1.5" },
              h("span", { className: "w-3 h-3 rounded-sm inline-block shrink-0", style: { background: "var(--chart-3)" } }),
              h("span", { className: "t-caption text-[11.5px]" }, "계획")
            ),
            h("div", { className: "flex items-center gap-1.5" },
              h("span", { className: "w-3 h-3 rounded-sm inline-block shrink-0", style: { background: "var(--primary)" } }),
              h("span", { className: "t-caption text-[11.5px]" }, "실적")
            )
          )
        ),

        /* 보고 일정 카드 */
        h("div", { className: "rounded-card-lg border border-border bg-card shadow-sm overflow-hidden" },
          h("div", { className: "flex items-center justify-between gap-3 px-5 py-4 border-b border-border" },
            h("div", { className: "flex items-center gap-2" },
              h(ColorChip, { icon: "calendar", color: "var(--warning)", size: 30, iconSize: 16 }),
              h("h3", { className: "text-[15px] font-bold" }, "보고 일정 현황")
            ),
            scheduleItems.length > 0 && h(CountPill, { count: scheduleItems.length })
          ),
          h("div", { className: "flex flex-col gap-2 px-4 py-3 overflow-y-auto", style: { maxHeight: 280 } },
            scheduleItems.length === 0
              ? h("div", { className: "py-8 text-center t-caption" }, "예정된 보고 일정이 없습니다.")
              : scheduleItems.map((item, i) => h(ScheduleCard, { key: i, item }))
          )
        )
      )
    );
  }

  w.Pages = w.Pages || {};
  w.Pages.Report = Report;
})(window);
