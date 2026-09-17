import { describe, it, expect } from 'vitest';
import { parseAddress, formatAddress, isAddressEmpty, detailTail } from './address_value';

describe('parseAddress', () => {
  it('"(우편번호) 주소" 를 우편번호와 본문으로 나눈다', () => {
    expect(parseAddress('(06236) 서울특별시 강남구 테헤란로 123')).toEqual({
      zonecode: '06236', address: '서울특별시 강남구 테헤란로 123',
    });
  });

  it('상세주소가 뒤에 이어 붙은 값도 본문으로 통째 보존한다', () => {
    expect(parseAddress('(06236) 서울특별시 강남구 테헤란로 123 (역삼동) 4층 401호')).toEqual({
      zonecode: '06236', address: '서울특별시 강남구 테헤란로 123 (역삼동) 4층 401호',
    });
  });

  // 레거시 평문 — 우편번호 없이 저장된 기존 행(company_profile 류)이 열렸을 때 값이 사라지면 안 된다.
  it('우편번호 없는 평문은 전체를 본문으로 받는다', () => {
    expect(parseAddress('대구광역시 동구 첨단로 39')).toEqual({ zonecode: '', address: '대구광역시 동구 첨단로 39' });
  });

  it('5자리가 아닌 괄호 숫자는 우편번호로 인정하지 않는다(구 6자리 포함)', () => {
    expect(parseAddress('(135-080) 서울시 강남구')).toEqual({ zonecode: '', address: '(135-080) 서울시 강남구' });
    expect(parseAddress('(123456) 서울시 강남구')).toEqual({ zonecode: '', address: '(123456) 서울시 강남구' });
  });

  it('빈 값 / undefined 는 빈 결과', () => {
    expect(parseAddress('')).toEqual({ zonecode: '', address: '' });
    expect(parseAddress(undefined)).toEqual({ zonecode: '', address: '' });
  });
});

describe('formatAddress', () => {
  it('우편번호가 있으면 "(zip) 본문"', () => {
    expect(formatAddress({ zonecode: '06236', address: '서울특별시 강남구 테헤란로 123' }))
      .toBe('(06236) 서울특별시 강남구 테헤란로 123');
  });

  it('우편번호가 없으면 본문만(접두 괄호를 만들지 않는다)', () => {
    expect(formatAddress({ zonecode: '', address: '대구광역시 동구 첨단로 39' })).toBe('대구광역시 동구 첨단로 39');
  });

  it('본문이 비어도 우편번호 접두는 남긴다 — 검색 직후 상태 유실 방지', () => {
    expect(formatAddress({ zonecode: '06236', address: '' })).toBe('(06236) ');
  });

  it('빈 값은 빈 문자열', () => {
    expect(formatAddress({ zonecode: '', address: '' })).toBe('');
  });
});

describe('왕복(round-trip)', () => {
  // 본문 input 이 제어형이라 타이핑 1회마다 parse→format→parse 가 돈다.
  // 여기서 값이 흔들리면 스페이스가 안 먹거나 한글 IME 조합이 끊긴다.
  const cases = [
    '(06236) 서울특별시 강남구 테헤란로 123',
    '(06236) 서울특별시 강남구 테헤란로 123 (역삼동) 4층 401호',
    '(06236) 서울특별시 강남구 테헤란로 123 ',   // 상세주소 입력 직전(끝 공백) — 절대 trim 하지 않는다
    '(06236)  서울',                              // 본문 자체가 공백으로 시작(구분자 1칸만 소비)
    '(06236) ',                                   // 우편번호만 받은 직후
    '대구광역시 동구 첨단로 39',                   // 레거시 평문
    '',
  ];
  for (const raw of cases) {
    it(`형태가 유지된다: ${JSON.stringify(raw)}`, () => {
      expect(formatAddress(parseAddress(raw))).toBe(raw);
    });
  }

  it('본문만 바꿔 다시 합쳐도 우편번호가 보존된다', () => {
    const v = parseAddress('(06236) 서울특별시 강남구 테헤란로 123');
    expect(formatAddress({ ...v, address: v.address + ' 4층' }))
      .toBe('(06236) 서울특별시 강남구 테헤란로 123 4층');
  });
});

