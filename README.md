# QiangQiangGameLauncher

基于 QiangQiang 框架开发的轻量级 Steam 游戏启动器，类似 Steam 大屏幕模式。

## 特性

- 🚀 极小体积、单 exe、极速启动
- 🎮 自动扫描 Steam 游戏库
- 🖼️ 显示游戏缩略图（网格布局）
- ☁️ GitHub Actions 云编译，下载即用

## 下载

前往 [Releases](https://github.com/kobolingfeng/qiangqiang-game-launcher/releases) 下载最新版本。

## 功能

- 自动扫描 Steam 安装的游戏
- 网格展示游戏缩略图
- 点击即可启动游戏
- 适合 Windows 掌机使用（大屏幕模式）

## 构建

### 环境要求

- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)（勾选"使用 C++ 的桌面开发"）
- [Bun](https://bun.sh)

### 本地编译

```bash
# 克隆项目
git clone https://github.com/kobolingfeng/qiangqiang-game-launcher
cd qiangqiang-game-launcher

# 安装依赖
bun install
bun run setup

# 开发模式
bun run dev

# 编译发布
bun run build:single
```

## 技术栈

- 框架: [QiangQiang](https://github.com/kobolingfeng/qiangqiang)
- 前端: TypeScript + 原生 JS
- 编译: GitHub Actions
