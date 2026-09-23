/* 월간보고 상세 보고서 원문 데이터 — 출처: S1_06_01_월간보고.html (KRDS TO-BE)
   대상: AJ-ISU경기도애그리푸드투자조합 월간보고(2026.01.31 현재). 소비처는 `monthly_report_modal.tsx` 하나다.

   ⚠ 금액은 전부 **원 단위 정수**로 둔다 — 목업이 "40 억원"처럼 미리 포맷해 둔 칸도 원값으로 환산해 담았다.
     그래야 단위 토글(원/백만원/억원)이 모달의 money() 한 곳에서만 동작한다(문자열을 옮기면 토글이 깨진다).
   ⚠ 출처 수치는 가감 없이 그대로 옮긴다(apfs-spec-popup 규약 7) — 합계가 안 맞아도 고쳐 쓰지 않는다.
     옮긴 뒤 원문 설계 메모가 남긴 "도메인 정합 확인" 과제를 실제로 재계산해 봤고(2026-09-12), 전부 맞았다:
       · 회수내역 6개 그룹 소계 = 다리 합(원금·회수금액·수익·감액 4열 전부), 합계행 = 소계 합
       · 회수 다리 29건 전건 회수금액(B) − 회수원금(A) = 수익금액(B−A)
       · 누적분배 3건 각 시점의 누적 분배원금 + 잔여원금 = 결성액 100억, 분배원금+분배수익 = 분배총액
       · 조합구성·투자집행·예금·수입·비용·누적분배 합계행 = 각 행 합
     즉 이 데이터엔 보정해야 할 칸이 없다. 값을 고치는 변경은 곧 출처 이탈이므로 하지 말 것.
   ⚠ rowSpan 은 그룹 구조(legs/items 길이)에서 **파생**한다 — 수기 rowspan 숫자를 두지 않는다
     (occasional_report_modal.tsx CHECKLIST 와 동일 관례).

   이 파일은 데이터만 담는다(React import 금지) — 렌더는 monthly_report_modal.tsx. */

export const RPT_META = {
  fundName: 'AJ-ISU경기도애그리푸드투자조합',
  asOf: '2026.01.31',
  formedAt: '2018-07-30',
  termFrom: '2018-08-20',
  termTo: '2026-08-19',
  termYears: 8,
  fundAmount: 10_000_000_000,   // 원문 '100억원'
} as const;

/* 1-라. 조합구성 — 출자금액은 원문 "40 억원" → 원 단위 환산 */
export type MemberRow = { no: number; name: string; won: number; rate: number; note: string };
export const MEMBERS: MemberRow[] = [
  { no: 1, name: '농식품투자모태조합', won: 4_000_000_000, rate: 40, note: '특별조합원' },
  { no: 2, name: '이수창업투자', won: 1_000_000_000, rate: 10, note: '업무집행조합원' },
  { no: 3, name: '엔비에이치(NBH)캐피탈 주식회사', won: 1_000_000_000, rate: 10, note: '업무집행조합원' },
  { no: 4, name: '이수화학', won: 1_000_000_000, rate: 10, note: '유한책임조합원' },
  { no: 5, name: '경기도청', won: 3_000_000_000, rate: 30, note: '유한책임조합원' },
];
export const MEMBERS_TOTAL = { won: 10_000_000_000, rate: 100 };

