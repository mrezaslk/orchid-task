import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class MoveTaskDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toColumnId: string;
}

