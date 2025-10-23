import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNumber } from 'class-validator';

export class GetRandomVocaByIdsQueryDto {
  @ApiProperty({
    description: '조회할 단어 ID 배열',
    type: [Number],
    example: [1, 2, 3],
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null) {
      return [];
    }

    const normalizeToArray = Array.isArray(value) ? value : [value];

    const flattened = normalizeToArray.flatMap((item) => {
      if (item === undefined || item === null) {
        return [];
      }

      if (typeof item === 'string') {
        return item
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part.length > 0);
      }

      return item;
    });

    return flattened
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsNumber({}, { each: true })
  ids!: number[];
}
