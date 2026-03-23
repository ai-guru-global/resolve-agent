#!/bin/bash

# ============================================
# ResolveAgent Intelligent Selector Demo
# 一键部署与运行脚本
# ============================================
#
# 使用方法:
#   chmod +x deploy.sh
#   ./deploy.sh              # 完整部署并运行批量测试
#   ./deploy.sh --interactive # 交互模式
#   ./deploy.sh --setup-only  # 仅设置环境，不运行
#   ./deploy.sh cleanup       # 清理演示资源
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
DEMO_DIR="$SCRIPT_DIR"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║     🧠  ResolveAgent Intelligent Selector Demo  🧠          ║"
    echo "║                                                              ║"
    echo "║     智能路由决策引擎 - 一键部署脚本                          ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
}

# 检查 Python 版本
check_python() {
    log_info "检查 Python 环境..."
    
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        log_error "未找到 Python，请先安装 Python 3.9+"
        exit 1
    fi
    
    # 检查版本
    PYTHON_VERSION=$($PYTHON_CMD -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    MAJOR_VERSION=$($PYTHON_CMD -c 'import sys; print(sys.version_info.major)')
    MINOR_VERSION=$($PYTHON_CMD -c 'import sys; print(sys.version_info.minor)')
    
    if [ "$MAJOR_VERSION" -lt 3 ] || ([ "$MAJOR_VERSION" -eq 3 ] && [ "$MINOR_VERSION" -lt 9 ]); then
        log_error "Python 版本需要 3.9+，当前版本: $PYTHON_VERSION"
        exit 1
    fi
    
    log_success "Python $PYTHON_VERSION ✓"
}

# 创建虚拟环境
setup_venv() {
    log_info "设置虚拟环境..."
    
    VENV_DIR="$DEMO_DIR/.venv"
    
    if [ -d "$VENV_DIR" ]; then
        log_info "虚拟环境已存在，跳过创建"
    else
        log_info "创建虚拟环境..."
        $PYTHON_CMD -m venv "$VENV_DIR"
    fi
    
    # 激活虚拟环境
    source "$VENV_DIR/bin/activate"
    
    log_success "虚拟环境已激活 ✓"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    
    # 升级 pip
    $PYTHON_CMD -m pip install --upgrade pip -q 2>/dev/null
    
    # 安装基础依赖
    $PYTHON_CMD -m pip install pyyaml -q 2>/dev/null
    
    # 尝试安装 ResolveAgent（如果存在）
    PYTHON_PKG="$PROJECT_ROOT/python"
    if [ -f "$PYTHON_PKG/pyproject.toml" ]; then
        log_info "检测到 ResolveAgent Python 包，尝试安装..."
        $PYTHON_CMD -m pip install -e "$PYTHON_PKG" -q 2>/dev/null || {
            log_warning "ResolveAgent 包安装失败，将使用模拟模式"
        }
    else
        log_warning "未找到 ResolveAgent 包，将使用模拟模式"
    fi
    
    log_success "依赖安装完成 ✓"
}

# 验证目录结构
verify_structure() {
    log_info "验证目录结构..."
    
    REQUIRED_DIRS=(
        "skills/web-search"
        "skills/log-analyzer"
        "skills/metrics-checker"
        "workflows"
        "rag/documents"
        "agents"
    )
    
    REQUIRED_FILES=(
        "main.py"
        "skills/web-search/manifest.yaml"
        "skills/web-search/skill.py"
        "skills/log-analyzer/manifest.yaml"
        "skills/log-analyzer/skill.py"
        "skills/metrics-checker/manifest.yaml"
        "skills/metrics-checker/skill.py"
        "workflows/incident-diagnosis.yaml"
        "rag/config.yaml"
        "rag/documents/runbook-502.md"
        "rag/documents/runbook-oom.md"
        "rag/documents/runbook-db.md"
        "agents/support-agent.yaml"
    )
    
    MISSING=0
    
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ ! -d "$DEMO_DIR/$dir" ]; then
            log_error "缺少目录: $dir"
            MISSING=1
        fi
    done
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$DEMO_DIR/$file" ]; then
            log_error "缺少文件: $file"
            MISSING=1
        fi
    done
    
    if [ $MISSING -eq 1 ]; then
        log_error "目录结构验证失败"
        exit 1
    fi
    
    log_success "目录结构验证通过 ✓"
}

