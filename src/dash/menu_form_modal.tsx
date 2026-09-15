/* 메뉴 관리 — 메뉴 등록/수정 모달 + 프로그램 검색 중첩 팝업. 출처: S0_105_메뉴관리.html `#m-menu`·`#m-pidsearch`.

   ⚠ RowFormModal(flat 스키마)로는 담을 수 없어 전용 모달이다 — 세 가지가 flat FieldSpec 밖이다:
     ① 메뉴 레벨 ↔ 상위메뉴 **연동**(레벨을 고르면 상위 후보가 한 레벨 위 메뉴로 바뀌고, 레벨1은 상위 없음)
     ② 프로그램ID는 직접 입력이 아니라 **프로그램 검색 팝업**(중첩 Dialog)에서 고른다. 레벨1(대분류)은 지정 불가
     ③ 단축번호는 프로그램ID가 있을 때만 입력 가능 + **중복확인** 버튼(목업 shortDup)
   그 외 골격·규격은 RowFormModal 그대로: 항목 9개(>6) → `max-w-[880px]` 2단 그리드, 본문 `p-[46px]`
   (+헤더·푸터 `px-[46px]`), 개별 컨트롤은 `SchemaField`(ad-hoc FieldSpec), 라벨 래퍼는 `Field` 규격 로컬 복제.

   필드 순서 = 목업 modal-body 위→아래:
     메뉴ID* · 메뉴명* · 메뉴명(영문) · 프로그램ID(검색) · 단축번호(중복확인) · 메뉴 레벨*+상위메뉴 · 정렬* · 사용자 구분(복수) · 사용여부
   검증 순서 = 목업 mm-save 주석: 메뉴ID → (중복) → 메뉴명 → 메뉴 레벨 → 상위메뉴 → 정렬 → 단축번호 중복. 오류는 필드 아래 인라인(role=alert).
   ⚠ 백엔드가 없어 저장은 부모(menu_manage)의 로컬 행 상태만 바꾼다. 정렬 재배치는 부모가 reseqSiblings 로 수행. */
import React from 'react';
import { UI } from './components';
import { MT } from './mask';
import { SchemaField } from './schemas/renderers';
import type { FieldSpec } from './schemas/types';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from './ui/sonner';
import { UTYPES, hasChildren, pidTakenBy } from './admin_menu_tree';
import type { MenuRow, MenuLevel, Program, UType } from './admin_menu_tree';

const { Button } = UI;

/** 부모가 받는 저장값 — id/ord 재배치는 부모 책임. `ord`는 사용자가 입력한 희망 정렬번호. */
export type MenuPatch = Pick<MenuRow, 'code' | 'name' | 'en' | 'pid' | 'pname' | 'short' | 'lvl' | 'parentId' | 'utypes' | 'use'> & { ord: number };
/** 등록 모달을 "하위 메뉴 등록"으로 열 때 미리 채우는 값(우클릭 메뉴) */
export type MenuPreset = { lvl: MenuLevel; parentId: string | null };

const F: Record<string, FieldSpec> = {
  code: { key: 'code', label: '메뉴ID', control: 'text', required: true },
  codeRo: { key: 'code', label: '메뉴ID', control: 'readonly' },
  name: { key: 'name', label: '메뉴명', control: 'text', required: true },
  en: { key: 'en', label: '메뉴명(영문)', control: 'text' },
  pid: { key: 'pid', label: '프로그램ID', control: 'readonly' },
  short: { key: 'short', label: '단축번호', control: 'number' },
  shortRo: { key: 'short', label: '단축번호', control: 'readonly' },
  lvl: { key: 'lvl', label: '메뉴 레벨', control: 'select', options: ['1', '2', '3'], required: true },
  ord: { key: 'ord', label: '정렬', control: 'number', required: true },
  use: { key: 'use', label: '사용여부', control: 'switch', options: ['여', '부'] },
};

