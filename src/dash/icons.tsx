/* lucide 스타일 라인 아이콘 (24x24, currentColor, stroke). 필요한 글리프만. */
import React from 'react';
import * as lucide from 'lucide';

const P = {
  home:["M3 10.5 12 3l9 7.5","M5 9.5V21h14V9.5","M9.5 21v-6h5v6"],
  landmark:["M3 21h18","M5 21V10","M19 21V10","M9 21V10","M15 21V10","M2.5 10 12 3.5 21.5 10","M3 10h18"],
  "shield-alert":["M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3Z","M12 8.5v4","M12 15.5h.01"],
  "shield-check":["M12 3 5 6v6c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6l-7-3Z","M9 12l2 2 4-4"],
  building:["M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16","M15 9h3a2 2 0 0 1 2 2v10","M8 7h2","M8 11h2","M8 15h2","M3 21h18"],
  wallet:["M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0","M3 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3","M21 10h-5a2 2 0 0 0 0 4h5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z"],
  file:["M14 3v5h5","M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z","M9 13h6","M9 17h6"],
  "file-check":["M14 3v5h5","M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z","M9 15l2 2 4-4"],
  chart:["M3 3v18h18","M7 15l3-4 3 2 4-6"],
  "chart-bar":["M3 3v18h18","M8 17v-5","M13 17V8","M18 17v-9"],
  settings:["M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z","M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7.7 2 2 0 0 1-4 0 1.6 1.6 0 0 0-2.7-.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4.6 13a2 2 0 0 1 0-4 1.6 1.6 0 0 0 .7-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-.7 2 2 0 0 1 4 0 1.6 1.6 0 0 0 2.7.7l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 .3 2Z"],
  target:["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z","M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z","M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"],
  trending:["M3 17l6-6 4 4 7-7","M14 8h6v6"],
  "trending-down":["M3 7l6 6 4-4 7 7","M14 16h6v-6"],
  calendar:["M7 3v3","M17 3v3","M4 8h16","M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z","M9 13h2","M13 13h2","M9 17h2"],
  bell:["M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6","M10.5 20a2 2 0 0 0 3 0"],
  search:["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z","M20 20l-4-4"],
  menu:["M4 7h16","M4 12h16","M4 17h16"],
  "panel-left":["M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z","M9 5v14"],
  "chevron-right":["M9 5l7 7-7 7"],
  "chevron-down":["M5 9l7 7 7-7"],
  "chevron-left":["M15 5l-7 7 7 7"],
  more:["M5 12h.01","M12 12h.01","M19 12h.01"],
  sun:["M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z","M12 2v2","M12 20v2","M4 12H2","M22 12h-2","M5 5l1.5 1.5","M17.5 17.5 19 19","M19 5l-1.5 1.5","M6.5 17.5 5 19"],
  moon:["M20 14a8 8 0 1 1-9.5-10.8A6.5 6.5 0 0 0 20 14Z"],
  x:["M6 6l12 12","M18 6 6 18"],
  check:["M5 12.5l4.5 4.5L19 7"],
  "check-circle":["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z","M8.5 12.2l2.4 2.4 4.6-4.8"],
  download:["M12 3v11","M8 11l4 4 4-4","M5 20h14"],
  upload:["M12 16V5","M8 9l4-4 4 4","M5 20h14"],
  inbox:["M3 12h5l1.5 3h5L21 12","M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z","M3 12v6"],
  users:["M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19","M10 4.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6","M19.5 19v-1.4a3 3 0 0 0-2.2-2.9","M16 4.7a3 3 0 0 1 0 5.6"],
  activity:["M3 12h4l2.5-7 5 14 2.5-7H21"],
  "alert-triangle":["M12 4 3 19h18L12 4Z","M12 10v4","M12 17h.01"],
  user:["M12 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7","M5 20a7 7 0 0 1 14 0"],
  plus:["M12 5v14","M5 12h14"],
  filter:["M3 5h18l-7 8v6l-4-2v-4L3 5Z"],
  external:["M14 4h6v6","M20 4l-8 8","M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"],
  refresh:["M21 12a9 9 0 1 1-2.6-6.3","M21 4v4h-4"],
  "arrow-right":["M5 12h14","M13 6l6 6-6 6"],
  clock:["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z","M12 7.5V12l3 2"],
  layers:["M12 3 3 8l9 5 9-5-9-5Z","M3 13l9 5 9-5","M3 18l9 5 9-5"],
};

