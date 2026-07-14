.PHONY: setup dev dev-api dev-web test test-api build e2e db-reset

setup:
	cd backend && go mod download
	cd frontend && npm install

dev:
	$(MAKE) -j2 dev-api dev-web

dev-api:
	cd backend && go run ./cmd/server -addr :8080 -db ./chronova.db

dev-web:
	cd frontend && npm run dev

test: test-api
	cd frontend && npm run build

test-api:
	cd backend && go vet ./... && go test ./...

build:
	cd backend && go build -o bin/server ./cmd/server
	cd frontend && npm run build

e2e:
	cd frontend && npx playwright test

db-reset:
	rm -f backend/chronova.db backend/chronova.db-wal backend/chronova.db-shm
	@echo "次回起動時に再シードされます"
