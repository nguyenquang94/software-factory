# DB Schema — factory-core

> Phiên bản: 0.2 — 2026-07-05 (v0.2: multi-agent role, GitHub, Attention Queue) · PostgreSQL 16 · Tài liệu cha: [00-overview.md](00-overview.md)

Quy ước chung:

- Mọi bảng có `id UUID PK default gen_random_uuid()`, `created_at`, `updated_at TIMESTAMPTZ`.
- **Multi-tenant từ đầu**: mọi bảng nghiệp vụ có `tenant_id` + `project_id`; cô lập bằng per-tenant schema + Row-Level Security (RLS), không bằng quy ước ứng dụng.
- Enum lưu `TEXT` + check constraint.
- Không soft delete; hủy nghiệp vụ = status `cancelled`/`rejected`, giữ audit.

## Sơ đồ quan hệ

```
Project ─┬─ AgentProfile (n) ── RoleAssignment (n)
         ├─ Intent (n) ─┬─ ClarifyingQuestion (n)
         │              ├─ Prototype (n)
         │              └─ Breakdown (n, version) ─┬─ Requirement (n)
         │                                         ├─ Story (n) ── AcceptanceCriterion (n)
         │                                         └─ UnitOfWork (n) ─┬─ UowDependency (n)
         │                                                            └─ Task (n) ─┬─ AgentJob (n)
         │                                                                         ├─ AgentReview (n)
         │                                                                         └─ TestRun (n)
         ├─ AttentionItem (n)      ├─ Bolt (n)
         ├─ LlmCall (n)            └─ AuditLog (n)
User + ProjectMember
```

## 1. project

| Cột | Kiểu | Ghi chú |
|---|---|---|
| name / customer_name | TEXT | |
| github_repo | TEXT | `owner/repo` |
| github_installation_id | BIGINT | GitHub App installation |
| settings | JSONB | pathway defaults, budget mặc định, CI commands, preview provider (`pages`/`vercel`), auto_merge rules |
| status | TEXT | `active` / `archived` |

## 2. agent_profile / role_assignment

`agent_profile` — cấu hình một agent cụ thể:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| project_id | UUID FK NULLABLE | null = toàn cục |
| name | TEXT | vd. "claude-code-sonnet" |
| adapter | TEXT | `claude-code` / `antigravity` |
| model | TEXT | |
| config | JSONB | rules path, max_turns, flags, endpoint… |
| token_budget_default | INTEGER | |
| enabled | BOOLEAN | |

`role_assignment` — vai trò nào trong pipeline dùng profile nào:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| project_id | UUID FK | |
| role | TEXT | `ba` / `pm` / `design` / `code` / `test` / `doc` / `cross_review` |
| agent_profile_id | UUID FK | |
| UNIQUE(project_id, role) | | override sâu hơn: `unit_of_work.agent_overrides`, `task.agent_profile_id` |

## 3. user / project_member

`user`: `email UNIQUE`, `name`, `role_global` (`admin`/`member`), `sso_subject`.
`project_member`: `project_id`, `user_id`, `role` (`approver` / `oncall_engineer` / `requester` / `customer`), UNIQUE(project_id, user_id).

## 4. intent

| Cột | Kiểu | Ghi chú |
|---|---|---|
| project_id | UUID FK | |
| title / raw_input | TEXT | raw_input = nguyên văn (bằng chứng phạm vi) |
| source_channel | TEXT | `portal` / `email` / `github_issue` |
| github_issue_number | INTEGER NULLABLE | nếu intake từ issue |
| pathway | TEXT | `greenfield` / `feature` / `bugfix` / `refactor` / `demo` / `document` |
| pathway_confidence | REAL | |
| summary | TEXT | BA agent bóc tách |
| complexity_score / risk_score | SMALLINT | 1–5 |
| ai_readiness | REAL | |
| effort_estimate | JSONB | `{person_days, bolts, est_cost_usd, notes}` |
| status | TEXT | `draft` / `clarifying` / `ba_running` / `gate_a` / `approved` / `rejected` |
| gate_a_by / gate_a_at | UUID FK user / TIMESTAMPTZ | người chốt Gate A |
| customer_ack | JSONB NULLABLE | khách xác nhận qua link: {token, at, note} |

## 5. clarifying_question

`intent_id`, `question`, `options JSONB` (A/B/C/D hoặc null), `answer`, `answered_by NULLABLE` (null = khách qua link), `answered_at`, `order_index`.

## 6. prototype

