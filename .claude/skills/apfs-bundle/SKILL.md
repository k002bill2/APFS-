---
name: apfs-bundle
description: "[아카이브] 구 APFS 단일 HTML 번들(omelette/Artifact 포맷)의 gzip+base64 자산을 추출·재인코딩하는 절차. ⚠️ 대상 파일 2종은 커밋 5fb2dfa로 저장소에서 삭제됐다 — 현행 작업에는 쓰지 않는다. git 이력에서 옛 번들을 꺼내 '읽어야' 할 때만 사용하고, 화면 추가·수정은 src/ 의 Vite 소스에서 한다. ARCHIVED: the bundle this describes no longer exists in the tree; use only to read an old bundle out of git history."
---

# APFS 번들 편집 스킬

## ⚠️ 아카이브 전용 (2026-09-14)

> **대상 파일이 저장소에 없다.** `농식품모태펀드 대시보드 (오프라인).html` · `농식품모태펀드 대시보드.html` 2종은
> 커밋 `5fb2dfa`("레거시 오프라인 대시보드 번들 2종 제거")로 삭제됐다.
> 2026-06 Vite 마이그레이션 이후 정본은 `src/dash/*.tsx` 이며, 화면 작업은 전부 그쪽이다.

**쓰는 경우 — 이것뿐이다.** git 이력에 남은 옛 번들을 꺼내 **읽어야** 할 때:

```bash
git show 5fb2dfa^:"농식품모태펀드 대시보드 (오프라인).html" > /tmp/old-bundle.html
```

그 다음 아래 "디코드 레시피"로 내용을 확인한다. 번들 구조·레시피 절은 이 목적을 위해 보존한다.

**쓰지 않는 경우.** 화면 추가·수정, 버그 수정, 디자인 변경 — 전부 `src/`에서 한다(→[[dashboard-ui]]).
번들을 되살려 재인코딩하지 않는다. 재인코딩 레시피는 과거 산출물을 재현해야 할 때만 유효하다.

## (참고) 원래 용도
이 파일은 사람이 직접 읽는 소스가 **아니라** 자가완결 번들이며, 단순 텍스트 검색/치환으로는 거의 수정할 수 없다.

## 번들 구조 (편집 전 필수 이해)
4개의 특수 `<script>` 태그로 구성된다.

| 태그 | 내용 |
|------|------|
| loader (일반 inline `<script>`) | DOMContentLoaded 시 manifest를 풀어 blob URL 생성 후 template 렌더 |
| `<script type="__bundler/manifest">` | `{ uuid: { mime, compressed, data(base64) } }` — 모든 자산. `compressed:true`면 gzip |
| `<script type="__bundler/ext_resources">` | `[{ id, uuid }]` — `window.__resources[id]`로 참조하는 리소스(로고 등) |
| `<script type="__bundler/template">` | JSON 문자열로 escape된 실제 앱 HTML. `<script src="<uuid>">`로 자산 참조 |

렌더 흐름: base64 디코드(+필요시 gzip 해제) → Blob/data: URL → template의 uuid를 blob URL로 치환 → DOMParser 파싱 → `documentElement` 교체 → `<script>` 재생성 실행(React→ReactDOM→Babel 순서 보존), `text/babel`은 `Babel.transformScriptTags()`로 변환.

> blob URL은 `file://`에서 null origin이라 loader가 `integrity`/`crossorigin`을 의도적으로 제거한다(SRI 깨짐 방지). **정상 동작이다.**

## 안전 원칙 (중요)
1. **원본 재생성 우선**: 의미 있는 변경은 번들을 직접 패치하지 말고 원본(omelette/Artifact 소스)에서 다시 내보내는 편이 안전하다. 원본 트리가 이 저장소에 없으면 **소스 위치를 사용자에게 확인**하라.
2. **백업 먼저**: 직접 패치가 불가피하면 작업 전 사본을 만든다.
3. **모듈 로드 순서 보존**: React → ReactDOM → Babel → 앱 모듈. 깨면 화면이 죽는다.
4. **데이터 무결성**: 디코드→수정→재인코드 과정에서 mime/compressed 플래그와 base64 정확성을 유지한다.

## 디코드 레시피 (추출·확인)
```python
import re, json, base64, gzip
f = "농식품모태펀드 대시보드 (오프라인).html"
data = open(f, encoding="utf-8").read()

manifest = json.loads(re.search(
    r'<script type="__bundler/manifest">\s*(.*?)\s*</script>', data, re.S).group(1))

def decode(uuid):
    e = manifest[uuid]; raw = base64.b64decode(e["data"])
    return gzip.decompress(raw) if e.get("compressed") else raw

# 실제 앱 HTML (JSON 문자열로 escape됨)
template = json.loads(re.search(
    r'<script type="__bundler/template">\s*(.*?)\s*</script>', data, re.S).group(1))

# 자산 목록 확인
for uuid, e in manifest.items():
    print(uuid, e["mime"], "gz" if e.get("compressed") else "raw", len(e["data"]))
```

## 재인코딩 레시피 (수정 후 되쓰기)
```python
def encode(content_bytes, compressed=True):
    raw = gzip.compress(content_bytes) if compressed else content_bytes
    return base64.b64encode(raw).decode("ascii")

# 예: 특정 자산 교체
manifest[uuid]["data"] = encode(new_source.encode("utf-8"),
                                compressed=manifest[uuid].get("compressed", False))
new_manifest_json = json.dumps(manifest, ensure_ascii=False)
# data 문자열의 manifest 블록을 new_manifest_json 으로 정확히 치환 후 파일 저장.
# template 을 바꿨다면 json.dumps(template, ensure_ascii=False) 로 다시 escape 하여 치환.
```

## 임베디드 모듈 맵 (자체 작성 앱 모듈)
`window`에 노출하는 `(function(w){…})(window)` 패턴. 핵심:
- `APFS_DATA`(더미 데이터) · 디자인 시스템 · `UI`(공통 래퍼) · `Icon`(lucide 스타일) · SVG 차트 프리미티브
- `Shell`(GNB/LNB/브레드크럼/알림/RBAC/테마) · 메인 대시보드 위젯+3시안 · 투자성과·포트폴리오 서브페이지 · 앱 루트(`#root` 마운트) · Tweaks 토큰 패널 · scaffold 진입점

## 검증
편집 후: (1) Python으로 manifest/template이 다시 정상 파싱되는지, (2) base64 디코드가 깨지지 않는지 확인하고, (3) 최종적으로 `open "농식품모태펀드 대시보드 (오프라인).html"` 로 브라우저에서 렌더/콘솔 오류를 수동 확인한다.
