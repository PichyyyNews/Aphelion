package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"aphelion/svc-user-auth/internal/config"
	"aphelion/svc-user-auth/internal/db"
	"aphelion/svc-user-auth/internal/models"
	"aphelion/svc-user-auth/internal/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	cfg *config.Config
}

func NewAuthHandler(cfg *config.Config) *AuthHandler {
	return &AuthHandler{cfg: cfg}
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input credentials"})
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))

	// Check if user exists
	var count int64
	db.DB.Model(&models.User{}).Where("email = ?", email).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Email is already registered"})
		return
	}

	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to encrypt password"})
		return
	}

	userId := utils.GenerateCUID()
	user := models.User{
		ID:            userId,
		Email:         email,
		Password:      sql.NullString{String: string(hashed), Valid: true},
		Name:          sql.NullString{String: req.Name, Valid: req.Name != ""},
		Role:          "USER",
		Status:        "ACTIVE",
		EmailVerified: false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Create User in Transaction
	tx := db.DB.Begin()
	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Log Activity
	activity := models.LoginActivity{
		ID:        utils.GenerateCUID(),
		UserID:    sql.NullString{String: userId, Valid: true},
		Type:      "REGISTER",
		IP:        sql.NullString{String: c.ClientIP(), Valid: true},
		UserAgent: sql.NullString{String: c.GetHeader("User-Agent"), Valid: true},
		CreatedAt: time.Now(),
	}
	if err := tx.Create(&activity).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to log activity"})
		return
	}

	tx.Commit()

	// Generate Session
	token, err := utils.CreateSessionToken(user.ID, user.Role, h.cfg.AuthSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session token"})
		return
	}

	session := models.Session{
		ID:      utils.GenerateCUID(),
		Token:   token,
		UserID:  user.ID,
		Expires: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := db.DB.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save session"})
		return
	}

	// Set cookie
	c.SetCookie("aphelion_session", token, 604800, "/", "", false, true)

	c.JSON(http.StatusCreated, gin.H{
		"ok":   true,
		"user": user,
	})
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
		return
	}

	email := strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	if err := db.DB.Where("email = ?", email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect email or password"})
		return
	}

	// Check status
	if user.Status == "BANNED" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been banned"})
		return
	}
	if user.Status == "SUSPENDED" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Your account has been suspended"})
		return
	}

	// Verify password
	err := bcrypt.CompareHashAndPassword([]byte(user.Password.String), []byte(req.Password))
	if err != nil {
		// Increment failed login count
		now := time.Now()
		user.FailedLoginCount++
		user.LastFailedLoginAt = &now
		db.DB.Save(&user)

		// Log activity
		activity := models.LoginActivity{
			ID:        utils.GenerateCUID(),
			UserID:    sql.NullString{String: user.ID, Valid: true},
			Type:      "LOGIN_FAILED",
			IP:        sql.NullString{String: c.ClientIP(), Valid: true},
			UserAgent: sql.NullString{String: c.GetHeader("User-Agent"), Valid: true},
			CreatedAt: time.Now(),
		}
		db.DB.Create(&activity)

		c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect email or password"})
		return
	}

	// Success login
	now := time.Now()
	user.FailedLoginCount = 0
	user.LastLoginAt = &now
	db.DB.Save(&user)

	// Log activity
	activity := models.LoginActivity{
		ID:        utils.GenerateCUID(),
		UserID:    sql.NullString{String: user.ID, Valid: true},
		Type:      "LOGIN_SUCCESS",
		IP:        sql.NullString{String: c.ClientIP(), Valid: true},
		UserAgent: sql.NullString{String: c.GetHeader("User-Agent"), Valid: true},
		CreatedAt: time.Now(),
	}
	db.DB.Create(&activity)

	// Generate Session
	token, err := utils.CreateSessionToken(user.ID, user.Role, h.cfg.AuthSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session token"})
		return
	}

	session := models.Session{
		ID:      utils.GenerateCUID(),
		Token:   token,
		UserID:  user.ID,
		Expires: time.Now().Add(7 * 24 * time.Hour),
	}
	if err := db.DB.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save session"})
		return
	}

	// Set cookie
	c.SetCookie("aphelion_session", token, 604800, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"ok":   true,
		"user": user,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	token, err := c.Cookie("aphelion_session")
	if err == nil && token != "" {
		// Delete session from DB
		db.DB.Where("token = ?", token).Delete(&models.Session{})
	}

	// Clear session cookies
	c.SetCookie("aphelion_session", "", -1, "/", "", false, true)
	c.SetCookie("aphelion_admin_access", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{"ok": true})
}

