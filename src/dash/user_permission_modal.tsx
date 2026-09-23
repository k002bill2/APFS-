/* 사용자 권한 관리 — 권한 설정 모달(등록/수정/복사 3모드). 출처: S0_102_권한관리.html `#m-preset` + `renderTree/refreshChecks`.

   ⚠ RowFormModal(flat 스키마)로는 담을 수 없어 전용 모달이다 — 본문 아래 **메뉴별 기능 권한 매트릭스**
     (대메뉴 › 중메뉴 › 소메뉴 × 조회·인쇄/다운로드·등록/수정·관리자)가 flat FieldSpec 밖이다.
   그 외 골격은 RowFormModal 규격 그대로: `max-w` wide + 본문 `p-[46px]`(+헤더·푸터 `px-[46px]`), 개별 컨트롤은
   `SchemaField`(ad-hoc FieldSpec), 라벨 래퍼는 `Field` 규격 로컬 복제(generic_list_modal.tsx 참조), 섹션 제목은
   `<legend>` 밑줄형(apfs-form-modal "본문 섹션 헤더").

   매트릭스 체크 규약(목업 `refreshChecks` 그대로, 모델은 user_permission_model.ts):
   - 셀 = 리프×기능 1개. 행 체크 = 그 리프 4기능 전체. 중/대메뉴 체크 = 하위 리프 전체×4기능.
     열 머리글 체크 = 전 리프의 그 기능. 좌상단 = 전체.
   - 집계 체크박스는 전부/일부/없음 3상태 — 일부는 DS `Checkbox` 의 `checked='indeterminate'`(SR 에 mixed, 시각은 대시).
     일부(indeterminate) 상태를 클릭하면 Radix 가 checked=true 로 올리므로 "전체 켜기"가 된다(목업 동일).
   - 셀·집계 체크는 전부 DS `Checkbox`(ui/checkbox.tsx) — 폼 모달의 '여/부' 체크와 같은 룩(2026-09-18, #202 후속).
     Radix Root 는 `<button>` 이라 `<label>` 로 **감싸지 않고** `htmlFor`/`id` 로 명시 연결한다(암묵 연결은 클릭 2회 발화).
   - 대/중메뉴 셀은 `rowSpan` 으로 묶는다(목업은 첫 행에만 라벨을 찍고 나머지는 빈 셀 — 표 구조상 rowSpan 이 정확).
   ⚠ 실제 인가가 아니다 — 백엔드/RBAC 없이 행 로컬 상태의 `perms` 만 바뀐다(브리프). */
import React from 'react';
import { UI } from './components';
import { SchemaField, isPlainWrapControl } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription , type DialogHandle} from './ui/dialog';
import { Checkbox } from './ui/checkbox';   // 매트릭스 셀·집계 체크 = DS 체크박스(3상태)
import type { MenuRow, UType } from './admin_menu_tree';
import { UTYPES } from './admin_menu_tree';
import { PERM_KEYS, PERM_LABELS, matrixRows, setCells, triOf, countOn, cellOf, permNameTaken } from './user_permission_model';
import type { PermKey, PermMap, Tri, MatrixRow } from './user_permission_model';

const { Button, SaveButton, TextSwap } = UI;

export interface PermRow {
  id: string; no: number;
  name: string;      // 명칭
  utype: UType;      // 사용자 구분(단일·필수)
  desc: string;      // 설명
  by: string;        // 최종수정(자)
  at: string;        // 최종수정일 'YYYY-MM-DD'
  use: boolean;      // 사용여부
  users: number;     // 배정 사용자수 — 0명일 때만 삭제 가능
  perms: PermMap;    // 메뉴별 기능 권한(리프 id → {v,d,c,a})
}
export type PermPatch = Pick<PermRow, 'name' | 'utype' | 'desc' | 'use' | 'perms'>;
export type PermMode = 'create' | 'edit' | 'copy';

/* ── 필드 정의(ad-hoc FieldSpec) — 목업 modal-body 위→아래: 명칭* · 사용자 구분* · 설명* · 사용여부 ── */
const F: Record<string, FieldSpec> = {
  name: { key: 'name', label: '명칭', control: 'text', required: true },
  utype: { key: 'utype', label: '사용자 구분', control: 'select', options: [...UTYPES], required: true },
  desc: { key: 'desc', label: '설명', control: 'text', long: true, required: true },
  use: { key: 'use', label: '사용여부', control: 'switch', options: ['여', '부'] },
};

