package utils

import (
	"crypto/rand"
	"math/big"
)

const base36Chars = "0123456789abcdefghijklmnopqrstuvwxyz"

func GenerateCUID() string {
	// Simple cuid-like format: 'c' + 24 random base36 characters
	result := make([]byte, 25)
	result[0] = 'c'
	for i := 1; i < 25; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(base36Chars))))
		result[i] = base36Chars[num.Int64()]
	}
	return string(result)
}
