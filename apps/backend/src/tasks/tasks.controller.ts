import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get tasks by board ID' })
  async getTasksByBoard(@Query('boardId') boardId: string) {
    return this.tasksService.getTasksByBoard(boardId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.createTask(createTaskDto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Move task to another column' })
  async moveTask(@Param('id') taskId: string, @Body() moveTaskDto: MoveTaskDto) {
    return this.tasksService.moveTask(taskId, moveTaskDto);
  }
}

