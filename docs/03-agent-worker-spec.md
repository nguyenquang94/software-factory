# Agent-Worker Spec

> Phiên bản: 0.2 — 2026-07-05 (v0.2: job theo role, GitHub, cross-review, prototype deploy) · Tài liệu cha: [00-overview.md](00-overview.md) · Schema: [01-db-schema.md](01-db-schema.md)

## 1. Vai trò

agent-worker là process riêng (Node), nhận job từ BullMQ, chạy coding agent trong sandbox theo **role** (ba / pm / design / code / test / doc / cross_review / prototype), thu kết quả (PR, preview URL, artifacts), báo về factory-core. Worker không chứa logic nghiệp vụ — orchestrator trong core quyết định job nào chạy khi nào.

Agent cấu hình qua **adapter pattern**: worker resolve profile theo thứ tự `task.agent_profile_id` → `uow.agent_overrides[role]` → `role_assignment(project, role)`. MVP: adapter `claude-code`, `antigravity`. Profile đã resolve ghi vào `agent_job.agent_profile_id` (audit).

## 2. Adapter interface

```typescript
interface CodingAgentAdapter {
  readonly name: string;                       // "claude-code" | "antigravity"
  healthcheck(profile: AgentProfile): Promise<HealthResult>;
  run(ctx: RunContext): Promise<RunResult>;    // blocking đến khi xong/kẹt/timeout
  cancel(runId: string): Promise<void>;
}

interface RunContext {
  jobId: string;
  role: AgentRole;             // quyết định rules + prompt template nào được nạp
  workspaceDir: string;        // git worktree
  rulesDir: string;            // rules đã materialize (chung + per-role)
  prompt: string;              // render từ template theo role + context
  profile: AgentProfile;
  tokenBudget: number;
  timeoutMs: number;
  onProgress: (e: ProgressEvent) => void;
  onLlmCall: (c: LlmCallRecord) => void;
}

interface RunResult {
  status: "succeeded" | "needs_human" | "failed" | "timeout" | "budget_exceeded";
  humanQuestion?: string;
  selfReport?: { summary: string; risks: string[]; confidence: number };
  tokensUsed: number;
  costUsd: number;
  selfFixRounds: number;
  artifacts: string[];         // paths trong workspace
  structuredOutput?: unknown;  // per-role: BA package JSON, breakdown JSON, review verdict…
}
```

### 2.1 Adapter `claude-code`

- Headless: `claude -p --output-format stream-json --max-turns <n>` hoặc Agent SDK (chốt ở spike tuần 1).
- Rules: materialize `CLAUDE.md` + `.claude/` per role trước khi chạy.
- Usage đọc từ stream-json → `onLlmCall`.
- Kẹt: rules quy định ghi `aidlc-docs/BLOCKED.md` rồi thoát → adapter map `needs_human`.
- Structured output: rules quy định ghi `aidlc-docs/output.json` theo schema role — adapter parse + validate.

### 2.2 Adapter `antigravity`

- Cùng contract. Cách invoke non-interactive, truyền rules, đọc usage: **spike tuần 1** (khả năng headless phải kiểm chứng theo phiên bản thực tế).
- Không expose usage per call → ghi 1 LlmCall tổng per phiên.
- Chưa headless được → lùi semi-manual: kỹ sư chạy trên máy, nộp kết quả qua CLI `factory report-job`.

## 3. Job theo role

| Role | Input chính | Output (structuredOutput + artifacts) | Ghi chú |
|---|---|---|---|
| `ba` | raw_input, answers, KB khách hàng, (brownfield: repo) | requirements FR/NFR, stories + AC, impact analysis → `aidlc-docs/inception/` | job mức intent |
| `prototype` | BA package, feedback vòng trước | HTML prototype trên branch `factory/proto-*`, deploy → preview_url | watermark "MOCKUP"; static HTML/JS, không backend |
| `pm` | BA package đã chốt Gate A | breakdown JSON: UoW + dependency + tasks (role, DoD, allowed_paths) + estimate | job mức intent |
| `design` | UoW, prototype, AC | UI spec, design tokens, component map → `aidlc-docs/design/` | chỉ pathway có UI |
| `code` | task, design spec, interface_contract, AC | code + PR; pass sandbox gate trước khi tạo PR | diff guard theo `allowed_paths` |
| `test` | **AC + interface contract, KHÔNG nhìn code** | test suite độc lập → PR riêng hoặc cùng branch test/ | chạy trong CI với code sau merge nhánh |
| `cross_review` | PR của coding agent + AC + findings CI | verdict approve/request_changes/escalate + findings | agent khác profile với coding agent nếu có thể |
| `doc` | code đã merge, AC, API surface | API docs, user guide, release notes | |
| `reverse_engineer` | repo legacy (brownfield) | codebase index (code_chunk), docs kiến trúc/domain hiện trạng, characterization tests | chạy trước BA ở pathway brownfield |

