import { Injectable } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksRepository {
  constructor(private prisma: PrismaService) {}

  async findByBoardId(boardId: string) {
    return this.prisma.task.findMany({
      where: { boardId },
      include: {
        column: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(taskId: string) {
    return this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: true,
      },
    });
  }

  async create(data: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        boardId: data.boardId,
        columnId: data.columnId,
      },
      include: {
        column: true,
      },
    });
  }

  async move(taskId: string, toColumnId: string) {
    return this.prisma.task.update({
      where: { id: taskId },
      data: { columnId: toColumnId },
      include: {
        column: true,
      },
    });
  }
}

