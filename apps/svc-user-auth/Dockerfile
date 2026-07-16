FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go.mod
COPY go.mod ./

# Download dependencies and generate go.sum
RUN go mod tidy

# Copy source code
COPY . .

# Build application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main ./cmd/api

# Final image
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 3001

CMD ["./main"]
