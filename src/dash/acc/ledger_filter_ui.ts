/* 장부조회(ACC-009~014) 플래그 적용 칩 공용 조각 — 여러 화면이 같은 칩 문구를 쓰게(병렬 구현 드리프트 방지).
   - flagChips: 플래그(미결재포함·모든계정포함·결산전표포함) 적용 칩 — 값만 보이므로 값 자체가 뜻을 담게('미결재 포함'), 기본값과 같으면 칩 없음.
   필터 칸은 공용 filter_panel(칩 줄 위 인라인 패널 — 2026-11-17 상세필터 드로어 폐기, apfs-detail-filter)이 그린다 —
   드로어 시절 이 파일에 있던 칸 조각(라벨 래퍼·일자·일자 범위·체크 플래그)은 PanelPeriod·PanelRange·PanelCheck 로 대체돼 지웠다.
   플래그 칸은 체크박스(PanelCheck) — 2026-11-03 사용자 지시 '~포함 필터는 전부 체크박스'(여/부 셀렉트 FlagSelect 는 폐기 — 다시 만들지 않는다).
   필수 조건(기간·기준일) 칩은 onClear 를 넘기지 않는다(설계서: 필수라 ✕ 없음). */
import type { AppliedFilter } from '../applied_filters';
import type { LedgerCond } from './ledger/ledger_model';

type FlagKey = 'includeUnapproved' | 'includeAll' | 'includeClosing';
const FLAG_TEXT: Record<FlagKey, { label: string; on: string; off: string }> = {
  includeUnapproved: { label: '미결재포함', on: '미결재 포함', off: '미결재 제외' },
  includeAll: { label: '모든계정포함', on: '모든계정 포함', off: '잔액 계정만' },
  includeClosing: { label: '결산전표포함', on: '결산전표 포함', off: '결산전표 제외' },
};

/** 플래그 적용 칩 — 순서 = 넘긴 keys 순서. 선택형 조건이라 기본값이면 칩을 띄우지 않고(초기 진입 = 칩 없음),
    사용자가 바꿔 적용했을 때만 표시 · ×(→ 기본값 복원). 2026-11-02 사용자 지시(재무상태표). */
export function flagChips(cond: LedgerCond, defaults: LedgerCond, set: (patch: Partial<LedgerCond>) => void,
  keys: readonly FlagKey[] = ['includeUnapproved', 'includeAll', 'includeClosing']): AppliedFilter[] {
  return keys.filter((k) => cond[k] !== defaults[k]).map((k) => {
    const t = FLAG_TEXT[k];
    return { label: t.label, value: cond[k] ? t.on : t.off, onClear: () => set({ [k]: defaults[k] }) };
  });
}
