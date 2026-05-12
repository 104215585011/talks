#!/bin/bash

# LinguaAI · 初始化脚本
# 用法：bash init.sh
# 设置 RUN_START_COMMAND=1 可自动启动开发服务器

INSTALL_CMD="npm install"
VERIFY_CMD="npm test -- --runInBand --passWithNoTests"
START_CMD="npm run dev"

set -e

echo "=============================="
echo "  LinguaAI · 初始化"
echo "=============================="
echo "当前目录: $(pwd)"
echo ""

echo "▶ 安装依赖..."
$INSTALL_CMD
echo "✓ 依赖安装完成"
echo ""

echo "▶ 运行验证..."
if $VERIFY_CMD; then
  echo "✓ 验证通过"
else
  echo "✗ 验证失败 — 请先修复基础状态再继续开发"
  exit 1
fi
echo ""

echo "=============================="
echo "  启动命令：$START_CMD"
echo "=============================="

if [ "${RUN_START_COMMAND}" = "1" ]; then
  echo "▶ 启动开发服务器..."
  $START_CMD
fi
