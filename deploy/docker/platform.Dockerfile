# Build stage
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git make

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags "-s -w" -o /bin/resolvenet-server ./cmd/resolvenet-server

# Runtime stage
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata
RUN adduser -D -u 1000 resolvenet

COPY --from=builder /bin/resolvenet-server /bin/resolvenet-server
COPY configs/ /etc/resolvenet/

USER resolvenet
EXPOSE 8080 9090

ENTRYPOINT ["/bin/resolvenet-server"]
