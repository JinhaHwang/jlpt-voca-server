# JLPT Vocabulary Supabase API

NestJS 기반의 JLPT 어휘 학습용 API 서버입니다. Supabase를 백엔드 데이터 소스로 사용하며 Swagger를 통해 문서화되어 있습니다.

## 빠른 시작

```bash
npm install
npm run start:dev
```

Swagger 문서는 `http://localhost:3000/api/docs`에서 확인할 수 있습니다.

## 주요 스크립트

| 커맨드 | 설명 |
| --- | --- |
| `npm run start:dev` | Nest CLI를 이용한 개발 서버 (핫 리로드) |
| `npm run start` | 컴파일된 결과(`dist/`) 실행 |
| `npm run start:prod` | 프로덕션 모드 실행 |
| `npm run build` | TypeScript 컴파일 및 Swagger 문서 생성 |
| `npm run vercel-build` | Vercel 배포용 빌드 스크립트 |
| `npm run test` | 단위 테스트 |
| `npm run test:watch` | 워치 모드 테스트 |
| `npm run test:cov` | 테스트 커버리지 측정 |
| `npm run test:e2e` | E2E 테스트 |

## 환경 변수

민감한 값은 `.env`에 정의하며 예시는 `.env.example`을 참고하세요. Supabase 프로젝트 설정 및 JWT 키 등이 필요합니다.

- `OPENAI_API_KEY`: JLPT 예문 생성을 위한 OpenAI 인증 키
- `TMAP_APP_KEY`: SK TMAP 지오코딩 API 호출용 앱 키

## 디렉터리 구조

```
supabase-api/
├─ api/                     # 서버리스/엣지 환경용 진입점
├─ dist/                    # 컴파일된 JavaScript (빌드 후 생성)
├─ node_modules/
├─ src/
│  ├─ auth/                 # 인증 모듈 (Controller, Service, DTO, Guard)
│  ├─ common/               # 재사용 가능한 데코레이터 및 유틸
│  ├─ health/               # 헬스 체크 엔드포인트
│  ├─ geo/                  # 외부 지오코딩(TMAP) 엔드포인트
│  ├─ jlpt-voca/            # JLPT 어휘 기능 모듈
│  ├─ profiles/             # 사용자 프로필 관리
│  ├─ supabase/             # Supabase 클라이언트 구성
│  ├─ types/                # 글로벌 타입 선언 (예: Express Request 확장)
│  ├─ app.controller.ts     # 루트 컨트롤러
│  ├─ app.factory.ts        # 애플리케이션/Swagger 설정 팩토리
│  ├─ app.module.ts         # 루트 모듈
│  └─ main.ts               # 부트스트랩 진입점
├─ test/
│  └─ app.e2e-spec.ts       # E2E 테스트와 설정
├─ views/
│  └─ index.hbs             # 루트 페이지 템플릿 (떠다니는 JLPT 카드 UI)
├─ package.json
├─ tsconfig.json
└─ README.md
```

## Swagger 구성

`src/app.factory.ts`에서 Swagger 설정을 관리합니다. 빌드 시 `swagger.json`이 갱신되어 배포 아티팩트에 포함됩니다.

## 테스트 전략

단위 테스트는 각 구현 파일과 동일한 위치에서 `*.spec.ts`로 관리하며, E2E 테스트는 `test/`에 위치합니다. 외부 API(Supabase 등)는 반드시 모킹하여 결정적 테스트를 유지하세요.

## 배포 노트

- Vercel 환경에서는 `npm run vercel-build`가 실행됩니다.
- Swagger 문서 및 `dist/` 출력물을 배포에 포함해야 합니다.
- 환경 변수는 Vercel 프로젝트 설정과 로컬 `.env`에 동일하게 반영하세요.
