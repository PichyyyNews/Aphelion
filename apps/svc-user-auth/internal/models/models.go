package models

import (
	"database/sql"
	"time"
)

type User struct {
	ID                 string         `gorm:"column:id;primaryKey" json:"id"`
	Email              string         `gorm:"column:email;uniqueIndex" json:"email"`
	Password           sql.NullString `gorm:"column:password" json:"-"`
	Name               sql.NullString `gorm:"column:name" json:"name"`
	Bio                sql.NullString `gorm:"column:bio" json:"bio"`
	AvatarURL          sql.NullString `gorm:"column:avatarUrl" json:"avatarUrl"`
	Role               string         `gorm:"column:role;default:USER" json:"role"`
	Status             string         `gorm:"column:status;default:ACTIVE" json:"status"`
	EmailVerified      bool           `gorm:"column:emailVerified;default:false" json:"emailVerified"`
	LastLoginAt        *time.Time     `gorm:"column:lastLoginAt" json:"lastLoginAt"`
	FailedLoginCount   int            `gorm:"column:failedLoginCount;default:0" json:"failedLoginCount"`
	LastFailedLoginAt  *time.Time     `gorm:"column:lastFailedLoginAt" json:"lastFailedLoginAt"`
	CreatedAt          time.Time      `gorm:"column:createdAt;default:now()" json:"createdAt"`
	UpdatedAt          time.Time      `gorm:"column:updatedAt" json:"updatedAt"`
}

func (User) TableName() string {
	return "User"
}

type Follow struct {
	FollowerID  string    `gorm:"column:followerId;primaryKey"`
	FollowingID string    `gorm:"column:followingId;primaryKey"`
	CreatedAt   time.Time `gorm:"column:createdAt;default:now()"`
}

func (Follow) TableName() string {
	return "Follow"
}

type Account struct {
	ID                string `gorm:"column:id;primaryKey" json:"id"`
	UserID            string `gorm:"column:userId" json:"userId"`
	Provider          string `gorm:"column:provider" json:"provider"`
	ProviderAccountId string `gorm:"column:providerAccountId" json:"providerAccountId"`
}

func (Account) TableName() string {
	return "Account"
}

type Session struct {
	ID      string    `gorm:"column:id;primaryKey" json:"id"`
	Token   string    `gorm:"column:token;uniqueIndex" json:"token"`
	UserID  string    `gorm:"column:userId" json:"userId"`
	Expires time.Time `gorm:"column:expires" json:"expires"`
}

func (Session) TableName() string {
	return "Session"
}

type SystemSetting struct {
	ID        string    `gorm:"column:id;primaryKey" json:"id"`
	Key       string    `gorm:"column:key;uniqueIndex" json:"key"`
	Value     string    `gorm:"column:value" json:"value"`
	IsSecret  bool      `gorm:"column:isSecret;default:false" json:"isSecret"`
	Category  string    `gorm:"column:category" json:"category"`
	UpdatedAt time.Time `gorm:"column:updatedAt" json:"updatedAt"`
}

func (SystemSetting) TableName() string {
	return "SystemSetting"
}

type AuditLog struct {
	ID           string         `gorm:"column:id;primaryKey" json:"id"`
	AdminID      sql.NullString `gorm:"column:userId" json:"adminId"` // mapped to userId in schema
	TargetUserID sql.NullString `gorm:"column:targetUserId" json:"targetUserId"`
	Action       string         `gorm:"column:action" json:"action"`
	Metadata     sql.NullString `gorm:"column:metadata;type:jsonb" json:"metadata"` // stored as JSON
	CreatedAt    time.Time      `gorm:"column:createdAt;default:now()" json:"createdAt"`
}

func (AuditLog) TableName() string {
	return "AuditLog"
}

type LoginActivity struct {
	ID        string         `gorm:"column:id;primaryKey" json:"id"`
	UserID    sql.NullString `gorm:"column:userId" json:"userId"`
	Type      string         `gorm:"column:type" json:"type"`
	IP        sql.NullString `gorm:"column:ip" json:"ip"`
	UserAgent sql.NullString `gorm:"column:userAgent" json:"userAgent"`
	CreatedAt time.Time      `gorm:"column:createdAt;default:now()" json:"createdAt"`
}

func (LoginActivity) TableName() string {
	return "LoginActivity"
}
