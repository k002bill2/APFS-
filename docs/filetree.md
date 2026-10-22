```
 kr.apfs
● ApfsApplication.java                     진입점
│
├─ config/                                 스프링 설정 (@Configuration 전용)
│   ● SecurityConfig.java                  인증/인가 필터체인, CSRF, 보안헤더, CORS
│   ● WebMvcConfig.java                    인터셉터 등록
│   ● OpenApiConfig.java                   SpringDoc
│   ● EgovConfigAppCommon.java             암복호화(ARIA), 멀티파트 리졸버
│   ● EgovConfigAppDatasource.java         HikariCP DataSource
│   ● EgovConfigAppMapper.java             SqlSessionFactory, Mapper 스캔
│   ● EgovConfigAppTransaction.java        트랜잭션 어드바이스/포인트컷
│   ● EgovConfigAppProperties.java         EgovPropertyService 등록
│   ○ LocalSecurityConfig.java             로컬 전용 보안 해제 (@Profile("local"))
│
├─ common/                                 비업무 공통 기능 (장치)
│   ├─ response/   ● ApiResponse  ○ PageRequest / PageResponse
│   ├─ exception/  ● ErrorCode  ● BizException  ● GlobalExceptionHandler
│   ├─ security/   ● LoginUser  ● SecurityUtils  ● RestAuthenticationEntryPoint
│   │              ● RestAccessDeniedHandler  ● SecondFactorFilter
│   │              ○ CustomUserDetailsService
│   ├─ file/       ● FileProperties  ● FileSignature  ● FileValidator
│   │              ● FilePathUtils  ● FileVo  ● FileStorageService
│   │              ● FileDownloadService  ● MultipartExtensionResolver
│   ├─ filter/     ● HTMLTagFilter  ● HTMLTagFilterRequestWrapper
│   ├─ util/       ● EgovWebUtil  ● EgovStringUtil / EgovDateUtil / EgovNumberUtil
│   ├─ code/       ○ 공통코드 조회 캐시 (읽기 전용)
│   ├─ excel/      ○ 엑셀 업로드/다운로드
│   ├─ report/     ○ ClipReport 연동
│   ├─ notify/     ○ 메일 발송 (NCP Cloud Outbound Mailer)
│   ├─ log/        ○ 접근이력, 변경이력
│   └─ interceptor/○ 접근이력, 권한 매트릭스 체크
│
├─ aut/                                    ○ 인증 (URL : /api/aut/**, /api/frt/logout)
│   ├─ login/                              로그인·로그아웃
│   └─ otp/                                이차인증(OTP)
│
├─ frt/                                    ○ 대시보드·공통 보조기능
│   ├─ widget/                             위젯 배치·사용자별 설정
│   ├─ schedule/                           일정관리
│   ├─ alarm/                              알림정보 (수신함 조회·읽음처리)
│   ├─ memo/                               메모
│   └─ fbox/                               파일BOX
│
├─ iam/                                    ○ 투자자산관리
│   ├─ mfund/                              모태펀드관리
│   ├─ asct/                               조합관리
│   ├─ report/                             사후보고관리  (10건 — 최대)
│   ├─ sfund/                              자펀드관리
│   ├─ ent/                                투자기업정보
│   ├─ gp/                                 운용사 모니터링
│   └─ prj/                                프로젝트 (프로젝트명세서) — 범위 확인 필요
│
├─ ews/                                    ○ 조기경보
│   ├─ alert/                              조기경보
│   ├─ ent/                                기업정보 (외부 신용정보)
│   ├─ sfund/                              자펀드정보
│   └─ valuation/                          가치평가 (IRR·Portfolio Report 포함, 10건)
│
├─ sfr/                                    ○ 자펀드 보고
│   ├─ transfer/                           전자보고 전송현황
│   ├─ occasionalreport/                   수시보고
│   ├─ regularreport/                      정기보고 (월간·반기)
│   ├─ verify/                             실물검증
│   └─ file/                               보고파일·보고양식
│
├─ acc/                                    ○ 회계
│   ├─ baseinfo/                           기초관리 (계정과목·결산양식)
│   ├─ slip/                               전표관리
│   ├─ ledger/                             장부조회
│   ├─ closing/                            결산관리
│   ├─ fixedasset/                         고정자산
│   ├─ funds/                              자금관리
│   ├─ bizorg/                             농식품경영체
│   └─ setting/                            설정 (휴일·회계거래처)
│
├─ brf/                                    ○ 부처보고
│   ├─ mfund/                              모태펀드
│   └─ register/                           등록원부
│
├─ trs/                                    ○ 수탁보고
│   ├─ sfund/                              자펀드수탁
│   └─ mfund/                              모태펀드수탁
│
└─ sys/                                    ○ 관리자
    ├─ user/                               사용자·권한 관리
    ├─ setting/                            시스템관리 (프로그램·메뉴·코드)
    └─ audit/                              감사·기록
```