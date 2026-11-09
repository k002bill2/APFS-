/* 자펀드보고양식관리(운용사ERP)(ADM-012) — 모달 묶음(등록·수정·새 버전 등록·삭제 확인·버전 이력). 페이지가 modal 상태 하나로 고른다.
   - 등록/수정 = RowFormModal + FORM_SCHEMA(목업 openForm 단일 폼 2모드). 수정 모달 안 [삭제] → 삭제 확인(report_form_manage 관례),
     푸터 왼쪽 [새 버전 등록](footerStart) → 같은 행의 새 버전 등록(우클릭 메뉴와 같은 동작 — 키보드 경로).
   - 새 버전 등록 = RowFormModal + VERSION_SCHEMA(목업 openNewVersion). 현재 버전은 읽기 칸, 설명은 현재 설명 프리필,
     저장 버튼 라벨 '새 버전으로 등록'(saveLabel — 목업 그대로).
   - 삭제 확인 = Radix AlertDialog(Cancel 기본 포커스 내장 — 목업 alertdialog 의 '취소' 기본 포커스).
   - 버전 이력 = 공유 ReportGuideHistoryModal(SRP-007 과 같은 팝업). versions 는 이 화면 state 라 새 버전 등록이 바로 보인다. */
import { UI } from '../../components';
import { RowFormModal } from '../../generic_list_modal';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../ui/alert-dialog';
import { ReportGuideHistoryModal } from '../../report_guide_history_modal';
import { FORM_SCHEMA, VERSION_SCHEMA } from './sfund_report_form_schemas';
import { currentVersionSummary } from './sfund_report_form_model';
import type { SfundReportForm, FormInput, VersionInput } from './sfund_report_form_model';

const { Button } = UI;

export type ModalState =
  | null
  | { kind: 'create' }
  | { kind: 'edit'; id: string }
  | { kind: 'version'; id: string }
  | { kind: 'delete'; id: string }
  | { kind: 'history'; id: string };

/* RowFormModal 은 buildRow 로 조립한 Row 를 넘긴다 — 폼 키만 꺼낸다(골드 report_form_manage 의 str(f.x) 관례) */
const str = (v: unknown) => String(v ?? '').trim();
const toForm = (f: any): FormInput => ({ title: str(f.title), desc: str(f.desc), file: str(f.file) });
const toVersion = (f: any): VersionInput => ({ ver: str(f.ver), desc: str(f.desc), file: str(f.file) });

export function SfundReportFormModals({ modal, target, setModal, onCreate, onEdit, onVersion, onDelete, onDownload }: {
  modal: ModalState;
  target: SfundReportForm | null;   // create 외 모드의 대상 행(없으면 그 모달은 열리지 않는다)
  setModal: (m: ModalState) => void;
  onCreate: (v: FormInput) => void;
  onEdit: (id: string, v: FormInput) => void;
  onVersion: (id: string, v: VersionInput) => void;
  onDelete: (id: string) => void;
  onDownload: (file: string) => void;
}) {
  const close = () => setModal(null);
  if (modal?.kind === 'create') {
    return <RowFormModal key="create" mode="create" schema={FORM_SCHEMA} title="양식 등록" onSave={(f) => onCreate(toForm(f))} onClose={close} />;
  }
  if (!modal || !target) return null;
  if (modal.kind === 'edit') {
    return (
      <RowFormModal key={`edit-${target.id}`} mode="edit" schema={FORM_SCHEMA} title="양식 수정"
        initial={{ id: target.id, title: target.title, desc: target.desc, file: target.file } as any}
        onSave={(f) => onEdit(target.id, toForm(f))} onClose={close}
        onDelete={() => setModal({ kind: 'delete', id: target.id })}
        /* 키보드 진입 경로(셀 Enter → 수정 모달 → 이 버튼). 수정 모달을 닫고 같은 행의 새 버전 등록을 연다 — 입력 중이던 수정은 버린다 */
        footerStart={<Button variant="outline" size="sm" leadingIcon="layers" onClick={() => setModal({ kind: 'version', id: target.id })}>새 버전 등록</Button>} />
    );
  }
  if (modal.kind === 'version') {
    /* mode="create" — 빈 새 버전명·새 파일로 시작한다. initial 은 읽기 칸 값과 설명 프리필만. 저장 라벨 = 목업 '새 버전으로 등록'
       key 필수 — 수정 모달의 [새 버전 등록]에서 넘어오면 같은 자리의 RowFormModal 이 재사용돼 입력 state(useState 초기값)가
       수정 모달 값으로 남는다(2026-11-02 실측: 현재 버전 '—'·첨부칸에 기존 파일). 모달마다 key 로 새로 마운트한다. */
    return (
      <RowFormModal key={`version-${target.id}`} mode="create" schema={VERSION_SCHEMA} title="새 버전 등록" saveLabel="새 버전으로 등록"
        initial={{ id: target.id, title: target.title, cur: currentVersionSummary(target), desc: target.desc } as any}
        onSave={(f) => onVersion(target.id, toVersion(f))} onClose={close} />
    );
  }
  if (modal.kind === 'history') {
    return <ReportGuideHistoryModal title={target.title} versions={target.versions} onDownload={onDownload} onClose={close} />;
  }
  return <DeleteConfirm target={target} onClose={close} onConfirm={() => onDelete(target.id)} />;
}

/* 삭제 확인 — 목업 문구 그대로. 버전 이력도 함께 사라진다(목업 동일 — 별도 안내 없음) */
function DeleteConfirm({ target, onClose, onConfirm }: { target: SfundReportForm; onClose: () => void; onConfirm: () => void }) {
  return (
    <AlertDialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>양식 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            선택한 보고양식 <b className="text-foreground">{target.title}</b> 을(를) 삭제하시겠습니까?
            <br />삭제 후에는 복구할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }}>삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
