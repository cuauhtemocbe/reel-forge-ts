.DEFAULT_GOAL := help

.PHONY: help lock-check validate

help: ## Mostrar esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

lock-check: ## Verificar que pnpm-lock.yaml está sincronizado con package.json
	@echo "🔒 Checking pnpm-lock.yaml sync..."
	pnpm install --frozen-lockfile
	@echo "✅ Lockfile in sync"

validate: lock-check ## Validación completa: lockfile + typecheck + test:coverage + lint + audit (gateado en pre-push/pre-merge-commit a main)
	@echo "📝 Running TypeScript type checking..."
	pnpm run typecheck
	@echo "✅ TypeScript type checking passed"
	@echo "🧪 Running tests with coverage..."
	pnpm run test:coverage
	@echo "✅ Tests and coverage passed"
	@echo "🧹 Running lint..."
	pnpm run lint
	@echo "✅ Lint passed"
	@echo "🔒 Running security audit..."
	@pnpm audit --audit-level moderate || echo "⚠️  Security audit found issues (continuing...)"
	@echo "🎉 All validations completed successfully!"