/* 2-가. 투자집행 업체현황 — 2단 헤더(투자내역 colSpan 7 + 합계 rowSpan 2) */
export type InvestRow = { no: number; co: string; ceo: string; loc: string; product: string; at: string; common: number; pref: number; cb: number; bw: number; project: number; etc: number; sub: number; total: number };
export const INVEST: InvestRow[] = [
  { no: 1, co: '(주)알피바이오', ceo: '김남기', loc: '서울', product: '연질캡슐 제품', at: '2018-11-09', common: 999_999_676, pref: 0, cb: 0, bw: 0, project: 0, etc: 0, sub: 999_999_676, total: 999_999_676 },
  { no: 2, co: '비즈바이오', ceo: '문현철', loc: '경기', product: '사료(DDFS,알팔파 펠렛 등)', at: '2018-12-20', common: 0, pref: 1_999_968_000, cb: 0, bw: 0, project: 0, etc: 0, sub: 1_999_968_000, total: 1_999_968_000 },
  { no: 3, co: '(주)에이에스텍', ceo: '유종배', loc: '경기', product: '의약품 원료 및 자외선 차단제', at: '2020-06-05', common: 0, pref: 999_170_900, cb: 0, bw: 0, project: 0, etc: 0, sub: 999_170_900, total: 999_170_900 },
  { no: 4, co: '(주)프레시지', ceo: '정중교', loc: '경기', product: '밀키트(가정간편식) 제조 및 유통 플랫폼 운영', at: '2020-07-30', common: 0, pref: 1_499_957_210, cb: 0, bw: 0, project: 0, etc: 0, sub: 1_499_957_210, total: 1_499_957_210 },
  { no: 5, co: '(주)요즘주방', ceo: '최영', loc: '서울', product: '공유주방 운영 및 경영컨설팅', at: '2020-09-28', common: 0, pref: 499_940_000, cb: 0, bw: 0, project: 0, etc: 0, sub: 499_940_000, total: 499_940_000 },
  { no: 6, co: '(주)부일', ceo: '하태민', loc: '경기', product: '수산물(새우, 활어 등) 수입, 제조, 유통', at: '2020-10-22', common: 0, pref: 597_600_000, cb: 0, bw: 0, project: 0, etc: 0, sub: 597_600_000, total: 597_600_000 },
  { no: 7, co: '(주)셀텍', ceo: '김영훈', loc: '경기', product: '', at: '2020-10-28', common: 0, pref: 0, cb: 500_000_000, bw: 0, project: 0, etc: 0, sub: 500_000_000, total: 500_000_000 },
  { no: 8, co: '(주)컬처히어로', ceo: '양준규', loc: '경기', product: '', at: '2021-08-18', common: 0, pref: 1_100_000_000, cb: 0, bw: 0, project: 0, etc: 0, sub: 1_100_000_000, total: 1_100_000_000 },
  { no: 9, co: '(주)조인앤조인', ceo: '진해수', loc: '경기', product: '비건 및 저당 등의 완제품 및 식품 원료', at: '2021-08-18', common: 0, pref: 501_683_000, cb: 0, bw: 0, project: 0, etc: 0, sub: 501_683_000, total: 501_683_000 },
];
export const INVEST_TOTAL = { common: 999_999_676, pref: 7_198_319_110, cb: 500_000_000, bw: 0, project: 0, etc: 0, sub: 8_698_318_786, total: 8_698_318_786 };

