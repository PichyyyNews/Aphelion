-- Create Enums
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING');
CREATE TYPE "LoginActivityType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'REGISTER');

-- Create User Table
CREATE TABLE "User" (
    "id" VARCHAR(255) PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255),
    "name" VARCHAR(255),
    "bio" TEXT,
    "avatarUrl" VARCHAR(255),
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "lastLoginAt" TIMESTAMP WITH TIME ZONE,
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailedLoginAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Follow Table
CREATE TABLE "Follow" (
    "followerId" VARCHAR(255) NOT NULL,
    "followingId" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("followerId", "followingId"),
    FOREIGN KEY ("followerId") REFERENCES "User" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("followingId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE INDEX "Follow_followingId_idx" ON "Follow" ("followingId");

-- Create Account Table
CREATE TABLE "Account" (
    "id" VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(255) NOT NULL,
    "providerAccountId" VARCHAR(255) NOT NULL,
    UNIQUE ("provider", "providerAccountId"),
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Create Session Table
CREATE TABLE "Session" (
    "id" VARCHAR(255) PRIMARY KEY,
    "token" VARCHAR(255) UNIQUE NOT NULL,
    "userId" VARCHAR(255) NOT NULL,
    "expires" TIMESTAMP WITH TIME ZONE NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- Create SystemSetting Table
CREATE TABLE "SystemSetting" (
    "id" VARCHAR(255) PRIMARY KEY,
    "key" VARCHAR(255) UNIQUE NOT NULL,
    "value" TEXT NOT NULL,
    "isSecret" BOOLEAN NOT NULL DEFAULT FALSE,
    "category" VARCHAR(255) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create AuditLog Table
CREATE TABLE "AuditLog" (
    "id" VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255),
    "targetUserId" VARCHAR(255),
    "action" VARCHAR(255) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL,
    FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE SET NULL
);

-- Create LoginActivity Table
CREATE TABLE "LoginActivity" (
    "id" VARCHAR(255) PRIMARY KEY,
    "userId" VARCHAR(255),
    "type" "LoginActivityType" NOT NULL,
    "ip" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL
);
