import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';

@Injectable()
export class BoardsRepository {
  constructor(private prisma: PrismaService) {}

  async findById(boardId: string) {
    return this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.board.findMany({
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async create(name: string) {
    return this.prisma.board.create({
      data: { name },
    });
  }
}

