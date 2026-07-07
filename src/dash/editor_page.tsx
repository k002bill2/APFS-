/* 문서 에디터 페이지 — platejs.org/editors 풀셋(유료 제외) 에디터를 모달 없이 빈 페이지 캔버스에 올린다.
   에디터 본체는 폼 모달에서 쓰는 RichTextField(Plate v53)를 그대로 재사용한다. RichTextField는
   DndProvider를 DndPlugin.render.aboveSlate로 내부 공급하는 self-contained 블랙박스라 소비처가
   Provider를 챙길 필요가 없다. 폼필드 규격(min/max-height)만 `.apfs-editor-page` 래퍼 스코프의
   CSS로 문서 캔버스 규격으로 재정의한다(폼 모달 사용처엔 무영향). RichTextField는 비제어라
   value는 마운트 시 1회만 시드로 읽히고 이후엔 onChange로만 흐른다(되먹임 루프 없음). */
import React from 'react';
import { Shell } from './shell';
import { UI } from './components';
import { RichTextField } from './fields/RichTextField';

const { useState } = React;
const { PageHeader } = Shell;
const { Button } = UI;

// 시드 문서(HTML) — '['로 시작하지 않으므로 toInitialValue가 html.deserialize로 파싱한다.
// 빈 페이지가 열리자마자 에디터의 서식·위계·기능을 한눈에 보여주는 소개 문서(공식 Playground 대응).
// 표준 태그(제목·마크·링크·목록·인용·코드·표·구분선)는 HTML로 안정 복원되고,
// 콜아웃·토글·다단·수식 등 커스텀 노드는 "+ 삽입" 메뉴로 넣도록 본문에서 안내한다.
const SEED = `
<h1>문서 에디터에 오신 것을 환영합니다</h1>
<p>Slate와 React로 만든 <a href="https://platejs.org">Plate</a> 기반의 리치 텍스트 에디터입니다. 상단 툴바로 서식을 지정하거나, <strong>마크다운 단축</strong>을 그대로 입력해 보세요. 슬래시(<code>/</code>)로 블록을 삽입하고, 텍스트를 선택하면 <em>플로팅 툴바</em>가 나타납니다.</p>
<h2>서식 편집</h2>
<p>본문에 <strong>굵게</strong>, <em>기울임</em>, <u>밑줄</u>, <s>취소선</s>, <code>인라인 코드</code>, <mark>형광펜</mark> 같은 마크를 적용할 수 있습니다. 글자 크기·색·서체, 정렬과 줄 간격도 조절됩니다.</p>
<h3>목록</h3>
<ul>
<li>글머리 기호 목록</li>
<li>중첩과 들여쓰기 지원
<ul><li>하위 항목</li></ul>
</li>
</ul>
<ol>
<li>번호 목록</li>
<li>체크리스트·토글 목록은 <strong>Turn-into</strong>/<strong>+ 삽입</strong> 메뉴에서</li>
</ol>
<h3>인용과 코드</h3>
<blockquote>블록 왼쪽 핸들을 잡아 순서를 바꾸고, 우클릭으로 복사·복제·삭제할 수 있습니다.</blockquote>
<pre><code>function hello() {
  console.log("Plate editor");
}</code></pre>
<h3>표</h3>
<table>
<tr><td><strong>기능</strong></td><td><strong>단축</strong></td></tr>
<tr><td>제목</td><td># 공백</td></tr>
<tr><td>인용</td><td>&gt; 공백</td></tr>
</table>
<h2>더 많은 블록</h2>
<p><strong>+ 삽입</strong> 메뉴로 표·콜아웃·2단 레이아웃·토글·날짜·수식·태그·이미지·동영상·파일 첨부·구분선을 넣을 수 있습니다. 멘션은 <code>@</code>, 이모지는 <code>:</code>로 불러옵니다.</p>
<hr>
<p></p>
`.trim();

function EditorPage({ onNav }: { onNav?: (route: string) => void }) {
  // 비제어 에디터라 doc은 저장/내보내기용 최신 스냅샷일 뿐, 에디터에 되먹이지 않는다.
  const [doc, setDoc] = useState<string>(SEED);

  return (
    <div
      className="apfs-editor-page max-w-[1180px] mx-auto"
      style={{ animation: 'dashFade .35s var(--ease) both' }}><PageHeader
        crumbs={['홈', '문서 에디터']}
        title="문서 에디터"
        sub="Plate 리치 텍스트 에디터 — 모달 없이 전체 화면 편집"
        actions={onNav && <Button
            variant="outline"
            size="sm"
            leadingIcon="chevron-left"
            onClick={() => onNav('main')}>메인으로</Button>} />
      <RichTextField value={doc} onChange={setDoc} label="문서 본문" />
    </div>
  );
}

export const Pages = { EditorPage };