/* kebab 이름 → Lucide PascalCase (대체 후보 포함) */
const MAP = {
  home:["Home"], landmark:["Landmark"], "shield-alert":["ShieldAlert"], "shield-check":["ShieldCheck"],
  building:["Building2","Building"], wallet:["Wallet"], file:["FileText","File"],
  // file-check: lucide FileCheck2는 체크가 문서 밖에 분리돼 20px에서 깨져 보임 →
  // MAP 미등록으로 자체 P 경로(문서+중앙 체크, `file` 계열과 일관)를 강제 사용.
  chart:["ChartLine","LineChart","TrendingUp"], "chart-bar":["ChartColumn","BarChart3","BarChart"],
  settings:["Settings"], target:["Target"], trending:["TrendingUp"], "trending-down":["TrendingDown"],
  calendar:["Calendar"], bell:["Bell"], search:["Search"], menu:["Menu"], "panel-left":["PanelLeft"],
  "chevron-right":["ChevronRight"], "chevron-down":["ChevronDown"], "chevron-left":["ChevronLeft"],
  more:["MoreHorizontal","Ellipsis"], sun:["Sun"], moon:["Moon"], x:["X"], check:["Check"],
  "check-circle":["CircleCheckBig","CheckCircle2","CircleCheck"], download:["Download"], upload:["Upload"],
  inbox:["Inbox"], users:["Users"], activity:["Activity"], "alert-triangle":["TriangleAlert","AlertTriangle"],
  user:["User"], plus:["Plus"], filter:["Filter"], external:["ExternalLink"], refresh:["RefreshCw"],
  "arrow-right":["ArrowRight"], clock:["Clock"], layers:["Layers","Layers3"],
  maximize:["Maximize2","Maximize"], minimize:["Minimize2","Minimize"],
  "expand-h":["UnfoldHorizontal","MoveHorizontal","StretchHorizontal"],
  "collapse-h":["FoldHorizontal","MoveHorizontal"],
};

// Lucide IconNode 조회: [[tag, attrs, children?], ...]
function lucideNode(name) {
  const L = lucide;
  if (!L) return null;
  const cands = MAP[name] || [];
  for (const c of cands) {
    let v = (L.icons && L.icons[c]) || L[c];
    if (!v) continue;
    if (v.default) v = v.default;
    if (!Array.isArray(v)) continue;
    // lucide 노드: ['svg', attrs, [children]]  또는 [children]
    if (v[0] === "svg" && Array.isArray(v[2])) return v[2];
    if (Array.isArray(v[0])) return v;
  }
  return null;
}

function renderNode(node) {
  return node.map((el, i) => {
    const tag = el[0], attrs = el[1] || {}, kids = el[2];
    const props = Object.assign({ key: i }, attrs);
    return React.createElement(tag, props, Array.isArray(kids) ? renderNode(kids) : undefined);
  });
}

function Icon({ name, size = 20, stroke = 2, className, style }) {
  const node = lucideNode(name);
  const children = node ? renderNode(node) : (P[name] || []).map((p, i) => <path key={i} d={p} />);
  if (!node && !P[name]) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        flex: "0 0 auto", display: "block",
        width: size, height: size,
        minWidth: size, minHeight: size, maxWidth: size, maxHeight: size,
        aspectRatio: "1 / 1", ...style,
      }}
      aria-hidden={true}>{children}</svg>
  );
}

export { Icon };
