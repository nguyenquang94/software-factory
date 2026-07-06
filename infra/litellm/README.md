# Cấu hình LiteLLM Proxy & Quản lý Virtual Keys per Tenant

Thư mục này chứa cấu hình Proxy của LiteLLM, hỗ trợ định tuyến đa model (multi-model routing), quản lý khóa ảo (virtual keys) theo từng Tenant và áp dụng hạn ngạch/ngân sách (budget/quota) sử dụng.

## 1. Cách hoạt động
LiteLLM được kết nối với cơ sở dữ liệu PostgreSQL (`factory`) của dự án để tự động lưu trữ thông tin về Virtual Keys, lịch sử cuộc gọi LLM và thông số ngân sách. Nó sử dụng Redis để cache các truy vấn và kiểm tra giới hạn nhanh chóng.

## 2. Cách tạo Virtual Key cho từng Tenant
Để cô lập chi phí và quản lý hạn ngạch riêng biệt cho từng Tenant, bạn cần tạo một Virtual Key riêng cho Tenant đó thông qua endpoint `/key/generate` của LiteLLM.

Sử dụng lệnh `curl` dưới đây để tạo khóa:

```bash
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer sk-factory-dev" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "tenant-A-key",
    "duration": "30d",
    "max_budget": 50.00,
    "budget_duration": "30d",
    "metadata": {
      "tenant_id": "uuid-cua-tenant-a-o-day"
    }
  }'
```

### Các thông số quan trọng:
- `Authorization`: Token Master Key của LiteLLM (mặc định là `sk-factory-dev` thiết lập trong `.env`).
- `max_budget`: Ngân sách tối đa tính bằng USD (ví dụ: `50.00` USD).
- `budget_duration`: Khoảng thời gian reset ngân sách (ví dụ: `30d` - 30 ngày, `1d` - 1 ngày, hoặc bỏ qua để áp dụng ngân sách trọn đời).
- `metadata.tenant_id`: Định danh Tenant nhằm mục đích phân tích chi phí và ghi nhận lịch sử cuộc gọi trong Audit/LlmCall.

Kết quả trả về sẽ chứa Virtual Key có định dạng `sk-...`. Ứng dụng client thuộc Tenant A sẽ dùng key này thay thế cho API key gốc để gọi LLM.

## 3. Cách cập nhật hoặc thiết lập Quota/Budget cho Key hiện tại
Bạn có thể cập nhật giới hạn ngân sách của một Virtual Key bất kỳ lúc nào qua endpoint `/key/update`:

```bash
curl -X POST "http://localhost:4000/key/update" \
  -H "Authorization: Bearer sk-factory-dev" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "sk-virtual-key-can-update",
    "max_budget": 100.00,
    "budget_duration": "30d"
  }'
```

## 4. Theo dõi lượng tiêu thụ (Usage & Metrics)
Vì LiteLLM Proxy được kết nối với Postgres DB, bạn có thể kiểm tra trực quan dashboard Admin của LiteLLM (nếu được kích hoạt) hoặc truy vấn trực tiếp bảng dữ liệu trong PostgreSQL để thống kê lượng token/cost tiêu thụ theo từng `tenant_id` trong phần `metadata`.
