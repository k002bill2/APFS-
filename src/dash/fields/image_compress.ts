/* 이미지 dataURL 압축 유틸 — 백엔드가 없어 base64가 문서에 인라인 저장되므로,
   삽입 전 리사이즈·재인코딩으로 용량을 줄이고 최종 캡을 강제한다(전부 브라우저 네이티브 API). */

export const RAW_MAX_BYTES = 20 * 1024 * 1024;   // 디코드 전 원본 상한 (DoS성 초대형 방어)
export const IMAGE_MAX_BYTES = 1024 * 1024;      // 압축 후 최종 캡 (기존 UPLOAD_MAX_BYTES와 동일 값)

const MAX_EDGE = 1600;   // 긴 변 상한(px) — 초과 시 비율 유지 다운스케일

// base64 4문자 = 3바이트 → 페이로드 길이 * 0.75 근사. 'base64,' 앞의 MIME 헤더는 제외.
export function estimateDataUrlBytes(dataUrl: string): number {
  const marker = 'base64,';
  const i = dataUrl.indexOf(marker);
  const start = i < 0 ? 0 : i + marker.length;
  return Math.floor((dataUrl.length - start) * 0.75);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

// 미지원 브라우저는 요청 type을 무시하고 다른 포맷(보통 PNG)을 반환하므로 blob.type로 지원 여부를 판별한다.
async function canvasToDataUrl(canvas: HTMLCanvasElement, type: string, quality: number): Promise<string | null> {
  const blob = await canvasToBlob(canvas, type, quality);
  if (!blob || blob.type !== type) return null;
  return blobToDataUrl(blob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function compressImageDataUrl(dataUrl: string): Promise<string> {
  // GIF는 재인코딩하면 애니메이션이 파괴되고, SVG는 래스터화되어 벡터 이점을 잃으므로 원본 그대로 둔다(캡은 호출측).
  if (/^data:image\/gif/i.test(dataUrl) || /^data:image\/svg\+xml/i.test(dataUrl)) return dataUrl;
  try {
    const blob = await fetch(dataUrl).then((r) => r.blob());
    const bitmap = await createImageBitmap(blob);
    let width = bitmap.width;
    let height = bitmap.height;
    const longest = Math.max(width, height);
    if (longest > MAX_EDGE) {
      const scale = MAX_EDGE / longest;
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close?.(); return dataUrl; }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    // webp(고압축) 우선, 미지원이면 jpeg 폴백.
    let out = await canvasToDataUrl(canvas, 'image/webp', 0.8);
    if (!out) out = await canvasToDataUrl(canvas, 'image/jpeg', 0.85);
    if (!out) return dataUrl;
    // 이미 최적화된 JPEG를 재인코딩하면 오히려 커질 수 있다 → 원본보다 크면 원본 유지.
    return out.length < dataUrl.length ? out : dataUrl;
  } catch {
    return dataUrl;   // 디코드 실패(손상/미지원 포맷) 시 원본 유지 — 캡은 호출측이 처리.
  }
}
