/* 일반 리스트 페이지 — 전용 구현이 없는 모든 메뉴 항목의 기본(폴백) 화면.
   레이아웃: KPI 배지 · 필터 칩 툴바 · CRUD 테이블 · 페이지네이션 · 하단 요약 2-카드.
   route 값(한글 레이블 또는 경로)으로 제목·브레드크럼을 자동 구성. */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';
import { RowFormModal, statusTone } from './generic_list_modal';
import type { Row } from './generic_list_modal';

const { useState } = React;
const { PageHeader } = Shell;
const { Card, Button, StatusBadge, IconBtn, ColorChip, SegTabs, DeltaBadge } = UI;
const D = APFS_DATA;

/* MENU를 재귀 탐색해 route와 일치하는 항목의 제목·breadcrumb·상위 레이블을 반환 */
function findMenuContext(route: string): { title: string; crumbs: string[]; parent?: string } {
  for (const top of D.MENU) {
    if (!top.children) continue;
    for (const child of top.children) {
      if (!child.children) {
        if (child.label === route || child.path === route)
          return { title: child.label, crumbs: ["홈", top.label, child.label], parent: top.label };
        continue;
      }
      for (const leaf of child.children) {
        if (leaf.label === route || leaf.path === route)
          return { title: leaf.label, crumbs: ["홈", top.label, child.label, leaf.label], parent: child.label };
      }
    }
  }
  return { title: route, crumbs: ["홈", route] };
}

/* 행 더미 데이터 생성 — index 기반 결정적 값 (브랜드 차트 팔레트 토큰 매핑) */
const ROW_ICONS = ["building", "layers", "target", "wallet", "chart-bar"];
const ROW_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-9)"];
const ROW_CATS = ["투자성과", "리스크", "회계마감", "운용사보고", "컴플라이언스"];
const ROW_STATUS = ["정상", "진행중", "검토중", "보류", "완료"];

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => {
    const k = i % 5;
    return {
      id: "R" + String(i + 1).padStart(3, "0"),
      icon: ROW_ICONS[k],
      color: ROW_COLORS[k],
      name: "항목명 " + String(i + 1).padStart(3, "0"),
      category: ROW_CATS[k],
      amount: 1200 * (i + 1) + ((i * 137) % 800),
      change: Number((((i * 13) % 200) / 10 - 8).toFixed(1)),
      status: ROW_STATUS[i % 5],
      trend: [3, 5, 4, 7, 6].map((v, j) => v + ((i + j * 2) % 4)),
    };
  });
}

let SEQ = 500;
const nextId = () => "R" + (++SEQ);

const PER = 20;

/* 작은 막대 스파크라인 — 마지막 막대만 진하게 (이미지 참조) */
function MiniBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 3, height: 20 }}>
      {data.map((v, i) => (
        <span key={i} style={{
          width: 5, borderRadius: 2, height: Math.max(3, (v / max) * 20),
          background: i === data.length - 1 ? color : `color-mix(in srgb, ${color} 32%, transparent)`,
        }} />
      ))}
    </div>
  );
}

/* 헤더 우측 KPI 배지 (라벨/값 마스킹) */
function KpiBadge({ icon, color, label, value, valueColor }: { icon: string; color: string; label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", borderRadius: 12, padding: "8px 14px", background: "var(--card)" }}>
      <ColorChip icon={icon} color={color} size={30} iconSize={16} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.2 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--caption)" }}><MT>{label}</MT></span>
        <span className="tabular" style={{ fontSize: 16, fontWeight: 800, color: valueColor || "var(--foreground)" }}>{value}</span>
      </div>
    </div>
  );
}

/* 제거 가능한 필터 칩 */
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 8px 5px 11px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, background: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
      <MT>{label}</MT>
      <button onClick={onRemove} aria-label={label + " 필터 제거"} style={{ display: "inline-flex", border: 0, background: "transparent", cursor: "pointer", color: "inherit", padding: 0 }}>
        <Icon name="x" size={13} stroke={2.4} />
      </button>
    </span>
  );
}

