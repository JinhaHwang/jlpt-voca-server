# 카카오·네이버 로그인 설정

## 구현과 범위

`/login`에서 카카오 또는 네이버를 선택하고 `/auth/callback`에서 Supabase PKCE 코드를 세션으로 교환한다. 로그인 상태는 Supabase SDK가 보관·갱신하고 React Query에는 사용자 정보만 노출한다. 서비스 API 요청에는 현재 Supabase 액세스 토큰을 전달한다. 인증 HTTP는 공식 SDK가 담당하고 앱 API는 기존 `src/lib/api.ts`를 사용한다.

로그인은 선택 사항이다. 학습 기록은 기존 브라우저 저장소에 유지되며 계정 간 분리나 기기 간 동기화는 이 변경에 포함되지 않는다. 로그아웃은 현재 세션만 종료한다. 카카오와 네이버를 같은 사용자로 자동 연결하지 않는다.

## 1. 프런트엔드 환경 설정

로컬 `.env.development.local` 및 배포 환경에 다음 값을 등록한다. 변경 후 개발 서버 재시작 또는 재배포가 필요하다.

| 변수 | 값 |
|---|---|
| `VITE_SUPABASE_URL` | 기존 API 서버와 동일한 Supabase 프로젝트 URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | 해당 프로젝트의 publishable key 또는 기존 anon key |

`service_role`, secret key, 카카오/네이버 Client Secret은 `VITE_*` 변수에 넣지 않는다. 환경 파일을 커밋하지 않는다. 두 변수가 없으면 로그인 버튼은 비활성화되고 게스트 학습은 계속 가능하다.

Supabase Authentication → URL Configuration에 서비스 Site URL과 다음 Redirect URL을 등록한다.

- 로컬: `http://localhost:3000/auth/callback`
- 운영: `https://dadokdadok.vercel.app/auth/callback` (실제 배포 도메인이 다르면 교체)

## 2. 카카오

1. [Kakao Developers](https://developers.kakao.com/)에서 앱을 만들고 카카오 로그인을 활성화한다.
2. 앱의 REST API 키와 활성화된 Client Secret을 Supabase Authentication → Sign In / Providers → Kakao에 입력한다.
3. 해당 Supabase 화면에 표시된 Callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`)을 카카오 Redirect URI로 등록한다. 프런트엔드 `/auth/callback`과 다른 주소다.
4. 필요한 프로필 동의 항목을 등록한다. 이메일을 받지 않는 경우 Supabase의 Allow users without an email을 활성화한다.
5. 앱 이용 도메인을 등록하고 개발/운영 계정으로 로그인한다.

## 3. 네이버

네이버의 중첩 프로필(`response.id`)과 토큰 교환 시 `state` 요구를 Supabase OAuth2에 연결하기 위해 `jlpt-voca-server`의 `NaverOAuthController`가 필요하다. 서버 변경을 먼저 배포한다.

### 서버 환경

| 변수 | 값 |
|---|---|
| `SUPABASE_URL` | 기존 프로젝트 URL |
| `NAVER_CLIENT_ID` | 네이버 앱 Client ID |
| `NAVER_CLIENT_SECRET` | 네이버 앱 Client Secret |
| `NAVER_OAUTH_STATE_SECRET` | 안전한 난수로 생성한 32자 이상의 서버 전용 서명키 |
| `NAVER_OAUTH_CALLBACK_URL` | `https://jlpt-voca-server.vercel.app/api/auth/naver/callback` |

네이버 개발자센터에서 로그인 API를 신청하고 서비스 URL을 등록한다. Callback URL에는 위 `NAVER_OAUTH_CALLBACK_URL`을 등록한다. 닉네임은 선택 동의로 사용할 수 있으며 식별에는 네이버 고유 ID만 사용한다. 일반 이용자에게 공개하기 전 네이버 검수·서비스 적용 상태를 확인한다.

### Supabase 사용자 지정 제공자

Authentication → Sign In / Providers → New Provider → Manual configuration에서 아래를 등록한다. 이 기능을 지원하는 Supabase Auth 버전이 필요하다.

| 항목 | 설정 |
|---|---|
| Identifier | `custom:naver` |
| Type | OAuth2 |
| Client ID / Secret | 위 네이버 앱 Client ID / Secret |
| Authorization URL | `https://jlpt-voca-server.vercel.app/api/auth/naver/authorize` |
| Token URL | `https://jlpt-voca-server.vercel.app/api/auth/naver/token` |
| UserInfo URL | `https://jlpt-voca-server.vercel.app/api/auth/naver/userinfo` |
| Scopes | 빈 목록 |
| Email optional | `true` |
| PKCE enabled | `false` (네이버 제공자 구간만 해당) |

Supabase → 네이버 구간에는 네이버가 제공하는 인증 코드·state 검증을 사용한다. **브라우저 → Supabase 구간의 PKCE는 항상 유지한다.** Supabase 표시 Callback URL이 서버의 `SUPABASE_URL` + `/auth/v1/callback`과 같은지 확인한다. 브리지는 정확히 이 주소로만 되돌려 보낸다.

관리 화면에 고급 설정이 없으면 Supabase 공식 Admin API의 `customProviders`에서 `email_optional: true`, `pkce_enabled: false`를 지정한다. 관리자 자격 증명은 서버나 관리자 도구에서만 사용한다.

### 네이버 흐름

브라우저 → Supabase → API `/authorize` → 네이버 → API `/callback` → Supabase → 프런트엔드 `/auth/callback`.

Supabase는 API `/token`에서 네이버 코드를 교환하고 `/userinfo`에서 고유 ID를 가져온다. 브리지는 서명된 10분 state와 최대 1분 코드를 사용하고 토큰 교환에 Client Secret을 요구한다. 인증 코드는 네이버에서 한 번만 사용할 수 있다. 서버는 공급자 오류 원문, 토큰, 인증 URL 쿼리를 애플리케이션 로그에 출력하지 않는다. 배포 플랫폼의 access log에도 인증 쿼리·본문을 저장하지 않도록 설정한다.

## 4. 운영 연결 확인

- 두 제공자 모두 동의 → 홈 이동 → 내 계정 표시 확인
- 새로고침·액세스 토큰 만료 후에도 로그인 유지 확인
- 동의 취소·만료된 코드 → 재시도 화면 확인
- 로그아웃 → 로그인 버튼으로 변경 및 게스트 학습 확인
- 모바일 브라우저와 카카오 인앱 브라우저에서 복귀 확인
- 학습 기록이 로그인/로그아웃 전후 동일하게 유지되는지 확인

자동 테스트는 공급자 응답을 고정한다. 실제 앱 키, 개발자 콘솔 등록, 네이버 검수와 실계정 로그인 확인은 별도로 필요하다.

## 근거

- [Supabase 카카오 로그인](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Supabase 사용자 지정 OAuth 제공자](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [네이버 로그인 API 명세](https://developers.naver.com/docs/login/api/api.md)
- [네이버 프로필 조회 API](https://developers.naver.com/docs/login/profile/profile.md)
