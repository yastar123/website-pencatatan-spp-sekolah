# 🔌 API Documentation - Schoboard

Dokumentasi lengkap semua REST API endpoints yang tersedia di Schoboard.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Semua endpoint (kecuali login) memerlukan session cookie yang valid. Session di-set otomatis setelah login berhasil.

### Login untuk Mendapatkan Session

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "bendahara@sekolah.com",
    "password": "bendahara123"
  }' \
  -c cookies.txt
```

### Menggunakan Session di Request Berikutnya

```bash
curl http://localhost:3000/api/students \
  -b cookies.txt
```

---

## Authentication Endpoints

### POST /auth/login
Login user dan create session.

**Request:**
```json
{
  "email": "bendahara@sekolah.com",
  "password": "bendahara123"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "email": "bendahara@sekolah.com",
    "name": "Bendahara Admin",
    "role": "BENDAHARA"
  }
}
```

**Response (Error 401):**
```json
{
  "error": "Invalid email or password"
}
```

---

### POST /auth/logout
Logout user dan destroy session.

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /auth/me
Get current logged-in user info.

**Response (Success 200):**
```json
{
  "user": {
    "id": "user_123",
    "email": "bendahara@sekolah.com",
    "name": "Bendahara Admin",
    "role": "BENDAHARA"
  }
}
```

**Response (Not Authenticated 401):**
```json
{
  "error": "Not authenticated"
}
```

---

## Students Endpoints

### GET /students
Get list of all students with pagination and filtering.

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, default: 10) - Items per page
- `search` (string) - Search by name or NIS
- `classId` (string) - Filter by class
- `status` (string) - Filter by status (LUNAS/MENUNGGAK)

**Example:**
```bash
curl "http://localhost:3000/api/students?page=1&limit=10&search=Sarah" \
  -b cookies.txt
