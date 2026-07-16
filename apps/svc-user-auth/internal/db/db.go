package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	"aphelion/svc-user-auth/internal/config"
	"aphelion/svc-user-auth/internal/models"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) *gorm.DB {
	var err error
	// Retry database connection in case DB is still starting up
	for i := 0; i < 10; i++ {
		DB, err = gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database (attempt %d/10): %v", i+1, err)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("Could not connect to database after retries: %v", err)
	}

	log.Println("Database connection established.")

	// Auto-migrate tables (this will also create tables if postgres-init.sql wasn't loaded)
	err = DB.AutoMigrate(
		&models.User{},
		&models.Follow{},
		&models.Account{},
		&models.Session{},
		&models.SystemSetting{},
		&models.AuditLog{},
		&models.LoginActivity{},
	)
	if err != nil {
		log.Printf("Auto-migration warning: %v", err)
	}

	SeedAdmin(cfg)

	return DB
}

func SeedAdmin(cfg *config.Config) {
	var count int64
	DB.Model(&models.User{}).Where("email = ?", cfg.InitialAdminEmail).Count(&count)
	if count == 0 {
		hashedBytes, err := bcrypt.GenerateFromPassword([]byte(cfg.InitialAdminPass), 12)
		if err != nil {
			log.Printf("Failed to hash initial admin password: %v", err)
			return
		}

		admin := models.User{
			ID:            fmt.Sprintf("admin-%d", time.Now().Unix()),
			Email:         cfg.InitialAdminEmail,
			Password:      sql.NullString{String: string(hashedBytes), Valid: true},
			Name:          sql.NullString{String: "Aphelion Admin", Valid: true},
			Role:          "ADMIN",
			Status:        "ACTIVE",
			EmailVerified: true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		if err := DB.Create(&admin).Error; err != nil {
			log.Printf("Failed to seed initial admin user: %v", err)
		} else {
			log.Printf("Initial admin user seeded: %s", cfg.InitialAdminEmail)
		}
	}
}
