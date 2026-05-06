#!/bin/bash

# 暂时关闭严格错误检查，便于调试
# set -eo pipefail

CLOINK_API_URL="${1:-}"

echo "========================================"
echo "       Cloink 客户端安装程序"
echo "========================================"
echo ""

echo "调试参数："
echo "  CLOINK_API_URL=${CLOINK_API_URL}"
echo "  第1个参数：${1}"
echo ""

if [ -z "${CLOINK_API_URL}" ]; then
    if [ -n "${1}" ] && echo "${1}" | grep -q "^--"; then
        true
    elif [ -n "${1}" ]; then
        CLOINK_API_URL="${1}"
    fi
fi

echo "最终 CLOINK_API_URL=${CLOINK_API_URL}"
echo ""

if command -v cloink >/dev/null 2>&1; then
    echo "检测到 Cloink 已安装"
    if [ -t 0 ]; then
        read -p "是否继续更新? (y/n): " -n 1 -r
        echo
        if [ "${REPLY}" = "y" ] || [ "${REPLY}" = "Y" ]; then
            echo "继续更新..."
        else
            exit 0
        fi
    else
        echo "非交互式模式，自动继续更新..."
    fi
    echo "停止现有服务..."
    if systemctl is-active --quiet cloink 2>/dev/null; then
        systemctl stop cloink 2>/dev/null || true
    fi
fi

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "${ID}"
    elif command -v lsb_release >/dev/null 2>&1; then
        lsb_release -si | tr '[:upper:]' '[:lower:]'
    elif [ -f /etc/debian_version ]; then
        echo "debian"
    elif [ -f /etc/redhat-release ]; then
        echo "centos"
    else
        uname -s | tr '[:upper:]' '[:lower:]'
    fi
}

install_dependencies() {
    OS=$(detect_os)
    echo "检查并安装依赖，OS=${OS}"
    case "${OS}" in
        ubuntu|debian|linuxmint|pop)
            apt-get update -y
            apt-get install -y curl tar ca-certificates systemd
            ;;
        centos|rhel|fedora|rocky|almalinux)
            if command -v dnf >/dev/null 2>&1; then
                dnf install -y curl tar ca-certificates systemd -y
            else
                yum install -y curl tar ca-certificates systemd -y
            fi
            ;;
        arch|manjaro)
            pacman -Sy --noconfirm curl tar ca-certificates systemd
            ;;
        *)
            echo "警告：无法检测系统，请确保已安装 curl、tar、ca-certificates"
            ;;
    esac
}

# 只返回下载链接，不输出额外内容
get_download_url_value() {
    if [ -z "${CLOINK_API_URL}" ]; then
        exit 1
    fi
    RESPONSE=$(curl -s "${CLOINK_API_URL}/api/version-releases/public")
    # 提取所有 downloadUrl
    ALL_URLS=$(echo "${RESPONSE}" | grep -o '"downloadUrl":"[^"]*"' | cut -d'"' -f4)
    # 找包含 linux 的链接
    DOWNLOAD_URL=$(echo "${ALL_URLS}" | grep -i linux | head -n1)
    if [ -z "${DOWNLOAD_URL}" ]; then
        DOWNLOAD_URL=$(echo "${ALL_URLS}" | head -n1)
    fi
    echo "${DOWNLOAD_URL}"
}

detect_architecture() {
    ARCH=$(uname -m)
    echo "检测到系统架构：${ARCH}"
}

download_and_install() {
    detect_architecture
    echo "获取下载链接..."
    echo "正在请求 API：${CLOINK_API_URL}/api/version-releases/public"
    
    # 先测试 API
    RESPONSE=$(curl -s "${CLOINK_API_URL}/api/version-releases/public")
    echo "API 返回：${RESPONSE}"
    if [ -z "${RESPONSE}" ]; then
        echo "错误：API 返回为空"
        exit 1
    fi
    
    # 真正获取下载链接（静默函数）
    DOWNLOAD_URL=$(get_download_url_value)
    echo "找到的下载链接：${DOWNLOAD_URL}"
    if [ -z "${DOWNLOAD_URL}" ]; then
        echo "错误：没有找到任何下载链接"
        exit 1
    fi

    echo "正在下载：${DOWNLOAD_URL}"
    cd /tmp
    curl -fL -o cloink.tar.gz "${DOWNLOAD_URL}"
    if [ $? -ne 0 ]; then
        echo "下载失败"
        exit 1
    fi

    echo "正在解压..."
    tar -xzf cloink.tar.gz
    ls -la

    cd * 2>/dev/null || true
    if [ ! -f cloink ]; then
        echo "错误：找不到可执行文件"
        ls -la
        exit 1
    fi

    echo "正在安装..."
    cp cloink /usr/bin/
    chmod +x /usr/bin/cloink
    if [ -f cloink-ui ]; then
        cp cloink-ui /usr/bin/
        chmod +x /usr/bin/cloink-ui
    fi

    cd /tmp
    rm -f cloink.tar.gz
    rm -rf cloink-* *cloink*
}

check_tun() {
    echo "检查 tun 模块..."
    mkdir -p /dev/net
    [ ! -c /dev/net/tun ] && mknod /dev/net/tun c 10 200 2>/dev/null || true
    chmod 666 /dev/net/tun 2>/dev/null || true
}

setup_systemd() {
    echo "配置 systemd 服务..."
    cat > /etc/systemd/system/cloink.service << 'EOF'
[Unit]
Description=Cloink VPN Client
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/cloink service run --daemon-addr unix:///var/run/cloink.sock --log-file /var/log/cloink/client.log
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable cloink
    systemctl start cloink

    echo ""
    echo "========================================"
    echo "  安装完成！"
    echo "========================================"
    echo ""

    if [ -n "${CLOINK_API_URL}" ]; then
        echo "配置管理地址：${CLOINK_API_URL}"
        echo ""
        echo "如果需要，请运行："
        echo "  cloink up --management-url ${CLOINK_API_URL}"
        echo ""
    fi
}

install_dependencies
check_tun
download_and_install
setup_systemd
