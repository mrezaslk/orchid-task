import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BoardsService } from './boards.service';

@ApiTags('boards')
@Controller('boards')
export class BoardsController {
  constructor(private boardsService: BoardsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all boards' })
  async getAllBoards() {
    return this.boardsService.getAllBoards();
  }

  @Get(':boardId')
  @ApiOperation({ summary: 'Get board by ID with columns' })
  async getBoard(@Param('boardId') boardId: string) {
    return this.boardsService.getBoard(boardId);
  }
}

