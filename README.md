# Simple Task Board

A minimal Trello-like task board with drag & drop functionality.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- Docker


## 🔧 Configuration

### Backend (.env)
```env
DATABASE_URL=postgresql://app:app@localhost:5432/app?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=8000
NODE_ENV=development
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```


### Setup & Run

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
make dev

# 3. Setup database
cd apps/backend
pnpm prisma:generate
pnpm prisma:push
pnpm seed

# 4. Start backend (terminal 1)
cd apps/backend
pnpm start:dev

# 5. Start frontend (terminal 2)
cd apps/frontend
pnpm dev
```

Visit: **http://localhost:3000**


## 📦 What's Included

### Backend (NestJS)
- **Boards** - Manage task boards
- **Columns** - Board columns (To Do, In Progress, Done)
- **Tasks** - Create and move tasks
- **Redis Cache** - Optional caching layer
- **Swagger Docs** - http://localhost:8000/docs

### Frontend (Next.js 15)
- **Drag & Drop** - dnd-kit integration
- **Real-time Updates** - SWR data fetching
- **Responsive UI** - Tailwind CSS

### Database (PostgreSQL)
- **Board** - Task boards
- **Column** - Board columns
- **Task** - Tasks with title, description

## 🏗️ Project Structure

```
apps/
├── backend/                # NestJS API
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── src/
│       ├── boards/         # Board management
│       ├── tasks/          # Task CRUD & movement
│       ├── persistence/    # Prisma & Redis
│       ├── config/         # Environment config
│       └── seeds/          # Database seeding
│
└── frontend/               # Next.js App
    └── src/
        ├── app/            # App Router pages
        ├── components/     # React components
        ├── hooks/          # Custom hooks
        └── lib/            # API client

packages/
├── tsconfig/              # Shared TypeScript configs
└── eslint-config/         # Shared ESLint configs
```

## 🛠️ Available Commands

```bash
# Development
make dev              # Start PostgreSQL
make down             # Stop all services

# Backend
cd apps/backend
pnpm start:dev        # Start with hot reload
pnpm prisma:studio    # Open Prisma Studio
pnpm seed             # Seed database

# Frontend
cd apps/frontend
pnpm dev              # Start dev server
pnpm build            # Production build

# Code Quality
pnpm lint             # Lint all apps
pnpm format           # Format all code
```

## 📚 API Endpoints

- `GET /api/boards` - List boards
- `GET /api/boards/:id` - Get board with columns
- `GET /api/tasks?boardId=:id` - List tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id/move` - Move task to column

Full API docs at: http://localhost:8000/docs

## 🗄️ Reset Database

If you need to start fresh:

```bash
cd apps/backend

# Option 1: Using the script
./reset-db.sh
pnpm prisma:push
pnpm seed

# Option 2: Manual
docker exec -it taskboard-db-dev psql -U app -d postgres -c "DROP DATABASE IF EXISTS app;"
docker exec -it taskboard-db-dev psql -U app -d postgres -c "CREATE DATABASE app;"
pnpm prisma:push
pnpm seed
```

## 🎯 Features

- ✅ Drag and drop tasks between columns
- ✅ Create new tasks
- ✅ Responsive design
- ✅ Real-time updates
- ✅ Persistent storage with PostgreSQL
- ✅ API documentation with Swagger


## 📝 License

MIT
