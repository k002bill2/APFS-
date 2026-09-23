/* 수탁보고 > 모태펀드 수탁 업로드 폼 2리프 — 원문이 목록 없이 "파일명(드롭존 + 파일 선택) · [확인]" 만 가진 화면.
   - 계좌정보 관리   = S3_103 계좌정보관리
   - 입출금 정보관리 = S3_105 입출금정보관리(드롭존 안내 문구가 하나 더 있다)
   원문 설계메모 "[대표님과 논의 필요] 목록 조회·이력 관리형으로 재설계할지" 는 설계 메모라 옮기지 않고, 원문 그대로의 폼만 만든다
   (목록·이력을 지어내지 않는다). 파일 처리·전송은 하지 않는다(브리프 규칙 5) — 확인은 원문 토스트로 끝난다.
   바깥 양식은 다른 수탁 화면과 같은 GridFrame(RiskPage) — 검색조건·표가 없어 툴바는 새로고침만, 푸터는 선택 건수. */
import React, { useState } from 'react';
import { UI } from './components';
import { mn } from './mask';
import { toast } from './ui/sonner';
import { RiskPage } from './risk_page_kit';
import { UploadDropzone } from './trust_upload';
import { CASHFLOW_UPLOAD_HINT } from './trust_mother_data';

const { Button } = UI;

interface UploadFormConfig {
  label: string;
  fileLabel: string;
  hint?: string;
  /** 원문 확인 토스트 — 파일 없음 / 처리됨 */
  emptyMsg: string;
  doneMsg: string;
}

function UploadFormPage({ cfg, onNav }: { cfg: UploadFormConfig; onNav?: (r: string) => void }) {
  const [files, setFiles] = useState<string[]>([]);
  const confirm = () => {
    if (!files.length) { toast(cfg.emptyMsg); return; }
    toast.success(cfg.doneMsg);
  };
  return (
    <RiskPage system="수탁보고" group="모태펀드 수탁" label={cfg.label} route={cfg.label} onNav={onNav}
      onReset={() => setFiles([])}
      footerLeft={<span>선택 파일 {mn(String(files.length))}건</span>}>
      {/* <form> 로 감싸지 않는다 — UI.Button 은 type 을 받지 않아(기본 submit) 드롭존의 [파일 선택]까지 제출이 된다 */}
      <div style={{ padding: '18px 18px 20px' }}>
        {/* 원문 `.frow` — 라벨 '파일명' + 드롭존 */}
        <div className="grid gap-3 items-start" style={{ gridTemplateColumns: 'minmax(72px, 120px) minmax(0, 1fr)' }}>
          <span className="font-semibold text-muted-foreground" style={{ fontSize: 14, paddingTop: 8 }}>파일명</span>
          <UploadDropzone files={files} onChange={setFiles} hint={cfg.hint} label={cfg.fileLabel} />
        </div>
        <div className="flex justify-end" style={{ marginTop: 16 }}>
          <Button variant="primary" size="md" onClick={confirm}>확인</Button>
        </div>
      </div>
    </RiskPage>
  );
}

const ACCOUNT: UploadFormConfig = {
  label: '계좌정보 관리', fileLabel: '계좌정보 파일', emptyMsg: '파일을 선택하세요', doneMsg: '등록되었습니다 (목업)',
};
const CASHFLOW: UploadFormConfig = {
  label: '입출금 정보관리', fileLabel: '입출금정보 파일', hint: CASHFLOW_UPLOAD_HINT, emptyMsg: '파일을 먼저 선택하세요', doneMsg: '처리되었습니다 (목업)',
};

/** 계좌정보 관리 — S3_103 */
export function AccountInfoManage({ onNav }: { onNav?: (r: string) => void }) { return <UploadFormPage cfg={ACCOUNT} onNav={onNav} />; }
/** 입출금 정보관리 — S3_105 */
export function CashflowInfoManage({ onNav }: { onNav?: (r: string) => void }) { return <UploadFormPage cfg={CASHFLOW} onNav={onNav} />; }
