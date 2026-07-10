/* safeUrl — URL 스킴 화이트리스트 sanitizer (순수 함수, editor 비의존).
   에디터 노드의 href/src에 사용자·가져오기 유래 URL을 넣기 전 위험 스킴(javascript:/vbscript: 등)을 차단한다.
   Plate의 getLinkAttributes(링크 노드용, allowedSchemes=http/https/mailto/tel)와 동일 정책을 공유하되,
   editor 인스턴스에 의존하지 않아 tag/file 같은 별도 노드에서도 쓰고 단위 테스트가 가능하다.

   ── 왜 싱크별로 정책이 갈리나 ──
   • 'nav'  = 내비게이션 앵커(tag). 클릭 시 이동하므로 실행 가능한 스킴만 위험. data:text/html은 앵커에서 XSS라 차단.
             허용: http, https, mailto, tel + 스킴 없는 상대/앵커(#, /path).
   • 'media'= 이미지·파일·비디오의 src/다운로드. 백엔드가 없어 base64 data: URI가 정식 값(붙여넣기 이미지·첨부 다운로드).
             허용: http, https, mailto, tel, data, blob. → getLinkAttributes를 그대로 쓰면 data:를 벗겨 다운로드/이미지가 깨진다.
   두 정책 모두 javascript:/vbscript:는 차단한다.

   ── 난독화 방어 ──
   브라우저는 스킴을 판정하기 전에 제어문자(0x00–0x1F, 0x7F)를 무시한다(`java\tscript:` → `javascript:`).
   그래서 스킴 판정 전 제어문자를 제거해 우회를 막는다. */

const NAV_SCHEMES = ['http', 'https', 'mailto', 'tel'];
const MEDIA_SCHEMES = ['http', 'https', 'mailto', 'tel', 'data', 'blob'];

export type UrlKind = 'nav' | 'media';

// 브라우저가 스킴 판정 전 무시하는 제어문자(0x00–0x1F, 0x7F). 스킴 추출 전에 제거해 `java\tscript:` 류 난독화를 차단.
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const SCHEME = /^\s*([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/;

/** 위험 스킴을 걸러 안전한 URL만 돌려준다. 차단·빈값이면 undefined(→ 호출부는 링크 없이 렌더). */
export function safeUrl(raw: unknown, kind: UrlKind = 'nav'): string | undefined {
  if (typeof raw !== 'string' || raw === '') return undefined;
  const m = raw.replace(CONTROL_CHARS, '').match(SCHEME);
  if (m) {
    const allowed = kind === 'media' ? MEDIA_SCHEMES : NAV_SCHEMES;
    return allowed.includes(m[1].toLowerCase()) ? raw : undefined;
  }
  // 스킴 없음 = 상대경로/앵커/프로토콜상대(//host) → 실행 스킴이 될 수 없어 안전.
  return raw;
}
