package cache

import (
	"context"
	"log"
	"time"

	"aphelion/svc-user-auth/internal/config"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client
var ctx = context.Background()

func InitRedis(cfg *config.Config) *redis.Client {
	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		log.Printf("Warning: Failed to parse Redis URL %s: %v. Using default options.", cfg.RedisURL, err)
		opt = &redis.Options{
			Addr: "localhost:6379",
		}
	}

	RDB = redis.NewClient(opt)

	// Test connection
	for i := 0; i < 5; i++ {
		_, err = RDB.Ping(ctx).Result()
		if err == nil {
			log.Println("Redis connection established.")
			return RDB
		}
		log.Printf("Failed to ping Redis (attempt %d/5): %v", i+1, err)
		time.Sleep(2 * time.Second)
	}

	log.Printf("Warning: Redis is not reachable, some caching features may be disabled: %v", err)
	return RDB
}
