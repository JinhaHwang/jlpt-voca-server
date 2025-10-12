import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index')
  root() {
    // 빈 객체 반환 (클라이언트에서 hash 파라미터로 처리)
    return {};
  }
}
