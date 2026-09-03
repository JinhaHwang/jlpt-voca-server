import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateStudyInsightDto } from './dto/create-study-insight.dto';
import { StudyInsightResponseDto } from './dto/study-insight-response.dto';
import { StudyInsightsService } from './study-insights.service';

@ApiTags('Study Insights')
@Controller('study-insights')
export class StudyInsightsController {
  constructor(private readonly studyInsightsService: StudyInsightsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '현재 학습 상태 AI 분석' })
  @ApiOkResponse({ type: StudyInsightResponseDto })
  async createInsight(
    @Body() body: CreateStudyInsightDto,
  ): Promise<StudyInsightResponseDto> {
    return this.studyInsightsService.createInsight(body);
  }
}