export function GenericListPage({ route, onNav }: { route: string; onNav: (r: string) => void }) {
  const { title, crumbs, parent } = findMenuContext(route);
  const [rows, setRows] = useState<Row[]>(() => makeRows(23));
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [chips, setChips] = useState<string[]>(["투자성과", "리스크", "회계마감", "운용사보고"]);
  const [page, setPage] = useState(1);
  const [view, setView] = useState("list");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: Row } | null>(null);

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PER));
  const curPage = Math.min(page, totalPages);
  const pageRows = rows.slice((curPage - 1) * PER, curPage * PER);

  // 파생 KPI
  const sumAmount = rows.reduce((s, r) => s + r.amount, 0);
  const avgChange = total ? rows.reduce((s, r) => s + r.change, 0) / total : 0;
  const goodRate = total ? Math.round(rows.filter((r) => r.status === "정상" || r.status === "완료").length / total * 100) : 0;
  const avgUp = avgChange >= 0;

  // 선택 토글
  const toggleRow = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) pageRows.forEach((r) => next.delete(r.id));
    else pageRows.forEach((r) => next.add(r.id));
    return next;
  });

  // CRUD
  const save = (row: Row) => {
    setRows((prev) => modal?.mode === "create"
      ? [{ ...row, id: nextId() }, ...prev]
      : prev.map((r) => (r.id === row.id ? row : r)));
    setModal(null);
  };
  const deleteOne = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    setModal(null);
  };
  const bulkDelete = () => {
    setRows((prev) => prev.filter((r) => !selected.has(r.id)));
    setSelected(new Set());
  };

  const cellPad = "11px 14px";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", animation: "dashFade .3s var(--ease) both" }}>
      <PageHeader
        crumbs={crumbs}
        title={title}
        actions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav("main")}>메인으로</Button>} />

      {/* ── 메인 리스트 카드 ── */}
      <Card pad={0} style={{ overflow: "hidden" }}>
        {/* 카드 헤더: 타이틀 + KPI 배지 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 18px", flexWrap: "wrap" }}>
          <h3 style={{ fontSize: 15.5, fontWeight: 700 }}><MT>{title}</MT></h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <KpiBadge icon="trending" color="var(--chart-1)" label="평균 변동률"
              value={mn((avgUp ? "+" : "-") + Math.abs(avgChange).toFixed(1)) + "%"}
              valueColor={avgUp ? "var(--success)" : "var(--danger)"} />
            <KpiBadge icon="wallet" color="var(--accent)" label="합계 금액"
              value={"₩" + mn(Math.round(sumAmount / 100).toLocaleString()) + "억"} />
          </div>
        </div>

        {/* 툴바: 필터 칩 / 선택 액션 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 18px", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "color-mix(in srgb, var(--muted) 35%, transparent)", flexWrap: "wrap" }}>
          {selected.size > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.size}건 선택됨</span>
              <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: "var(--danger)" }} onClick={bulkDelete}>선택 삭제</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>선택 해제</Button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Icon name="filter" size={16} style={{ color: "var(--caption)" }} />
              {chips.map((c) => <FilterPill key={c} label={c} onRemove={() => setChips((p) => p.filter((x) => x !== c))} />)}
              {chips.length === 0 && <span style={{ fontSize: 12.5, color: "var(--caption)" }}>필터 없음</span>}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Button variant="ghost" size="sm" leadingIcon="panel-left">상세필터</Button>
            <IconBtn icon="refresh" label="새로고침" size={34} onClick={() => { setRows(makeRows(23)); setSelected(new Set()); setPage(1); }} />
            <Button variant="primary" size="sm" leadingIcon="plus" onClick={() => setModal({ mode: "create" })}>신규 등록</Button>
          </div>
        </div>

        {/* 테이블 / 상세 뷰 */}
        {view === "list" ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--muted) 55%, transparent)" }}>
                  <th style={{ padding: cellPad, width: 44 }}>
                    <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="전체 선택" style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
                  </th>
                  {[["항목명", "left"], ["금액 (백만원)", "right"], ["변동률", "center"], ["상태", "center"], ["추이", "center"], ["", "right"]].map(([label, align], i) => (
                    <th key={i} style={{ padding: cellPad, textAlign: align as any, fontSize: 12, fontWeight: 700, color: "var(--caption)", whiteSpace: "nowrap", borderBottom: "1px solid var(--border)" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => {
                  const sel = selected.has(r.id);
                  return (
                    <tr key={r.id}
                      style={{ borderBottom: "1px solid var(--border)", background: sel ? "color-mix(in srgb, var(--primary) 6%, transparent)" : undefined, transition: "background .12s" }}
                      onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "color-mix(in srgb, var(--muted) 40%, transparent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = sel ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent"; }}>
                      <td style={{ padding: cellPad }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleRow(r.id)} aria-label={r.name + " 선택"} style={{ accentColor: "var(--primary)", width: 15, height: 15, cursor: "pointer" }} />
                      </td>
                      <td style={{ padding: cellPad }}>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}><MT>{r.name}</MT></div>
                          <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 1 }}><MT>{r.category}</MT></div>
                        </div>
                      </td>
                      <td className="tabular" style={{ padding: cellPad, textAlign: "right", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap" }}>{mn(r.amount.toLocaleString())}</td>
                      <td style={{ padding: cellPad, textAlign: "center" }}><div style={{ display: "inline-flex" }}><DeltaBadge value={r.change} /></div></td>
                      <td style={{ padding: cellPad, textAlign: "center" }}><StatusBadge tone={statusTone(r.status)} label={r.status} size="sm" /></td>
                      <td style={{ padding: cellPad, textAlign: "center" }}><MiniBars data={r.trend} color={r.color} /></td>
                      <td style={{ padding: cellPad, textAlign: "right" }}>
                        <IconBtn icon="file" label={r.name + " 상세·수정"} size={32} onClick={() => setModal({ mode: "edit", row: r })} />
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: "48px 0", textAlign: "center", color: "var(--caption)", fontSize: 13 }}>
                    <Icon name="inbox" size={28} stroke={1.7} style={{ margin: "0 auto 8px" }} />표시할 항목이 없습니다
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, padding: 18 }}>
            {pageRows.map((r) => (
              <button key={r.id} onClick={() => setModal({ mode: "edit", row: r })}
                style={{ textAlign: "left", border: "1px solid var(--border)", borderRadius: 12, padding: 14, background: "var(--card)", cursor: "pointer", font: "inherit", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ColorChip icon={r.icon} color={r.color} size={36} iconSize={18} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}><MT>{r.name}</MT></div>
                    <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}><MT>{r.category}</MT></div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="tabular" style={{ fontSize: 15, fontWeight: 700 }}>{mn(r.amount.toLocaleString())}</span>
                  <DeltaBadge value={r.change} />
                </div>
                <StatusBadge tone={statusTone(r.status)} label={r.status} size="sm" />
              </button>
            ))}
          </div>
        )}

        {/* 푸터: 건수 · 페이지네이션 · 뷰 토글 · 내보내기 */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 18px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, color: "var(--caption)" }}>총 {mn(String(total))}개 중 {mn(String(pageRows.length))}개 항목 표시 중</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => setPage((p) => Math.max(1, p - 1))} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={{
                width: 32, height: 32, borderRadius: 8, border: "1px solid",
                borderColor: p === curPage ? "var(--primary)" : "var(--border)",
                background: p === curPage ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
                color: p === curPage ? "var(--primary)" : "var(--foreground)",
                font: "inherit", fontSize: 13, fontWeight: p === curPage ? 700 : 500, cursor: "pointer", transition: "all .12s",
              }}>{p}</button>
            ))}
            <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <SegTabs size="sm" value={view} onChange={setView} options={[{ value: "list", label: "리스트 뷰" }, { value: "detail", label: "상세 뷰" }]} />
            <IconBtn icon="download" label="다운로드" size={32} />
            <IconBtn icon="external" label="새 창" size={32} />
            <IconBtn icon="more" label="더보기" size={32} />
          </div>
        </div>
      </Card>

      {/* ── 하단 요약 2-카드 ── */}
      <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
        {/* 좌: 진행률 요약 */}
        <Card style={{ flex: "1 1 380px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700 }}><MT>{(parent || title) + " 진행 요약"}</MT></h4>
          <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.6, margin: 0 }}>
            <MT>{"정상·완료 항목 비중과 평균 변동률을 종합한 진행 지표입니다."}</MT>
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
            <span className="tabular" style={{ fontSize: 34, fontWeight: 800, color: "var(--accent)" }}>{mn(String(goodRate))}%</span>
            <StatusBadge tone="success" icon="trending" label="정상 진행" size="sm" />
          </div>
        </Card>

        {/* 우: 합계 금액 강조 (forest green) */}
        <Card pad={20} style={{ flex: "1 1 320px", background: "var(--primary)", border: "none", color: "#fff", display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, opacity: .85 }}><MT>{"총 운용 금액"}</MT></span>
          <span style={{ fontSize: 12, opacity: .7 }}><MT>{title + " 누적 합계"}</MT></span>
          <span className="tabular" style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.01em", margin: "4px 0" }}>{"₩" + mn(sumAmount.toLocaleString())}</span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,.18)", fontSize: 12.5, fontWeight: 600 }}>
            <Icon name="trending" size={15} stroke={2.4} /><MT>{"전기 대비 추이 보기"}</MT>
          </div>
        </Card>
      </div>

      {modal && (
        <RowFormModal
          mode={modal.mode}
          initial={modal.row}
          onSave={save}
          onClose={() => setModal(null)}
          onDelete={modal.row ? () => deleteOne(modal.row!.id) : undefined} />
      )}
    </div>
  );
}
