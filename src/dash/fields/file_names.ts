/* 첨부파일 값 계약("a.pdf, b.png" CSV) 공용 파서 — 모달의 DocumentsField와
   리스트 셀의 첨부 칩(schemas/renderers.tsx AttachChips)이 같은 규칙을 쓰도록 SSOT로 분리.
   ⚠ leaf로 유지한다 — 리스트 셀이 import하므로 FilePond/Attachment 같은 무거운 모듈을
     여기에 끌어들이면 DocumentsField의 lazy 분할이 깨진다. */

/** CSV 첨부 값 → 파일명 배열. 공백·빈 항목 제거. */
export const parseFileNames = (v: string): string[] =>
  (v || '').split(',').map((s) => s.trim()).filter(Boolean);

/** 파일명 → 확장자 라벨(대문자). 확장자가 없으면 '파일'. */
export const fileExtLabel = (name: string): string => {
  const ext = name.split('.').pop()?.toUpperCase();
  return ext && ext !== name.toUpperCase() ? ext : '파일';
};
