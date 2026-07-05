# Kiến trúc tổng thể — Software Factory (bản đầy đủ, toàn trình)

> Phiên bản: 0.2 — 2026-07-05 (v0.2: bỏ phân tầng MVP — triển khai toàn bộ phạm vi)
> Tài liệu liên quan: [00-overview.md](00-overview.md) · [01-db-schema.md](01-db-schema.md) · [02-api-spec.md](02-api-spec.md) · [03-agent-worker-spec.md](03-agent-worker-spec.md)

## 1. Mô hình 5 tầng

```
┌─ 5. DELIVERY PORTAL ────────────────────────────────────────────────┐
│  factory-ui: Intake · BA Workspace (Gate A) · Plan board (Gate B)    │
│  · Attention Queue (flags + Gate C)                                  │
│  Portal khách hàng: questionnaire, prototype, UAT, dashboard         │
│  nghiệm thu (AC ↔ test, bằng chứng bàn giao)                         │
│  Dashboard lãnh đạo: metrics, ROI, cost per project/khách            │
├─ 4. GOVERNANCE ─────────────────────────────────────────────────────┤
│  3 human gates + Attention routing · SLA per item                    │
│  Audit trail append-only · auto-merge rules · diff guard             │
│  Traceability 2 chiều: Intent → AC → code → test → deploy            │
│  Extension system per khách: SAST/Semgrep, performance,              │
│  compliance — dạng blocking rule opt-in                              │
├─ 3. CONTEXT & KNOWLEDGE ────────────────────────────────────────────┤
│  aidlc-docs/ trong git repo (artifacts mọi phase, versioned)         │
│  Rules library per role + per khách (chuẩn coding, security,         │
│  domain glossary) — versioned, phát hành như package                 │
│  Codebase index brownfield: tree-sitter parse + embeddings           │
│  (pgvector) — reverse-engineering docs, impact analysis              │
│  KB domain per khách hàng · học từ dữ liệu dự án (rules ngày         │
│  càng tốt qua retro tự động)                                         │
├─ 2. AGENT ORCHESTRATION ────────────────────────────────────────────┤
│  Orchestrator: pipeline theo pathway, gate checks, flag routing,     │
│  xếp lịch UoW theo topo, điều phối đa dự án song song                │
│  agent-worker pool + adapter registry (claude-code, antigravity, …)  │
│  Model Gateway (LiteLLM): route đa model, cost/quota per tenant,     │
│  failover · route vLLM self-host (Qwen/DeepSeek/Llama) cho dự án     │
│  cấm dữ liệu ra ngoài                                                │
├─ 1. WORKFLOW ENGINE ────────────────────────────────────────────────┤
│  Temporal: mỗi pathway = workflow definition; gate = signal chờ      │
│  người; retry/timeout/heartbeat/audit có sẵn; workflow sống nhiều    │
│  ngày qua restart                                                    │
│  Bolt cycles · stage matrix · depth modulation theo độ phức tạp      │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Sơ đồ thành phần (component view)

```
                          NGƯỜI DÙNG
   requester/approver/on-call ──── khách hàng (portal riêng, public link)
        │                                │
        ▼                                ▼
┌────────────────────────────────────────────────────────────────────┐
│ factory-ui (React+Vite, WebSocket) + customer portal + dashboards   │
└──────────────┬─────────────────────────────────────────────────────┘
               │ REST /api/v1 + WS   (SSO: Keycloak)
┌──────────────▼─────────────── CONTROL PLANE ───────────────────────┐
│ factory-core (NestJS, modular monolith)                             │
│                                                                     │
│  intake ──► orchestrator ◄── attention          integrations        │
│                 │  ▲         (Temporal client)  (GitHub App, Jira)  │
│  breakdown ◄────┤  │ signals/events                ▲  │             │
│  tasks/bolt ◄───┤  │                      webhooks │  │ API calls   │
│  context ◄──────┤  └── llm-ledger · audit          │  ▼             │
│  (index, KB,    │      · metrics                ┌──┴────────────┐   │
│   rules)        │                               │    GitHub     │   │
│                 ▼                               │ repo · PR ·   │   │
│  Temporal server │ PostgreSQL 16 (+pgvector)    │ Actions CI ·  │   │
│  Redis (cache)   │ per-tenant schema            │ Issues ·      │   │
└───────┼──────────┴──────────────────────────────│ Pages/Vercel  │───┘
        │ activity: dispatch job                  └──┬────────────┘
