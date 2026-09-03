import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AiLocationDto } from './dto/ai-location.dto';
import { AiStatusResponseDto } from './dto/ai-status-response.dto';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  @Post('my-bus')
  @ApiCreatedResponse({ type: AiStatusResponseDto })
  async logMyBusLocation(
    @Body() payload: AiLocationDto,
    @Query('lat') latQuery?: string,
    @Query('lng') lngQuery?: string,
  ): Promise<AiStatusResponseDto> {
    const lat =
      payload?.lat ??
      (typeof latQuery === 'string' ? Number(latQuery) : undefined);
    const lng =
      payload?.lng ??
      (typeof lngQuery === 'string' ? Number(lngQuery) : undefined);

    if (typeof lat !== 'number' || Number.isNaN(lat)) {
      throw new BadRequestException('lat is required and must be a number');
    }

    if (typeof lng !== 'number' || Number.isNaN(lng)) {
      throw new BadRequestException('lng is required and must be a number');
    }

    this.logger.log(`Received /ai/my-bus coordinates lat=${lat}, lng=${lng}`);

    return { status: 'received' };
  }
}
