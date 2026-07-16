package handlers

import (
	"crypto/subtle"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"aphelion/svc-user-auth/internal/config"
	"aphelion/svc-user-auth/internal/db"
	"aphelion/svc-user-auth/internal/models"
	"aphelion/svc-user-auth/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AdminHandler struct {
	cfg *config.Config
}

func NewAdminHandler(cfg *config.Config) *AdminHandler {
	return &AdminHandler{cfg: cfg}
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	q := c.Query("q")
	role := c.Query("role")
	status := c.Query("status")
	pageStr := c.Query("page")

	page := 1
	if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
		page = p
	}

	pageSize := 20
	offset := (page - 1) * pageSize

	query := db.DB.Model(&models.User{})

	if q != "" {
		query = query.Where("email ILIKE ?", "%"+q+"%")
	}
	if role == "USER" || role == "ADMIN" {
		query = query.Where("role = ?", role)
	}
	if status == "ACTIVE" || status == "SUSPENDED" || status == "BANNED" || status == "PENDING" {
		query = query.Where("status = ?", status)
	}

	var total int64
	query.Count(&total)

	var users []models.User
	err := query.Order(" \"createdAt\" DESC ").Offset(offset).Limit(pageSize).
		Select("id, email, name, role, status, \"emailVerified\", \"createdAt\", \"lastLoginAt\", \"failedLoginCount\"").
		Find(&users).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users":    users,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func (h *AdminHandler) GetUser(c *gin.Context) {
	targetId := c.Param("id")

	var user models.User
	if err := db.DB.Where("id = ?", targetId).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var activities []models.LoginActivity
	db.DB.Where("\"userId\" = ?", targetId).Order(" \"createdAt\" DESC ").Limit(20).Find(&activities)

	// Combine to match the expected format
	c.JSON(http.StatusOK, gin.H{
		"id":                user.ID,
		"email":             user.Email,
		"name":              user.Name.String,
		"bio":               user.Bio.String,
		"avatarUrl":         user.AvatarURL.String,
		"role":              user.Role,
		"status":            user.Status,
		"emailVerified":     user.EmailVerified,
		"createdAt":         user.CreatedAt,
		"lastLoginAt":       user.LastLoginAt,
		"loginActivities":   activities,
		"failedLoginCount":  user.FailedLoginCount,
		"lastFailedLoginAt": user.LastFailedLoginAt,
	})
}

func (h *AdminHandler) canChangeAdmin(adminId, targetId string, tx *gorm.DB) (bool, string, *models.User) {
	if adminId == targetId {
		return false, "You cannot change your own admin access", nil
	}

	var adminCount int64
	tx.Model(&models.User{}).Where("role = ?", "ADMIN").Count(&adminCount)

	var target models.User
	if err := tx.Where("id = ?", targetId).First(&target).Error; err != nil {
		return false, "User not found", nil
	}

	if target.role == "ADMIN" && adminCount <= 1 {
		return false, "At least one admin must remain", nil
	}

	return true, "", &target
}

type UpdateUserRequest struct {
	Status string `json:"status"`
	Role   string `json:"role"`
}

