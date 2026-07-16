# Massive-Scale System Architecture & Directory Design

เอกสารฉบับนี้อธิบายถึงสถาปัตยกรรมระบบขนาดใหญ่ (Massive Scale) ที่ได้รับการออกแบบในลักษณะ Microservices และ Polyglot Persistence (การเลือกใช้ฐานข้อมูลให้เหมาะสมกับลักษณะงาน) พร้อมทั้งโครงสร้างโฟลเดอร์แบบ Monorepo เพื่อให้ง่ายต่อการพัฒนาและพร้อมรองรับการขยายระบบในอนาคต

---

## 1. System Architecture & Tech Stack

ระบบถูกแบ่งออกเป็นบริการย่อย (Services) และสัญญาระหว่างข้อมูล (Data Stores) ตามหน้าที่ความรับผิดชอบอย่างชัดเจน:

### 🌐 Frontend & API Gateway
*   **web-frontend (Next.js + TypeScript):** รองรับ Server-Side Rendering (SSR) เพื่อความเร็วในการโหลดหน้าแรก การจัดการ State ภายในผ่าน Zustand และเน้น UI ที่สะอาด รวดเร็ว
*   **api-gateway (Envoy Proxy):** ด่านหน้าของระบบ ทำหน้าที่ทำ Rate Limiting, Authentication Verification และการจัดเส้นทาง (Routing) ไปยัง Microservices หลังบ้าน

### ⚡ Backend Services (Microservices)
*   **svc-user-auth (Go / TypeScript):** รับผิดชอบระบบสมาชิก การจัดการสิทธิ์ (RBAC) ประวัติส่วนตัว (Profile) ทำงานร่วมกับ Relational DB และ Cache
*   **svc-activity-feed (Go):** บริการที่มี High Read/Write Throughput ทำหน้าที่รับโพสต์ คอมเมนต์ กดไลก์ และดึงข้อมูลฟีด โดยจะทำงานร่วมกับ Message Broker (Kafka) เพื่อลดโหลดสะสม
*   **svc-notification (Rust / Go):** ทำงานแบบ Event-Driven รอรับสัญญานอีเวนต์จาก Kafka แล้วผลักข้อมูลแจ้งเตือนรูปแบบ Real-time ไปยังผู้ใช้งานผ่านระบบ WebSockets

### 📊 Data & Message Broker Layer
*   **infra-cache (Redis):** เก็บข้อมูล Session Token และข้อมูลที่มีการอ่านซ้ำบ่อยๆ เพื่อให้ Latency ต่ำที่สุด
*   **infra-kafka (Apache Kafka):** รับข้อมูลกิจกรรมปริมาณมหาศาลแบบ Asynchronous ช่วยให้ API หลังบ้านไม่เกิด Bottleneck
*   **db-core (PostgreSQL):** เก็บข้อมูลโครงสร้างที่ต้องการความถูกต้องสูงสุด (ACID Compliance) เช่น บัญชีผู้ใช้ และข้อมูลความปลอดภัย
*   **db-activity (ScyllaDB / Cassandra):** Wide-column Store สำหรับเก็บ Activity Logs, Feed Timeline ซึ่งรองรับปริมาณ Data ขนาด Petabyte ได้ดี
*   **db-social-graph (Neo4j):** Graph Database จัดการความสัมพันธ์เชิงเครือข่าย เช่น ระบบเพื่อน (Friends Lineage) และระบบผู้ติดตาม (Followers)

---

## 2. Directory Structure (Monorepo)

โครงสร้างโฟลเดอร์แบบ Monorepo ช่วยให้ทีมพัฒนาสามารถดูแลรักษาโค้ดทุกบริการได้จากที่เดียว สามารถแชร์ประเภทข้อมูล (Type Declarations) และเอกสารอินเตอร์เฟส (Protobuf) ร่วมกันได้

```text
my-massive-app/
├── apps/                               # --- APPLICATIONS & SERVICES ---
│   ├── web-frontend/                   # Next.js (TypeScript) Frontend
│   │   ├── src/
│   │   │   ├── app/                    # Next.js App Router
│   │   │   ├── components/             # Reusable UI Components
│   │   │   ├── hooks/                  # Custom React Hooks
│   │   │   └── services/               # API Client Connections
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── svc-user-auth/                  # Backend API 1: User & Authentication (Go)
│   │   ├── cmd/api/main.go             # Entry Point
│   │   ├── internal/                   # Core Business Logic (Domain/Repository/Usecase)
│   │   └── Dockerfile
│   │
│   ├── svc-activity-feed/              # Backend API 2: High-traffic Feed & Posts (Go)
│   │   ├── cmd/api/main.go
│   │   ├── internal/
│   │   └── Dockerfile
│   │
│   └── svc-notification/               # Backend API 3: Real-time Notification (Rust)
│       ├── src/main.rs                 # WebSocket Server
│       └── Dockerfile
│
├── deploy/                             # --- INFRASTRUCTURE & DEPLOYMENT ---
│   ├── docker-compose.yml              # ไฟล์สำหรับยกระบบ Local Development ทั้งหมดขึ้นมาทำงาน
│   ├── gateway/                        # การตั้งค่า API Gateway
│   │   └── envoy.yaml
│   └── database/                       # SQL/CQL สำหรับการกำหนดโครงสร้างฐานข้อมูลเริ่มต้น
│       ├── postgres-init.sql
│       └── scylla-init.cql
│
├── shared/                             # --- SHARED CODE & CONTRACTS ---
│   └── proto/                          # Protocol Buffers (gRPC) สำหรับการสื่อสารภายใน
│       ├── user.proto
│       └── activity.proto
│
└── README.md