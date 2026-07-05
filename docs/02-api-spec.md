# API Spec — factory-core

> Phiên bản: 0.2 — 2026-07-05 (v0.2: pipeline toàn trình, GitHub, Attention Queue) · REST + WebSocket · Tài liệu cha: [00-overview.md](00-overview.md) · Schema: [01-db-schema.md](01-db-schema.md)

Quy ước: base `/api/v1`, JSON, JWT Bearer. Lỗi `{error: {code, message, details?}}`. Phân trang `?page=&limit=`. Mọi mutation ghi AuditLog ở service layer. Quyền theo `project_member.role` (`approver` / `oncall_engineer` / `requester` / `customer`).

## 1. Projects, Agent Profiles & Role Assignments

```
GET/POST   /projects                          — (admin tạo)
GET/PATCH  /projects/:id                      — settings: auto_merge rules, preview provider, CI commands

GET/POST   /agent-profiles?project_id=
PATCH      /agent-profiles/:id

GET        /projects/:pid/role-assignments    — map role → profile
PUT        /projects/:pid/role-assignments    — [{role: "ba", agent_profile_id}, {role: "code", …}, …]
```

## 2. Intake (người chỉ làm bước này + trả lời câu hỏi)

```
POST   /projects/:pid/intents                 — {title, raw_input, source_channel} (requester)
GET    /projects/:pid/intents?status=&pathway=
GET    /intents/:id                           — kèm questions, prototypes, breakdowns

POST   /intents/:id/run-ba                    — kích hoạt BA agent pipeline (auto sau khi tạo,
                                                endpoint này để chạy lại) → status=ba_running
GET    /intents/:id/questions
POST   /questions/:qid/answer                 — {answer} (member hoặc public token)
GET    /intents/:id/public?token=             — trang cho khách: questionnaire + prototype preview + nút xác nhận
POST   /intents/:id/customer-ack?token=       — khách xác nhận BA package
```

BA agent pipeline (orchestrator tự chạy, không cần gọi API từng bước): classify → questionnaire → (chờ answers) → requirements + stories/AC → prototype (nếu pathway cần) → tạo AttentionItem `gate_a`.

## 3. Prototype

```
GET    /intents/:id/prototypes                — versions + preview_url + feedback
POST   /prototypes/:id/feedback               — {note, screens?} (member hoặc public token)
POST   /intents/:id/prototypes/rebuild        — BA agent sinh version mới theo feedback
```

## 4. Gates (3 điểm chốt của con người)

```
POST   /intents/:id/gate-a/approve            — {note?} (approver) → intent approved, orchestrator chạy PM agent
POST   /intents/:id/gate-a/reject             — {reason!} → quay lại ba_running kèm feedback

POST   /breakdowns/:id/gate-b/approve         — (approver) → locked, sinh tasks, dispatch construction
POST   /breakdowns/:id/gate-b/request-changes — {notes!} → PM agent sửa, version mới

GET    /intents/:id/acceptance-report         — mapping AC ↔ test ↔ pass/fail + staging URL
POST   /intents/:id/gate-c/approve            — nghiệm thu (approver, kèm customer ack nếu cần)
POST   /intents/:id/gate-c/reject             — {failed_acs: [], reason} → orchestrator tạo rework tasks
```

## 5. Breakdown (PM agent sinh; người chỉ xem/sửa trước khi chốt)

```
GET    /breakdowns/:id                        — cây requirements/stories/uows/tasks + dependency graph
PATCH  /requirements/:id | /stories/:id | /uows/:id | /tasks/:id    — chỉnh tay trước Gate B (approver)
POST   /uows/:id/dependencies                 — {depends_on_uow_id}
POST   /breakdowns/:id/regenerate             — PM agent chạy lại với hướng dẫn {notes}
```

## 6. Tasks & Bolts (chủ yếu read-only — agent tự chạy)

```
GET    /projects/:pid/tasks?status=&bolt_id=&uow_id=&role=
GET    /tasks/:id                             — kèm agent_jobs, agent_reviews, test_runs
POST   /tasks/:id/dispatch                    — chạy lại tay (oncall_engineer)
POST   /tasks/:id/answer-block                — {answer} khi blocked → re-dispatch
POST   /tasks/:id/cancel

GET    /projects/:pid/bolts
GET    /bolts/:id/report                      — bolt report tự động
```

