import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  Query,
} from '@nestjs/common';

type AiLocationPayload = {
  lat?: number;
  lng?: number;
};

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  @Post('my-bus')
  async logMyBusLocation(
    @Body() payload: AiLocationPayload,
    @Query('lat') latQuery?: string,
    @Query('lng') lngQuery?: string,
  ) {
    const lat =
      payload?.lat ?? (typeof latQuery === 'string' ? Number(latQuery) : undefined);
    const lng =
      payload?.lng ?? (typeof lngQuery === 'string' ? Number(lngQuery) : undefined);

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
