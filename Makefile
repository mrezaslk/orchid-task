.PHONY: help install dev build up down logs clean seed prisma-push prisma-studio lint test format

dev:
	@echo "🚀 Starting development databases..."
	docker compose -f infra/compose.dev.yaml up -d

down:
	@echo "🛑 Stopping all Docker services..."
	docker compose -f infra/compose.yaml down
	docker compose -f infra/compose.dev.yaml down

logs:
	@echo "📋 Showing logs..."
	docker compose -f infra/compose.yaml logs -f

prisma-push:
	@echo "📊 Pushing Prisma schema to database..."
	cd apps/backend && pnpm prisma:push

prisma-studio:
	@echo "🎨 Opening Prisma Studio..."
	cd apps/backend && pnpm prisma:studio

seed:
	@echo "🌱 Seeding database..."
	cd apps/backend && pnpm seed



