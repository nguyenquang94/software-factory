# Cấu hình LiteLLM Proxy & Quản lý Virtual Keys per Tenant

Thư mục này chứa cấu hình Proxy của LiteLLM, hỗ trợ định tuyến đa model (multi-model routing), quản lý khóa ảo (virtual keys) theo từng Tenant và áp dụng hạn ngạch/ngân sách (budget/quota) sử dụng.

## 1. Cách hoạt động
LiteLLM được kết nối với cơ sở dữ liệu PostgreSQL (`litellm`) của dự án để tự động lưu trữ thông tin về Virtual Keys, lịch sử cuộc gọi LLM và thông số ngân sách. Nó sử dụng Redis để cache các truy vấn và kiểm tra giới hạn nhanh chóng.

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
- `metadata.tenant_id`: Định danh Tenant nhằm mục đích phân tích chi phí và ghi nhận lịch sử cuộc gọi trong database.

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

## 4. Theo dõi lượng tiêu thụ (Usage & Metrics) & Kiểm tra Quota
Bạn có thể truy vấn thông tin chi tiết của một Virtual Key (bao gồm budget đã tiêu thụ và ngân sách còn lại) bằng cách sử dụng chính Virtual Key đó hoặc Master Key để gọi endpoint `/key/info`:

### Cách 1: Dùng chính Virtual Key để tự kiểm tra
```bash
curl -G "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-YOUR-VIRTUAL-KEY"
```

### Cách 2: Dùng Master Key để kiểm tra một key bất kỳ
```bash
curl -G "http://localhost:4000/key/info" \
  -H "Authorization: Bearer sk-factory-dev" \
  --data-urlencode "key=sk-YOUR-VIRTUAL-KEY"
```

Phản hồi trả về sẽ có dạng:
```json
{
  "key": "sk-YOUR-VIRTUAL-KEY",
  "info": {
    "key_alias": "tenant-A-key",
    "max_budget": 50.0,
    "budget_spent": 1.25,
    "max_parallel_requests": null,
    "metadata": {
      "tenant_id": "uuid-cua-tenant-a-o-day"
    }
  }
}
```

## 5. Ví dụ cụ thể cho 2 Tenant
Dưới đây là kịch bản kiểm tra hoạt động phân tách hạn ngạch giữa 2 Tenant:
- **Tenant A (`tenant-a`)**: Được cấp Virtual Key với ngân sách `0.00` USD (Hết hạn ngạch / Bị chặn ngay từ đầu).
- **Tenant B (`tenant-b`)**: Được cấp Virtual Key với ngân sách `100.00` USD (Có thể gọi bình thường).

### Bước 1: Tạo Virtual Key cho Tenant A (Budget = 0)
```bash
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer sk-factory-dev" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "tenant-a-key",
    "max_budget": 0.00,
    "metadata": {
      "tenant_id": "tenant-a"
    }
  }'
```

### Bước 2: Tạo Virtual Key cho Tenant B (Budget = 100)
```bash
curl -X POST "http://localhost:4000/key/generate" \
  -H "Authorization: Bearer sk-factory-dev" \
  -H "Content-Type: application/json" \
  -d '{
    "key_alias": "tenant-b-key",
    "max_budget": 100.00,
    "metadata": {
      "tenant_id": "tenant-b"
    }
  }'
```

### Bước 3: Thử nghiệm cuộc gọi từ Tenant A
Tenant A gọi model `claude` (hoặc `claude-3-5-sonnet`):
```bash
curl -X POST "http://localhost:4000/chat/completions" \
  -H "Authorization: Bearer sk-TENANT-A-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude",
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ]
  }'
```
**Kết quả mong đợi**: Bị LiteLLM chặn ngay từ phía proxy và trả về lỗi:
`HTTP/1.1 400 Bad Request` hoặc `429 Too Many Requests` kèm nội dung `Budget Exceeded`.