Job contract (BullMQ queue `agent-jobs`):

```json
{
  "agent_job_id": "uuid", "role": "code",
  "intent_id": "uuid", "task_id": "uuid",
  "repo": {"github": "owner/repo", "base_branch": "develop", "work_branch": "factory/T-0042"},
  "rules_version": "vtit-rules@1.3.0",
  "context": { "intent_summary": "…", "uow": {…}, "task": {…}, "acceptance_criteria": […], "design_spec_path": "aidlc-docs/design/UOW-001.md" },
  "agent_profile_id": "uuid",
  "token_budget": 500000, "timeout_ms": 3600000
}
```

## 4. Vòng đời job (role=code, đầy đủ nhất)

```
1. claim → POST /internal/agent-jobs/:id/events {started}
2. workspace: clone --filter=blob:none + worktree work_branch;
   materialize rules per role; render prompt
3. adapter.run() — stream progress; đếm token, chạm budget → dừng cứng
4. sandbox gate (worker tự chạy, không tin agent):
   test/lint/build theo project.settings.ci
   + diff guard (allowed_paths) — vi phạm tính 1 vòng self-fix
   fail → feedback cho agent tự sửa ≤ 3 vòng → quá: needs_human
5. succeeded: commit + push, tạo PR (GitHub API) kèm self-report comment,
   ghi TestRun(sandbox), artifacts, LlmCall batch → events {done}
6. core orchestrator: enqueue job cross_review cho PR
   verdict approve + CI xanh + không chạm auto_merge forbid rules
     → enable auto-merge → integrated
   verdict escalate / confidence < ngưỡng → AttentionItem
7. dọn workspace (giữ nếu FACTORY_KEEP_WORKSPACE=1)
```

Role khác rút gọn: `ba`/`pm` không tạo PR code (artifacts + structuredOutput đẩy thẳng về core); `prototype` thêm bước deploy (Pages: push branch `gh-pages` path per intent; Vercel: API tạo preview deployment); `test` tạo PR test suite; `doc` tạo PR docs.

## 5. Sandbox & an toàn (K8s Job; Docker Compose cho dev cục bộ)

| Lớp | Cơ chế |
|---|---|
| Cô lập | mỗi job = 1 K8s Job, container non-root, namespace `factory-jobs-<tenant>` + NetworkPolicy |
| Mạng | egress allowlist: Model Gateway + github.com + preview provider; dự án self-host: chỉ vLLM nội bộ |
| Tài nguyên | requests/limits CPU/mem, disk quota |
| Thời gian | activeDeadlineSeconds per job (mặc định 60'), SIGTERM + grace 30s |
| Chi phí | token budget per job per role, dừng cứng; budget per project/ngày ở Gateway |
| Bí mật | Vault: GitHub App token (scoped, TTL ngắn) + model key per tenant; không vào log/artifacts |
| Diff guard | chỉ cho sửa `allowed_paths` của UoW; `aidlc-docs/**` luôn được phép |

Concurrency: `FACTORY_MAX_CONCURRENT_JOBS` (mặc định 3); job cùng UoW tuần tự (BullMQ group), khác UoW song song. Job `test` và `code` cùng UoW được phép song song (test không nhìn code).

## 6. Xử lý sự cố

| Tình huống | Hành vi |
|---|---|
| Agent kẹt / hỏi người | `needs_human` → AttentionItem(agent_blocked) kèm câu hỏi; người answer → re-dispatch, prompt nối câu trả lời |
| Cross-review bất đồng ≥ 2 vòng | AttentionItem(review_escalated) — người quyết merge hay rework |
| Timeout / crash | kill container; BullMQ stalled re-queue; idempotent nhờ work_branch riêng (chạy lại làm sạch branch) |
| Chạm token budget | dừng cứng → AttentionItem(budget_exceeded): raise / split / cancel |
| CI đỏ lặp ≥ 2 lần | AttentionItem(ci_failed_repeatedly) |
| Push/PR fail | retry 3 lần backoff → job failed, artifacts giữ trong workspace |
| 2 agent sửa chéo file | không xảy ra nếu allowed_paths disjoint — PM agent phải cắt UoW disjoint, orchestrator validate khi Gate B |

## 7. Spike tuần 1 (chốt trước khi code worker)

1. Claude Code headless + rules per-role trên 1 task mẫu: chốt stream-json format, phát hiện kẹt, structured output, usage.
2. Antigravity chế độ tương đương: có headless không, invoke/usage thế nào. Không được → semi-manual.
3. BA agent sinh HTML prototype từ 1 intent mẫu + deploy GitHub Pages: đo chất lượng + token cost.
4. Cross-review thử: coding agent (profile A) + review agent (profile B) trên 1 PR có bug cài sẵn — đo tỷ lệ bắt được. **Số này quyết định mức auto-merge dám bật.**
