import { Controller, Get, Query } from '@nestjs/common';
import { GetJlptVocaQueryDto } from './dto/get-jlpt-voca-query.dto';
import { GetRandomVocaQueryDto } from './dto/get-random-voca-query.dto';
import { JlptVocaService } from './jlpt-voca.service';

@Controller('jlpt-voca')
export class JlptVocaController {
  constructor(private readonly jlptVocaService: JlptVocaService) {}

  @Get()
  async list(@Query() query: GetJlptVocaQueryDto) {
    return this.jlptVocaService.findAll(query);
  }

  @Get('random')
  async random(@Query() query: GetRandomVocaQueryDto) {
    return this.jlptVocaService.findRandom(query);
  }
}