/* 2-나. 투자집행 업체 사후관리 등급 — 등급부여 근거·비고는 원문 장문 그대로 */
export type GradeRow = { no: number; co: string; grade: string; basis: string; note: string };
export const GRADES: GradeRow[] = [
  { no: 1, co: '(주)프레시지', grade: 'A', basis: '●동사는 HMR 업계 1위로, 앵커에퀴티의 보통주 신주 2천억원 납입 이후 볼트온 전략을 통해 확장 중. 대학병원 임상결과에 기반한 건강 HMR(환자식, 건강식) 업체(국내 유일) ㈜닥터키친과의 주식 교환을 비롯하여 간편식 기업 ㈜허닭, 물류 회사인 라인물류, HMR 업계 2위인 테이스티나인과 M&A 계약을 체결함으로써 HMR 시장을 석권할 계획임. ●22년 상반기 실적: 전년 상반기 대비 약 28% 상승한 1,043억원의 매출을 기록하며 지속 성장 중(21년 누적매출액: 약 1,889억원), 이는 밀키트 시장의 성장과 제품/채널 다각화를 통한 프레시지의 시장 내 Presence 확대에 기인. ●공장 운영 효율성 제고. 도급 계약 개선을 통한 인건비 절감 및 공장 자동화 투자 검토 중임. ●구매 비용 절감: 냉장육을 냉동육으로 전환 추진 중에 있으며, 축산 부위별 전문 업체와의 계약을 통한 원가 절감. 가격 인상 계획: 3분기 추가 판가 인상 고려중이며, 판가 및 출고가 밀착 관리를 통한 실질 가격 인상 효과 기대.', note: '●투자 당시 2023년 말 코스닥 상장을 통한 Exit 계획이었으나, 앵커에퀴티로의 피인수와 BEP 달성 지연으로 인해 M&A를 포함한 다양한 Exit 계획 하에 다소 연기 예상. ●아직까지 적자이나, 비약적인 매출 상승과 밀키트 내에서의 독보적인 시장 지배력, OEM 외에도 자체 브랜드, 외식사업 관련 IP 확보 전략 등이 시장에서 인정받고 있음. 이에 따라 성장성 또는 사업모델 특례 상장도 충분히 가능할 것으로 판단. ●또한 시장 내 지배적 위치에 따라, 다양한 식품 대기업에서도 M&A 대상으로 고려 가능한 바, 전략적 M&A를 통한 방식의 exit도 고려 가능.' },
  { no: 2, co: '(주)컬처히어로', grade: 'A', basis: '●상반기 주요 실적 - 2분기 매출은 8.3억원으로 1분기(7.8억원)대비 6% 증가하며, 1월 2.3억원에서 5월 3.3억원으로 지속 증가세 - 단, 6월 매출은 비용 효율화를 위한 전략적 마케팅 비용 절감(1억원 => 3.3천만원, 78% 절감)으로 인한 일시적 하락 - 주요 지표 우상향으로 서비스 품질 개선 효과: DAU/MAU Stickness 11%→19%, 구매전환율 7.5%→12.4%, 이탈율 24%→4.5% ●하반기 전략 - 2022년 목표: GMV 109억원, 매출 44억원, App 다운 220만, 회원 113만, 전체 MAU 54만명, SNS 구독 350만명 목표 - 커머스: 상반기 구독떡볶이(4월), 곤약누들(7월) 출시완료, 하반기 통통까스(8월), 코인육수(9월), 줄리엔강달가슴살김(10월), 키친모먼트(11월) 등 전략 PB 출시 목표 및 MD팀 신규 셋업(4명) 완료 - 콘텐츠: [시나몬프로젝트]로 푸드라이프스타일 콘텐츠 시리즈 제작 및 OTT 등 제휴, LG 씽큐(4억원) 콘텐츠 제작 등 수익화 강화 - 서비스: [레시피 노트] 서비스 런칭으로 유저 참여율 증대(후기/팁/질문 등), 랩스타일크리에이터 활성화 지속 강화중 - 마케팅: [MBTI 소울푸드&레시피 추천] 퀴즈 바이럴 런칭 1주일 5만명 참여, [월간식탁고사] 바이럴 준비 - 수출: 하반기 베트남 수출 본격 강화 목표(하나코미, 마켓씨아공 등 현지 파트너십 업체 협의) - 파트너십: 락키친/리빙 전략제휴 기획전 준비중, 카카오메이커스 입점 준비중', note: '●브릿지 투자 유치 목표: 50~100억원(22년 4분기~23년 1분기) ●Exit 예상 시기: 2025년 경(IPO 상장 또는 푸드/키친/커머스 관련 대기업/유니콘 등 M&A 목표)' },
  { no: 3, co: '(주)조인앤조인', grade: 'A', basis: '●신규시장/고객사 확보 현황 - 일본 NTC 주식회사(종합상사) \'널담 병아리콩 퍼핑 스낵\' 추가 수출 발주 확정. ●국내 대형거래처 확보 - 그랜드워커힐 Amenity 입점 진행 중; 기존 Home Bar 물량이 소진되는 2023년 1월 동사 병아리콩 퍼핑 스낵 입점 예정(예상 초도물량 2천만원/월, 상시 주문 건 별도). 롯데마트 42개 지점 확보 및 확대 중. - 현대백화점 투홀 신규거래선 추가 및 초도물량 납품(기대매출 1천만원/월). - 삼성월스토리 기존 FS(급식, 간식 사업) 거래 확대(삼성전자 확대 중), FD(식자재, 일반유통사업) 신규 미팅 완료, 반제품, 소재 거래 FD와 협의 중, MOU 체결과 시 직접 투자 논의 중. ●신제품 개발/출시/Renewal관련 추진사항 - \'비건유\' 8월9일 생산 완료, 치즈, 버터 프로토타입 개발 완료. - TVP(대체육 제조를 위한 식물성 단백질 조직을 만들 수 있는 기술)을 보유하고 있는 유럽계 회사와 독점적 관계 협상 중임. 해당 기술 식품 공학적으로 활용하면 최고 품질의 비건육 개발이 가능할 것으로 판단됨. ●미국시장 진출관련 진행사항 - CES 2023 Central Plaza Booth 배정확정, 계약체결 완료. - 널담 브랜드 디저트 제품 아마존 계열 마트(홀푸즈마켓)에 납품 선적 완료 및 해상 운송 중(약 800만원)', note: '●Exit 예상 시기: 2024년 경. ●2024년 실적을 바탕으로 상장(우회상장 포함)을 추진하여 회수하거나, 식품 대기업 계열 등으로의 M&A를 통하여 회수 예정. ●금액: IRR 8.0%(만기/조기 상환) 이상 Exit 예정. ●IPO시 IRR 38.2%(예상).' },
  { no: 4, co: '(주)요즘주방', grade: 'D', basis: '동사의 주요 BM인 공유주방의 사업성이 떨어져서 피봇을 검토중에 있음. 동사가 구축해 놓은 공유주방의 오프라인 거점에 정성식품이 거점형 주방을 입점시켜 반찬프렌차이즈 활성화로 피봇 모색. 정성식품 인수를 검토하던 중에 현재 채권시장의 어려움으로 인해 무산될 위기에 처해 있음.', note: '정성식품 인수 여부 11월 11일 결정 예정' },
];

