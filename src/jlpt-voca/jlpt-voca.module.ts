import { Module } from '@nestjs/common';
import { JlptVocaController } from './jlpt-voca.controller';
import { JlptVocaService } from './jlpt-voca.service';
import { JlptVocaAgentsService } from './jlpt-voca-agents.service';

@Module({
  controllers: [JlptVocaController],
  providers: [JlptVocaService, JlptVocaAgentsService],
})
export class JlptVocaModule {}