// OAuth settings helper
type OAuthProviderConfig struct {
	Enabled      bool
	ClientID     string
	ClientSecret string
}

func (h *AuthHandler) getProviderConfig(provider string) (*OAuthProviderConfig, error) {
	prefix := strings.ToUpper(provider)
	var enabledSetting, clientIDSetting, clientSecretSetting models.SystemSetting

	db.DB.Where("key = ?", fmt.Sprintf("%s_ENABLED", prefix)).First(&enabledSetting)
	db.DB.Where("key = ?", fmt.Sprintf("%s_CLIENT_ID", prefix)).First(&clientIDSetting)
	db.DB.Where("key = ?", fmt.Sprintf("%s_CLIENT_SECRET", prefix)).First(&clientSecretSetting)

	enabled := enabledSetting.Value == "true"
	clientID := clientIDSetting.Value

	decryptedSecret := ""
	if clientSecretSetting.Value != "" {
		key := utils.GetEncryptionKey(h.cfg.EncryptionKey)
		decrypted, err := utils.Decrypt(clientSecretSetting.Value, key)
		if err != nil {
			log.Printf("Failed to decrypt client secret for %s: %v", provider, err)
			return nil, err
		}
		decryptedSecret = decrypted
	}

	return &OAuthProviderConfig{
		Enabled:      enabled,
		ClientID:     clientID,
		ClientSecret: decryptedSecret,
	}, nil
}

func (h *AuthHandler) OAuthRedirect(c *gin.Context) {
	provider := c.Param("provider")
	if provider != "github" && provider != "google" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Unknown provider"})
		return
	}

	cfg, err := h.getProviderConfig(provider)
	if err != nil || !cfg.Enabled || cfg.ClientID == "" || cfg.ClientSecret == "" {
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=provider-not-configured")
		return
	}

	// Generate state token
	state, err := utils.CreateSessionToken(provider, "OAUTH_STATE", h.cfg.AuthSecret)
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	redirectUri := fmt.Sprintf("%s/api/auth/oauth/%s/callback", h.cfg.AppURL, provider)

	var authURL *url.URL
	if provider == "github" {
		authURL, _ = url.Parse("https://github.com/login/oauth/authorize")
	} else {
		authURL, _ = url.Parse("https://accounts.google.com/o/oauth2/v2/auth")
	}

	q := authURL.Query()
	q.Set("client_id", cfg.ClientID)
	q.Set("redirect_uri", redirectUri)
	q.Set("state", state)
	q.Set("response_type", "code")
	if provider == "github" {
		q.Set("scope", "read:user user:email")
	} else {
		q.Set("scope", "openid email profile")
	}
	authURL.RawQuery = q.Encode()

	// Set state cookie (10 minutes)
	c.SetCookie("aphelion_oauth_state", state, 600, "/", "", false, true)
	c.Redirect(http.StatusFound, authURL.String())
}

