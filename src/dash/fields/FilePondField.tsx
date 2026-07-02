/* FilePondField — FilePond(v4) / react-filepond(v7) 기반 파일 업로더. 스키마 control: 'filepond'.
   ── 백엔드 없음(프로토타입) ──
   server prop 미지정 → 파일은 브라우저 로컬에만 보관(실제 업로드 안 함). 선택된 파일명만
   onChange로 직렬화("a.pdf, b.png")해 폼 vals(Record<string,string>) 계약에 맞춘다.
   ⚠️ 왕복(round-trip) 불가: value 문자열에서 File 객체를 복원할 수 없으므로(server.load 없음)
      수정 모드 재진입 시 기존 첨부는 다시 채워지지 않는다 — 프로토타입 허용 한계.
   ── 용량 제한 ──
   캡처 범례("총 가능한 Byte 10MByte")에 맞춰 maxTotalFileSize 10MB(+ 단일 10MB). 검증은
   file-validate-size 플러그인이 담당. */
// JSX는 자동 런타임(jsx:'react-jsx')이라 React import 불필요 — 비제어라 useState도 안 쓴다.
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginFileValidateSize from 'filepond-plugin-file-validate-size';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import './filepond.css';

// 플러그인 등록은 모듈 스코프에서 1회(렌더 중 등록 금지 — 매 렌더 재등록 방지).
registerPlugin(FilePondPluginFileValidateSize, FilePondPluginFileValidateType);

// required: 필수 필드 상시 표식 — 드롭 패널 테두리만 danger(is-required, filepond.css).
export function FilePondField({ onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  // ⚠️ 비제어(uncontrolled) — files prop을 React로 제어하지 않는다. FilePond가 내부 파일 목록을 단독 소유.
  //    제어 모드(files={state})에서 onupdatefiles가 넘기는 FilePondFile 객체를 그대로 files prop으로 되먹이면
  //    react-filepond가 이를 유효한 파일 소스로 인식하지 못해 내부 상태를 비운다(DOM엔 항목이 보이나 getFiles()=0
  //    → 드롭/선택이 "안 먹는" 것처럼 보임). 우리 용도는 파일명 캡처뿐이라 onupdatefiles로 읽어 직렬화만 한다.
  return (
    <FilePond
      className={required ? 'is-required' : undefined}
      onupdatefiles={(items) => onChange(items.map((i) => i.file?.name ?? '').filter(Boolean).join(', '))}
      allowMultiple={true}
      maxFiles={10}
      maxFileSize="10MB"
      maxTotalFileSize="10MB"
      credits={false}
      name="files"
      labelIdle='파일을 끌어다 놓거나 <span class="filepond--label-action">찾아보기</span> · 총 10MB'
      labelMaxFileSizeExceeded="파일 용량이 너무 큽니다"
      labelMaxFileSize="최대 파일 크기는 {filesize} 입니다"
      labelMaxTotalFileSizeExceeded="전체 첨부 용량을 초과했습니다"
      labelMaxTotalFileSize="총 가능 용량은 {filesize} 입니다"
      labelFileTypeNotAllowed="허용되지 않는 파일 형식입니다"
      labelFileWaitingForSize="크기 계산 중"
      labelFileLoading="불러오는 중"
      labelFileLoadError="불러오기 오류"
      labelFileProcessing="업로드 중"
      labelFileProcessingComplete="업로드 완료"
      labelFileProcessingAborted="업로드 취소됨"
      labelFileProcessingError="업로드 오류"
      labelFileRemoveError="삭제 오류"
      labelTapToCancel="탭하여 취소"
      labelTapToRetry="탭하여 재시도"
      labelTapToUndo="탭하여 실행취소"
      labelButtonRemoveItem="삭제"
      labelButtonAbortItemLoad="중단"
      labelButtonRetryItemLoad="재시도"
      labelButtonAbortItemProcessing="취소"
      labelButtonUndoItemProcessing="실행취소"
      labelButtonRetryItemProcessing="재시도"
      labelButtonProcessItem="업로드"
    />
  );
}