describe('isAddressEmpty (필수 검증)', () => {
  // 원시 문자열 trim 으로 보면 "(06236) " 가 채워진 것으로 위장한다 — 본문 기준으로 판정해야 한다.
  it('우편번호만 있고 본문이 없으면 비어 있다', () => {
    expect(isAddressEmpty('(06236) ')).toBe(true);
    expect(isAddressEmpty('(06236)')).toBe(true);
  });

  it('공백만 든 본문도 비어 있다', () => {
    expect(isAddressEmpty('(06236)    ')).toBe(true);
    expect(isAddressEmpty('   ')).toBe(true);
  });

  it('본문이 있으면 비어 있지 않다(레거시 평문 포함)', () => {
    expect(isAddressEmpty('(06236) 서울특별시 강남구')).toBe(false);
    expect(isAddressEmpty('대구광역시 동구 첨단로 39')).toBe(false);
  });

  it('빈 값 / undefined 는 비어 있다', () => {
    expect(isAddressEmpty('')).toBe(true);
    expect(isAddressEmpty(undefined)).toBe(true);
  });
});

describe('detailTail (재검색 시 상세주소 보존)', () => {
  it('같은 주소를 다시 고르면 사용자가 이어 쓴 상세주소가 꼬리로 남는다', () => {
    expect(detailTail('서울특별시 강남구 테헤란로 123 4층 401호', ['서울특별시 강남구 테헤란로 123']))
      .toBe(' 4층 401호');
  });

  it('건물명 포함형(가장 긴 일치)을 우선해 중복을 막는다', () => {
    const prev = '서울특별시 강남구 테헤란로 123 (역삼빌딩) 4층';
    const candidates = ['서울특별시 강남구 테헤란로 123 (역삼빌딩)', '서울특별시 강남구 테헤란로 123'];
    expect(detailTail(prev, candidates)).toBe(' 4층');
  });

  it('다른 주소를 고르면 꼬리가 없다(교체가 맞는 동작)', () => {
    expect(detailTail('서울특별시 강남구 테헤란로 123 4층', ['부산광역시 해운대구 센텀중앙로 55'])).toBe('');
  });

  it('빈 본문·빈 후보는 꼬리 없음', () => {
    expect(detailTail('', ['서울특별시 강남구'])).toBe('');
    expect(detailTail('서울특별시 강남구', ['', '  '])).toBe('');
  });

  it('본문과 후보가 정확히 같으면 빈 꼬리', () => {
    expect(detailTail('서울특별시 강남구 테헤란로 123', ['서울특별시 강남구 테헤란로 123'])).toBe('');
  });

  // ── 토큰 경계(2026-09-17 리뷰 확정 결함 회귀) ────────────────────────────────
  // 경계가 없으면 "테헤란로 12" 가 "테헤란로 123" 의 접두라 꼬리 "3" 이 되붙어
  // 사용자가 고른 적 없는 123번지에 12번지 우편번호가 붙는다(무음 주소 뒤바뀜).
  it('접두 형제 번지(12 ↔ 123)는 꼬리로 인정하지 않는다', () => {
    expect(detailTail('서울특별시 강남구 테헤란로 123 4층', ['서울특별시 강남구 테헤란로 12'])).toBe('');
    expect(detailTail('서울특별시 강남구 테헤란로 123', ['서울특별시 강남구 테헤란로 12'])).toBe('');
  });

  it('번지 하이픈(12 ↔ 12-3)도 꼬리가 아니다', () => {
    expect(detailTail('서울특별시 강남구 테헤란로 12-3 2층', ['서울특별시 강남구 테헤란로 12'])).toBe('');
  });

  it('한글이 이어지면(역삼동 ↔ 역삼동로) 꼬리가 아니다', () => {
    expect(detailTail('서울특별시 강남구 역삼동로 5', ['서울특별시 강남구 역삼동'])).toBe('');
  });

  it('구분문자(공백·쉼표·여는 괄호)로 시작하면 정당한 꼬리다', () => {
    const base = '서울특별시 강남구 테헤란로 123';
    expect(detailTail(`${base} 4층`, [base])).toBe(' 4층');
    expect(detailTail(`${base}, 4층`, [base])).toBe(', 4층');
    expect(detailTail(`${base}(역삼빌딩) 4층`, [base])).toBe('(역삼빌딩) 4층');
  });

  // 표기 전환(도로명 ↔ 지번) 재검색 — 소비처가 건물명 포함형을 양쪽 다 후보로 넘겨야 중복이 안 난다.
  it('건물명 포함형이 후보에 있으면 옛 건물명이 꼬리로 남지 않는다', () => {
    const prev = '서울특별시 강남구 테헤란로 123 (역삼빌딩) 4층 401호';
    const cands = ['서울특별시 강남구 역삼동 737 (역삼빌딩)', '서울특별시 강남구 테헤란로 123', '서울특별시 강남구 테헤란로 123 (역삼빌딩)'];
    expect(detailTail(prev, cands)).toBe(' 4층 401호');
  });
});