Output BA agent — HTML prototype để chốt Gate A.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| intent_id | UUID FK | |
| version | INTEGER | UNIQUE(intent_id, version) |
| branch | TEXT | vd. `factory/proto-INT-12-v2` |
| preview_url | TEXT | GitHub Pages / Vercel preview |
| screens | JSONB | danh sách màn hình + mô tả luồng |
| status | TEXT | `building` / `live` / `superseded` |
| feedback | JSONB | góp ý của khách/người chốt per vòng |

## 7. breakdown

Output PM agent, khóa tại Gate B.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| intent_id / version | UUID FK / INTEGER | UNIQUE(intent_id, version) |
| status | TEXT | `draft` / `gate_b` / `locked` / `superseded` |
| gate_b_by / gate_b_at | UUID FK user / TIMESTAMPTZ | |
| notes | TEXT | |

## 8. requirement

`breakdown_id`, `code` (`FR-001`/`NFR-001`, UNIQUE per breakdown), `type` (`functional`/`non_functional`), `title`, `description`, `impact_analysis JSONB` (brownfield), `order_index`.

## 9. story / acceptance_criterion

`story`: `breakdown_id`, `code` (`US-001`), `title`, `narrative`, `order_index`; nối requirement qua `story_requirement`.

`acceptance_criterion`: `story_id NULLABLE`, `unit_of_work_id NULLABLE` (check: một trong hai non-null), `code` (`AC-001`), `given_when_then`, `order_index`. **AC là hợp đồng**: testing agent sinh test từ đây, Gate C nghiệm thu theo đây.

## 10. unit_of_work

| Cột | Kiểu | Ghi chú |
|---|---|---|
| breakdown_id | UUID FK | |
| code / name / description | TEXT | `UOW-001` |
| bounded_context | TEXT | |
| interface_contract | JSONB | |
| agent_overrides | JSONB NULLABLE | override role→profile cho UoW này |
| allowed_paths | TEXT[] | diff guard: coding agent chỉ được sửa trong đây |
| status | TEXT | `pending` / `in_progress` / `done` / `cancelled` |

`uow_dependency`: `uow_id`, `depends_on_uow_id`, UNIQUE cặp.

## 11. task

| Cột | Kiểu | Ghi chú |
|---|---|---|
| unit_of_work_id / bolt_id | UUID FK / NULLABLE | |
| code | TEXT | `T-0042`, UNIQUE per project |
| title / description / definition_of_done | TEXT | |
| role | TEXT | `design` / `code` / `test` / `doc` — agent vai nào thực thi |
| status | TEXT | `backlog` / `planned` / `ai_drafting` / `agent_review` / `awaiting_human` / `approved` / `integrated` / `verified` / `done` / `blocked` / `failed` / `cancelled` |
| flag_reason | TEXT NULLABLE | lý do vào awaiting_human/blocked |
| agent_profile_id | UUID FK NULLABLE | override sâu nhất |
| rework_count | SMALLINT default 0 | |
| priority / order_index | SMALLINT | |
| due_at | TIMESTAMPTZ | |

Index: `(status)`, `(unit_of_work_id, status)`, `(bolt_id)`.

## 12. bolt

`project_id`, `name`, `starts_at`, `ends_at`, `goal`, `status` (`planned`/`active`/`done`).

## 13. agent_job

| Cột | Kiểu | Ghi chú |
|---|---|---|
| task_id | UUID FK NULLABLE | null với job mức intent (ba, pm, prototype) |
| intent_id | UUID FK NULLABLE | check: task_id hoặc intent_id non-null |
| role | TEXT | `ba` / `pm` / `design` / `code` / `test` / `doc` / `cross_review` / `prototype` |
| agent_profile_id | UUID FK | profile đã resolve |
| input_payload | JSONB | prompt, rules version, branch, context |
| status | TEXT | `queued` / `running` / `succeeded` / `needs_human` / `failed` / `timeout` / `budget_exceeded` / `cancelled` |
| result_payload | JSONB | pr_url / preview_url / artifacts / self_report {summary, risks, confidence} |
| token_budget / tokens_used | INTEGER | |
| cost_usd | NUMERIC(10,4) | |
| self_fix_rounds | SMALLINT | |
| started_at / finished_at | TIMESTAMPTZ | |
| log_ref | TEXT | |

## 14. agent_review

Cross-review agent-agent (thay human review mặc định).

