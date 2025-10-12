import { Controller, Get, Render } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';

@ApiTags('Root')
@Controller()
export class AppController {
  @Get()
  @ApiExcludeEndpoint()
  @Render('index')
  root() {
    // 빈 객체 반환 (클라이언트에서 hash 파라미터로 처리)
    return {};
  }
}
