import { Module } from '@nestjs/common';

import { StudyInsightsController } from './study-insights.controller';
import { StudyInsightsService } from './study-insights.service';

@Module({
  controllers: [StudyInsightsController],
  providers: [StudyInsightsService],
})
export class StudyInsightsModule {}
