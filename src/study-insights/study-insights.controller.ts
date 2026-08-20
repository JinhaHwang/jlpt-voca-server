import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CreateStudyInsightDto } from './dto/create-study-insight.dto';
import { StudyInsightsService } from './study-insights.service';

@ApiTags('Study Insights')
@Controller('study-insights')
export class StudyInsightsController {
  constructor(private readonly studyInsightsService: StudyInsightsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '현재 학습 상태 AI 분석' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        status: 'in_progress',
        progressRate: 80,
        summary: 'N2 Unit 14 학습을 80% 완료했어요.',
        nextAction: '남은 10단어를 학습한 뒤 헷갈린 8단어를 복습해 보세요.',
      },
    },
  })
  async createInsight(@Body() body: CreateStudyInsightDto) {
    return this.studyInsightsService.createInsight(body);
  }
}
