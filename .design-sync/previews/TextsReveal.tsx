import * as React from 'react';
import { TextsReveal, Card, ColorChip } from 'apfs-dashboard-offline';

/* TextsReveal — 순차 등장(transitions.dev 18). 마운트 다음 프레임에 is-shown 이 붙고,
   자식이 단 `t-stagger-line t-stagger-line--N`(N=1~4) 가 40ms 간격으로 위→아래 리빌된다.
   N 이 없는 자식은 지연 0(첫 레인)으로 함께 등장한다. 닫힘 애니메이션은 없고 언마운트로 사라진다.
   앱에서는 온보딩 완료 화면(제목·부제·요약·액션)이 정본 사용처. */

const kv: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '7px 0', borderTop: '1px solid var(--border)' };

export function IssueSuccess() {
  return (
    <Card>
      <TextsReveal className="flex flex-col items-center text-center">
        <span aria-hidden="true" style={{ marginBottom: 16 }}>
          <ColorChip icon="check" color="var(--success-text)" soft="var(--success-soft)" size={56} iconSize={28} />
        </span>
        <h3 className="t-stagger-line t-stagger-line--1" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--foreground)' }}>계정 발급이 완료되었습니다</h3>
        <p className="t-stagger-line t-stagger-line--2" style={{ margin: '8px 0 18px', fontSize: 13, color: 'var(--muted-foreground)' }}>담당자 메일로 초기 비밀번호를 보냈습니다. 최초 로그인 시 변경해 주세요.</p>
        <div className="t-stagger-line t-stagger-line--3" style={{ width: '100%', maxWidth: 320, textAlign: 'left', marginBottom: 18 }}>
          <div style={kv}><span style={{ color: 'var(--caption)' }}>소속</span><span style={{ fontWeight: 700, color: 'var(--foreground)' }}>○○인베스트먼트</span></div>
          <div style={kv}><span style={{ color: 'var(--caption)' }}>사용자 구분</span><span style={{ fontWeight: 700, color: 'var(--foreground)' }}>운용사 담당자</span></div>
          <div style={kv}><span style={{ color: 'var(--caption)' }}>발급 일시</span><span style={{ fontWeight: 700, color: 'var(--foreground)' }}>2026-09-19 14:22</span></div>
        </div>
        <div className="t-stagger-line t-stagger-line--4">
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 38, padding: '0 18px', borderRadius: 9, background: 'var(--primary)', color: 'var(--primary-foreground)', fontSize: 13.5, fontWeight: 700 }}>로그인 화면으로</span>
        </div>
      </TextsReveal>
    </Card>
  );
}

export function NoticeLines() {
  return (
    <Card>
      <TextsReveal className="flex flex-col gap-2">
        <div className="t-stagger-line t-stagger-line--1" style={{ fontSize: 14, fontWeight: 800, color: 'var(--foreground)' }}>2026년 3분기 마감 안내</div>
        <div className="t-stagger-line t-stagger-line--2" style={{ fontSize: 13, color: 'var(--foreground)' }}>운용사 분기보고서 제출 기한은 10월 15일입니다.</div>
        <div className="t-stagger-line t-stagger-line--3" style={{ fontSize: 13, color: 'var(--foreground)' }}>수탁 데이터 검증은 10월 20일까지 완료해 주세요.</div>
        <div className="t-stagger-line t-stagger-line--4" style={{ fontSize: 12, color: 'var(--caption)' }}>문의 · 농업정책보험금융원 투자운용부</div>
      </TextsReveal>
    </Card>
  );
}

export function SummaryRows() {
  const rows = [
    { k: '총 AUM(운용자산)', v: '23,840억원' },
    { k: '모태펀드 집행률', v: '78.0%' },
    { k: '순자산 IRR', v: '9.7%' },
    { k: '조기경보 운용사', v: '4개사' },
  ];
  return (
    <Card>
      <TextsReveal>
        {rows.map((r, i) => (
          <div key={r.k} className={`t-stagger-line t-stagger-line--${i + 1}`} style={kv}>
            <span style={{ color: 'var(--caption)' }}>{r.k}</span>
            <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>{r.v}</span>
          </div>
        ))}
      </TextsReveal>
    </Card>
  );
}
