import * as React from 'react';
import { InputGroup, InputGroupInput, InputGroupTextarea, InputGroupAddon, InputGroupText, InputGroupButton } from 'apfs-dashboard-offline';
import { Search } from 'lucide-react';

/* InputGroupText — 애드온 안의 텍스트 조각(<span> · text-sm · text-muted-foreground).
   단위(백만원·%·년), 접두 라벨, 하단 메타(작성자·글자수)에 쓴다. 클릭 대상이 아니다. */

const col: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 12, width: 420 };
const cap: React.CSSProperties = { fontSize: 12, color: 'var(--caption)', marginBottom: 6 };

export function Units() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>금액 단위</div>
        <InputGroup>
          <InputGroupInput defaultValue="30,000" aria-label="약정총액" />
          <InputGroupAddon align="inline-end"><InputGroupText>백만원</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>비율 단위</div>
        <InputGroup>
          <InputGroupInput defaultValue="60.0" aria-label="의무투자 비율" />
          <InputGroupAddon align="inline-end"><InputGroupText>%</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>기간 단위</div>
        <InputGroup>
          <InputGroupInput defaultValue="8" aria-label="존속기간" />
          <InputGroupAddon align="inline-end"><InputGroupText>년</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
}

export function PrefixLabels() {
  return (
    <div style={col}>
      <div>
        <div style={cap}>접두 라벨 — 펀드코드</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><InputGroupText>AFF-2026-</InputGroupText></InputGroupAddon>
          <InputGroupInput defaultValue="013" aria-label="펀드 일련번호" />
        </InputGroup>
      </div>
      <div>
        <div style={cap}>접두 + 접미 동시</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><InputGroupText>최소</InputGroupText></InputGroupAddon>
          <InputGroupInput defaultValue="60.0" aria-label="의무투자 비율" />
          <InputGroupAddon align="inline-end"><InputGroupText>% 이상</InputGroupText></InputGroupAddon>
        </InputGroup>
      </div>
      <div>
        <div style={cap}>아이콘 애드온과 나란히</div>
        <InputGroup>
          <InputGroupAddon align="inline-start"><Search /><InputGroupText>운용사</InputGroupText></InputGroupAddon>
          <InputGroupInput placeholder="이름으로 검색" aria-label="운용사 검색" />
        </InputGroup>
      </div>
    </div>
  );
}

export function FooterMeta() {
  return (
    <div style={{ width: 460 }}>
      <div style={cap}>하단 메타 — 글자수 카운터</div>
      <InputGroup>
        <InputGroupTextarea
          aria-label="수시보고 사유"
          defaultValue="대표 운용인력 1인 교체(2026-09-10 이사회 의결)에 따른 중요사항 변경 신고입니다."
        />
        <InputGroupAddon align="block-end">
          <InputGroupText>52 / 500자</InputGroupText>
          <InputGroupButton variant="default" size="sm" className="ml-auto">제출</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