func (h *AuthHandler) OAuthCallback(c *gin.Context) {
	provider := c.Param("provider")
	if provider != "github" && provider != "google" {
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	state := c.Query("state")
	code := c.Query("code")
	cookieState, err := c.Cookie("aphelion_oauth_state")

	if err != nil || state == "" || state != cookieState {
		log.Printf("OAuth callback state mismatch: param=%s cookie=%s", state, cookieState)
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	// Clear state cookie
	c.SetCookie("aphelion_oauth_state", "", -1, "/", "", false, true)

	claims, err := utils.VerifyToken(state, h.cfg.AuthSecret)
	if err != nil || claims["userId"] != provider {
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	cfg, err := h.getProviderConfig(provider)
	if err != nil || !cfg.Enabled {
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	redirectUri := fmt.Sprintf("%s/api/auth/oauth/%s/callback", h.cfg.AppURL, provider)

	// Exchange Code for Access Token
	var tokenUrl string
	if provider == "github" {
		tokenUrl = "https://github.com/login/oauth/access_token"
	} else {
		tokenUrl = "https://oauth2.googleapis.com/token"
	}

	client := &http.Client{}
	form := url.Values{}
	form.Set("client_id", cfg.ClientID)
	form.Set("client_secret", cfg.ClientSecret)
	form.Set("code", code)
	form.Set("redirect_uri", redirectUri)
	form.Set("grant_type", "authorization_code")

	req, _ := http.NewRequest("POST", tokenUrl, strings.NewReader(form.Encode()))
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Token exchange HTTP error: %v", err)
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}
	defer resp.Body.Close()

	var tokenRes map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&tokenRes)

	accessToken, ok := tokenRes["access_token"].(string)
	if !ok || accessToken == "" {
		log.Printf("Failed to get access token from response: %v", tokenRes)
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	// Fetch Profile
	var profileUrl string
	if provider == "github" {
		profileUrl = "https://api.github.com/user"
	} else {
		profileUrl = "https://openidconnect.googleapis.com/v1/userinfo"
	}

	reqProfile, _ := http.NewRequest("GET", profileUrl, nil)
	reqProfile.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
	if provider == "github" {
		reqProfile.Header.Set("Accept", "application/vnd.github+json")
	}

	respProfile, err := client.Do(reqProfile)
	if err != nil {
		log.Printf("Profile request HTTP error: %v", err)
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}
	defer respProfile.Body.Close()

	var profile map[string]interface{}
	json.NewDecoder(respProfile.Body).Decode(&profile)

	var email string
	if e, exists := profile["email"].(string); exists && e != "" {
		email = e
	}

	// GitHub private email fallback
	if provider == "github" && email == "" {
		reqEmails, _ := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
		reqEmails.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))
		reqEmails.Header.Set("Accept", "application/vnd.github+json")

		respEmails, err := client.Do(reqEmails)
		if err == nil {
			defer respEmails.Body.Close()
			var emails []map[string]interface{}
			json.NewDecoder(respEmails.Body).Decode(&emails)
			for _, mail := range emails {
				if primary, ok := mail["primary"].(bool); ok && primary {
					if mailEmail, ok := mail["email"].(string); ok {
						email = mailEmail
						break
					}
				}
			}
		}
	}

	if email == "" {
		log.Println("OAuth email is empty after retrieval attempts.")
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	email = strings.ToLower(email)
	var accountId string
	if idVal, exists := profile["id"]; exists {
		accountId = fmt.Sprintf("%v", idVal)
	} else if subVal, exists := profile["sub"]; exists {
		accountId = fmt.Sprintf("%v", subVal)
	}

	if accountId == "" {
		log.Println("OAuth profile has no unique ID/Sub field.")
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	// Transaction to find/create user and save account
	tx := db.DB.Begin()

	var account models.Account
	var user models.User
	var accountExists bool

	if err := tx.Where("provider = ? AND \"providerAccountId\" = ?", provider, accountId).First(&account).Error; err == nil {
		accountExists = true
		tx.Where("id = ?", account.UserID).First(&user)
	} else {
		// Try to find user by email
		if err := tx.Where("email = ?", email).First(&user).Error; err != nil {
			// Create new user
			name := ""
			if n, exists := profile["name"].(string); exists {
				name = n
			} else if login, exists := profile["login"].(string); exists {
				name = login
			} else {
				name = email
			}

			user = models.User{
				ID:            utils.GenerateCUID(),
				Email:         email,
				Name:          sql.NullString{String: name, Valid: name != ""},
				Role:          "USER",
				Status:        "ACTIVE",
				EmailVerified: true,
				CreatedAt:     time.Now(),
				UpdatedAt:     time.Now(),
			}
			if err := tx.Create(&user).Error; err != nil {
				tx.Rollback()
				c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
				return
			}
		} else {
			// Update name if blank
			if !user.Name.Valid || user.Name.String == "" {
				name := ""
				if n, exists := profile["name"].(string); exists {
					name = n
				}
				if name != "" {
					user.Name = sql.NullString{String: name, Valid: true}
					tx.Save(&user)
				}
			}
		}
	}

	if !accountExists {
		account = models.Account{
			ID:                utils.GenerateCUID(),
			UserID:            user.ID,
			Provider:          provider,
			ProviderAccountId: accountId,
		}
		if err := tx.Create(&account).Error; err != nil {
			tx.Rollback()
			c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
			return
		}
	}

	tx.Commit()

	// Generate Session
	tokenStr, err := utils.CreateSessionToken(user.ID, user.Role, h.cfg.AuthSecret)
	if err != nil {
		c.Redirect(http.StatusFound, h.cfg.AppURL+"/login?error=oauth-failed")
		return
	}

	session := models.Session{
		ID:      utils.GenerateCUID(),
		Token:   tokenStr,
		UserID:  user.ID,
		Expires: time.Now().Add(7 * 24 * time.Hour),
	}
	db.DB.Create(&session)

	// Set cookie
	c.SetCookie("aphelion_session", tokenStr, 604800, "/", "", false, true)

	c.Redirect(http.StatusFound, h.cfg.AppURL+"/dashboard")
}
