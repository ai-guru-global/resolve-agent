package server

import (
	"os"
	"regexp"
	"slices"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

// routeRe 从 router.go 源码提取 "METHOD /path" 注册项，作为 API 契约唯一事实源。
// 若 router.go 的注册写法变化（如改用 helper 函数），本测试会以 0 匹配失败，防止静默失守。
var routeRe = regexp.MustCompile(`mux\.HandleFunc\("([A-Z]+) (/[^"]*)"`)

func routerRoutes(t *testing.T) []string {
	t.Helper()
	src, err := os.ReadFile("router.go")
	if err != nil {
		t.Fatalf("read router.go: %v", err)
	}
	matches := routeRe.FindAllStringSubmatch(string(src), -1)
	routes := make([]string, 0, len(matches))
	for _, m := range matches {
		routes = append(routes, m[1]+" "+m[2])
	}
	if len(routes) == 0 {
		t.Fatal("no routes parsed from router.go — 注册写法变更需同步本测试")
	}
	return routes
}

func openapiOperations(t *testing.T) map[string]bool {
	t.Helper()
	data, err := os.ReadFile("../../api/openapi/v1/resolveagent.yaml")
	if err != nil {
		t.Fatalf("read openapi yaml: %v", err)
	}
	var doc struct {
		Paths map[string]map[string]yaml.Node `yaml:"paths"`
	}
	if err := yaml.Unmarshal(data, &doc); err != nil {
		t.Fatalf("parse openapi yaml: %v", err)
	}
	ops := map[string]bool{}
	for path, item := range doc.Paths {
		for method := range item {
			m := strings.ToUpper(method)
			switch m {
			case "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS":
				ops[m+" "+path] = true
			}
		}
	}
	return ops
}

// TestOpenAPICoversAllRoutes: router 的每条注册都必须在 OpenAPI 中有对应操作。
func TestOpenAPICoversAllRoutes(t *testing.T) {
	ops := openapiOperations(t)
	for _, r := range routerRoutes(t) {
		if !ops[r] {
			t.Errorf("router 路由未进 OpenAPI: %s", r)
		}
	}
}

// TestOpenAPIHasNoPhantomOperations: OpenAPI 中不得存在 router 没有的幻影操作。
func TestOpenAPIHasNoPhantomOperations(t *testing.T) {
	routes := routerRoutes(t)
	for op := range openapiOperations(t) {
		if !slices.Contains(routes, op) {
			t.Errorf("OpenAPI 幻影操作（router 不存在）: %s", op)
		}
	}
}

// TestOpenAPIRouteCountParity: 钉住注册总数，正则失配或路由增删都会在此暴露。
func TestOpenAPIRouteCountParity(t *testing.T) {
	if got := len(routerRoutes(t)); got != 95 {
		t.Errorf("router 注册路由数应为 95，实测 %d", got)
	}
}
