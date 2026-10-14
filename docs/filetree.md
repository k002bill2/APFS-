├─ login/                                  ○ 로그인 (인증 절차)
│
├─ dashboard/                              ○ 대시보드
│
├─ ffms/                                   ○ 투자자산관리
│   ├─ mfund/                              모태펀드 관리
│   ├─ asct/                               조합관리
│   ├─ report/                             사후보고관리
│   ├─ sfund/                              자펀드 관리
│   ├─ ent/                                투자기업정보
│   ├─ gp/                                 운용사 모니터링
│   └─ ● sample/                           기동 확인용 참조 구현 (첫 도메인 작성 후 삭제)
│
├─ risk/                                   ○ 조기경보
│   ├─ alert/                              조기경보
│   ├─ ent/                                기업정보
│   ├─ sfund/                              자펀드정보
│   └─ valuation/                          가치평가
│
├─ sfund/                                  ○ 자펀드 보고
│   ├─ ocsrpt/                             수시보고
│   ├─ fxtmrpt/                            정기보고
│   ├─ verify/                             실물검증
│   └─ file/                               파일
│
├─ account/                                ○ 회계
│   ├─ baseinfo/                           기초관리 (계정과목·거래처 등 기준정보)
│   ├─ slip/                               전표관리
│   ├─ ledger/                             장부조회
│   ├─ closing/                            결산관리
│   ├─ fixedasset/                         고정자산
│   ├─ funds/                              자금관리
│   ├─ bizorg/                             농식품경영체
│   └─ setting/                            설정
│
├─ brief/                                  ○ 부처보고
│   ├─ mfund/                              모태펀드
│   └─ register/                           등록원부
│
├─ trust/                                  ○ 수탁보고
│   ├─ sfund/                              자펀드 수탁
│   └─ mfund/                              모태펀드 수탁
│
└─ system/                                 ○ 관리자
    ├─ user/                               사용자·권한 관리
    ├─ setting/                            시스템 관리
    └─ audit/                              감사·기록