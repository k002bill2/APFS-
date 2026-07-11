import { describe, it, expect } from 'vitest';
import { safeUrl } from './safeUrl';

describe('safeUrl', () => {
  describe('위험 스킴 차단 (nav·media 공통)', () => {
    const dangerous = [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      '  javascript:alert(1)',        // 선행 공백
      'javascript:alert(1)',    // 제어문자 난독화
      'java\tscript:alert(1)',        // 탭 삽입 난독화
      'java\nscript:alert(1)',        // 개행 삽입 난독화
      'vbscript:msgbox(1)',
    ];
    for (const url of dangerous) {
      it(`nav 차단: ${JSON.stringify(url)}`, () => {
        expect(safeUrl(url, 'nav')).toBeUndefined();
      });
      it(`media 차단: ${JSON.stringify(url)}`, () => {
        expect(safeUrl(url, 'media')).toBeUndefined();
      });
    }
  });

  describe('nav 정책 — 앵커(tag)', () => {
    it('http/https/mailto/tel 허용', () => {
      expect(safeUrl('https://example.com', 'nav')).toBe('https://example.com');
      expect(safeUrl('http://a.b', 'nav')).toBe('http://a.b');
      expect(safeUrl('mailto:a@b.com', 'nav')).toBe('mailto:a@b.com');
      expect(safeUrl('tel:+8210', 'nav')).toBe('tel:+8210');
    });
    it('상대경로/앵커/프로토콜상대 허용', () => {
      expect(safeUrl('/path/to', 'nav')).toBe('/path/to');
      expect(safeUrl('#anchor', 'nav')).toBe('#anchor');
      expect(safeUrl('//cdn.example.com/x', 'nav')).toBe('//cdn.example.com/x');
    });
    it('data:/blob: 는 앵커에선 차단(data:text/html XSS 방지)', () => {
      expect(safeUrl('data:text/html,<script>alert(1)</script>', 'nav')).toBeUndefined();
      expect(safeUrl('blob:https://x/uuid', 'nav')).toBeUndefined();
    });
  });

  describe('media 정책 — 이미지·파일 src (data: 보존이 핵심)', () => {
    it('base64 data: 이미지 허용 (붙여넣기 이미지)', () => {
      const img = 'data:image/png;base64,iVBORw0KGgo=';
      expect(safeUrl(img, 'media')).toBe(img);
    });
    it('data: 첨부/파일 다운로드 허용', () => {
      const file = 'data:application/pdf;base64,JVBERi0=';
      expect(safeUrl(file, 'media')).toBe(file);
    });
    it('blob: 허용', () => {
      expect(safeUrl('blob:https://x/uuid', 'media')).toBe('blob:https://x/uuid');
    });
    it('http/https 허용', () => {
      expect(safeUrl('https://cdn/x.png', 'media')).toBe('https://cdn/x.png');
    });
  });

  describe('경계값', () => {
    it('빈 문자열·비문자열은 undefined', () => {
      expect(safeUrl('', 'nav')).toBeUndefined();
      expect(safeUrl(undefined)).toBeUndefined();
      expect(safeUrl(null)).toBeUndefined();
      expect(safeUrl(123 as unknown)).toBeUndefined();
    });
    it('kind 기본값은 nav', () => {
      expect(safeUrl('data:image/png;base64,x')).toBeUndefined(); // 기본 nav → data 차단
    });
    it('알 수 없는 스킴(ftp 등)은 화이트리스트 밖이라 차단', () => {
      expect(safeUrl('ftp://host/file', 'media')).toBeUndefined();
    });
  });
});