### Bước 4: Thử nghiệm cuộc gọi từ Tenant B
Tenant B gọi model `claude`:
```bash
curl -X POST "http://localhost:4000/chat/completions" \
  -H "Authorization: Bearer sk-TENANT-B-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude",
    "messages": [
      {
        "role": "user",
        "content": "Hello"
      }
    ]
  }'
```
**Kết quả mong đợi**: Do ngân sách là `100.00` USD, yêu cầu sẽ vượt qua được bước kiểm tra budget của LiteLLM. (Yêu cầu sau đó có thể bị lỗi xác thực API Key Anthropic giả `AuthenticationError`, nhưng điều này chứng minh yêu cầu đã đi qua được proxy check).

---

## Verified

Môi trường đã được xác thực cục bộ bằng Docker và `curl` với kết quả thành công:

### 1. Tạo Virtual Key cho Tenant A (Budget = 0.00)
- **Lệnh**:
  ```bash
  curl -X POST "http://localhost:4000/key/generate" \
    -H "Authorization: Bearer sk-factory-dev" \
    -H "Content-Type: application/json" \
    -d '{"key_alias": "tenant-a-key", "max_budget": 0.00, "metadata": {"tenant_id": "tenant-a"}}'
  ```
- **Kết quả trả về**:
  ```json
  {
    "key_alias": "tenant-a-key",
    "max_budget": 0.0,
    "metadata": {"tenant_id": "tenant-a"},
    "key": "sk-9fmxlfbL260XA7hcEbiXHg"
  }
  ```

### 2. Tạo Virtual Key cho Tenant B (Budget = 100.00)
- **Lệnh**:
  ```bash
  curl -X POST "http://localhost:4000/key/generate" \
    -H "Authorization: Bearer sk-factory-dev" \
    -H "Content-Type: application/json" \
    -d '{"key_alias": "tenant-b-key", "max_budget": 100.00, "metadata": {"tenant_id": "tenant-b"}}'
  ```
- **Kết quả trả về**:
  ```json
  {
    "key_alias": "tenant-b-key",
    "max_budget": 100.0,
    "metadata": {"tenant_id": "tenant-b"},
    "key": "sk-E-Xuo_GA1QkaqFX3vqcDrQ"
  }
  ```

### 3. Gọi thử bằng Key của Tenant A (Có Budget = 0.00)
- **Lệnh**:
  ```bash
  curl -i -X POST "http://localhost:4000/chat/completions" \
    -H "Authorization: Bearer sk-9fmxlfbL260XA7hcEbiXHg" \
    -H "Content-Type: application/json" \
    -d '{"model": "claude", "messages": [{"role": "user", "content": "Hello"}]}'
  ```
- **Kết quả**: Bị LiteLLM chặn ngay lập tức tại tầng Proxy.
  ```http
  HTTP/1.1 429 Too Many Requests
  Content-Type: application/json

  {"error":{"message":"Budget has been exceeded! Key=tenant-a-key (sk-...iXHg) Current cost: 0.0, Max budget: 0.0","type":"budget_exceeded","param":null,"code":"429"}}
  ```

### 4. Gọi thử bằng Key của Tenant B (Có Budget = 100.00)
- **Lệnh**:
  ```bash
  curl -i -X POST "http://localhost:4000/chat/completions" \
    -H "Authorization: Bearer sk-E-Xuo_GA1QkaqFX3vqcDrQ" \
    -H "Content-Type: application/json" \
    -d '{"model": "claude", "messages": [{"role": "user", "content": "Hello"}]}'
  ```
- **Kết quả**: Vượt qua lớp kiểm tra Budget của Proxy thành công, sau đó kích hoạt router fallback từ `claude` sang `claude-3-5-sonnet` (cả hai đều lỗi API Key Anthropic dummy 401).
  ```http
  HTTP/1.1 401 Unauthorized
  Content-Type: application/json

  {"error":{"message":"litellm.AuthenticationError: AnthropicException - {\"type\":\"error\",\"error\":{\"type\":\"authentication_error\",\"message\":\"invalid x-api-key\"}...}. Received Model Group=claude\nAvailable Model Group Fallbacks=['claude-3-5-sonnet']\nError doing the fallback: litellm.AuthenticationError: AnthropicException...","type":null,"param":null,"code":"401"}}
  ```
