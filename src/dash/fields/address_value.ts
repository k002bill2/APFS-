/* 주소 필드(control:'address')의 값 계약 SSOT — 파싱/직렬화만 담당하는 순수 모듈.
 *
 * 값은 **단일 문자열** "(12345) 서울특별시 …" 이다. 스키마·buildRow·엑셀·필터가 모두 raw 문자열을
 * 그대로 흘리므로(build_row.ts의 `...vals` 전개) 객체/배열을 emit하면 무음으로 깨진다 — 기존
 * 복합 컨트롤(tags=JSON 문자열, filepond=CSV)과 같은 원칙이다. 표기 자체도 기존 읽기전용 데이터
 * (gp_spec_modal '(41585) 대구광역시 …', company_profile_data)와 동일해 마이그레이션이 필요 없다.
 *
 * ⚠️ UI(.tsx)가 아니라 .ts 에 두는 이유: 이 저장소의 vitest 에는 jsdom/@testing-library 가 없어
 *    렌더 테스트를 못 한다. 로직을 순수 모듈로 분리해야 UI 없이 검증된다(safeUrl.ts·file_names.ts 선례).
 */

/** "(12345) 본문" 형태. 우편번호는 신 5자리(zonecode)만 인정한다 — 구 6자리 체계는 쓰지 않는다.
 *  구분자 공백을 `\s*`(탐욕)가 아니라 ` ?`(정확히 1칸)로 두는 이유: 본문 input 이 제어형이라
 *  parse→format 왕복이 매 타이핑마다 돈다. `\s*`면 사용자가 본문 앞에 스페이스를 칠 때마다
 *  구분자가 삼켜 입력이 먹통이 된다. 1칸만 소비하면 왕복이 항상 항등(identity)이다. */
const ADDRESS_RE = /^\((\d{5})\) ?([\s\S]*)$/;

export type AddressValue = {
  /** 우편번호 5자리. 형식에 맞지 않으면 ''(레거시 평문 값). */
  zonecode: string;
  /** 주소 본문 — 도로명/지번 + 사용자가 이어 쓴 상세주소. */
  address: string;
};

/* 레거시 평문("서울시 …", 우편번호 없음)은 전체를 본문으로 받아 graceful fallback 한다.
   그래야 기존 행을 열었을 때 값이 사라지지 않고, 사용자가 검색 버튼으로 우편번호만 덧붙일 수 있다. */
export function parseAddress(raw: string | undefined | null): AddressValue {
  const s = raw ?? '';
  const m = ADDRESS_RE.exec(s);
  if (!m) return { zonecode: '', address: s };
  return { zonecode: m[1], address: m[2] };
}

/* ⚠️ 어떤 경우에도 trim 하지 않는다. 본문 input 이 제어형이라 타이핑마다
   parse → 편집 → format → parse 왕복을 도는데, 여기서 공백을 깎으면
   (a) 단어 사이 스페이스를 칠 수 없고 (b) 한글 IME 조합 중 자모가 끊긴다.
   우편번호가 없으면 접두 "(…)" 를 붙이지 않는다 — 레거시 평문 값을 그대로 보존. */
export function formatAddress(v: AddressValue): string {
  if (!v.zonecode) return v.address;
  // 본문이 비어도 접두는 남긴다: 검색으로 우편번호만 받은 직후 상태가 유실되면 안 된다.
  return v.address ? `(${v.zonecode}) ${v.address}` : `(${v.zonecode}) `;
}

/* 필수 검증용 "비어 있음" 판정 — 원시 문자열 `.trim()` 으로 보면 안 된다.
   formatAddress 는 본문이 비어도 접두를 남기므로 `"(06236) "` 가 trim 후에도 비어 있지 않아
   **주소 본문 없이 저장되는 false-pass** 가 생긴다(richtext 의 빈 문서 false-pass 와 같은 계열).
   판정 정본을 값 계약이 있는 이 모듈에 두고 컨트롤·RowFormModal 이 공유한다. */
export function isAddressEmpty(raw: string | undefined | null): boolean {
  return !parseAddress(raw).address.trim();
}

/* 재검색 시 사용자가 이어 쓴 상세주소(층·호)를 보존하기 위한 꼬리 추출.
   본문에는 검색으로 얻은 기본주소와 사용자가 직접 친 상세주소가 구분자 없이 한 문자열로 섞여 있다
   → 새 검색 결과의 후보(도로명·지번·건물명 포함형)로 **접두 일치**를 보고 남는 뒷부분만 꼬리로 인정한다.
   일치 후보가 없으면(= 아예 다른 주소를 고른 것) 꼬리는 없다 — 그때는 교체가 맞는 동작이다.
   가장 긴 일치를 쓰는 이유: "…25" 와 "…25 (○○빌딩)" 이 동시에 후보일 때 짧은 쪽을 고르면
   건물명이 꼬리로 남아 새 본문과 중복된다.

   ⚠️ **토큰 경계가 없으면 주소가 조용히 뒤바뀐다**(2026-09-17 리뷰 확정 결함). 문자 단위
   `startsWith` 만 보면 "테헤란로 12" 가 "테헤란로 123" 의 접두라서 꼬리 "3" 이 되붙고,
   결과가 "(새 우편번호) 테헤란로 123" — 사용자가 고른 적 없는 번지에 남의 우편번호가 붙는다.
   그래서 **기본주소 바로 뒤가 문자열 끝이거나 구분문자(공백·쉼표·여는 괄호)** 일 때만 꼬리로 본다.
   번지 하이픈("12" vs "12-3")도 같은 이유로 거부 대상이다 — 상세주소는 하이픈으로 시작하지 않는다. */
const TAIL_BOUNDARY = /^[\s,(]/;

export function detailTail(prevAddress: string, candidates: string[]): string {
  const prev = prevAddress ?? '';
  let best = '';
  for (const c of candidates) {
    const base = (c ?? '').trim();
    if (!base || !prev.startsWith(base)) continue;
    const rest = prev.slice(base.length);
    if (rest && !TAIL_BOUNDARY.test(rest)) continue;   // 번지·한글이 이어짐 = 다른 주소다
    if (base.length > best.length) best = base;
  }
  return best ? prev.slice(best.length) : '';
}
