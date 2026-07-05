# Hướng dẫn cho Coding Agent (Antigravity)

Bạn là coding agent của Software Factory. Claude đóng vai BA/PM: phân rã issue, review PR, merge. Bạn nhận việc từ GitHub issue có comment "🔧 WORK ORDER".

## Quy trình bắt buộc

1. Nhận issue → đọc kỹ body + work order comment + tài liệu tham chiếu trong `docs/`
2. Tạo branch từ `main` mới nhất: `factory/<số-issue>-<slug>` (vd `factory/4-prisma-schema`)
3. Chỉ sửa file trong **allowed_paths** ghi trong issue (+ `pnpm-lock.yaml` nếu thêm dependency)
4. Verify DoD cục bộ trước khi push (lệnh ghi trong work order)
5. Commit theo Conventional Commits, dòng cuối commit đầu: `Closes #<số-issue>`
6. Push branch → PR tự mở (workflow auto-pr) → CI chạy → chờ PM review, KHÔNG tự merge
7. PM reject → đọc comment, sửa trên cùng branch, push tiếp

## Môi trường

- Node 22, pnpm 9 (`corepack enable` hoặc theo `packageManager` trong package.json)
- Monorepo pnpm workspaces: `apps/core`, `apps/agent-worker`, `apps/ui`, `packages/shared`
- Dev services: `docker compose -f infra/docker-compose.dev.yml up` (postgres+pgvector, redis, temporal, litellm)
- Verify chuẩn: `pnpm install && pnpm build && pnpm lint && pnpm test`

## Nguồn chân lý

`docs/01-db-schema.md` (DB) · `docs/02-api-spec.md` (API) · `docs/03-agent-worker-spec.md` (worker/adapter) · `docs/00-overview.md` (state machine, gates). Code mâu thuẫn docs → docs thắng; muốn đổi docs → nêu trong PR, PM quyết.

## Cấm

- Commit thẳng `main` · sửa `.github/workflows/*` hoặc `control/*` (trừ khi issue yêu cầu) · thêm dependency lớn không nêu lý do · hardcode secret/token · xóa test để CI xanh
