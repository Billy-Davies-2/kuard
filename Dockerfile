########## Modern multi-stage build (frontend + backend) ##########
# 1. Build frontend (Next.js) with Bun
FROM oven/bun:1 AS frontend
WORKDIR /app/web

# Copy only dependency manifests first for better layer caching
COPY web/package.json web/bun.lockb* ./
COPY web/tsconfig.json web/tailwind.config.* web/postcss.config.* ./

# Install dependencies (cached if manifest unchanged)
RUN bun install

# Copy the rest of the frontend source
COPY web/. .

# Build production assets (configured for static export via next.config.js -> out/)
RUN bun run build

# 2. Build backend (Go)
FROM golang:1.25-alpine AS backend
WORKDIR /app
RUN apk add --no-cache git ca-certificates build-base

ARG VERSION=dev
ARG COLOR=blue
ENV CGO_ENABLED=0

# Cache go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy backend sources (exclude web node_modules by not copying their artifacts from root)
COPY . .

# Inject version (git describe + color) into pkg/version.VERSION
RUN --mount=type=cache,target=/root/.cache/go-build \
	--mount=type=cache,target=/go/pkg \
	go build -ldflags "-s -w -X github.com/kubernetes-up-and-running/kuard/pkg/version.VERSION=${VERSION}-${COLOR}" -o /app/kuard ./cmd/kuard

# 3. Minimal runtime image
FROM gcr.io/distroless/static:nonroot AS runtime
WORKDIR /app
COPY --from=backend /app/kuard /app/kuard
COPY --from=frontend /app/web/out /app/web/out

USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app/kuard"]

LABEL org.opencontainers.image.source="https://github.com/kubernetes-up-and-running/kuard" \
	  org.opencontainers.image.title="kuard" \
	  org.opencontainers.image.description="Kubernetes Up and Running Demo (modernized build)" \
	  org.opencontainers.image.version="${VERSION}-${COLOR}" \
	  org.opencontainers.image.licenses="Apache-2.0"
