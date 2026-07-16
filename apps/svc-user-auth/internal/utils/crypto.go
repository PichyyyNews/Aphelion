package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
)

// GetEncryptionKey derives a 32-byte key using SHA-256
func GetEncryptionKey(secret string) []byte {
	h := sha256.New()
	h.Write([]byte(secret))
	return h.Sum(nil)
}

// Encrypt encrypts plain text using AES-256-GCM (Next.js compatible format)
func Encrypt(plaintext string, key []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	iv := make([]byte, 12)
	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return "", err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// In Go, Seal appends the 16-byte tag to the ciphertext.
	sealed := aesgcm.Seal(nil, iv, []byte(plaintext), nil)
	tagStart := len(sealed) - 16
	ciphertext := sealed[:tagStart]
	tag := sealed[tagStart:]

	ivB64 := base64.StdEncoding.EncodeToString(iv)
	tagB64 := base64.StdEncoding.EncodeToString(tag)
	cipherB64 := base64.StdEncoding.EncodeToString(ciphertext)

	return fmt.Sprintf("%s.%s.%s", ivB64, tagB64, cipherB64), nil
}

// Decrypt decrypts ciphertext in Node.js-compatible format: iv.tag.ciphertext
func Decrypt(cryptoText string, key []byte) (string, error) {
	parts := strings.Split(cryptoText, ".")
	if len(parts) != 3 {
		// Return original value if it doesn't match the encrypted format (as in original node code)
		return cryptoText, nil
	}

	iv, err := base64.StdEncoding.DecodeString(parts[0])
	if err != nil {
		return "", err
	}

	tag, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", err
	}

	ciphertext, err := base64.StdEncoding.DecodeString(parts[2])
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	// Reconstruct the sealed block with appended tag
	sealed := append(ciphertext, tag...)

	plaintext, err := aesgcm.Open(nil, iv, sealed, nil)
	if err != nil {
		return "", errors.New("decryption failed: authentic tag mismatch")
	}

	return string(plaintext), nil
}
