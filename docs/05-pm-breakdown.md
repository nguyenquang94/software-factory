# PM Breakdown — M1 "Xương sống" (tuần 1–4)

> Phiên bản: 0.1 — 2026-07-05 · Vai: PM (phân rã sau Gate A = bộ docs 00–04 đã duyệt)
> Mốc M1: **1 intent chạy workflow BA end-to-end → artifacts + prototype lên preview URL**

## 1. Quy ước GitHub (bất biến cho cả sản phẩm lẫn dự án sau này)

- **Issue**: mỗi task = 1 issue. Tiêu đề `[UOW-xxx] <việc>`. Body có: mô tả, definition of done, AC, phụ thuộc (`Depends on #n`).
- **Labels**: `uow:xxx`, `role:code|test|doc|infra`, `milestone-epic`, `blocked`.
- **Milestones**: M1–M6 theo roadmap ([04 §8](04-architecture.md)).
- **Branch**: `factory/<issue>-<slug>` (vd. `factory/12-monorepo-skeleton`), tách từ `main`.
- **PR**: 1 issue = 1 PR, body bắt buộc `Closes #<issue>`; CI xanh + review mới merge (squash). Không commit thẳng `main`.
- **Commit**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).

## 2. UoW của M1 + đồ thị phụ thuộc

```
UOW-101 infra ──► UOW-102 core-domain ──┬─► UOW-103 orchestrator ─┐
   │                                    ├─► UOW-106 llm-ledger    ├─► UOW-108 intake
   │                                    ├─► UOW-107 github-integ ─┘      │
   └─► UOW-104 agent-worker ◄───────────┘                                ▼
              │                                                   E2E: intent → BA
              └─► UOW-105 antigravity spike                       → prototype preview
```

| UoW | Tên | allowed_paths | Phụ thuộc |
|---|---|---|---|
| UOW-101 | Monorepo skeleton & dev infra | `/*` (root config), `.github/`, `infra/` | — |
| UOW-102 | Core domain: Prisma schema + audit | `apps/core/prisma/`, `apps/core/src/{audit,common}/` | 101 |
| UOW-103 | Orchestrator: Temporal + BA workflow | `apps/core/src/orchestrator/` | 102 |
| UOW-104 | Agent-worker + adapter claude-code | `apps/agent-worker/` | 101 |
| UOW-105 | Adapter antigravity (spike) | `apps/agent-worker/src/adapters/antigravity/` | 104 |
| UOW-106 | LLM gateway + cost ledger | `infra/litellm/`, `apps/core/src/llm/` | 102 |
| UOW-107 | GitHub integration | `apps/core/src/integrations/github/` | 102 |
| UOW-108 | Intake + public questionnaire API | `apps/core/src/intake/` | 103, 106, 107 |

## 3. Tasks M1 (mỗi task = 1 issue)

### UOW-101 — Monorepo skeleton & dev infra

| # | Task | DoD |
|---|---|---|
| T-101.1 | Khởi tạo monorepo pnpm workspaces (`apps/core`, `apps/agent-worker`, `apps/ui`, `packages/shared`) + TS config + ESLint/Prettier | `pnpm install && pnpm build` xanh |
| T-101.2 | Docker Compose dev: postgres16+pgvector, redis, temporal + temporal-ui, litellm | `docker compose up` → healthcheck 4 service xanh |
| T-101.3 | GitHub Actions CI: lint + build + test trên PR | PR mẫu chạy CI xanh |

### UOW-102 — Core domain

| # | Task | DoD |
|---|---|---|
| T-102.1 | Prisma schema đầy đủ theo [01-db-schema.md](01-db-schema.md) (19 bảng + tenant) + migration đầu | `prisma migrate dev` sạch, ERD sinh ra khớp docs |
| T-102.2 | RLS per-tenant + middleware set `app.tenant_id` + seed 1 tenant/1 project | test chứng minh tenant A không đọc được data tenant B |
| T-102.3 | Audit service: interceptor ghi AuditLog cho mọi mutation qua service layer | test: mọi chuyển trạng thái sinh đúng audit record |

### UOW-103 — Orchestrator

