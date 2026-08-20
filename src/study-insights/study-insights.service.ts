import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CreateStudyInsightDto } from './dto/create-study-insight.dto';
import { runStudyInsightWorkflow } from './study-insight.workflow';

export type StudyInsightStatus = 'not_started' | 'in_progress' | 'completed';

export interface StudyInsightContext extends CreateStudyInsightDto {
  status: StudyInsightStatus;
  progressRate: number;
  studiedWordCount: number;
  remainingWordCount: number;
}

export interface StudyInsightResult {
  status: StudyInsightStatus;
  progressRate: number;
  summary: string;
  nextAction: string;
}

@Injectable()
export class StudyInsightsService {
  private readonly logger = new Logger(StudyInsightsService.name);

  constructor(private readonly configService: ConfigService) {}

  async createInsight(
    input: CreateStudyInsightDto,
  ): Promise<StudyInsightResult> {
    if (!this.configService.get<string>('OPENAI_API_KEY')) {
      throw new ServiceUnavailableException(
        'OpenAI integration is not configured. Set OPENAI_API_KEY.',
      );
    }

    const context = this.createContext(input);

    try {
      const message = await runStudyInsightWorkflow(context);
      return {
        status: context.status,
        progressRate: context.progressRate,
        ...message,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create study insight: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to create study insight. Please try again later.',
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  private createContext(input: CreateStudyInsightDto): StudyInsightContext {
    const studiedWordCount = Math.min(
      input.learnedWordCount + input.repeatWordCount,
      input.targetWordCount,
    );
    const remainingWordCount = Math.max(
      input.targetWordCount - studiedWordCount,
      0,
    );
    const status: StudyInsightStatus =
      input.reviewCount > 0
        ? 'completed'
        : studiedWordCount > 0
        ? 'in_progress'
        : 'not_started';
    const progressRate =
      status === 'completed'
        ? 100
        : Math.round((studiedWordCount / input.targetWordCount) * 100);

    return {
      ...input,
      status,
      progressRate,
      studiedWordCount,
      remainingWordCount,
    };
  }
}
