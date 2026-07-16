FROM golang:1.22-alpine AS builder

# Enable automatic toolchain downloads for newer Go versions
ENV GOTOOLCHAIN=auto

WORKDIR /app

# Copy source code (including go.mod)
COPY . .

# Download dependencies and generate go.sum based on the source code
RUN go mod tidy

# Build application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main ./cmd/api

# Final image
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/main .

EXPOSE 3001

CMD ["./main"]
