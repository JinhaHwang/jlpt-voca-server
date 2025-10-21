import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GenerateExampleSentenceDto {
  @ApiProperty({
    description: '예문을 생성할 일본어 단어',
    example: '学校',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  word: string;
}
