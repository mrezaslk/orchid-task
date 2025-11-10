import { Injectable, NotFoundException } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { RedisService } from '../persistence/redis.service';
import { BoardsService } from '../boards/boards.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private tasksRepository: TasksRepository,
    private redisService: RedisService,
    private boardsService: BoardsService,
  ) {}

  async getTasksByBoard(boardId: string) {
    const cacheKey = `tasks:board:${boardId}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const tasks = await this.tasksRepository.findByBoardId(boardId);
    
    // Add enteredAt timestamp (using updatedAt as proxy for when it entered current column)
    const enrichedTasks = tasks.map((task) => ({
      ...task,
      enteredAt: task.updatedAt,
    }));
    
    await this.redisService.set(cacheKey, enrichedTasks, 30);
    return enrichedTasks;
  }

  async createTask(createTaskDto: CreateTaskDto) {
    const task = await this.tasksRepository.create(createTaskDto);
    
    // Invalidate caches
    await this.redisService.del(`tasks:board:${task.boardId}`);
    await this.boardsService.invalidateBoardCache(task.boardId);
    
    return {
      ...task,
      enteredAt: task.createdAt,
    };
  }

  async moveTask(taskId: string, moveTaskDto: MoveTaskDto) {
    const task = await this.tasksRepository.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const updatedTask = await this.tasksRepository.move(taskId, moveTaskDto.toColumnId);

    // Invalidate caches
    await this.redisService.del(`tasks:board:${updatedTask.boardId}`);
    await this.boardsService.invalidateBoardCache(updatedTask.boardId);

    return {
      ...updatedTask,
      enteredAt: updatedTask.updatedAt, // Time when it entered the new column
    };
  }
}

