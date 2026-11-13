/* 파일BOX 목록 저장소 — 전체 화면(file_box)과 GNB 사용자 메뉴 팝업(file_box_modal)이 같은 목록을 본다
   (목업 addMyFile 이 renderMy·renderFilePopupMy 를 함께 갱신하던 것과 같다).
   백엔드가 없어 이 모듈이 '서버' 역할을 한다 — 상태는 통째로 새 객체로 바꾸고(불변), 구독자에게 알린다.
   새로고침하면 데모 데이터로 돌아간다(브라우저 저장 없음). */
import { useSyncExternalStore } from 'react';
import { demoMyFiles, demoSubFiles } from './file_box_data';
import type { MyFile, SubFile } from './file_box_data';

export type FileBoxState = Readonly<{ my: readonly MyFile[]; sub: readonly SubFile[] }>;

let state: FileBoxState = { my: demoMyFiles(), sub: demoSubFiles() };
const listeners = new Set<() => void>();

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const snapshot = () => state;

export function useFileBox(): FileBoxState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function updateFileBox(fn: (s: FileBoxState) => FileBoxState): void {
  state = fn(state);
  listeners.forEach((l) => l());
}
