import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiExcludeEndpoint()
  root(@Res() res: Response) {
    // Supabase 이메일 인증 콜백을 위한 간단한 HTML
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JLPT Vocabulary API</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.2rem;
      margin-bottom: 2rem;
    }
    a {
      display: inline-block;
      padding: 0.8rem 2rem;
      background: white;
      color: #667eea;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: transform 0.2s;
    }
    a:hover {
      transform: translateY(-2px);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🇯🇵 JLPT Vocabulary API</h1>
    <p>JLPT 단어 학습을 위한 API 서버입니다</p>
    <a href="/api/docs">API 문서 보기</a>
  </div>
  <script>
    // Supabase 이메일 인증 콜백 처리
    if (window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      
      if (accessToken) {
        // 토큰을 클라이언트 앱으로 전달 (필요 시)
        console.log('Authentication successful');
        // window.opener?.postMessage({ accessToken, refreshToken }, '*');
      }
    }
  </script>
</body>
</html>
    `;

    res.type('text/html').send(html);
  }
}
