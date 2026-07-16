package main

import (
	"fmt"
	"log"

	"aphelion/svc-user-auth/internal/cache"
	"aphelion/svc-user-auth/internal/config"
	"aphelion/svc-user-auth/internal/db"
	"aphelion/svc-user-auth/internal/handlers"
	"aphelion/svc-user-auth/internal/middleware"

	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("Starting svc-user-auth microservice...")

	// 1. Load config
	cfg := config.LoadConfig()

	// 2. Init Database
	db.InitDB(cfg)

	// 3. Init Cache
	cache.InitRedis(cfg)

	// 4. Setup Router
	r := gin.Default()

	// Enable CORS or trust proxies if needed
	r.SetTrustedProxies(nil)

	// Handlers
	authHandler := handlers.NewAuthHandler(cfg)
	profileHandler := handlers.NewProfileHandler()
	adminHandler := handlers.NewAdminHandler(cfg)

	// Public Auth API Group
	authGroup := r.Group("/api/auth")
	{
		authGroup.POST("/register", authHandler.Register)
		authGroup.POST("/login", authHandler.Login)
		authGroup.POST("/logout", authHandler.Logout)
		authGroup.GET("/oauth/:provider", authHandler.OAuthRedirect)
		authGroup.GET("/oauth/:provider/callback", authHandler.OAuthCallback)
	}

	// Profile API Group (Envoy verified JWT, handles auth)
	r.GET("/api/profile", profileHandler.GetProfile)
	r.POST("/api/profile", profileHandler.UpdateProfile)

	// Admin API Group
	adminRoleGroup := r.Group("/api/admin", middleware.RequireAdminRole())
	{
		// Verify password to unlock admin access (requires ADMIN role, sets cookie)
		adminRoleGroup.POST("/verify", adminHandler.VerifyAdminGate)

		// Routes requiring full unlocked admin access gate (Required admin token in cookie)
		adminAccessGroup := adminRoleGroup.Group("", middleware.RequireAdminAccessGate(cfg))
		{
			adminAccessGroup.POST("/oauth", adminHandler.ConfigureOAuth)
			adminAccessGroup.GET("/users", adminHandler.ListUsers)
			adminAccessGroup.GET("/users/:id", adminHandler.GetUser)
			adminAccessGroup.PATCH("/users/:id", adminHandler.UpdateUser)
			adminAccessGroup.DELETE("/users/:id", adminHandler.DeleteUser)
			adminAccessGroup.POST("/users/:id/force-logout", adminHandler.ForceLogout)
		}
	}

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Listening and serving HTTP on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to run HTTP server: %v", err)
	}
}