| # | Task | DoD |
|---|---|---|
| T-103.1 | Temporal worker + workflow `IntentPipeline` khung (stage theo pathway matrix) | workflow start/replay được qua temporal-ui |
| T-103.2 | Activities: dispatch agent-job (BullMQ) + chờ kết quả + cập nhật DB | activity retry/timeout đúng spec |
| T-103.3 | Gate = signal: `gate_a_approve/reject` + tạo AttentionItem khi đến gate | test: workflow dừng ở gate, resume đúng khi signal |

### UOW-104 — Agent-worker + adapter claude-code

| # | Task | DoD |
|---|---|---|
| T-104.1 | Worker skeleton: BullMQ consumer, job contract ([03 §3](03-agent-worker-spec.md)), workspace git worktree, callback events | job mock chạy end-to-end, events về core |
| T-104.2 | Adapter interface + registry + resolve profile 3 cấp | unit test resolve override |
| T-104.3 | Adapter `claude-code` headless: spawn, rules materialize, stream-json parse, BLOCKED.md detect, usage → LlmCall | chạy thật 1 job `ba` trên intent mẫu ra artifacts |
| T-104.4 | Sandbox Docker: non-root, egress allowlist, token budget dừng cứng, timeout | test budget/timeout kill đúng |
| T-104.5 | Job `prototype`: sinh HTML prototype + deploy GitHub Pages → preview_url | intent mẫu ra preview URL bấm được |

### UOW-105 — Adapter antigravity (spike, timebox 3 ngày)

| # | Task | DoD |
|---|---|---|
| T-105.1 | Spike: kiểm chứng headless/CLI, cách truyền rules, đọc usage → báo cáo | báo cáo + quyết định: adapter đầy đủ / semi-manual |
| T-105.2 | Implement adapter theo kết luận spike | 1 job chạy qua antigravity (hoặc CLI `factory report-job`) |

### UOW-106 — LLM gateway + ledger

| # | Task | DoD |
|---|---|---|
| T-106.1 | LiteLLM config: route model, key per tenant, quota | gọi qua gateway từ 2 tenant, quota tách nhau |
| T-106.2 | Module `llm`: LlmCall ledger + endpoint metrics summary | cost per project query được |

### UOW-107 — GitHub integration

| # | Task | DoD |
|---|---|---|
| T-107.1 | GitHub App: auth (installation token TTL ngắn), client (branch, PR, comment, issue) | tạo branch+PR trên repo test qua API |
| T-107.2 | Webhook endpoint + verify signature: issues.opened(label factory), PR merged, workflow_run | event mẫu xử lý đúng, ghi TestRun/status |

### UOW-108 — Intake

| # | Task | DoD |
|---|---|---|
| T-108.1 | Module intake: POST intents, classify (LLM), trạng thái Intent | tạo intent → pathway + confidence lưu DB |
| T-108.2 | Questionnaire: sinh câu hỏi (job ba), public link token, answer API | khách trả lời qua link không cần login |
| T-108.3 | **E2E M1**: intent mẫu → BA workflow → requirements/stories/AC artifacts + prototype preview → AttentionItem gate_a | demo được toàn luồng, audit + cost ghi đủ |

## 4. Epic M2–M6 (mỗi mốc 1 epic issue, phân rã khi vào mốc)

| Epic | Nội dung tóm tắt |
|---|---|
| M2 — Toàn trình lần đầu | PM agent, construction cells (design/code/test/cross-review/auto-merge), Attention Queue UI, 4 màn hình |
| M3 — Brownfield & chất lượng | reverse_engineer, code_chunk index, characterization tests, Sonar/Semgrep, extension system |
| M4 — Multi-tenant & self-host | RLS hoàn chỉnh, namespace per tenant, Vault, vLLM route, Keycloak, customer portal |
| M5 — Vận hành & đo lường | OTel+Langfuse+Grafana, metrics/ROI dashboard, Jira sync, bolt/acceptance reports |
| M6 — Scale & học | đa dự án quy mô lớn, retro tự động cập nhật rules, hardening, go-live |

## 5. Gate B

Bản phân rã này cần bạn **chốt Gate B** (comment/approve) trước khi tạo issues và bắt đầu code. Thay đổi sau chốt = sửa issue có dấu vết, không sửa ngầm.