Không có endpoint set-status tự do — trạng thái chỉ đổi qua action ngữ nghĩa + webhook.

## 7. Agent Jobs

```
GET    /agent-jobs/:id                        — status, tokens, cost, self_fix_rounds
GET    /agent-jobs/:id/log?tail=500
POST   /agent-jobs/:id/cancel
GET    /projects/:pid/agent-jobs?status=running&role=
```

Callback nội bộ từ worker (service token):

```
POST   /internal/agent-jobs/:id/events        — {type: progress|needs_human|done|failed, payload}
POST   /internal/agent-jobs/:id/llm-calls     — batch LlmCall
POST   /internal/agent-reviews                — worker đẩy kết quả cross-review {task_id, verdict, findings, confidence}
```

## 8. Attention Queue (màn hình duy nhất con người trực)

```
GET    /projects/:pid/attention?status=open&type=&sort=sla     — gates + flags, sắp theo severity/sla
GET    /attention/:id                         — kèm entity chi tiết (task, PR link, findings, câu hỏi agent)
POST   /attention/:id/claim                   — (approver/oncall_engineer)
POST   /attention/:id/resolve                 — {decision, note!} — decision tùy type:
                                                gate_a/b/c → gọi gate endpoint tương ứng
                                                agent_blocked → answer + re-dispatch
                                                review_escalated → approve_merge | request_changes
                                                budget_exceeded → raise_budget | split_task | cancel
POST   /attention/:id/escalate                — {to_user_id, note}
```

## 9. Test & Metrics

```
GET    /tasks/:id/test-runs
GET    /projects/:pid/metrics/summary         — cost/tokens theo tuần, % task toàn trình không cần người,
                                                tỷ lệ escalate, rework trung bình, AC coverage
GET    /projects/:pid/audit-logs?entity_type=&entity_id=&actor=
```

## 10. GitHub integration (webhooks vào)

GitHub App với quyền: contents, pull_requests, issues, actions, pages. Webhook endpoint:

```
POST   /webhooks/github                       — verify signature (X-Hub-Signature-256)
```

| Event | Xử lý |
|---|---|
| `issues.opened` (label `factory`) | tạo Intent, source=github_issue, auto chạy BA |
| `pull_request.closed` (merged) | task → integrated |
| `workflow_run.completed` | ghi TestRun(gate=ci); pass → task verified; fail lặp ≥ 2 → AttentionItem |
| `issue_comment` trên PR của factory | forward vào context vòng rework của agent |

Chiều ra (core/worker gọi GitHub API): tạo branch, PR, comment self-report + findings của cross-review lên PR, enable auto-merge, deploy Pages/Vercel preview, tạo staging deployment cho Gate C.

## 11. WebSocket (`/ws`, subscribe theo project)

| Event | Payload |
|---|---|
| `pipeline.stage_changed` | {intent_id, stage, status} |
| `task.status_changed` | {task_id, from, to} |
| `agent_job.progress` | {job_id, role, message, tokens_used} |
| `agent_job.log` | {job_id, line} (khi client mở panel) |
| `attention.created` | {attention_id, type, severity, sla_deadline} |
| `prototype.live` | {intent_id, version, preview_url} |

## 12. Luồng toàn trình (happy path, pathway=feature)

```
POST intents (hoặc GitHub issue label `factory`)
→ [BA agent] classify → questionnaire → khách answer qua /public?token
→ [BA agent] requirements + stories/AC + prototype → preview_url → attention(gate_a)
→ người + khách chốt Gate A
→ [PM agent] breakdown: UoW + tasks + gán role → attention(gate_b)
→ người chốt Gate B → dispatch construction
→ [design agent] UI spec → [coding agent] code + PR (sandbox pass)
→ [testing agent] test độc lập từ AC + cross-review PR
→ verdict approve + CI xanh → auto-merge → integrated → verified
   (escalate/blocked → attention → người xử lý)
→ đủ task done → staging deploy → acceptance-report → attention(gate_c)
→ người + khách nghiệm thu Gate C → done
```
