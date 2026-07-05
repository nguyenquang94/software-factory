# infra — local dev environment

Docker Compose stack for Software Factory development (issue #2, UOW-101 / T-101.2).

## Prerequisites

- Docker with Compose v2

## Run

```bash
cp infra/.env.example infra/.env   # then edit ANTHROPIC_API_KEY etc.
docker compose -f infra/docker-compose.dev.yml --env-file infra/.env up -d
```

Stop: `docker compose -f infra/docker-compose.dev.yml down` (add `-v` to wipe data).

## Services & ports

| Service     | Image                             | Port | Notes                                            |
| ----------- | --------------------------------- | ---- | ------------------------------------------------ |
| postgres    | pgvector/pgvector:pg16            | 5432 | DB `factory`; healthcheck `pg_isready`           |
| redis       | redis:7-alpine                    | 6379 | healthcheck `redis-cli ping`                     |
| temporal    | temporalio/auto-setup:latest      | 7233 | gRPC; uses shared postgres (own `temporal` DBs)  |
| temporal-ui | temporalio/ui:latest              | 8080 | http://localhost:8080                            |
| litellm     | ghcr.io/berriai/litellm:main-latest | 4000 | proxy; config in `infra/litellm/config.yaml`   |

Temporal auto-setup provisions its own `temporal` and `temporal_visibility`
databases inside the shared Postgres instance (standard `DB=postgres12` config),
kept separate from the app's `factory` database.
