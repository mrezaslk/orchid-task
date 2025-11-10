import { Injectable, NotFoundException } from '@nestjs/common';
import { BoardsRepository } from './boards.repository';
import { RedisService } from '../persistence/redis.service';

@Injectable()
export class BoardsService {
  constructor(
    private boardsRepository: BoardsRepository,
    private redisService: RedisService,
  ) {}

  async getBoard(boardId: string) {
    const cacheKey = `board:${boardId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const board = await this.boardsRepository.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    await this.redisService.set(cacheKey, board, 30);
    return board;
  }

  async getAllBoards() {
    return this.boardsRepository.findAll();
  }

  async invalidateBoardCache(boardId: string) {
    await this.redisService.del(`board:${boardId}`);
  }
}

