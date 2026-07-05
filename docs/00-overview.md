# Software Factory — Tổng quan sản phẩm

> Phiên bản: 0.3 — 2026-07-05 (v0.2: toàn trình multi-agent, GitHub, 3 human gate · v0.3: bỏ phân tầng MVP, toàn phạm vi)
> Trạng thái: Draft, chờ duyệt
> Tài liệu liên quan: [01-db-schema.md](01-db-schema.md) · [02-api-spec.md](02-api-spec.md) · [03-agent-worker-spec.md](03-agent-worker-spec.md)

## 1. Tầm nhìn

Nhà máy phần mềm AI toàn trình: **con người chỉ đưa yêu cầu và chốt tại 3 gate** — toàn bộ vai trò BA, PM, Design, Coding, Testing, Doc do agent đảm nhiệm, chạy trên GitHub. Mọi quyết định truy vết được.

Sản phẩm không phải coding agent (dùng agent có sẵn qua adapter) mà là **tầng nhà máy điều phối các agent theo vai trò**, quản lý context, governance và đo lường.

## 2. Pipeline toàn trình

```
Người đưa yêu cầu (portal / email / GitHub issue)
   │
   ▼
┌─ BA AGENT ────────────────────────────────────────────────┐
│ phân loại pathway · questionnaire làm rõ (khách trả lời    │
│ qua link) · requirements FR/NFR · stories + AC             │
│ · HTML PROTOTYPE click được → deploy preview URL           │
└───────────────────────────┬───────────────────────────────┘
   ▼
══ GATE A — CHỐT BA (người + khách): requirements + mockup/demo ══
   ▼
┌─ PM AGENT ────────────────────────────────────────────────┐
│ cắt UoW theo bounded context · đồ thị phụ thuộc            │
│ · task plan per UoW · gán specialist agent + xếp bolt      │
│ · ước lượng effort/cost                                    │
└───────────────────────────┬───────────────────────────────┘
   ▼
══ GATE B — CHỐT PLAN (người): breakdown bị khóa version ══
   ▼
┌─ CONSTRUCTION (per UoW, song song) ───────────────────────┐
│ DESIGN AGENT   → UI spec, design tokens, component map     │
│ CODING AGENT   → code + PR (GitHub)                        │
│ TESTING AGENT  → test độc lập từ AC (không nhìn code)      │
│                  + CROSS-REVIEW PR của coding agent        │
│ DOC AGENT      → API docs, user guide, release notes       │
│                                                            │
│ CI: GitHub Actions (build/test/lint)                       │
│ Người CHỈ can thiệp khi bị flag: confidence thấp,          │
│ cross-review bất đồng, quá vòng tự sửa, chạm budget        │
└───────────────────────────┬───────────────────────────────┘
   ▼
══ GATE C — NGHIỆM THU (người + khách): acceptance report AC↔test
   + demo trên staging ══
```

## 3. Nguyên lý thiết kế

1. **AI làm, người chốt**: 3 gate cứng (A/B/C) + exception-based intervention (Attention Queue) — không review từng PR trừ khi bị flag.
2. **Adaptive workflow**: pathway quyết định stage nào chạy, độ sâu bao nhiêu (bugfix bỏ qua BA prototype; demo bỏ qua Gate C).
3. **Audit trail đầy đủ**: mọi output agent, mọi quyết định gate, mọi flag được ghi append-only.
4. **Persistent context**: artifacts trong git repo dự án (`aidlc-docs/`); agent sau đọc output agent trước.
5. **Agent là worker thay thế được**: mỗi vai trò (ba/pm/design/code/test/doc) map tới một `agent_profile` cấu hình được — adapter MVP: `claude-code`, `antigravity`. Đổi agent = đổi config.
6. **AI không tự chấm bài mình**: testing agent sinh test từ AC đã chốt ở Gate A, *không nhìn code*; coding agent phải pass bộ test đó. Cross-review giữa 2 agent khác nhau trước khi merge.

## 4. Kiến trúc

