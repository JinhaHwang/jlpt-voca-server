import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JapaneseSentenceWorkflowResult,
  runWorkflow,
} from './japanese-sentence.workflow';

@Injectable()
export class JlptVocaAgentsService {
  private readonly logger = new Logger(JlptVocaAgentsService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateExampleSentence(
    word: string,
  ): Promise<JapaneseSentenceWorkflowResult> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OpenAI integration is not configured. Set OPENAI_API_KEY.',
      );
    }

    try {
      return await runWorkflow({ input_as_text: word });
    } catch (error) {
      this.logger.error(
        `Failed to generate example sentence via OpenAI agents: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Failed to generate example sentence. Please try again later.',
        {
          cause: error instanceof Error ? error : undefined,
        },
      );
    }
  }
}