/* 2-나 부속. 등급분류기준 — 규정 문구 */
export const GRADE_CRITERIA: { grade: string; desc: string }[] = [
  { grade: 'AA', desc: '목표 투자수익율 조기 달성 예상\n: 회사 경영 상태, 재무상태 및 미래현금흐름 등을 고려하여 투자원금 및 목표 투자수익을 조기 회수할 것으로 예상되는 경우' },
  { grade: 'A', desc: '목표 투자수익율 달성 예상\n: 회사 경영 상태, 재무상태 및 미래현금흐름 등을 고려하여 투자원금 및 목표 투자수익을 회수할 것으로 예상되는 경우' },
  { grade: 'B', desc: '투자원금 회수 예상\n: 투자원금 회수에 위험이 존재하지 않으나, 목표 투자수익율을 달성하지 못할 잠재적인 요인이 존재하는 경우\n\nAction Plan\n: 투자업체에 대한 Value-up 방안을 마련하여 목표 투자수익율을 달성할 수 있도록 집중사후관리 필요' },
  { grade: 'C', desc: '투자원금 회수에 위험이 존재\n: 투자원금 손실을 초래할 수 있는 요인이 현재화되어 투자원금 회수에 상당한 위험이 발생할 것으로 예상되는 경우\n\nAction Plan\n: 투자원금을 회수하기 위한 관리방안 마련 및 구체적인 회수 시나리오 작성' },
  { grade: 'D', desc: '투자자산평가손실인식대상 및 인식\n1) 투자원금의 손실 발생을 예상하나, 그 손실액을 확정할 수 없어, 장부상 감액손실을 인식하지 않은 경우\n2) 부도, 영업 중단 등의 사유로 인해 장부상 투자자산감액평가손실액을 인식한 경우\n\nAction Plan\n: 투자원금 회수 시나리오 상의 단계별 진행상황 수시 체크' },
];