┌───────▼─────────────────────────────────────────── │ ──────────────┐
│ EXECUTION PLANE (K8s)                               │ push/PR/deploy│
│ agent-worker: mỗi job = 1 K8s Job (container riêng) ┘               │
│  ┌ adapter registry ─────────────────┐                              │
│  │ claude-code │ antigravity │ …     │                              │
│  └───────────────────────────────────┘                              │
│  role jobs: ba · pm · design · code · test · doc                    │
│             · cross_review · prototype · reverse_engineer           │
│  sandbox: NetworkPolicy egress allowlist · token budget             │
│           · diff guard · activeDeadlineSeconds · Vault secrets      │
│       │                                                             │
│       ▼                                                             │
│  Model Gateway (LiteLLM) ──► Claude API / GPT / Bedrock             │
│                          └─► vLLM self-host (dự án nhạy cảm)        │
└─────────────────────────────────────────────────────────────────────┘
        │
  Observability: OpenTelemetry (trace toàn pipeline) + Langfuse
  (trace từng LLM call: prompt, token, cost, latency) + Grafana
```

## 3. Trách nhiệm từng thành phần

| Thành phần | Trách nhiệm | Không làm |
|---|---|---|
| factory-ui + portals | điều phối, phê duyệt, dashboard; realtime WS | không phải IDE; không sửa code |
| intake | chuẩn hóa yêu cầu (portal/email/Jira/GitHub issue) thành Intent | không phân tích — việc của BA agent |
| orchestrator | não nhà máy: Temporal workflow per intent, gate = signal, flag routing, xếp UoW theo topo, điều phối đa dự án | không gọi model trực tiếp |
| breakdown/tasks | lưu + version + khóa artifact phân rã | không sinh nội dung |
| attention | hàng đợi duy nhất cho người: gates + flags, SLA timer | |
| context | codebase index (tree-sitter+pgvector), KB khách, rules library versioned, retro learning | |
| llm-ledger + metrics | cost ledger per tenant/project/role · velocity, % toàn trình, defect, ROI | |
| audit | append-only, mọi quyết định người–AI | |
| integrations | GitHub App (webhook/API), Jira sync 2 chiều, SonarQube/Semgrep | |
| agent-worker | thực thi job theo role trong K8s Job sandbox, qua adapter | không quyết định — orchestrator quyết |
| adapter | dịch job contract ↔ coding agent cụ thể | không chứa rules nghiệp vụ |
| Model Gateway | route đa model + self-host, cost/quota per tenant, failover | |
| Temporal | độ bền workflow: sống qua restart, retry, chờ signal nhiều ngày | không chứa business data (Postgres) |
| GitHub | source of truth cho code, PR, CI, preview/staging | không chứa trạng thái nhà máy |
| aidlc-docs/ | context bền vững giữa agent/phase | không chứa secret |

## 4. Multi-tenant & bảo mật dữ liệu khách

- **Cô lập dữ liệu**: per-tenant DB schema + RLS; repo khách không rời môi trường được chỉ định; workspace job gắn nhãn tenant, NetworkPolicy chặn cross-tenant.
- **3 phương án deploy per khách**: cloud chung (multi-tenant) · VPC/on-prem riêng (single-tenant, kèm vLLM self-host) · hybrid (control plane chung, execution plane trong hạ tầng khách).
- **Model routing theo chính sách tenant**: dự án cấm data ra ngoài → bắt buộc self-host route, Gateway enforce (không phải convention).
- Secrets: Vault, GitHub App token scoped + TTL ngắn, model key per tenant.
- IP protection: LlmCall không lưu full prompt mặc định (hash + độ dài), full log opt-in per tenant.

## 5. Luồng dữ liệu chính (pathway=feature, brownfield)

```
1  Yêu cầu ─► intake ─► Intent (raw nguyên văn)
2  orchestrator khởi động Temporal workflow theo pathway
3  job[reverse_engineer] (brownfield) ─► codebase index + docs hiện trạng
4  job[ba] ─► requirements + stories/AC + impact analysis
5  job[prototype] ─► preview URL ─► khách thử
6  GATE A (Temporal signal) ─► người + khách chốt
7  job[pm] ─► UoW + tasks + gán role ─► GATE B ─► lock
8  per UoW song song: job[design] → job[code] → PR (sandbox gate)
                      job[test] (từ AC, không nhìn code)
