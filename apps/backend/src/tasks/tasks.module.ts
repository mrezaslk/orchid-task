import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [BoardsModule],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService],
})
export class TasksModule {}

