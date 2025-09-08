# Demo application for "Kubernetes Up and Running"

![screenshot](docs/images/screenshot.png)

### Quick Run (Kubernetes)

```
kubectl run --restart=Never --image=gcr.io/kuar-demo/kuard-amd64:blue kuard
kubectl port-forward kuard 8080:8080
```

Then browse to http://localhost:8080 (UI now served at root `/`).

### Building (Local)

We now use:
* Go 1.25
* Bun + Next.js for the web UI (TailwindCSS v4)
* Multi‑stage Docker build (frontend → Go binary → distroless runtime)

Standard targets (see `Makefile`):

```
make build        # build kuard binary + frontend (production)
make test         # run unit + integration + fuzz seeds
make cover        # generate coverage.html
make image        # build multi-arch container image (requires buildx setup)
make push-all-colors REGISTRY=<your-registry>
```

#### Legacy "Insert Binary" Pattern
Still possible, but the multi-stage `Dockerfile` replaces this. See previous revisions if needed.

#### Multi-stage Dockerfile

```
docker build -t kuard:dev .
docker run --rm -p 8080:8080 kuard:dev
```

Multi-arch (example):
```
docker buildx build --platform linux/amd64,linux/arm64 -t <reg>/kuard:blue --push .
```

#### Makefile Convenience

```
make clean        # remove build artifacts
make push-all-colors REGISTRY=<reg>  # push blue, green, purple variants
```

If something seems off: `make clean`.

### KeyGen Workload

To help simulate batch workers, we have a synthetic workload of generating 4096 bit RSA keys.  This can be configured through the UI or the command line.

```
--keygen-enable               Enable KeyGen workload
--keygen-exit-code int        Exit code when workload complete
--keygen-exit-on-complete     Exit after workload is complete
--keygen-memq-queue string    The MemQ server queue to use. If MemQ is used, other limits are ignored.
--keygen-memq-server string   The MemQ server to draw work items from.  If MemQ is used, other limits are ignored.
--keygen-num-to-gen int       The number of keys to generate. Set to 0 for infinite
--keygen-time-to-run int      The target run time in seconds. Set to 0 for infinite
```

### Queue API (NATS JetStream Only)

MemQ has been simplified to rely exclusively on NATS JetStream. Set `NATS_URL` (default `nats://127.0.0.1:4222`). If NATS is unreachable, queue APIs will return errors.
Endpoints (query param style) under base path `/memq/server`:

| Method | URL | Query | Desc |
|--------|-----|-------|------|
| GET | `/stats` | – | Stats for all queues |
| PUT | `/queues` | `?queue=<name>` | Create queue |
| DELETE | `/queues` | `?queue=<name>` | Delete queue |
| POST | `/queues/drain` | `?queue=<name>` | Drain queue |
| POST | `/queues/enqueue` | `?queue=<name>` | Enqueue (body=text) |
| POST | `/queues/dequeue` | `?queue=<name>` | Dequeue (204 if empty) |

Queues map to JetStream streams (name prefix `MEMQ_` and subjects `memq.<queue>`). Messages persist across restarts; drain uses stream purge preserving consumers.

### Versions

Images built will automatically have the git version (based on tag) applied.  In addition, there is an idea of a "fake version".  This is used so that we can use the same basic server to demonstrate upgrade scenarios.

Originally (and in the Kubernetes Up & Running book) we had `1`, `2`, and `3`.  This confused people so going forward we will be using colors instead: `blue`, `green` and `purple`. This translates into the following container images:

```
gcr.io/kuar-demo/kuard-amd64:v0.9-blue
gcr.io/kuar-demo/kuard-amd64:blue
gcr.io/kuar-demo/kuard-amd64:v0.9-green
gcr.io/kuar-demo/kuard-amd64:green
gcr.io/kuar-demo/kuard-amd64:v0.9-purple
gcr.io/kuar-demo/kuard-amd64:purple
```

For documentation where you want to demonstrate using versions but use the latest version of this server, you can simply reference `gcr.io/kuar-demo/kuard-amd64:blue`.  You can then demonstrate an upgrade with `gcr.io/kuar-demo/kuard-amd64:green`.

(Another way to think about it is that `:blue` is essentially `:latest-blue`)

We also build versions for `arm`, `arm64`, and `ppc64le`.  Just substitute the appropriate architecture in the image name.  These aren't as well tested as the `amd64` version but seem to work okay.

### Development (Go + Next.js UI)

Backend only:
```
go run ./cmd/kuard --debug
```

Full stack live dev (two terminals):
1. Start Go server (proxy mode enabled automatically for dev UI detection):
```
go run ./cmd/kuard --debug
```
2. Start frontend dev server:
```
cd web
bun install
bun run dev   # serves on :8081
```
3. Visit: http://localhost:8080 (server proxies to Next.js dev when available).

Production UI build embeds static export into container during `make build`.

#### WSL / No-Docker Local Development

If you cannot run Docker locally (e.g. minimal WSL distro), you can still do full stack dev:

```
make dev            # runs scripts/dev.sh
```

What it does:
* Starts (or reuses) Next.js dev server on :8081 via Bun.
* Runs backend with `NEXT_DEV=1` so root `/` proxies to that dev server.
* If you install `nats-server` and run `scripts/dev.sh --with-nats`, it will start a local JetStream instance under `.dev/nats`.

Manual alternative:
1. (Optional) Install NATS: `curl -L https://github.com/nats-io/nats-server/releases/latest/download/nats-server-linux-amd64.zip` (unzip & add to PATH)
2. Start NATS (optional): `nats-server -js -sd .dev/nats`
3. Terminal A: `cd web && bun install && bun run dev`
4. Terminal B: `NEXT_DEV=1 NATS_URL=nats://127.0.0.1:4222 go run ./cmd/kuard --debug`
5. Browse: http://localhost:8080

Logs are written to `.dev/logs` when using the helper script.

### Completed Modernization Tasks
* [x] Replace go-bindata with native file serving & templates
* [x] Migrate UI to Next.js + Bun + Tailwind
* [x] Introduce generic JSON hook with reload
* [x] Enhance filesystem browser (icons, breadcrumb, sorting)
* [x] Simplify keygen workload form
* [x] NATS JetStream backend (now required; in-memory removed)
* [x] Add unit / integration / fuzz tests + coverage target
* [x] Multi-stage Docker + distroless runtime

### Remaining Ideas / Future Work
* Richer NATS stats (pending/ack counts) in /memq/server/stats
* Dark mode + improved responsive layout
* UI surfacing build metadata & backend mode (NATS vs memory)
* More advanced FS permissions/owner info (needs API extension)
* Additional chaos / probe controls in UI
