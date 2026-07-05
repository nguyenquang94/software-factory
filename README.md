# Software Factory

Nhà máy phần mềm AI toàn trình: con người đưa yêu cầu và chốt tại 3 gate — toàn bộ vai trò BA, PM, Design, Coding, Testing, Doc do agent đảm nhiệm, chạy trên GitHub.

## Tài liệu thiết kế

| Tài liệu | Nội dung |
|---|---|
| [docs/00-overview.md](docs/00-overview.md) | Tầm nhìn, pipeline toàn trình, pathway/stage matrix, state machine, test gates |
| [docs/01-db-schema.md](docs/01-db-schema.md) | DB schema (multi-tenant, RLS) |
| [docs/02-api-spec.md](docs/02-api-spec.md) | REST + WebSocket API |
| [docs/03-agent-worker-spec.md](docs/03-agent-worker-spec.md) | Adapter pattern, job contract, sandbox |
| [docs/04-architecture.md](docs/04-architecture.md) | Kiến trúc tổng thể 5 tầng, roadmap M1–M6 |
| [docs/05-pm-breakdown.md](docs/05-pm-breakdown.md) | Phân rã M1: UoW, tasks, quy ước GitHub |

## Quy trình làm việc (dogfood chính quy trình của nhà máy)

- Mỗi task = 1 issue (label `uow:*`, `role:*`, milestone M1–M6)
- Branch: `factory/<issue>-<slug>` — PR bắt buộc `Closes #<issue>` — squash merge — CI xanh trước merge
- Không commit thẳng `main`
- 3 gate con người: Gate A (BA package), Gate B (plan), Gate C (nghiệm thu)

## Cấu trúc (hình thành từ M1)

```
apps/core          # NestJS control plane
apps/agent-worker  # execution plane, adapter: claude-code | antigravity
apps/ui            # React portal
packages/shared    # types, job contract
infra/             # docker compose dev, litellm, helm (sau)
bootstrap/         # dữ liệu khởi tạo issues/labels/milestones
```
