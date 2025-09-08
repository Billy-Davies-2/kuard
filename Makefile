# Copyright 2019 The KUARD Authors.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

##### Simplified modern Makefile (Go 1.25 + Next.js/Bun) #####
SHELL := /bin/bash
NAME ?= kuard
MODULE := github.com/kubernetes-up-and-running/kuard
REGISTRY ?= ghcr.io/$(USER)
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COLOR ?= blue
COLORS ?= blue green purple
PLATFORMS ?= linux/amd64,linux/arm64
IMAGE ?= $(REGISTRY)/$(NAME)
DATE := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
GIT_SHA := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)

.PHONY: all
all: build

## Build only the Go binary locally
.PHONY: build
build:
	@echo "-> building backend"
	CGO_ENABLED=0 go build -ldflags "-s -w -X $(MODULE)/pkg/version.VERSION=$(VERSION)-$(COLOR)" -o bin/$(NAME) ./cmd/kuard

## Run the server locally (serves already-built static UI if present)
.PHONY: run
run: build
	@echo "-> running $(NAME) (static mode)"
	./bin/$(NAME)

## Production-style dev: build static frontend then run backend serving it.
.PHONY: dev
dev: web-build build
	@echo "-> starting backend with static exported UI"
	@if [ "$(NO_NATS)" != "1" ]; then \
		echo "-> ensuring local nats-server (JetStream)"; \
		if command -v nats-server >/dev/null 2>&1; then \
			if ! pgrep -f "nats-server" >/dev/null 2>&1; then \
				mkdir -p .dev/nats .dev/logs; \
				echo "   launching nats-server"; \
				nats-server -js -sd .dev/nats > .dev/logs/nats.log 2>&1 & \
				sleep 1; \
			else echo "   nats-server already running"; fi; \
			export NATS_URL?=nats://127.0.0.1:4222; \
		else echo "   nats-server not found (install to enable queues)"; fi; \
	fi; \
	./bin/$(NAME) --debug

## Live reload (old behavior) with Next.js dev server + proxy
.PHONY: dev-live
dev-live:
	@echo "-> launching live dev (backend proxy to :8081) with auto NATS (set NO_NATS=1 to skip)"
	@if [ "$(NO_NATS)" = "1" ]; then bash scripts/dev.sh; else bash scripts/dev.sh --with-nats; fi

## Build production frontend with Bun
.PHONY: web-build
web-build:
	@echo "-> building frontend (Next.js static export)"
	cd web && bun install && bun run build

## Multi-arch image build using buildx (requires docker buildx)
.PHONY: image
image:
	@echo "-> building image $(IMAGE):$(VERSION)-$(COLOR)"
	docker buildx build --platform $(PLATFORMS) \
		--build-arg VERSION=$(VERSION) --build-arg COLOR=$(COLOR) \
		-t $(IMAGE):$(VERSION)-$(COLOR) -t $(IMAGE):$(COLOR) .

## Push multi-arch image (add --push)
.PHONY: push
push:
	@echo "-> building & pushing image"
	docker buildx build --platform $(PLATFORMS) \
		--build-arg VERSION=$(VERSION) --build-arg COLOR=$(COLOR) \
		-t $(IMAGE):$(VERSION)-$(COLOR) -t $(IMAGE):$(COLOR) --push .

## Build & push all color variants sequentially
.PHONY: push-all-colors
push-all-colors:
	@for c in $(COLORS); do \
		echo "==> $$c"; \
		docker buildx build --platform $(PLATFORMS) \
			--build-arg VERSION=$(VERSION) --build-arg COLOR=$$c \
			-t $(IMAGE):$(VERSION)-$$c -t $(IMAGE):$$c --push .; \
	done

## Run tests (Go + Bun)
.PHONY: test
test:
	@echo "-> go tests"
	go test ./... -count=1
	@if [ -d web/tests ]; then echo "-> bun tests"; (cd web && bun install && bun test); fi

## Generate coverage profile & HTML report (Go only)
.PHONY: cover
cover:
	@echo "-> running coverage"
	go test ./... -coverprofile=coverage.out -covermode=atomic
	go tool cover -func=coverage.out | grep total:
	go tool cover -html=coverage.out -o coverage.html

## Clean build artifacts
.PHONY: clean
clean:
	rm -rf bin web/.next web/node_modules

.PHONY: help
help:
	@echo 'Targets:'
	@grep -E '^\.PHONY: ' Makefile | cut -d' ' -f2- | tr ' ' '\n' | sed 's/^/  /'
