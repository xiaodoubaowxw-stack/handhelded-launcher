// 构建脚本 - 负责下载 QiangQiang 框架并构建项目
import { exec, rm, mkdir, cp, cat, writeTextFile, exists } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QIANGQIANG_REPO = 'https://github.com/kobolingfeng/qiangqiang.git';
const QIQNGQIANG_BRANCH = 'main';
const TEMP_DIR = join(__dirname, 'temp_qiangqiang');
const OUTPUT_DIR = join(__dirname, 'dist');

// 检查并安装依赖
async function checkDependencies() {
    console.log('📦 检查依赖...');
    
    // 检查 Bun
    try {
        await exec('bun --version');
        console.log('✅ Bun 已安装');
    } catch {
        console.error('❌ Bun 未安装，请先安装: https://bun.sh');
        process.exit(1);
    }
}

// 下载 QiangQiang 框架
async function downloadQiangQiang() {
    console.log('📥 下载 QiangQiang 框架...');
    
    // 清理旧目录
    if (await exists(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true });
    }
    
    // Git clone
    await exec(`git clone --depth 1 --branch ${QIQNGQIANG_BRANCH} ${QIANGQIANG_REPO} ${TEMP_DIR}`);
    console.log('✅ QiangQiang 下载完成');
    
    // 安装依赖
    await exec('bun install', { cwd: TEMP_DIR });
    await exec('bun run setup', { cwd: TEMP_DIR });
    console.log('✅ QiangQiang 依赖安装完成');
}

// 复制项目文件到 QiangQiang 目录
async function copyProjectFiles() {
    console.log('📁 准备项目文件...');
    
    const srcDir = join(__dirname, 'src');
    const targetSrcDir = join(TEMP_DIR, 'src');
    
    // 清理目标 src 目录
    if (await exists(targetSrcDir)) {
        await rm(targetSrcDir, { recursive: true });
    }
    
    // 复制前端文件
    await cp(join(srcDir, 'frontend'), join(targetSrcDir, 'frontend'), { recursive: true });
    
    // 复制 scanner
    await cp(join(srcDir, 'scanner.ts'), join(targetSrcDir, 'scanner.ts'));
    
    // 复制 API 桥接
    await cp(join(srcDir, 'api.ts'), join(targetSrcDir, 'api.ts'));
    
    // 复制 package.json
    await cp(join(__dirname, 'package.json'), join(TEMP_DIR, 'package.json'));
    
    // 复制 app.config.json
    await cp(join(__dirname, 'app.config.json'), join(TEMP_DIR, 'app.config.json'));
    
    console.log('✅ 项目文件已复制');
}

// 构建项目
async function build() {
    console.log('🔨 开始构建...');
    
    // 构建前端 + 原生壳
    await exec('bun run build', { cwd: TEMP_DIR });
    
    // 创建单文件 exe
    await exec('bun run build:single', { cwd: TEMP_DIR });
    
    // 创建输出目录
    if (!await exists(OUTPUT_DIR)) {
        await mkdir(OUTPUT_DIR, { recursive: true });
    }
    
    // 复制构建产物
    const artifacts = [
        'dist/强强-portable.zip',
        'dist/强强-single.exe'
    ];
    
    for (const artifact of artifacts) {
        const artifactPath = join(TEMP_DIR, artifact);
        if (await exists(artifactPath)) {
            const fileName = artifact.split('/').pop()!;
            await cp(artifactPath, join(OUTPUT_DIR, fileName));
            console.log(`✅ 已复制: ${fileName}`);
        }
    }
    
    console.log('🎉 构建完成！');
    console.log(`📦 输出目录: ${OUTPUT_DIR}`);
}

// 清理临时文件
async function cleanup() {
    console.log('🧹 清理临时文件...');
    if (await exists(TEMP_DIR)) {
        await rm(TEMP_DIR, { recursive: true });
    }
}

// 主函数
async function main() {
    console.log('🚀 QiangQiangGameLauncher 构建脚本\n');
    
    await checkDependencies();
    await downloadQiangQiang();
    await copyProjectFiles();
    await build();
    await cleanup();
    
    console.log('\n✨ 完成！');
}

main().catch(console.error);