```

**Response (Success 200):**
```json
{
  "students": [
    {
      "id": "student_123",
      "nis": "4236432",
      "name": "Sarah Jones",
      "classId": "class_123",
      "address": "Kenkitan Santan",
      "phoneOrangTua": "08112368303",
      "status": "LUNAS",
      "class": {
        "id": "class_123",
        "name": "8A"
      },
      "createdAt": "2026-06-02T07:08:40.113Z",
      "updatedAt": "2026-06-02T07:08:40.113Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
```

---

### POST /students
Create new student. **Bendahara Only**

**Request:**
```json
{
  "nis": "4236440",
  "name": "New Student",
  "classId": "class_123",
  "address": "Jalan Mulia No. 5",
  "phoneOrangTua": "081234567890"
}
```

**Response (Success 201):**
```json
{
  "success": true,
  "student": {
    "id": "student_456",
    "nis": "4236440",
    "name": "New Student",
    "classId": "class_123",
    "address": "Jalan Mulia No. 5",
    "phoneOrangTua": "081234567890",
    "status": "MENUNGGAK",
    "createdAt": "2026-06-02T10:00:00.000Z"
  }
}
```

**Response (Error 400):**
```json
{
  "error": "NIS already exists"
}
```

---

### GET /students/[id]
Get single student by ID.

**Response (Success 200):**
```json
{
  "student": {
    "id": "student_123",
    "nis": "4236432",
    "name": "Sarah Jones",
    "classId": "class_123",
    "address": "Kenkitan Santan",
    "phoneOrangTua": "08112368303",
    "status": "LUNAS",
    "class": {
      "id": "class_123",
      "name": "8A"
    },
    "payments": [
      {
        "id": "payment_123",
        "amount": 30000,
        "status": "BERHASIL",
        "date": "2026-06-02T07:08:40.113Z"
      }
    ]
  }
}
```

---

### PUT /students/[id]
Update student data. **Bendahara Only**

**Request:**
```json
{
  "name": "Sarah Jones Updated",
  "address": "Jalan Baru No. 10",
  "phoneOrangTua": "081234567890",
  "classId": "class_456"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "student": {
    "id": "student_123",
    "nis": "4236432",
    "name": "Sarah Jones Updated",
    "address": "Jalan Baru No. 10",
    "phoneOrangTua": "081234567890",
    "classId": "class_456",
    "updatedAt": "2026-06-02T10:30:00.000Z"
  }
}
```

---

### DELETE /students/[id]
Delete student. **Bendahara Only**

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Student deleted"
}
```

---

## Payments Endpoints

### GET /payments
Get list of all payments.

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 10)
- `search` (string) - Search by NIS or student name
- `status` (string) - BERHASIL/GAGAL/PENDING
- `startDate` (date, format: YYYY-MM-DD)
- `endDate` (date, format: YYYY-MM-DD)

**Example:**
```bash
curl "http://localhost:3000/api/payments?status=BERHASIL&startDate=2026-06-01&endDate=2026-06-30" \
  -b cookies.txt
```

**Response (Success 200):**
```json
{
  "payments": [
    {
      "id": "payment_123",
      "studentId": "student_123",
      "transactionNo": "TRX001",
      "paymentType": "SPP",
      "amount": 30000,
      "paymentMethod": "Transfer Bank",
      "status": "BERHASIL",
      "proofUrl": "/uploads/proof_123.jpg",
      "notes": "Pembayaran SPP Oktober",
      "createdAt": "2026-06-02T07:08:40.113Z",
      "student": {
        "name": "Sarah Jones",
        "nis": "4236432"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
```

---

### POST /payments
Create new payment record. **Bendahara Only**

**Request:**
```json
{
  "studentId": "student_123",
  "paymentType": "SPP",
  "amount": 30000,
  "paymentMethod": "Transfer Bank",
  "status": "BERHASIL",
  "proofUrl": "/uploads/proof_123.jpg",
  "notes": "Pembayaran SPP Oktober"
}
```

**Response (Success 201):**
```json
{
  "success": true,
  "payment": {
    "id": "payment_456",
    "studentId": "student_123",
    "transactionNo": "TRX002",
    "paymentType": "SPP",
    "amount": 30000,
    "paymentMethod": "Transfer Bank",
    "status": "BERHASIL",
    "createdAt": "2026-06-02T10:00:00.000Z"
  }
}
```

---

### PUT /payments/[id]
Update payment. **Bendahara Only**

**Request:**
```json
{
  "amount": 35000,
  "status": "BERHASIL",
  "notes": "Update nominal pembayaran"
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "payment": {
    "id": "payment_123",
    "amount": 35000,
    "status": "BERHASIL",
    "updatedAt": "2026-06-02T10:30:00.000Z"
  }
}
```

---

### DELETE /payments/[id]
Delete payment record. **Bendahara Only**

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Payment deleted"
}
```

---

## Classes Endpoints

### GET /classes
Get all classes.

**Response (Success 200):**
```json
{
  "classes": [
    {
      "id": "class_123",
      "name": "8A",
      "academicYearId": "year_123",
      "createdAt": "2026-06-02T07:08:40.107Z"
    },
    {
      "id": "class_124",
      "name": "8B",
      "academicYearId": "year_123"
    }
  ]
}
```

---

### POST /classes
Create new class. **Bendahara Only**

**Request:**
```json
{
  "name": "9B",
  "academicYearId": "year_123"
}
```

**Response (Success 201):**
```json
{
  "success": true,
  "class": {
    "id": "class_789",
    "name": "9B",
    "academicYearId": "year_123"
  }
}
```

---

### DELETE /classes/[id]
Delete class. **Bendahara Only**

**Response (Success 200):**
```json
{
  "success": true,
  "message": "Class deleted"
}
```

---

## Academic Years Endpoints

### GET /academic-years
Get all academic years.

**Response (Success 200):**
```json
{
  "academicYears": [
    {
      "id": "year_123",
      "year": "2023/2024",
      "startDate": "2023-07-01T00:00:00.000Z",
      "endDate": "2024-06-30T00:00:00.000Z",
      "active": true,
      "createdAt": "2026-06-02T07:08:40.107Z"
    },
    {
      "id": "year_124",
      "year": "2024/2025",
      "startDate": "2024-07-01T00:00:00.000Z",
      "endDate": "2025-06-30T00:00:00.000Z",
      "active": false
    }
  ]
}
```

---

### POST /academic-years
Create new academic year. **Bendahara Only**

**Request:**
```json
{
  "year": "2025/2026",
  "startDate": "2025-07-01",
  "endDate": "2026-06-30",
  "active": false
}
```

**Response (Success 201):**
```json
{
  "success": true,
  "academicYear": {
    "id": "year_789",
    "year": "2025/2026",
    "startDate": "2025-07-01T00:00:00.000Z",
    "endDate": "2026-06-30T00:00:00.000Z",
    "active": false
  }
}
```

---

## SPP Rates Endpoints

### GET /spp-rates
Get all SPP rates.

**Query Parameters:**
- `academicYearId` (string) - Filter by academic year
- `classId` (string) - Filter by class

**Response (Success 200):**
```json
{
  "rates": [
    {
      "id": "rate_123",
      "classId": "class_123",
      "academicYearId": "year_123",
      "amount": 30000,
      "class": {
        "name": "8A"
      },
      "academicYear": {
        "year": "2023/2024"
      }
    }
  ]
}
```

---

### POST /spp-rates
Create new SPP rate. **Bendahara Only**

**Request:**
```json
{
  "classId": "class_125",
  "academicYearId": "year_123",
  "amount": 35000
}
```

**Response (Success 201):**
```json
{
  "success": true,
  "rate": {
    "id": "rate_456",
    "classId": "class_125",
    "academicYearId": "year_123",
    "amount": 35000
  }
}
```

---

## Dashboard Endpoints

### GET /dashboard/stats
Get dashboard statistics.

**Response (Success 200):**
```json
{
  "totalBalance": 60000,
  "studentsLunas": 2,
  "studentsMenunggak": 1,
  "totalStudents": 3,
  "chartData": [
    {
      "month": "Jan",
      "revenue": 0
    },
    {
      "month": "Jun",
      "revenue": 60000
    }
  ],
  "recentTransactions": [
    {
      "id": "payment_123",
      "studentName": "Sarah Jones",
      "studentNis": "4236432",
      "amount": 30000,
      "status": "BERHASIL",
      "date": "2026-06-02T07:08:40.304Z"
    }
  ]
}
```

---

## Reports Endpoints

### GET /reports
Generate reports with various filters.

**Query Parameters:**
- `type` (string) - Report type: monthly/byClass/trend/rework
- `academicYearId` (string) - Filter by academic year
- `startDate` (date) - Start date filter
- `endDate` (date) - End date filter
- `classId` (string) - Filter by class (for byClass reports)

**Example:**
```bash
curl "http://localhost:3000/api/reports?type=monthly&academicYearId=year_123&startDate=2026-06-01&endDate=2026-06-30" \
  -b cookies.txt
```

**Response (Success 200):**
```json
{
  "reportType": "monthly",
  "academicYear": "2023/2024",
  "period": {
    "startDate": "2026-06-01",
    "endDate": "2026-06-30"
  },
  "data": [
    {
      "month": "Juni",
      "totalPayments": 60000,
      "paymentCount": 2,
      "studentsLunas": 2,
      "studentsMenunggak": 1,
      "byClass": [
        {
          "className": "8A",
          "totalPayments": 30000,
          "count": 1
        },
        {
          "className": "8B",
          "totalPayments": 30000,
          "count": 1
        }
      ]
    }
  ],
  "summary": {
    "totalRevenue": 60000,
    "totalTransactions": 2,
    "averagePerTransaction": 30000
  }
}
```

---

## Backup Endpoints

### GET /backup/export
Export database as file.

**Response:**
- Returns SQLite database file (binary)
- Filename: `backup-YYYY-MM-DD.db`

**Example:**
```bash
curl -b cookies.txt "http://localhost:3000/api/backup/export" \
  -o backup-2026-06-02.db
```

---

## Error Handling

Semua error response mengikuti format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Status | Code | Meaning |
|--------|------|---------|
| 400 | BAD_REQUEST | Invalid request format |
| 401 | UNAUTHORIZED | Not authenticated / Invalid session |
| 403 | FORBIDDEN | Not authorized for this action |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Data conflict (e.g., duplicate NIS) |
| 500 | SERVER_ERROR | Internal server error |

---

## Rate Limiting

Saat ini tidak ada rate limiting. Untuk production, implementasikan rate limiting untuk prevent abuse.

---

## Testing API dengan cURL

### 1. Login & Save Session
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bendahara@sekolah.com","password":"bendahara123"}' \
  -c /tmp/cookies.txt
```

### 2. Get Students
```bash
curl http://localhost:3000/api/students \
  -b /tmp/cookies.txt
```

### 3. Create Payment
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -b /tmp/cookies.txt \
  -d '{
    "studentId": "student_123",
    "paymentType": "SPP",
    "amount": 30000,
    "paymentMethod": "Transfer Bank",
    "status": "BERHASIL"
  }'
```

### 4. Get Dashboard Stats
```bash
curl http://localhost:3000/api/dashboard/stats \
  -b /tmp/cookies.txt
```

---

## Testing dengan Postman

1. Open Postman
2. Create new collection "Schoboard"
3. Create request for login POST /api/auth/login
4. Set "Save response cookies" to ON
5. After login, create requests untuk endpoints lain
6. Cookies akan otomatis included

---

## Response Time Guidelines

Target response times untuk production:

- List endpoints (GET): < 200ms
- Detail endpoints (GET): < 100ms
- Create endpoints (POST): < 300ms
- Update endpoints (PUT): < 300ms
- Delete endpoints (DELETE): < 100ms
- Report generation: < 1000ms

---

## Best Practices

1. **Always validate input** sebelum send ke API
2. **Use meaningful error messages** untuk debug
3. **Cache responses** di client jika possible
4. **Implement exponential backoff** untuk retry logic
5. **Log all API calls** untuk audit trail
6. **Use HTTPS** untuk production

---

**End of API Documentation**
