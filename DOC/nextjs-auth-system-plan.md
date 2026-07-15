# แผนระบบ Auth สำหรับ Next.js (TypeScript) แบบ Production-ready
## พร้อม Admin Panel สำหรับตั้งค่า Provider และจัดการผู้ใช้

---

## 1. เลือก Stack

| ส่วน | เทคโนโลยีที่แนะนำ | เหตุผล |
|---|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript | มาตรฐานปัจจุบัน, รองรับ Server Actions, RSC |
| Auth Library | **Auth.js (NextAuth v5)** | มาตรฐานอันดับ 1 ของวงการ Next.js รองรับ OAuth (GitHub, Google) + Credentials provider ในตัว, session management ครบ |
| Database | **PostgreSQL** | Relational, ACID, scale ได้ดี, รองรับ connection pooling (เหมาะกับ auth data) |
| ORM | **Prisma** (หรือ Drizzle ถ้าต้องการ perf/edge สูงกว่า) | Type-safe, migration ดี, community ใหญ่ |
| Password Hashing | **argon2id** (หรือ bcrypt) | มาตรฐานสากลสำหรับเก็บรหัสผ่าน |
| Validation | **Zod** | Type-safe validation ทั้ง client/server |
| Email Service | **Resend** หรือ **AWS SES** | ส่ง email ยืนยันบัญชี / reset password |
| Rate Limiting | **Upstash Redis + @upstash/ratelimit** | ป้องกัน brute-force login, scale แบบ serverless ได้ |
| Session | JWT (stateless) หรือ Database session ผ่าน Prisma Adapter | JWT เหมาะกับ scale เยอะ, DB session เหมาะกับ revoke ได้ทันที |
| Deployment | Vercel / Docker + PostgreSQL (Neon, Supabase, RDS) | Neon/Supabase รองรับ serverless Postgres ดีมากกับ Next.js |

**คำแนะนำ:** scale เยอะแนะนำ **JWT session + Redis สำหรับ rate limit/blacklist** และใช้ **Neon (serverless Postgres)** เพราะ connection pooling ดีกับ serverless functions ของ Next.js/Vercel

---

## 2. Flow การทำงานหลัก

1. **Register (Email/Password)**
   - กรอก email, password, confirm password → validate ด้วย Zod (client + server)
   - เช็ค password กับ confirm password ตรงกัน, ความยาว/ความซับซ้อนตามมาตรฐาน (min 8 ตัว, มีตัวเลข/ตัวอักษรพิเศษ)
   - Hash password ด้วย argon2id/bcrypt ก่อนเก็บ DB
   - ส่ง email ยืนยันบัญชี (verification token, หมดอายุใน 24 ชม.)
   - บัญชีจะ "pending" จนกว่าจะกด verify

2. **Login (Email/Password)**
   - ตรวจสอบ credentials ผ่าน Auth.js Credentials Provider
   - เช็คว่า verified แล้วหรือยัง
   - Rate limit ป้องกัน brute force (เช่น 5 ครั้ง/15 นาทีต่อ IP+email)

3. **Login with GitHub / Google**
   - ใช้ Auth.js OAuth Provider (`GitHubProvider`, `GoogleProvider`)
   - ถ้า email ตรงกับ account ที่มีอยู่แล้ว (สมัครด้วย email/password) → ให้ option "link account" ไม่ใช่สร้าง duplicate user

4. **Session Management**
   - JWT callback เก็บ userId, role
   - Middleware ตรวจสอบ session ทุก protected route

---

## 3. หลักการจัดการ Config: `.env` vs Database

| ชั้น | เก็บที่ไหน | ตัวอย่าง |
|---|---|---|
| **Secret ระดับ Infra** (แก้ผ่าน `.env` เท่านั้น) | `.env` | `DATABASE_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY` |
| **Config ที่ admin ปรับได้ผ่านหน้าเว็บ** | เก็บใน **Database** (เข้ารหัสไว้) | Google/GitHub Client ID/Secret, เปิด/ปิด provider, email service API key |

เหตุผล: `NEXTAUTH_SECRET`/`DATABASE_URL` ต้องมีตั้งแต่ app start ห้ามพึ่ง DB (ไก่กับไข่) ส่วน OAuth key ที่ต้องการให้ admin แก้ได้แบบไม่ redeploy ต้องเก็บใน DB แล้ว **เข้ารหัสด้วย AES** ก่อนเก็บ (ใช้ `ENCRYPTION_KEY` จาก .env)

