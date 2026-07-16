package config

import (
	"os"
)

type Config struct {
	Port               string
	DatabaseURL        string
	RedisURL           string
	AuthSecret         []byte
	EncryptionKey      string
	AdminPanelPassword string
	InitialAdminEmail  string
	InitialAdminPass   string
	AppURL             string
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://user:pass@localhost:5432/user_db"
	}

	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = os.Getenv("CACHE_URL")
	}
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}

	authSecretStr := os.Getenv("AUTH_SECRET")
	if authSecretStr == "" {
		authSecretStr = "dev-secret-change-me"
	}

	encKey := os.Getenv("ENCRYPTION_KEY")
	if encKey == "" {
		encKey = authSecretStr // fallback to AUTH_SECRET as in original codebase
	}

	adminPass := os.Getenv("ADMIN_PANEL_PASSWORD")
	if adminPass == "" {
		adminPass = "AdminChangeMe123!"
	}

	adminEmail := os.Getenv("INITIAL_ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin@aphelion.local"
	}

	adminInitPass := os.Getenv("INITIAL_ADMIN_PASSWORD")
	if adminInitPass == "" {
		adminInitPass = "ChangeMe123!"
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000" // default Next.js dev port, or port 80 if via Envoy
	}

	return &Config{
		Port:               port,
		DatabaseURL:        dbURL,
		RedisURL:           redisURL,
		AuthSecret:         []byte(authSecretStr),
		EncryptionKey:      encKey,
		AdminPanelPassword: adminPass,
		InitialAdminEmail:  adminEmail,
		InitialAdminPass:   adminInitPass,
		AppURL:             appURL,
	}
}