# 运行 Demo
run_demo() {
    local MODE=$1
    
    log_info "启动 Demo..."
    echo ""
    
    cd "$DEMO_DIR"
    
    if [ "$MODE" == "interactive" ]; then
        $PYTHON_CMD main.py --interactive
    else
        $PYTHON_CMD main.py
    fi
}

# 清理演示资源
cleanup() {
    log_info "清理演示资源..."
    
    # 删除虚拟环境
    if [ -d "$DEMO_DIR/.venv" ]; then
        rm -rf "$DEMO_DIR/.venv"
        log_success "已删除虚拟环境"
    fi
    
    # 删除 Python 缓存
    find "$DEMO_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find "$DEMO_DIR" -type f -name "*.pyc" -delete 2>/dev/null || true
    
    log_success "清理完成 ✓"
}

# 显示帮助信息
show_help() {
    echo -e "${CYAN}${BOLD}ResolveAgent Intelligent Selector Demo${NC}"
    echo ""
    echo -e "${BOLD}使用方法:${NC} $0 [选项]"
    echo ""
    echo -e "${BOLD}选项:${NC}"
    echo "  --help, -h        显示帮助信息"
    echo "  --interactive, -i 以交互模式运行（推荐）"
    echo "  --setup-only      仅设置环境，不运行 Demo"
    echo "  --skip-venv       跳过虚拟环境设置（使用系统 Python）"
    echo "  cleanup           清理演示资源"
    echo ""
    echo -e "${BOLD}示例:${NC}"
    echo "  $0                # 完整部署并运行批量测试"
    echo "  $0 -i             # 交互模式（推荐）"
    echo "  $0 --setup-only   # 仅设置环境"
    echo "  $0 cleanup        # 清理资源"
    echo ""
    echo -e "${BOLD}路由类型说明:${NC}"
    echo "  🔧 skill          技能执行器 - 执行特定功能"
    echo "  📚 rag            知识检索 - RAG 知识库查询"
    echo "  🌳 fta/workflow   故障树分析 - 复杂诊断工作流"
    echo "  💻 code_analysis  代码分析 - 静态代码分析"
    echo "  💬 direct         直接对话 - LLM 直接回复"
    echo ""
}

# 主函数
main() {
    local INTERACTIVE=false
    local SETUP_ONLY=false
    local SKIP_VENV=false
    
    # 检查 cleanup 命令
    if [[ "$1" == "cleanup" ]]; then
        print_banner
        cleanup
        exit 0
    fi
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                show_help
                exit 0
                ;;
            --interactive|-i)
                INTERACTIVE=true
                shift
                ;;
            --setup-only)
                SETUP_ONLY=true
                shift
                ;;
            --skip-venv)
                SKIP_VENV=true
                shift
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    print_banner
    
    # 执行步骤
    check_python
    
    if [ "$SKIP_VENV" = false ]; then
        setup_venv
    fi
    
    install_dependencies
    verify_structure
    
    if [ "$SETUP_ONLY" = true ]; then
        echo ""
        log_success "环境设置完成！"
        echo ""
        echo -e "${BOLD}运行 Demo:${NC}"
        echo "  cd $DEMO_DIR"
        if [ "$SKIP_VENV" = false ]; then
            echo "  source .venv/bin/activate"
        fi
        echo "  python main.py              # 批量测试"
        echo "  python main.py --interactive # 交互模式（推荐）"
        echo ""
        echo -e "${BOLD}清理资源:${NC}"
        echo "  ./deploy.sh cleanup"
        echo ""
        exit 0
    fi
    
    echo ""
    echo -e "${CYAN}${BOLD}启动 Demo...${NC}"
    echo ""
    
    if [ "$INTERACTIVE" = true ]; then
        run_demo "interactive"
    else
        run_demo "batch"
    fi
}

# 运行主函数
main "$@"