/* 2-다. 회수내역 — 업체별 그룹(rowSpan) + 소계, 마지막 합계. 감액금액에 음수 있음(-138,188,416) */
export type RecoveryLeg = { no: number; date: string; principal: number; recovered: number; profit: number; impair: number; state: string; note: string };
export type RecoveryGroup = { co: string; at: string; amount: number; done: string; legs: RecoveryLeg[]; sub: { principal: number; recovered: number; profit: number; impair: number } };
export const RECOVERY: RecoveryGroup[] = [
  { co: '(주)알피바이오', at: '2018-11-09', amount: 999_999_676, done: 'O',
    legs: [
      { no: 1, date: '2022-09-29', principal: 876_782_458, recovered: 2_101_318_750, profit: 1_224_536_292, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 2, date: '2022-10-17', principal: 123_217_218, recovered: 201_926_200, profit: 78_708_982, impair: 0, state: '회수 완료', note: 'KOSDAQ' },
    ],
    sub: { principal: 999_999_676, recovered: 2_303_244_950, profit: 1_303_245_274, impair: 0 } },
  { co: '비즈바이오', at: '2018-12-20', amount: 1_999_968_000, done: 'O',
    legs: [
      { no: 3, date: '2024-03-29', principal: 999_984_000, recovered: 1_293_388_432, profit: 293_404_432, impair: 0, state: '-', note: '상환' },
      { no: 4, date: '2024-06-28', principal: 999_984_000, recovered: 1_309_173_935, profit: 309_189_935, impair: 0, state: '회수 완료', note: '상환' },
    ],
    sub: { principal: 1_999_968_000, recovered: 2_602_562_367, profit: 602_594_367, impair: 0 } },
  { co: '(주)에이에스텍', at: '2020-06-05', amount: 999_170_900, done: 'O',
    legs: [
      { no: 5, date: '2023-11-21', principal: 432_217_622, recovered: 2_326_075_080, profit: 1_893_857_458, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 6, date: '2024-01-03', principal: 2_864_451, recovered: 20_665_600, profit: 17_801_149, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 7, date: '2024-01-04', principal: 4_611_186, recovered: 32_954_700, profit: 28_343_514, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 8, date: '2024-01-05', principal: 8_665_933, recovered: 61_260_550, profit: 52_594_617, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 9, date: '2024-01-08', principal: 92_093_074, recovered: 657_468_550, profit: 565_375_476, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 10, date: '2024-01-10', principal: 3_837_010, recovered: 28_602_300, profit: 24_765_290, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 11, date: '2024-01-11', principal: 49_387_590, recovered: 397_415_500, profit: 348_027_910, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 12, date: '2024-03-04', principal: 31_528_318, recovered: 202_419_200, profit: 170_890_882, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 13, date: '2024-03-07', principal: 4_838_600, recovered: 30_551_350, profit: 25_712_750, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 14, date: '2024-03-08', principal: 31_755_732, recovered: 203_015_850, profit: 171_260_118, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 15, date: '2024-04-01', principal: 4_838_600, recovered: 30_525_000, profit: 25_686_400, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 16, date: '2024-04-03', principal: 24_797_825, recovered: 157_226_400, profit: 132_428_575, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 17, date: '2024-04-04', principal: 32_317_009, recovered: 211_542_300, profit: 179_225_291, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 18, date: '2024-04-08', principal: 40_745_851, recovered: 269_802_550, profit: 229_056_699, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 19, date: '2024-05-09', principal: 40_847_461, recovered: 272_813_450, profit: 231_965_989, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 20, date: '2024-05-10', principal: 56_040_665, recovered: 388_150_950, profit: 332_110_285, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 21, date: '2024-05-14', principal: 9_677_200, recovered: 70_862_500, profit: 61_185_300, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 22, date: '2024-05-23', principal: 28_189_683, recovered: 230_699_799, profit: 202_510_116, impair: 0, state: '-', note: 'KOSDAQ' },
      { no: 23, date: '2024-11-28', principal: 99_199_500, recovered: 99_199_500, profit: 0, impair: 0, state: '-', note: '' },
      { no: 24, date: '2025-03-14', principal: 717_590, recovered: 3_295_392, profit: 2_577_802, impair: 0, state: '회수 완료', note: 'KOSDAQ' },
    ],
    sub: { principal: 999_170_900, recovered: 5_694_546_521, profit: 4_695_375_621, impair: 0 } },
  { co: '(주)요즘주방', at: '2020-09-28', amount: 499_940_000, done: 'X',
    legs: [
      { no: 25, date: '2022-12-30', principal: 0, recovered: 0, profit: 0, impair: 499_939_000, state: '-', note: '' },
    ],
    sub: { principal: 0, recovered: 0, profit: 0, impair: 499_939_000 } },
  { co: '(주)부일', at: '2020-10-22', amount: 597_600_000, done: 'O',
    legs: [
      { no: 26, date: '2021-09-15', principal: 597_600_000, recovered: 688_893_633, profit: 91_293_633, impair: 0, state: '회수 완료', note: '상환' },
    ],
    sub: { principal: 597_600_000, recovered: 688_893_633, profit: 91_293_633, impair: 0 } },
  { co: '(주)셀텍', at: '2020-10-28', amount: 500_000_000, done: 'X',
    legs: [
      { no: 27, date: '2021-12-31', principal: 0, recovered: 0, profit: 0, impair: 499_999_000, state: '-', note: '기타' },
      { no: 28, date: '2022-12-22', principal: 0, recovered: 0, profit: 0, impair: -138_188_416, state: '회수 완료', note: '기타' },
      { no: 29, date: '2022-12-22', principal: 138_189_416, recovered: 138_189_416, profit: 0, impair: 0, state: '-', note: '상환' },
    ],
    sub: { principal: 138_189_416, recovered: 138_189_416, profit: 0, impair: 361_810_584 } },
];
export const RECOVERY_TOTAL = { amount: 5_596_678_576, principal: 4_734_927_992, recovered: 11_427_436_887, profit: 6_692_508_895, impair: 861_749_584 };

