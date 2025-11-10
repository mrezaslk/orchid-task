import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a board
  const board = await prisma.board.upsert({
    where: { id: 'default-board' },
    update: {},
    create: {
      id: 'default-board',
      name: 'My Task Board',
    },
  });
  console.log('✅ Board created:', board.name);

  // Create columns
  const todoColumn = await prisma.column.upsert({
    where: { id: 'col-todo' },
    update: {},
    create: {
      id: 'col-todo',
      boardId: board.id,
      name: 'To Do',
      position: 0,
    },
  });

  const inProgressColumn = await prisma.column.upsert({
    where: { id: 'col-in-progress' },
    update: {},
    create: {
      id: 'col-in-progress',
      boardId: board.id,
      name: 'In Progress',
      position: 1,
    },
  });

  const doneColumn = await prisma.column.upsert({
    where: { id: 'col-done' },
    update: {},
    create: {
      id: 'col-done',
      boardId: board.id,
      name: 'Done',
      position: 2,
    },
  });

  console.log('✅ Columns created: To Do, In Progress, Done');

  // Create tasks
  const tasks = [
    {
      id: 'task-1',
      title: 'Setup project repository',
      description: 'Initialize monorepo with Turborepo and configure workspaces',
      columnId: doneColumn.id,
    },
    {
      id: 'task-2',
      title: 'Implement authentication',
      description: 'Add JWT authentication with login endpoint',
      columnId: inProgressColumn.id,
    },
    {
      id: 'task-3',
      title: 'Add drag and drop',
      description: 'Integrate dnd-kit for task board interactions',
      columnId: todoColumn.id,
    },
  ];

  for (const taskData of tasks) {
    const task = await prisma.task.upsert({
      where: { id: taskData.id },
      update: {},
      create: {
        id: taskData.id,
        title: taskData.title,
        description: taskData.description,
        boardId: board.id,
        columnId: taskData.columnId,
      },
    });

    console.log('✅ Task created:', task.title);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