```
┌─ factory-core (NestJS monolith) ─────────────────────────────┐
│  - intake       : nhận yêu cầu (portal/email/GitHub issue)    │
│  - orchestrator : pipeline engine — thứ tự agent theo pathway,│
│                   gate checks, flag routing                   │
│  - breakdown    : Requirements/Stories/UoW/Task (BA+PM agent  │
│                   sinh → người chốt gate → khóa version)      │
│  - tasks        : vòng đời task, bolt, SLA                    │
│  - attention    : Attention Queue (gates + flags)             │
│  - agent-jobs   : enqueue/track job theo role                 │
│  - llm          : cost logging (LlmCall)                      │
│  - audit        : append-only AuditLog                        │
│  - integrations : GitHub App (PR, Actions, issue, preview)    │
├───────────────────────────────────────────────────────────────┤
│  PostgreSQL 16 (+ pgvector để dành) · Redis 7 (BullMQ)        │
└───────────────┬───────────────────────────────────────────────┘
                │ BullMQ
┌─ agent-worker (Node) ────────────────────────────────────────┐
│  Job theo role: ba / pm / design / code / test / doc /        │
│  cross-review. Adapter: claude-code | antigravity             │
│  sandbox container · git worktree · PR qua GitHub API         │
│  prototype deploy → GitHub Pages / Vercel preview             │
└───────────────────────────────────────────────────────────────┘
┌─ factory-ui (React + Vite) ──────────────────────────────────┐
│  1. Intake & Questionnaire      2. BA Workspace (requirements │
│     + prototype preview, Gate A)                              │
│  3. Plan & Task board (Gate B, bolt, agent đang chạy)         │
│  4. Attention Queue (flags + Gate C nghiệm thu)               │
└───────────────────────────────────────────────────────────────┘
```

Quyết định kỹ thuật (bản đầy đủ — không cắt MVP, xem [04-architecture.md](04-architecture.md)):

- **GitHub là mặt phẳng tích hợp chính**: repo, PR, GitHub Actions (CI), GitHub Pages/Vercel (preview prototype + staging demo), webhook, GitHub App auth. Issue của khách là một kênh intake; Jira sync 2 chiều cho khách dùng Jira.
- Modular monolith cho core; **Temporal** làm workflow engine (pathway = workflow definition, gate = signal chờ người).
- **Multi-tenant từ đầu**: per-tenant schema + RLS, namespace K8s riêng cho jobs, chính sách model routing per tenant (dự án nhạy cảm → vLLM self-host).
- Coding agent qua adapter (`claude-code`, `antigravity`), config theo role/project/UoW/task.
- Stack: NestJS 10 + Prisma, React 18 + Vite, Temporal, BullMQ (dispatch job), PostgreSQL 16 (+pgvector), Redis 7, K8s/Helm (Docker Compose cho dev), Keycloak, Vault, LiteLLM, OTel + Langfuse + Grafana.

## 5. Pathway & Stage matrix

| Stage | greenfield | feature | bugfix | refactor | demo | document |
|---|---|---|---|---|---|---|
| Intake + Questionnaire | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| BA: Requirements | ✓ | ✓ | — | ○ | ○ | ✓ |
| BA: Impact analysis (brownfield) | — | ✓ | ✓ | ✓ | — | ○ |
| BA: Stories + AC | ✓ | ✓ | — | — | ○ | — |
| BA: HTML prototype | ✓ | ○ (nếu có UI) | — | — | ✓ | — |
| **Gate A** | ✓ | ✓ | ○ (auto nếu nhỏ) | ✓ | ✓ | ✓ |
| PM: UoW + task plan + gán agent | ✓ | ✓ | ✓ (rút gọn) | ✓ | ○ | ✓ |
| **Gate B** | ✓ | ✓ | ○ | ✓ | ○ | — |
| Design agent | ✓ | ○ | — | — | ○ | — |
| Coding agent | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Testing agent (test từ AC + cross-review) | ✓ | ✓ | ✓ | ✓ | ○ | — |
| Doc agent | ✓ | ○ | — | ○ | — | ✓ |
| **Gate C** | ✓ | ✓ | ○ | ○ | — | ✓ |

