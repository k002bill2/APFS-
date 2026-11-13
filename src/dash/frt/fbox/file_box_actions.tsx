/* 파일BOX 액션 대화상자 — 업로드(공용 UploadModal) · 삭제 확인(AlertDialog) · 추가·교체(전용 모달).
   전체 화면과 GNB 팝업이 같은 동작을 쓰도록 훅 하나로 묶었다: 호스트는 `dialogs` 를 렌더하고 openUpload·askDelete·openSupplement 만 부른다.
   반영은 file_box_store(두 화면이 같은 목록) — 행 계산은 file_box_model 순수 함수. */
import { useState } from 'react';
import { format } from 'date-fns';
import { UI } from '../../components';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { toast } from '../../ui/sonner';
import { UploadModal } from '../../trust_upload';
import { FILE_HINT, FILE_MAX_SIZE } from './file_box_data';
import { addMyFiles, deleteMyFiles, supplementSub } from './file_box_model';
import { useFileBox, updateFileBox } from './file_box_store';
import { FileBoxSupplementModal } from './file_box_supplement_modal';

const { SaveButton } = UI;

type Dlg = null | { kind: 'upload' } | { kind: 'delete'; ids: string[] } | { kind: 'supplement'; id: string };
const today = () => format(new Date(), 'yyyy-MM-dd');

/** onDeleted — 삭제가 반영된 뒤 호스트가 선택을 비운다 */
export function useFileBoxActions(onDeleted: () => void) {
  const { my, sub } = useFileBox();
  const [dlg, setDlg] = useState<Dlg>(null);
  const close = () => setDlg(null);

  const commitDelete = (ids: string[]) => () => {
    updateFileBox((s) => ({ ...s, my: deleteMyFiles(s.my, ids) }));
    onDeleted();
    close();
    toast.success(`${String(ids.length)}개 파일을 삭제했습니다`);
  };
  const nameOf = (id: string) => my.find((r) => r.id === id)?.name ?? '';
  const supplementRow = dlg?.kind === 'supplement' ? sub.find((r) => r.id === dlg.id) ?? null : null;

  const dialogs = (
    <>
      {dlg?.kind === 'upload' && (
        <UploadModal title="파일 업로드" label="내 파일함에 올릴 파일" hint={FILE_HINT} maxSize={FILE_MAX_SIZE}
          emptyMsg="업로드할 파일을 선택하세요."
          doneMsg={(files) => `${String(files.length)}개 파일을 내 파일함에 올렸습니다`}
          onDone={(files) => updateFileBox((s) => ({ ...s, my: addMyFiles(s.my, files, today(), () => crypto.randomUUID()) }))}
          onClose={close} />
      )}

      {dlg?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDlg((d) => (d?.kind === 'delete' ? null : d)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제</AlertDialogTitle>
              <AlertDialogDescription>
                {dlg.ids.length === 1
                  ? <>파일 <b className="text-foreground">{nameOf(dlg.ids[0])}</b> 을(를) 삭제하시겠습니까?</>
                  : <>선택한 파일 <b className="text-foreground">{dlg.ids.length}개</b>를 삭제하시겠습니까?</>}
                <br />삭제 후에는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="trash" busyLabel="삭제 중" style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }}
                onSubmit={() => commitDelete(dlg.ids)}>삭제</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {supplementRow && (
        <FileBoxSupplementModal row={supplementRow} onClose={close}
          onSave={({ mode, fileName }) => {
            updateFileBox((s) => ({ ...s, sub: supplementSub(s.sub, { id: supplementRow.id, mode, fileName, today: today(), newId: crypto.randomUUID() }) }));
            close();
            toast.success(mode === 'add' ? `보완 파일을 추가했습니다: ${fileName}` : `파일을 교체했습니다: ${fileName}`);
          }} />
      )}
    </>
  );

  return {
    dialogs,
    open: dlg !== null,
    openUpload: () => setDlg({ kind: 'upload' }),
    askDelete: (ids: readonly string[]) => { if (ids.length) setDlg({ kind: 'delete', ids: [...ids] }); },
    openSupplement: (id: string) => setDlg({ kind: 'supplement', id }),
  };
}
