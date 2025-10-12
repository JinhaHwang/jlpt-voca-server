import { Module } from '@nestjs/common';
import { JlptVocaController } from './jlpt-voca.controller';
import { JlptVocaService } from './jlpt-voca.service';

@Module({
  controllers: [JlptVocaController],
  providers: [JlptVocaService],
})
export class JlptVocaModule {}
