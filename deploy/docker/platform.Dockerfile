# Build stage
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git make

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags "-s -w" -o /bin/resolveagent-server ./cmd/resolveagent-server

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata
RUN adduser -D -u 1000 resolveagent

COPY --from=builder /bin/resolveagent-server /bin/resolveagent-server
COPY configs/ /etc/resolveagent/

USER resolveagent
EXPOSE 8080 9090

ENTRYPOINT ["/bin/resolveagent-server"]