/* RowFormModal `Field` 규격 로컬 복제(공유 export 아님). radio 는 plain div(암묵 연결이 첫 라디오만 가리킴). */
const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, className, plain }: { label: string; children: React.ReactNode; errMsg?: string; className?: string; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

/* 3상태 체크박스 — DS Checkbox(Radix) + indeterminate. 접근名은 aria-label 로 명시(가시 라벨이 있어도 "무엇의 전체"인지 남긴다).
   `id` 를 주면 옆 텍스트를 `<label htmlFor>` 로 연결할 수 있다(래핑 금지 — 파일 머리 규약). */
function TriCheck({ tri, onChange, label, id }: { tri: Tri; onChange: (on: boolean) => void; label: string; id?: string }) {
  return (
    <Checkbox
      id={id}
      checked={tri === 'all' ? true : tri === 'some' ? 'indeterminate' : false}
      onCheckedChange={(c) => onChange(c === true)}
      aria-label={label}
      className="align-middle"
    />
  );
}
/* 집계 체크 옆 가시 라벨 — TriCheck 의 id 와 htmlFor 로 명시 연결(클릭 면적 확보). */
const cellLabel: React.CSSProperties = { cursor: 'pointer', userSelect: 'none' };

/* ── 매트릭스 — 대/중 그룹은 트리 순서로 1회 계산(rows 가 바뀌지 않는 한 고정) ── */
type MidGroup = { midId: string; mid: string; leaves: MatrixRow[] };
type DaeGroup = { daeId: string; dae: string; mids: MidGroup[]; leafIds: string[] };
function groupMatrix(rows: MatrixRow[]): DaeGroup[] {
  const out: DaeGroup[] = [];
  for (const r of rows) {
    let d = out[out.length - 1];
    if (!d || d.daeId !== r.daeId) { d = { daeId: r.daeId, dae: r.dae, mids: [], leafIds: [] }; out.push(d); }
    let m = d.mids[d.mids.length - 1];
    if (!m || m.midId !== r.midId) { m = { midId: r.midId, mid: r.mid, leaves: [] }; d.mids.push(m); }
    m.leaves.push(r); d.leafIds.push(r.leafId);
  }
  return out;
}

const th: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 2, background: 'var(--grid-header)', color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 700, textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
const thC: React.CSSProperties = { ...th, textAlign: 'center' };
const td: React.CSSProperties = { padding: '5px 10px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', fontSize: 13 };
const tdC: React.CSSProperties = { ...td, textAlign: 'center' };
/* 대/중메뉴 rowSpan 셀 — 위 정렬 + 은은한 배경으로 그룹 경계를 드러낸다 */
const tdGroup: React.CSSProperties = { ...td, verticalAlign: 'top', background: 'color-mix(in srgb, var(--muted) 45%, transparent)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' };

function PermMatrix({ rows, perms, onChange }: { rows: MatrixRow[]; perms: PermMap; onChange: (next: PermMap) => void }) {
  const uid = React.useId();   // 집계 체크 id 접두(htmlFor 연결용) — 모달이 겹쳐도 충돌하지 않는다
  const groups = React.useMemo(() => groupMatrix(rows), [rows]);
  const allIds = React.useMemo(() => rows.map((r) => r.leafId), [rows]);
  const set = (ids: readonly string[], keys: readonly PermKey[], on: boolean) => onChange(setCells(perms, ids, keys, on));
  const groupLabel = (name: string) => <span className="font-semibold">{name}</span>;   // 부모 span 이 gap 을 갖는다 — 겹 래퍼 금지
  return (
    <table className="w-full border-collapse" style={{ minWidth: 760, tableLayout: 'fixed', fontVariantNumeric: 'tabular-nums' }}>
      <colgroup>
        <col style={{ width: 36 }} /><col style={{ width: 118 }} /><col style={{ width: 128 }} /><col /><col style={{ width: 84 }} />
        <col style={{ width: 64 }} /><col style={{ width: 104 }} /><col style={{ width: 84 }} /><col style={{ width: 64 }} />
      </colgroup>
      <thead>
        <tr>
          <th style={thC}><TriCheck tri={triOf(perms, allIds, PERM_KEYS)} onChange={(on) => set(allIds, PERM_KEYS, on)} label="전체 선택" /></th>
          <th style={th}>대메뉴</th><th style={th}>중메뉴</th><th style={th}>소메뉴</th><th style={th}>프로그램ID</th>
          {PERM_KEYS.map((k) => (
            <th key={k} style={thC}>
              {/* 열 머리글 체크 = 해당 기능 전체(목업 colchk) — 라벨은 htmlFor 명시 연결(클릭 면적 확보, 래핑 금지) */}
              <span className="inline-flex items-center gap-1.5">
                <TriCheck id={`${uid}-col-${k}`} tri={triOf(perms, allIds, [k])} onChange={(on) => set(allIds, [k], on)} label={`${PERM_LABELS[k]} 전체`} />
                <label htmlFor={`${uid}-col-${k}`} style={cellLabel}>{PERM_LABELS[k]}</label>
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groups.map((d) => d.mids.map((m, mi) => m.leaves.map((leaf, li) => {
          const c = cellOf(perms, leaf.leafId);
          const midIds = m.leaves.map((x) => x.leafId);
          return (
            <tr key={leaf.leafId}>
              <td style={tdC}><TriCheck tri={triOf(perms, [leaf.leafId], PERM_KEYS)} onChange={(on) => set([leaf.leafId], PERM_KEYS, on)} label={`${leaf.name} 전체 기능`} /></td>
              {mi === 0 && li === 0 && (
                <td rowSpan={d.leafIds.length} style={tdGroup}>
                  <span className="inline-flex items-center gap-[7px]">
                    <TriCheck id={`${uid}-dae-${d.daeId}`} tri={triOf(perms, d.leafIds, PERM_KEYS)} onChange={(on) => set(d.leafIds, PERM_KEYS, on)} label={`대메뉴 ${d.dae} 전체`} />
                    <label htmlFor={`${uid}-dae-${d.daeId}`} style={cellLabel}>{groupLabel(d.dae)}</label>
                  </span>
                </td>
              )}
              {li === 0 && (
                <td rowSpan={m.leaves.length} style={tdGroup}>
                  {m.mid === '-' ? <span className="text-muted-foreground">-</span> : (
                    <span className="inline-flex items-center gap-[7px]">
                      <TriCheck id={`${uid}-mid-${m.midId}`} tri={triOf(perms, midIds, PERM_KEYS)} onChange={(on) => set(midIds, PERM_KEYS, on)} label={`중메뉴 ${m.mid} 전체`} />
                      <label htmlFor={`${uid}-mid-${m.midId}`} style={cellLabel}>{groupLabel(m.mid)}</label>
                    </span>
                  )}
                </td>
              )}
              <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leaf.name}>{leaf.name}</td>
              <td style={{ ...td, color: 'var(--muted-foreground)', fontSize: 12 }}>{leaf.pid}</td>
              {PERM_KEYS.map((k) => (
                <td key={k} style={tdC}>
                  <TriCheck tri={c[k] ? 'all' : 'none'} onChange={(on) => set([leaf.leafId], [k], on)} label={`${leaf.name} ${PERM_LABELS[k]}`} />
                </td>
              ))}
            </tr>
          );
        })))}
      </tbody>
    </table>
  );
}

/* ──────────────────────────────
   모달 본체
────────────────────────────── */
const TITLE: Record<PermMode, string> = { create: '권한 등록', edit: '권한 수정', copy: '권한 복사' };

export function UserPermissionModal({ mode, initial, menuRows, existing, onSave, onClose }: {
  mode: PermMode;
  initial?: PermRow;
  menuRows: readonly MenuRow[];
  existing: readonly Pick<PermRow, 'id' | 'name'>[];   // 명칭 중복 검사 대상(전체 권한 행). 수정 모드는 자기 자신 제외
  onSave: (patch: PermPatch) => void;
  onClose: () => void;
}) {
  const rows = React.useMemo(() => matrixRows(menuRows), [menuRows]);
  const allIds = React.useMemo(() => rows.map((r) => r.leafId), [rows]);
  /* 등록은 빈 권한, 수정·복사는 원본 권한을 그대로(복사는 명칭 뒤 ' (복사)' — 목업 openPreset) */
  const [v, setV] = React.useState(() => ({
    name: mode === 'copy' && initial ? `${initial.name} (복사)` : (initial?.name ?? ''),
    utype: (initial?.utype ?? UTYPES[0]) as string,
    desc: initial?.desc ?? '',
    use: initial ? (initial.use ? '여' : '부') : '여',
  }));
  const [perms, setPerms] = React.useState<PermMap>(() => (mode === 'create' ? {} : (initial?.perms ?? {})));
  const [errKey, setErrKey] = React.useState('');
  const set = (k: keyof typeof v, val: string) => { setV((p) => ({ ...p, [k]: val })); if (errKey === k) setErrKey(''); };

  /* 검증: 화면 필드 순서(위→아래) — 명칭 → 사용자 구분 → 설명(목업 pf-save 주석 그대로) */
  const submit = () => {
    if (!v.name.trim()) { setErrKey('name'); return; }
    if (permNameTaken(existing, v.name, mode === 'edit' ? initial?.id : undefined)) { setErrKey('nameDup'); return; }   // 명칭 유일(Codex P1)
    if (!v.utype) { setErrKey('utype'); return; }
    if (!v.desc.trim()) { setErrKey('desc'); return; }
    return () => onSave({ name: v.name.trim(), utype: v.utype as UType, desc: v.desc.trim(), use: v.use === '여', perms });
  };

  const on = countOn(perms, allIds);
  const total = allIds.length * PERM_KEYS.length;

  const dlgRef = React.useRef<DialogHandle>(null);

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 바깥 클릭으로는 안 닫힘 — 매트릭스 작성 중 오터치 유실 방지(RowFormModal 동형) */}
      <DialogContent className="max-w-[1000px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{TITLE[mode]}</DialogTitle>
          <DialogDescription className="sr-only">{TITLE[mode]} 양식 — 명칭·사용자 구분·설명과 메뉴별 기능 권한</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="명칭 *" errMsg={errKey === 'name' ? '명칭을(를) 입력하세요.' : errKey === 'nameDup' ? '이미 존재하는 명칭입니다.' : undefined}>
              <SchemaField field={F.name} value={v.name} onChange={(x) => { set('name', x); if (errKey === 'nameDup') setErrKey(''); }} invalid={errKey === 'name' || errKey === 'nameDup'} />
            </Field>
            <Field label="사용자 구분 *" errMsg={errKey === 'utype' ? '사용자 구분을(를) 선택하세요.' : undefined}>
              <SchemaField field={F.utype} value={v.utype} onChange={(x) => set('utype', x)} invalid={errKey === 'utype'} />
            </Field>
            <Field label="설명 *" className="sm:col-span-2" errMsg={errKey === 'desc' ? '설명을(를) 입력하세요.' : undefined}>
              <SchemaField field={F.desc} value={v.desc} onChange={(x) => set('desc', x)} invalid={errKey === 'desc'} />
            </Field>
            <Field label="사용여부" plain={isPlainWrapControl(F.use.control)}>
              <SchemaField field={F.use} value={v.use} onChange={(x) => set('use', x)} />
            </Field>
          </div>

          {/* 메뉴별 기능 권한 — 섹션 헤더 규격(apfs-form-modal). 선택 수 캡션은 aria-live 로 SR 에도 전달 */}
          <fieldset className="border-0 p-0 m-0 mt-2">
            <legend className="w-full flex items-center justify-between gap-2 text-lg font-bold border-b-2 border-border pb-2 mb-3">
              <span>메뉴별 기능 권한</span>
              <span className="text-caption font-semibold" style={{ fontSize: 12 }} aria-live="polite"><TextSwap text={`${on.toLocaleString()} / ${total.toLocaleString()} 선택`} /></span>
            </legend>
            <div className="overflow-x-auto rounded-[9px] border border-border">
              <PermMatrix rows={rows} perms={perms} onChange={setPerms} />
            </div>
            <p className="text-caption m-0 mt-2" style={{ fontSize: 12, lineHeight: 1.5 }}>
              열 머리글 체크 = 해당 기능 전체 · 대메뉴/중메뉴 체크 = 하위 일괄 선택. 화면 표시용 프로토타입이며 실제 차단은 서버측 인가로 이루어집니다.
            </p>
          </fieldset>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
            <SaveButton onSubmit={submit} />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