| Cột | Kiểu | Ghi chú |
|---|---|---|
| task_id | UUID FK | task bị review (thường role=code) |
| reviewer_job_id | UUID FK agent_job | job của agent review (role=test/cross_review) |
| pr_url | TEXT | |
| verdict | TEXT | `approve` / `request_changes` / `escalate` |
| findings | JSONB | mảng {severity, file, note} |
| confidence | REAL | thấp hơn ngưỡng project → escalate |
| round | SMALLINT | vòng review thứ mấy |

Verdict `approve` + CI xanh → auto-merge (nếu `settings.auto_merge` cho phép). `escalate` → AttentionItem.

## 15. attention_item

Hàng đợi duy nhất cho con người: 3 gate + mọi flag.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| project_id | UUID FK | |
| type | TEXT | `gate_a` / `gate_b` / `gate_c` / `agent_blocked` / `review_escalated` / `budget_exceeded` / `ci_failed_repeatedly` / `job_failed` |
| entity_type / entity_id | TEXT / UUID | intent, breakdown, task, agent_job… |
| title / detail | TEXT | câu hỏi/lý do cụ thể |
| severity | SMALLINT | 1–3 |
| status | TEXT | `open` / `in_review` / `resolved` / `escalated` |
| assignee_id | UUID FK user NULLABLE | |
| sla_deadline | TIMESTAMPTZ | |
| resolution | JSONB | quyết định + note (bắt buộc khi resolve) |
| resolved_by / resolved_at | UUID FK user / TIMESTAMPTZ | |

Index: `(project_id, status, sla_deadline)`, `(entity_type, entity_id)`.

## 16. test_run

| Cột | Kiểu | Ghi chú |
|---|---|---|
| task_id | UUID FK | |
| gate | TEXT | `sandbox` / `independent` / `ci` / `acceptance` |
| suite | TEXT | `unit` / `integration` / `regression` / `e2e` / `lint` / `build` |
| status | TEXT | `passed` / `failed` / `error` / `skipped` |
| stats | JSONB | {total, passed, failed, duration_ms, coverage_pct} |
| report_url | TEXT | link GitHub Actions run |
| ran_at | TIMESTAMPTZ | |

`test_run_ac`: `test_run_id`, `acceptance_criterion_id`, `covered BOOLEAN` — nền báo cáo Gate C.

## 17. llm_call

`project_id`, `agent_job_id NULLABLE`, `purpose` (`classify`/`questionnaire`/`ba`/`pm`/`construction`/`review`/`summarize`), `provider`, `model`, `input_tokens`, `output_tokens`, `cost_usd NUMERIC(10,6)`, `latency_ms`, `metadata JSONB` (không lưu full prompt — hash + độ dài; full log opt-in per project).

## 18. audit_log

Append-only (chặn UPDATE/DELETE bằng quyền DB): `project_id`, `actor_type` (`user`/`agent`/`system`), `actor_id NULLABLE`, `action` (`intent.gate_a_approved`, `breakdown.locked`, `agent_review.escalated`, `task.status_changed`, `pr.auto_merged`…), `entity_type`, `entity_id`, `payload JSONB`, `created_at`.

Index: `(project_id, created_at)`, `(entity_type, entity_id)`.

## 19. code_chunk (codebase index — brownfield)

| Cột | Kiểu | Ghi chú |
|---|---|---|
| project_id | UUID FK | |
| repo_ref | TEXT | commit SHA lúc index |
| path / symbol | TEXT | file + function/class (tree-sitter) |
| kind | TEXT | `function` / `class` / `module` / `config` |
| content_hash | TEXT | re-index tăng dần |
| embedding | vector(1024) | pgvector, HNSW index |
| summary | TEXT | AI tóm tắt — nguồn cho reverse-engineering docs |

## Ghi chú triển khai

- ORM: Prisma.
- Tenant: bảng `tenant` (id, name, deploy_mode `shared`/`vpc`/`hybrid`, model_policy `api_allowed`/`self_host_only`); `project.tenant_id` FK; RLS policy theo `current_setting('app.tenant_id')`.
- Trạng thái workflow sống trong Temporal; Postgres giữ trạng thái nghiệp vụ (hai bên đối chiếu qua `workflow_id` trên intent).
- Mọi chuyển trạng thái qua service layer (tự ghi AuditLog) — không update trực tiếp.
- Auto-merge rules trong `project.settings`: vd. `{max_severity_for_auto: "low", forbid_paths: ["**/auth/**", "**/payment/**"], require_human_if_risk_score: 4}` — chạm rule → luôn tạo AttentionItem thay vì auto-merge.
