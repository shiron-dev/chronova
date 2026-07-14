.PHONY: setup dev dev-api dev-web test test-api test-web build e2e db-reset

setup:
	cd backend && go mod download
	cd frontend && npm install

dev:
	$(MAKE) -j2 dev-api dev-web

dev-api:
	cd backend && go run ./cmd/server -addr :8080 -db ./chronova.db

dev-web:
	cd frontend && npm run dev

# 全テスト: backend(vet+test) → frontend単体(vitest) → 本番ビルド(型チェック)
test: test-api test-web
	cd frontend && npm run build

test-api:
	cd backend && go vet ./... && go test ./...

test-web:
	cd frontend && npm run test

build:
	cd backend && go build -o bin/server ./cmd/server
	cd frontend && npm run build

# ローカルではプリインストールのChromiumを使う。CIでは環境変数を渡さず標準解決に任せる。
e2e:
	cd frontend && PLAYWRIGHT_CHROMIUM_PATH=$${PLAYWRIGHT_CHROMIUM_PATH:-/opt/pw-browsers/chromium} npx playwright test

db-reset:
	rm -f backend/chronova.db backend/chronova.db-wal backend/chronova.db-shm
	@echo "次回起動時に再シードされます"
