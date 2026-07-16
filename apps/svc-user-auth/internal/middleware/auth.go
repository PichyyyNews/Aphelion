package middleware

import (
	"net/http"

	"aphelion/svc-user-auth/internal/config"
	"aphelion/svc-user-auth/internal/utils"

	"github.com/gin-gonic/gin"
)

func RequireAdminRole() gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetHeader("x-user-role")
		if role != "ADMIN" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Admin role required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func RequireAdminAccessGate(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// First ensure they are admin
		role := c.GetHeader("x-user-role")
		userId := c.GetHeader("x-user-id")
		if role != "ADMIN" || userId == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Admin role required"})
			c.Abort()
			return
		}

		// Retrieve admin access cookie
		tokenStr, err := c.Cookie("aphelion_admin_access")
		if err != nil || tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin access password required"})
			c.Abort()
			return
		}

		// Verify token
		claims, err := utils.VerifyToken(tokenStr, cfg.AuthSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin access password required"})
			c.Abort()
			return
		}

		// Check scope and user id
		if claims["scope"] != "admin-panel" || claims["userId"] != userId {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin access password required"})
			c.Abort()
			return
		}

		c.Next()
	}
}
