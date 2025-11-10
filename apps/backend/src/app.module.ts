import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PersistenceModule } from './persistence/persistence.module';
import { BoardsModule } from './boards/boards.module';
import { TasksModule } from './tasks/tasks.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

@Module({
  imports: [
    AppConfigModule,
    PersistenceModule,
    BoardsModule,
    TasksModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
})
export class AppModule {}

