package handlers

import (
	"database/sql"
	"net/http"
	"strings"

	"aphelion/svc-user-auth/internal/db"
	"aphelion/svc-user-auth/internal/models"

	"github.com/gin-gonic/gin"
)

type ProfileHandler struct{}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{}
}

func (h *ProfileHandler) GetProfile(c *gin.Context) {
	userId := c.GetHeader("x-user-id")
	if userId == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: x-user-id header missing"})
		return
	}

	var user models.User
	if err := db.DB.Where("id = ?", userId).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}

type UpdateProfileRequest struct {
	Name      string `json:"name"`
	Bio       string `json:"bio"`
	AvatarURL string `json:"avatarUrl"`
}

func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	userId := c.GetHeader("x-user-id")
	if userId == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: x-user-id header missing"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile input"})
		return
	}

	var user models.User
	if err := db.DB.Where("id = ?", userId).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update fields
	user.Name = sql.NullString{String: strings.TrimSpace(req.Name), Valid: req.Name != ""}
	user.Bio = sql.NullString{String: strings.TrimSpace(req.Bio), Valid: req.Bio != ""}
	user.AvatarURL = sql.NullString{String: strings.TrimSpace(req.AvatarURL), Valid: req.AvatarURL != ""}

	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}