/* 2-라. 수시보고 내역 — 업체별 그룹(rowSpan) */
export type OccGroup = { co: string; items: { no: number; date: string; summary: string }[] };
export const OCC_NOTES: OccGroup[] = [
  { co: '(주)부일', items: [
    { no: 1, date: '2020-11-02', summary: '[부일]부속합의서 체결의 건' },
    { no: 2, date: '2021-09-13', summary: '특별상환권 행사의 건(부일)' },
  ] },
  { co: '비즈바이오', items: [
    { no: 3, date: '2024-07-12', summary: '[비즈바이오] 전량 상환' },
  ] },
  { co: '(주)셀텍', items: [
    { no: 4, date: '2020-11-13', summary: '(주)셀텍 계약서 변경의 건' },
    { no: 5, date: '2022-01-27', summary: '[셀텍] 회생 개시 신청' },
    { no: 6, date: '2023-01-03', summary: '[셀텍]회생인가 결정으로 인한 회수' },
  ] },
  { co: '(주)알피바이오', items: [
    { no: 7, date: '2022-09-29', summary: '[알피바이오]금일 상장 및 일부 매도' },
    { no: 8, date: '2022-10-17', summary: '[알피바이오] 15,102주 매도' },
  ] },
  { co: '(주)에이에스텍', items: [
    { no: 9, date: '2023-03-31', summary: '[에이에스텍]계약 조건 변경의 건' },
    { no: 10, date: '2023-11-28', summary: '[에이에스텍]금일 상장 구주매출 거래발생' },
    { no: 11, date: '2024-01-08', summary: '[에이에스텍] 일부 매도' },
  ] },
  { co: '(주)요즘주방', items: [
    { no: 12, date: '2022-12-26', summary: '[요즘주방] 투자금 감액의 건' },
  ] },
  { co: '(주)인피닉', items: [
    { no: 13, date: '2022-09-01', summary: '[인피닉] 투자금 집행 중단의 건' },
  ] },
  { co: '(주)프레시지', items: [
    { no: 14, date: '2021-11-09', summary: '[프레시지]우선주 보통주 전환의 건' },
  ] },
  { co: '운용사관련', items: [
    { no: 15, date: '2018-12-03', summary: '[AJ캐피탈파트너스] 주주현황' },
    { no: 16, date: '2021-03-30', summary: '대주주 변경 예정(2021.04.09)' },
    { no: 17, date: '2021-04-16', summary: '운용사 대주주 변경의 건' },
  ] },
  { co: '기타', items: [
    { no: 18, date: '2019-08-07', summary: '일반펀드매니저(참여인력) 변경의 건' },
    { no: 19, date: '2019-10-04', summary: '[AJ캐피탈파트너스] 대표이사 변경' },
    { no: 20, date: '2021-04-05', summary: '일반펀드매니저(참여인력) 변경의 건' },
    { no: 21, date: '2021-06-04', summary: '회사 주요사항 변경' },
    { no: 22, date: '2021-10-20', summary: '준법감시인 변경의 건' },
    { no: 23, date: '2022-11-16', summary: '[이수창업투자]대표이사 변경' },
    { no: 24, date: '2023-01-20', summary: 'NBH캐피탈(주) 준법감시인 변경' },
  ] },
];

