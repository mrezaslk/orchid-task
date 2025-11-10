import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement login feature' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Add JWT authentication to the backend' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  boardId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  columnId: string;
}