## 6. State machine

**Intent:** `draft → clarifying → ba_running → gate_a → approved | rejected` (gate_a = chờ người+khách chốt BA package)

**Breakdown:** `draft (PM agent sinh) → gate_b → locked | superseded`

**Task:**

```
backlog → planned → ai_drafting → agent_review → awaiting_human*
                        │             │                │
                        │             └── pass ──→ approved → integrated → verified → done
                        ├→ blocked / failed
* awaiting_human chỉ khi bị flag — không phải mặc định
```

- `agent_review`: cross-review bởi testing agent (code PR) hoặc agent khác vai trò. Pass → auto-approve; bất đồng/confidence thấp → flag.
- `awaiting_human`: item nằm trong Attention Queue kèm lý do flag.
- `integrated`: PR merged (auto-merge khi agent_review pass + CI xanh, hoặc người bấm khi flagged).
- `verified`: GitHub Actions integration/regression xanh.

**AttentionItem:** `open → in_review → resolved | escalated`

## 7. Test gates

| Gate | Ở đâu | Nội dung | Fail thì |
|---|---|---|---|
| Sandbox | agent-worker | unit + lint + build trước khi tạo PR | coding agent tự sửa ≤ 3 vòng → flag |
| Independent test | testing agent job | test sinh từ AC (không nhìn code), chạy với code trong CI | task rework, coding agent nhận feedback |
| CI | GitHub Actions | integration + regression (brownfield: characterization) | task rework |
| Acceptance | Gate C | report AC ↔ test ↔ pass/fail + demo staging | không bàn giao |

Đo theo **số AC được cover bởi ≥ 1 test thật** (testing agent độc lập), không theo % coverage dòng.

## 8. Vai trò con người (chỉ còn 3 + exception)

| Ai | Làm gì | Ở đâu |
|---|---|---|
| Người đưa yêu cầu | nhập yêu cầu, trả lời questionnaire | Intake |
| Người chốt (PM/lead) | Gate A (requirements + mockup), Gate B (plan), Gate C (nghiệm thu) | BA Workspace, Plan board, Attention Queue |
| Kỹ sư trực (on-call) | xử lý flag: agent kẹt, cross-review bất đồng, budget, sự cố | Attention Queue |
| Khách hàng | trả lời questionnaire, bấm thử prototype, UAT staging | link công khai |

## 9. Roadmap

Toàn phạm vi, ~6 tháng, đội 8–10, chia 6 mốc M1–M6 — mốc nào cũng chạy end-to-end được. Chi tiết ở [04-architecture.md §8](04-architecture.md). Tóm tắt: M1 xương sống (Temporal + adapter + GitHub App + BA agent) → M2 toàn trình lần đầu → M3 brownfield & quality gates → M4 multi-tenant & self-host → M5 observability & dashboards → M6 scale & retro learning.

Nguyên tắc: mốc nào cũng có thứ chạy end-to-end. Rủi ro lớn nhất (agent headless ổn định + chất lượng cross-review agent-agent) xử lý ở M1–M2.

## 10. Rủi ro chính

1. **Cross-review agent-agent chất lượng thấp** (2 agent cùng sai một kiểu) → đo tỷ lệ defect lọt qua ở pilot; nếu cao, hạ về human review PR cho code rủi ro cao (tiêu chí: chạm auth/payment/data migration).
2. **Agent headless không ổn định** → spike tuần 1, có phương án semi-manual.
3. **Chi phí token toàn trình** (6 role agent/task) → LlmCall log + budget per task/role từ ngày đầu.
4. **Prototype gây kỳ vọng sai** (khách tưởng sản phẩm gần xong) → prototype gắn watermark "mockup", Gate A ghi rõ phạm vi.
5. **Coverage giả** → gate theo AC-cover, testing agent độc lập với coding agent.