### `.env.local` ตัวอย่าง

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<openssl rand -base64 32>"

# ใช้เข้ารหัส secret ที่เก็บใน DB (OAuth keys ที่ admin กรอก)
ENCRYPTION_KEY="<openssl rand -base64 32>"

# Redis (rate limit)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Email service (fallback เริ่มต้น, override ได้จาก admin)
RESEND_API_KEY=""

# Bootstrap admin (สร้าง admin คนแรกตอน seed)
INITIAL_ADMIN_EMAIL="admin@example.com"
INITIAL_ADMIN_PASSWORD="ChangeMe123!"
```

---

## 4. Database Schema (Prisma)

```prisma
enum Role {
  USER
  ADMIN
}

enum UserStatus {
  ACTIVE
  BANNED
  PENDING
}

model User {
  id            String     @id @default(cuid())
  email         String     @unique
  emailVerified DateTime?
  password      String?    // null ได้ถ้า login ผ่าน OAuth อย่างเดียว
  name          String?
  image         String?
  role          Role       @default(USER)
  status        UserStatus @default(ACTIVE)
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  accounts      Account[]
  sessions      Session[]
  auditLogs     AuditLog[]
  verificationTokens VerificationToken[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  provider          String
  providerAccountId String
  type              String
  access_token      String?
  refresh_token     String?
  expires_at        Int?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  type      String   // "EMAIL_VERIFY" | "PASSWORD_RESET"
  expires   DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// เก็บ config ที่ admin ตั้งค่าได้ผ่านหน้าเว็บ
model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique   // เช่น "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"
  value       String              // ถ้าเป็น secret จะเก็บแบบ encrypted
  isSecret    Boolean  @default(false)
  category    String              // "oauth" | "email" | "general"
  updatedAt   DateTime @updatedAt
  updatedBy   String?
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String              // "LOGIN", "SETTING_UPDATE", "USER_BANNED"
  metadata  Json?
  createdAt DateTime @default(now())
  user      User?    @relation(fields: [userId], references: [id])
}
```

---

## 5. Folder Structure (แยกไฟล์ตาม domain ไม่รวมไฟล์เดียว)

```
src/
├── app/
│   ├── (auth)/                      # route group สำหรับหน้า auth
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-email/page.tsx
│   │   └── layout.tsx
│   │
│   ├── (protected)/                 # หน้าที่ต้อง login
│   │   ├── dashboard/page.tsx
│   │   └── layout.tsx               # เช็ค session
│   │
│   ├── admin/                       # เฉพาะ role = ADMIN
│   │   ├── layout.tsx               # guard: redirect ถ้าไม่ใช่ admin
│   │   ├── page.tsx                 # overview/dashboard
│   │   ├── users/
│   │   │   ├── page.tsx             # ตาราง list ผู้ใช้ + search/filter
│   │   │   └── [id]/page.tsx        # แก้ role, ban, reset password
│   │   ├── settings/
│   │   │   ├── page.tsx             # tab: OAuth / Email / General
│   │   │   ├── oauth/page.tsx       # ฟอร์มกรอก Google/GitHub client id/secret
│   │   │   └── email/page.tsx       # ตั้งค่า email provider API key
│   │   └── audit-logs/page.tsx
│   │
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── register/route.ts
│       └── admin/
│           ├── settings/route.ts    # GET/POST system settings
│           └── users/route.ts       # user management API
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── OAuthButtons.tsx
│   │   │   └── PasswordInput.tsx
│   │   ├── actions/
│   │   │   ├── register.action.ts   # Server Action
│   │   │   ├── login.action.ts
│   │   │   └── verify-email.action.ts
│   │   ├── schemas/
│   │   │   ├── register.schema.ts   # Zod schema
│   │   │   └── login.schema.ts
│   │   ├── hooks/
│   │   │   └── useAuthForm.ts
│   │   └── services/
│   │       ├── auth.service.ts      # logic เชื่อม DB/hash
│   │       └── email.service.ts     # ส่ง verification email
│   │
│   └── admin/
│       ├── components/
│       │   ├── UserTable.tsx
│       │   ├── UserRoleEditor.tsx
│       │   ├── OAuthSettingsForm.tsx
│       │   └── SettingsCard.tsx
│       ├── actions/
│       │   ├── update-setting.action.ts
│       │   ├── ban-user.action.ts
│       │   └── update-role.action.ts
│       ├── schemas/
│       │   └── settings.schema.ts
│       └── services/
│           ├── settings.service.ts  # get/set + encrypt/decrypt
│           └── user-admin.service.ts
│
├── lib/
│   ├── auth.ts                      # NextAuth config — ดึง provider config จาก DB
│   ├── prisma.ts                    # Prisma client singleton
│   ├── redis.ts                     # Upstash client
│   ├── rate-limit.ts
│   ├── password.ts                  # hash/verify helper
│   ├── encryption.ts                # AES encrypt/decrypt (ใช้ ENCRYPTION_KEY)
│   └── settings-cache.ts            # cache SystemSetting (Redis/in-memory, ลด DB hit)
│
├── middleware.ts                    # เช็ค session + role สำหรับ /admin/*
├── types/
│   └── next-auth.d.ts               # extend Session/JWT types
│
prisma/
├── schema.prisma
└── seed.ts                          # สร้าง admin คนแรกจาก INITIAL_ADMIN_EMAIL
```

---

## 6. จุดที่ต้องออกแบบดี ๆ (สำคัญ)

**1) NextAuth ต้องอ่าน OAuth config จาก DB แบบ dynamic**
Auth.js ปกติ config providers ตอน build/init แต่ในเคสนี้ต้อง fetch จาก DB ทุกครั้งที่ request เข้า `/api/auth/*` → ใช้วิธี export `authOptions` เป็น function ที่ดึงค่าจาก `settings-cache.ts` (cache ไว้ 1-5 นาที กัน DB โดนยิงถี่)

**2) Encrypt secret ก่อนเก็บ DB เสมอ**
`OAuthSettingsForm` → เรียก `update-setting.action.ts` → เข้ารหัสด้วย `lib/encryption.ts` ก่อน save → ตอนใช้งานจริงค่อย decrypt ใน `settings.service.ts`

**3) Middleware guard 2 ชั้น**
- ชั้น auth: login แล้วหรือยัง
- ชั้น role: `role === "ADMIN"` เท่านั้นถึงเข้า `/admin/*` ได้ (เช็คใน middleware.ts และซ้ำใน server action อีกชั้นเพื่อความปลอดภัย ไม่เชื่อ client อย่างเดียว)

**4) Audit Log**
ทุกครั้งที่ admin แก้ setting หรือ ban user → log ไว้ใน `AuditLog` เพื่อ trace ย้อนหลังได้ (มาตรฐานความปลอดภัยของระบบระดับ production)

**5) Cache invalidation**
เวลา admin เปลี่ยนค่า OAuth key → ต้อง clear cache ใน `settings-cache.ts` ทันที ไม่งั้น login จะยังใช้ค่าเก่าอยู่จนกว่า cache หมดอายุ

---

## 7. Security Checklist (มาตรฐานสากล)

- [ ] Hash password ด้วย argon2id (แนะนำมากกว่า bcrypt)
- [ ] Rate limit login/register endpoint
- [ ] CSRF protection (Auth.js มีในตัว)
- [ ] Email verification ก่อนใช้งานเต็มรูปแบบ
- [ ] Secure, httpOnly, SameSite cookie สำหรับ session
- [ ] Environment variables แยก `.env.local` ไม่ commit
- [ ] Password policy: min length, complexity, เช็คกับ breached password list (เช่น HaveIBeenPwned API)
- [ ] Account linking logic เมื่อ OAuth email ซ้ำกับ email/password account
- [ ] Encrypt OAuth/API secrets ที่เก็บใน DB ด้วย AES
- [ ] Role-based access control (RBAC) guard ทั้ง middleware และ server action
- [ ] Audit log สำหรับ action สำคัญของ admin

---

## 8. ลำดับการเริ่มพัฒนา (แนะนำ)

1. `prisma/schema.prisma` + `seed.ts` — โครงสร้างฐานข้อมูล + สร้าง admin คนแรก
2. `lib/encryption.ts` + `features/admin/services/settings.service.ts` — ระบบเก็บ config ปลอดภัย
3. `lib/auth.ts` — NextAuth แบบ dynamic provider (อ่านค่าจาก DB)
4. `features/auth/` — Register / Login / OAuth buttons
5. `middleware.ts` — protect route + role guard
6. `features/admin/` — User management + Settings UI
7. Rate limiting + Audit log