9  job[cross_review] ─► approve + CI xanh + quality gates (Sonar/Semgrep
   + extensions của khách) ─► auto-merge │ escalate ─► attention
10 Actions ─► TestRun(ci) ─► verified ─► staging ─► acceptance report
11 GATE C ─► done ─► retro tự động ─► đề xuất cập nhật rules
   (mọi bước ─► audit · mọi LLM call ─► ledger + Langfuse)
```

## 6. Topology triển khai

K8s (Helm chart) từ đầu; Docker Compose chỉ cho môi trường dev cục bộ.

```
namespace factory-system : core · ui · temporal · litellm · langfuse
                           · keycloak · grafana/otel-collector
namespace factory-jobs-<tenant> : K8s Jobs (agent), NetworkPolicy riêng
data: PostgreSQL (HA, per-tenant schema) · Redis · Vault
      · object storage (log, artifacts, report)
external: GitHub · model APIs · vLLM cluster (GPU) cho self-host
```

## 7. Nguyên tắc kiến trúc (bất biến)

1. **Control plane không chạm model** — mọi LLM call qua worker/Gateway, cost đo 100%.
2. **GitHub = code · Postgres = trạng thái nhà máy · git `aidlc-docs/` = context agent.** Không nhân đôi.
3. **Agent thay được, role bất biến** — pipeline nói chuyện với role, không với agent cụ thể.
4. **Mọi chuyển trạng thái qua service layer** → audit tự động.
5. **Người là exception handler** — trừ 3 gate.
6. **Fail-safe mặc định**: budget/timeout/rule cấm → dừng và hỏi người.
7. **Chính sách tenant enforce bằng hạ tầng** (Gateway route, NetworkPolicy, RLS), không bằng quy ước.

## 8. Thứ tự build (toàn phạm vi, ~6 tháng, đội 8–10)

Không cắt phạm vi — chỉ xếp thứ tự theo phụ thuộc kỹ thuật; mốc nào cũng chạy end-to-end được.

| Mốc | Tuần | Nội dung | Chạy được gì |
|---|---|---|---|
| M1 — Xương sống | 1–4 | Temporal + Postgres (per-tenant schema) + skeleton core + Gateway (LiteLLM) + adapter claude-code & antigravity (spike → chốt) + GitHub App | 1 intent chạy workflow BA → artifacts + prototype lên preview |
| M2 — Toàn trình lần đầu | 5–8 | PM agent + construction cells (code/test/cross-review/auto-merge) + Attention Queue + UI 4 màn + audit/ledger | 1 feature nhỏ đi hết pipeline không cần người ngoài 3 gate |
| M3 — Brownfield & chất lượng | 9–12 | reverse_engineer job + codebase index (tree-sitter+pgvector) + characterization tests + quality gates (Sonar/Semgrep) + extension system | maintain dự án cũ toàn trình |
| M4 — Multi-tenant & self-host | 13–16 | RLS + namespace per tenant + Vault + vLLM route + Keycloak SSO + customer portal | 2 khách chạy song song cô lập, 1 khách dùng self-host |
| M5 — Vận hành & đo lường | 17–20 | OTel + Langfuse + Grafana + metrics/ROI dashboard + Jira sync + bolt reports + acceptance report hoàn chỉnh | lãnh đạo xem ROI; khách xem dashboard nghiệm thu |
| M6 — Scale & học | 21–24 | điều phối đa dự án quy mô lớn, retro tự động cập nhật rules, hardening, tài liệu vận hành, pilot 3 dự án thật | go-live nội bộ toàn delivery |

Song song từ M1: rules library per role Việt hóa/tùy biến VTIT — đây là tài sản quan trọng ngang code.

## 9. Rủi ro toàn trình

1. **Cross-review agent-agent chất lượng thấp** → M2 đo bằng PR có bug cài sẵn; nếu thấp, auto-merge chỉ bật cho path rủi ro thấp.
2. **Agent headless không ổn định chạy dài** → spike M1; Temporal heartbeat + retry giảm thiệt hại.
3. **Chi phí token toàn trình (8 role/intent)** → ledger + budget per role từ M1; số liệu M2 quyết định pricing.
4. **Chất lượng model self-host kém API** → benchmark ở M4 trên bộ task chuẩn trước khi cam kết với khách.
5. **Phạm vi 6 tháng trượt** → mốc nào cũng end-to-end; trượt thì lùi M5/M6, không đụng M1–M3.