/* 3. 미투자자산 운용현황 — 예금내역 */
export type DepositRow = { no: number; account: string; won: number; due: string | null; rate: number; note: string };
export const DEPOSITS: DepositRow[] = [
  { no: 1, account: '317-0014-7214-71 (NH농협은행)', won: 154_901_256, due: '2040-12-31', rate: 0.6, note: '' },
  { no: 2, account: '002-11-252481 (신한투자증권)', won: 1, due: null, rate: 0, note: '' },
];
export const DEPOSITS_TOTAL = 154_901_257;

/* 4. 수입내역 (일자별 발생내역) */
export type LedgerRow = { no: number; date: string; won: number; note: string };
export const INCOME: LedgerRow[] = [
  { no: 1, date: '2018년', won: 69_019_824, note: '' },
  { no: 2, date: '2019년', won: 117_783_989, note: '' },
  { no: 3, date: '2020년', won: 50_374_607, note: '' },
  { no: 4, date: '2021년', won: 101_743_843, note: '' },
  { no: 5, date: '2022년', won: 1_457_377_991, note: '' },
  { no: 6, date: '2023년', won: 2_073_108_512, note: '' },
  { no: 7, date: '2024년', won: 3_415_359_684, note: '' },
  { no: 8, date: '2025년', won: 2_854_545, note: '' },
  { no: 9, date: '2026-01-25', won: 17_832, note: '이자 입금' },
];
export const INCOME_TOTAL = 7_287_640_827;

/* 5. 비용내역 (일자별 발생내역) */
export const EXPENSE: LedgerRow[] = [
  { no: 1, date: '2018년', won: 97_658_536, note: '' },
  { no: 2, date: '2019년', won: 201_724_005, note: '' },
  { no: 3, date: '2020년', won: 245_409_796, note: '' },
  { no: 4, date: '2021년', won: 762_637_583, note: '' },
  { no: 5, date: '2022년', won: 722_008_441, note: '' },
  { no: 6, date: '2023년', won: 247_533_908, note: '' },
  { no: 7, date: '2024년', won: 217_985_192, note: '' },
  { no: 8, date: '2025년', won: 83_455_075, note: '' },
  { no: 9, date: '2026-01-30', won: 6_585_677, note: '26년 1월 관리보수' },
];
export const EXPENSE_TOTAL = 2_584_998_213;

/* 6. 누적분배내역 */
export type DistribRow = { no: number; date: string; principal: number; profit: number; total: number; rest: number | null };
export const DISTRIB: DistribRow[] = [
  { no: 1, date: '2022-11-07', principal: 3_000_000_000, profit: 0, total: 3_000_000_000, rest: 7_000_000_000 },
  { no: 2, date: '2023-12-13', principal: 3_000_000_000, profit: 0, total: 3_000_000_000, rest: 4_000_000_000 },
  { no: 3, date: '2024-08-30', principal: 1_000_000_000, profit: 4_530_230_393, total: 5_530_230_393, rest: 3_000_000_000 },
];
export const DISTRIB_TOTAL = { principal: 7_000_000_000, profit: 4_530_230_393, total: 11_530_230_393 };

/* 원문 ※ 안내문구 — 표 아래 캡션으로 그대로 렌더(규정 문구) */
export const NOTES = {
  invest: '※ 위 표에는 반드시 누적투자 전체를 기입할 것. (회수완료된 업체도 삭제불가)',
  grade: '※ IPO 예정인 경우 예정일자, 잔존평가금액 기술.',
  gradeAction: '※ 사후관리 C등급 이하는 Action Plan 별도 수시보고.',
  recovery: '※ 비고란에는 장외매각, 유가증권시장, 코스닥시장, NASDAQ, MOTHER 등 Exit 창구 표시.',
  occ: '※ 수시 보고한 내역을 업체별로 누적으로 요약.',
  occEtc: '※ 투자업체와 관련없는 보고의 경우 투자기업에 관련 제목 간단히 기술. (예: 대주주변경, 대표변경 등)',
  expense: '※ 비용내역에는 투자금 집행금은 기재하지 않고 순수 비용(관리보수,감액 등 포함)만 기재.',
} as const;