func (h *AdminHandler) UpdateUser(c *gin.Context) {
	adminId := c.GetHeader("x-user-id")
	targetId := c.Param("id")

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	tx := db.DB.Begin()

	ok, errMsg, target := h.canChangeAdmin(adminId, targetId, tx)
	if !ok {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	action := ""
	var metadata map[string]interface{}

	if req.Status == "ACTIVE" || req.Status == "SUSPENDED" || req.Status == "BANNED" || req.Status == "PENDING" {
		target.Status = req.Status
		action = fmt.Sprintf("STATUS_%s", req.Status)
		metadata = map[string]interface{}{"status": req.Status}
	} else if req.Role == "USER" || req.Role == "ADMIN" {
		target.Role = req.Role
		action = fmt.Sprintf("ROLE_%s", req.Role)
		metadata = map[string]interface{}{"role": req.Role}
	} else {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid update action"})
		return
	}

	if err := tx.Save(target).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Create Audit Log
	metaBytes, _ := json.Marshal(metadata)
	audit := models.AuditLog{
		ID:           utils.GenerateCUID(),
		AdminID:      sql.NullString{String: adminId, Valid: true},
		TargetUserID: sql.NullString{String: targetId, Valid: true},
		Action:       action,
		Metadata:     sql.NullString{String: string(metaBytes), Valid: true},
		CreatedAt:    time.Now(),
	}
	if err := tx.Create(&audit).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create audit log"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, target)
}

func (h *AdminHandler) DeleteUser(c *gin.Context) {
	adminId := c.GetHeader("x-user-id")
	targetId := c.Param("id")

	tx := db.DB.Begin()

	ok, errMsg, _ := h.canChangeAdmin(adminId, targetId, tx)
	if !ok {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
		return
	}

	// Cascade delete dependent entities manually in Go (as transaction)
	tx.Where("\"userId\" = ?", targetId).Delete(&models.Session{})
	tx.Where("\"userId\" = ?", targetId).Delete(&models.Account{})
	tx.Where("\"userId\" = ?", targetId).Delete(&models.LoginActivity{})
	tx.Where("\"userId\" = ? OR \"targetUserId\" = ?", targetId, targetId).Delete(&models.AuditLog{})

	if err := tx.Where("id = ?", targetId).Delete(&models.User{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	// Create final audit log for delete
	audit := models.AuditLog{
		ID:        utils.GenerateCUID(),
		AdminID:   sql.NullString{String: adminId, Valid: true},
		Action:    "DELETE",
		Metadata:  sql.NullString{String: fmt.Sprintf("{\"targetUserId\": \"%s\"}", targetId), Valid: true},
		CreatedAt: time.Now(),
	}
	tx.Create(&audit)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *AdminHandler) ForceLogout(c *gin.Context) {
	adminId := c.GetHeader("x-user-id")
	targetId := c.Param("id")

	if adminId == targetId {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot force logout yourself"})
		return
	}

	tx := db.DB.Begin()

	// Delete sessions
	tx.Where("\"userId\" = ?", targetId).Delete(&models.Session{})

	// Log audit
	audit := models.AuditLog{
		ID:           utils.GenerateCUID(),
		AdminID:      sql.NullString{String: adminId, Valid: true},
		TargetUserID: sql.NullString{String: targetId, Valid: true},
		Action:       "FORCE_LOGOUT",
		CreatedAt:    time.Now(),
	}
	tx.Create(&audit)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type AdminVerifyRequest struct {
	Password string `json:"password" binding:"required"`
}

func (h *AdminHandler) VerifyAdminGate(c *gin.Context) {
	adminId := c.GetHeader("x-user-id")
	role := c.GetHeader("x-user-role")

	if role != "ADMIN" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
		return
	}

	var req AdminVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
		return
	}

	// Timing safe compare
	passwordBytes := []byte(req.Password)
	expectedBytes := []byte(h.cfg.AdminPanelPassword)

	if subtle.ConstantTimeCompare(passwordBytes, expectedBytes) != 1 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect admin access password"})
		return
	}

	token, err := utils.CreateAdminAccessToken(adminId, h.cfg.AuthSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create access token"})
		return
	}

	// Set cookie (valid for 30 minutes)
	c.SetCookie("aphelion_admin_access", token, 1800, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

type ConfigureOAuthRequest struct {
	Provider     string `json:"provider" binding:"required,oneof=github google"`
	Enabled      bool   `json:"enabled"`
	ClientID     string `json:"clientId" binding:"required"`
	ClientSecret string `json:"clientSecret" binding:"required"`
}

func (h *AdminHandler) ConfigureOAuth(c *gin.Context) {
	adminId := c.GetHeader("x-user-id")

	var req ConfigureOAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid settings"})
		return
	}

	prefix := strings.ToUpper(req.Provider)
	key := utils.GetEncryptionKey(h.cfg.EncryptionKey)

	encryptedSecret, err := utils.Encrypt(req.ClientSecret, key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt provider secret"})
		return
	}

	tx := db.DB.Begin()

	settings := []models.SystemSetting{
		{
			ID:        utils.GenerateCUID(),
			Key:       fmt.Sprintf("%s_ENABLED", prefix),
			Value:     fmt.Sprintf("%t", req.Enabled),
			IsSecret:  false,
			Category:  "oauth",
			UpdatedAt: time.Now(),
		},
		{
			ID:        utils.GenerateCUID(),
			Key:       fmt.Sprintf("%s_CLIENT_ID", prefix),
			Value:     req.ClientID,
			IsSecret:  false,
			Category:  "oauth",
			UpdatedAt: time.Now(),
		},
		{
			ID:        utils.GenerateCUID(),
			Key:       fmt.Sprintf("%s_CLIENT_SECRET", prefix),
			Value:     encryptedSecret,
			IsSecret:  true,
			Category:  "oauth",
			UpdatedAt: time.Now(),
		},
	}

	for _, setting := range settings {
		// Upsert system setting
		var existing models.SystemSetting
		if err := tx.Where("key = ?", setting.Key).First(&existing).Error; err == nil {
			existing.Value = setting.Value
			existing.IsSecret = setting.IsSecret
			existing.UpdatedAt = time.Now()
			tx.Save(&existing)
		} else {
			tx.Create(&setting)
		}
	}

	// Create audit log
	audit := models.AuditLog{
		ID:        utils.GenerateCUID(),
		AdminID:   sql.NullString{String: adminId, Valid: true},
		Action:    "OAUTH_SETTINGS_UPDATED",
		Metadata:  sql.NullString{String: fmt.Sprintf("{\"provider\": \"%s\"}", req.Provider), Valid: true},
		CreatedAt: time.Now(),
	}
	tx.Create(&audit)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