/* RowFormModal `Field` 규격 로컬 복제(공유 export 아님). plain=<div> 래퍼(버튼을 품은 복합 컨트롤·radio·checkbox 그룹). */
const labelStyle: React.CSSProperties = { fontSize: 12, marginBottom: 5 };
function Field({ label, children, errMsg, className, plain, hint }: { label: string; children: React.ReactNode; errMsg?: string; className?: string; plain?: boolean; hint?: string }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className={`block mb-3.5 ${className ?? ''}`}>
      <span className="font-semibold text-caption block" style={labelStyle}>{label}</span>
      {children}
      {hint && !errMsg && <span className="text-caption block mt-1" style={{ fontSize: 11.5 }}>{hint}</span>}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 11.5 }}>{errMsg}</span>}
    </Wrap>
  );
}

/* ── 프로그램 검색 팝업(중첩 Dialog) — 프로그램ID·프로그램명 부분일치 + 라디오 선택 + 확인(목업 #m-pidsearch) ── */
function ProgramSearchDialog({ programs, onPick, onClose }: { programs: readonly Program[]; onPick: (p: Program) => void; onClose: () => void }) {
  const [qid, setQid] = React.useState('');
  const [qname, setQname] = React.useState('');
  const [pick, setPick] = React.useState<string>('');
  const list = React.useMemo(() => {
    const a = qid.trim().toLowerCase(), b = qname.trim().toLowerCase();
    return programs.filter((p) => (!a || p.pid.toLowerCase().includes(a)) && (!b || p.pname.toLowerCase().includes(b)));
  }, [programs, qid, qname]);
  const confirm = () => {
    const p = programs.find((x) => x.pid === pick);
    if (!p) { toast.error('프로그램을 선택해 주세요.'); return; }
    onPick(p);
  };
  const th: React.CSSProperties = { position: 'sticky', top: 0, background: 'var(--grid-header)', color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 700, textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)' };
  const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid var(--border)', fontSize: 13 };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[640px] max-h-[80vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>프로그램 검색</DialogTitle>
          <DialogDescription className="sr-only">프로그램ID 또는 프로그램명으로 검색해 메뉴에 매핑할 프로그램을 선택</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="프로그램ID"><SchemaField field={{ key: 'qid', label: '프로그램ID', control: 'text' }} value={qid} onChange={setQid} /></Field>
            <Field label="프로그램명"><SchemaField field={{ key: 'qname', label: '프로그램명', control: 'text' }} value={qname} onChange={setQname} /></Field>
          </div>
          {/* 결과 표 — 라디오로 1건 선택(키보드 화살표 이동은 네이티브). 행 클릭도 선택 */}
          <div className="rounded-[9px] border border-border overflow-auto" style={{ maxHeight: 320 }} role="group" aria-label="프로그램 검색 결과">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup><col style={{ width: 40 }} /><col style={{ width: 150 }} /><col /></colgroup>
              <thead><tr><th style={th}><span className="sr-only">선택</span></th><th style={th}>프로그램ID</th><th style={th}>프로그램명</th></tr></thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: 'var(--muted-foreground)', padding: '26px 0' }}>검색 결과가 없습니다.</td></tr>}
                {list.map((p) => (
                  <tr key={p.pid} onClick={() => setPick(p.pid)} className="cursor-pointer" style={pick === p.pid ? { background: 'var(--row-selected)' } : undefined}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <input type="radio" name="pg-pick" value={p.pid} checked={pick === p.pid} onChange={() => setPick(p.pid)} aria-label={`${p.pid} ${p.pname}`} style={{ accentColor: 'var(--primary)', width: 16, height: 16, margin: 0 }} />
                    </td>
                    <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}><MT>{p.pid}</MT></td>
                    <td style={{ ...td, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><MT>{p.pname}</MT></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-caption m-0 mt-2" style={{ fontSize: 12, lineHeight: 1.5 }}>프로그램ID가 있는 메뉴(실제 프로그램)만 단축번호를 설정할 수 있습니다. 행을 선택하고 [확인]을 누르세요.</p>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={confirm}>확인</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────────────────
   모달 본체
────────────────────────────── */
type V = { code: string; name: string; en: string; pid: string; pname: string; short: string; lvl: '' | '1' | '2' | '3'; parentId: string; ord: string; utypes: UType[]; use: '여' | '부' };

export function MenuFormModal({ mode, initial, preset, rows, programs, onSave, onClose, onDelete }: {
  mode: 'create' | 'edit';
  initial?: MenuRow;
  preset?: MenuPreset;
  rows: readonly MenuRow[];       // 전체 메뉴(상위 후보·중복 검사용)
  programs: readonly Program[];   // 프로그램 카탈로그
  onSave: (patch: MenuPatch) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [v, setV] = React.useState<V>(() => initial
    ? { code: initial.code, name: initial.name, en: initial.en, pid: initial.pid, pname: initial.pname, short: initial.short, lvl: String(initial.lvl) as V['lvl'], parentId: initial.parentId ?? '', ord: String(initial.ord), utypes: [...initial.utypes], use: initial.use ? '여' : '부' }
    : { code: '', name: '', en: '', pid: '', pname: '', short: '', lvl: preset ? (String(preset.lvl) as V['lvl']) : '', parentId: preset?.parentId ?? '', ord: '', utypes: [], use: '여' });
  const [errKey, setErrKey] = React.useState('');
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [pgOpen, setPgOpen] = React.useState(false);
  const set = <K extends keyof V>(k: K, val: V[K]) => { setV((p) => ({ ...p, [k]: val })); if (errKey === k) setErrKey(''); };

  /* 레벨 변경 → 상위메뉴 초기화(후보 집합이 바뀜). 레벨1 → 프로그램·단축번호 해제(목업 syncPidLevel) */
  const setLvl = (lvl: string) => {
    setV((p) => ({ ...p, lvl: lvl as V['lvl'], parentId: '', ...(lvl === '1' ? { pid: '', pname: '', short: '' } : {}) }));
    if (errKey === 'lvl' || errKey === 'parentId') setErrKey('');
  };
  const isTop = v.lvl === '1';
  /* 하위 메뉴가 있는 행은 레벨을 바꿀 수 없다 — 바꾸면 자식이 부모보다 두 단계 아래(또는 같은 레벨)가 되어 트리 불변식이 깨진다(Codex P1) */
  const lvlLocked = mode === 'edit' && !!initial && hasChildren(rows, initial.id);
  const parentCandidates = React.useMemo(() => {
    if (!v.lvl || isTop) return [] as MenuRow[];
    const plvl = (Number(v.lvl) - 1) as MenuLevel;
    return rows.filter((r) => r.lvl === plvl && r.id !== initial?.id);
  }, [rows, v.lvl, isTop, initial?.id]);
  /* 상위메뉴 select — 옵션은 이름, 값은 id. 동명이 있을 수 있어 `이름 (메뉴ID)` 로 표기 */
  const parentLabel = (r: MenuRow) => `${r.name} (${r.code})`;
  const parentField: FieldSpec = React.useMemo(() => ({ key: 'parentId', label: '상위메뉴', control: 'select', options: ['선택해 주세요', ...parentCandidates.map(parentLabel)], required: !isTop && !!v.lvl }), [parentCandidates, isTop, v.lvl]);
  const parentValue = parentCandidates.find((r) => r.id === v.parentId);
  const setParent = (label: string) => { const r = parentCandidates.find((x) => parentLabel(x) === label); set('parentId', r?.id ?? ''); };

  const shortDup = (val: string) => rows.some((r) => r.id !== initial?.id && r.short !== '' && r.short === val);
  const checkShort = () => {
    const s = v.short.replace(/[^\d]/g, '');
    if (!s) { toast.error('단축번호를 입력해 주세요.'); return; }
    toast[shortDup(s) ? 'error' : 'success'](shortDup(s) ? '이미 사용 중인 단축번호입니다.' : '사용 가능한 단축번호입니다.');
  };
  const toggleUtype = (u: UType) => set('utypes', v.utypes.includes(u) ? v.utypes.filter((x) => x !== u) : [...v.utypes, u]);

  const submit = () => {
    const code = v.code.trim(), name = v.name.trim(), ord = v.ord.replace(/[^\d]/g, '');
    if (!code) { setErrKey('code'); return; }
    if (mode === 'create' && rows.some((r) => r.code === code)) { setErrKey('codeDup'); return; }
    if (!name) { setErrKey('name'); return; }
    if (!v.lvl) { setErrKey('lvl'); return; }
    if (!isTop && !v.parentId) { setErrKey('parentId'); return; }
    if (!ord) { setErrKey('ord'); return; }
    const short = v.pid ? v.short.replace(/[^\d]/g, '') : '';
    if (short && shortDup(short)) { setErrKey('shortDup'); return; }
    if (v.pid && pidTakenBy(rows, v.pid, initial?.id)) { setErrKey('pidDup'); return; }   // 한 프로그램은 한 메뉴에만
    onSave({ code, name, en: v.en.trim(), pid: v.pid, pname: v.pname, short, lvl: Number(v.lvl) as MenuLevel, parentId: isTop ? null : v.parentId, ord: Number(ord), utypes: [...v.utypes], use: v.use === '여' });
  };

  const title = mode === 'create' ? '메뉴 등록' : '메뉴 수정';
  const err = (k: string, msg: string) => (errKey === k ? msg : undefined);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title} 양식</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5">
            <Field label="메뉴ID *" errMsg={err('code', '메뉴ID을(를) 입력하세요.') ?? err('codeDup', '이미 사용 중인 메뉴ID입니다.')}>
              <SchemaField field={mode === 'edit' ? F.codeRo : F.code} value={v.code} onChange={(x) => { set('code', x); if (errKey === 'codeDup') setErrKey(''); }} invalid={errKey === 'code' || errKey === 'codeDup'} />
            </Field>
            <Field label="메뉴명 *" errMsg={err('name', '메뉴명을(를) 입력하세요.')}>
              <SchemaField field={F.name} value={v.name} onChange={(x) => set('name', x)} invalid={errKey === 'name'} />
            </Field>
            <Field label="메뉴명(영문)">
              <SchemaField field={F.en} value={v.en} onChange={(x) => set('en', x)} />
            </Field>

            {/* 프로그램ID — 직접 입력 없이 검색 팝업으로 선택. 레벨1(대분류)은 지정 불가. plain div(버튼 동거 — web-a11y 함정 B) */}
            <Field label="프로그램ID" plain hint={isTop ? '대분류는 프로그램을 지정할 수 없습니다.' : '프로그램 검색으로 선택합니다.'} errMsg={err('pidDup', '이미 다른 메뉴에 연결된 프로그램입니다.')}>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={{ minWidth: 0, flex: '1 1 160px' }}>
                  <SchemaField field={F.pid} value={v.pid ? `${v.pid} · ${v.pname}` : ''} onChange={() => undefined} fill />
                </div>
                <Button variant="outline" size="sm" leadingIcon="search" disabled={isTop} onClick={() => setPgOpen(true)}>프로그램 검색</Button>
                {v.pid && <Button variant="ghost" size="sm" onClick={() => { setV((p) => ({ ...p, pid: '', pname: '', short: '' })); if (errKey === 'pidDup') setErrKey(''); }}>해제</Button>}
              </div>
            </Field>

            {/* 단축번호 — 프로그램ID가 있을 때만 입력 가능 + 중복확인(목업 syncShort/shortDup) */}
            <Field label="단축번호" plain hint={v.pid ? '같은 번호는 한 메뉴에만 지정할 수 있습니다.' : '프로그램ID 지정 시에만 입력 가능'} errMsg={err('shortDup', '이미 사용 중인 단축번호입니다.')}>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={{ minWidth: 0, flex: '1 1 140px' }}>
                  {v.pid
                    ? <SchemaField field={F.short} value={v.short} onChange={(x) => { set('short', x.replace(/[^\d]/g, '')); if (errKey === 'shortDup') setErrKey(''); }} invalid={errKey === 'shortDup'} fill />
                    : <SchemaField field={F.shortRo} value="" onChange={() => undefined} fill />}
                </div>
                <Button variant="outline" size="sm" disabled={!v.pid} onClick={checkShort}>중복확인</Button>
              </div>
            </Field>

            <Field label="메뉴 레벨 *" errMsg={err('lvl', '메뉴 레벨을(를) 선택하세요.')} hint={lvlLocked ? '하위 메뉴가 있어 레벨을 바꿀 수 없습니다.' : undefined}>
              {lvlLocked
                ? <SchemaField field={{ key: 'lvl', label: '메뉴 레벨', control: 'readonly' }} value={v.lvl} onChange={() => undefined} />
                : <SchemaField field={{ ...F.lvl, options: ['선택해 주세요', ...F.lvl.options!] }} value={v.lvl || '선택해 주세요'} onChange={(x) => setLvl(x === '선택해 주세요' ? '' : x)} invalid={errKey === 'lvl'} />}
            </Field>
            <Field label={isTop ? '상위메뉴' : '상위메뉴 *'} errMsg={err('parentId', '상위메뉴를 선택하세요.')}
              hint={isTop ? '대분류(레벨1)는 상위메뉴가 없습니다.' : !v.lvl ? '메뉴 레벨을 먼저 선택하세요.' : undefined}>
              {isTop || !v.lvl
                ? <SchemaField field={{ key: 'parentId', label: '상위메뉴', control: 'readonly' }} value="" onChange={() => undefined} />
                : <SchemaField field={parentField} value={parentValue ? parentLabel(parentValue) : '선택해 주세요'} onChange={setParent} invalid={errKey === 'parentId'} />}
            </Field>

            <Field label="정렬 *" hint="같은 레벨 내 정렬 순서 — 번호가 겹치면 이후 순서가 자동 조정됩니다." errMsg={err('ord', '정렬을(를) 입력하세요.')}>
              <SchemaField field={F.ord} value={v.ord} onChange={(x) => set('ord', x)} invalid={errKey === 'ord'} />
            </Field>

            {/* 사용자 구분 — 복수 선택 체크박스 그룹(목업 chkgrp). 미선택 = 전체 공통 메뉴 */}
            <Field label="사용자 구분" plain hint="이 메뉴를 노출할 사용자 유형입니다(복수 선택 가능). 미선택 시 전체 공통 메뉴로 취급합니다.">
              <div role="group" aria-label="사용자 구분" className="flex items-center gap-4 flex-wrap" style={{ minHeight: 34 }}>
                {UTYPES.map((u) => (
                  <label key={u} className="inline-flex items-center gap-1.5 cursor-pointer" style={{ fontSize: 14 }}>
                    <input type="checkbox" checked={v.utypes.includes(u)} onChange={() => toggleUtype(u)} style={{ accentColor: 'var(--primary)', width: 16, height: 16, margin: 0 }} />
                    {u}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="사용여부" plain>
              <SchemaField field={F.use} value={v.use} onChange={(x) => set('use', x as V['use'])} />
            </Field>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div>
            {mode === 'edit' && onDelete && (
              confirmDel
                ? <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={onDelete}>삭제 확인</Button>
                : <Button variant="ghost" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDel(true)}>삭제</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
            <Button variant="primary" size="sm" leadingIcon="check" onClick={submit}>저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {pgOpen && (
        <ProgramSearchDialog programs={programs} onClose={() => setPgOpen(false)}
          onPick={(p) => { setV((x) => ({ ...x, pid: p.pid, pname: p.pname })); if (errKey === 'pidDup') setErrKey(''); setPgOpen(false); }} />
      )}
    </Dialog>
  );
}
