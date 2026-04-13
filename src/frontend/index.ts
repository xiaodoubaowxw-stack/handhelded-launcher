// QiangQiangGameLauncher - 前端入口
// 基于 QiangQiang 框架的游戏启动器

import { win, shell } from '../api';
import { Game, scanSteamGames } from './scanner';

let games: Game[] = [];
let grid: ReturnType<typeof createGrid> | null = null;

// 初始化应用
async function init() {
    // 设置窗口
    await win.setTitle('游戏启动器');
    await win.setSize(1280, 800);
    await win.center();
    await win.setEffect('mica'); // Windows 11 Mica 效果
    
    // 加载样式
    await loadStyles();
    
    // 创建UI
    await createUI();
    
    // 扫描游戏
    await scanGames();
}

// 加载CSS样式
async function loadStyles() {
    const style = document.createElement('style');
    style.textContent = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #fff;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 40px;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            background: linear-gradient(90deg, #00d4ff, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .header-actions {
            display: flex;
            gap: 12px;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #7c3aed, #00d4ff);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(124, 58, 237, 0.4);
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .main-content {
            padding: 40px;
        }
        
        .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 20px;
        }
        
        .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top-color: #7c3aed;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .loading-text {
            font-size: 18px;
            color: rgba(255, 255, 255, 0.7);
        }
        
        .game-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 24px;
            padding: 20px 0;
        }
        
        .game-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .game-card:hover {
            transform: translateY(-8px) scale(1.02);
            border-color: #7c3aed;
            box-shadow: 0 20px 40px rgba(124, 58, 237, 0.3);
        }
        
        .game-card img {
            width: 100%;
            aspect-ratio: 16/9;
            object-fit: cover;
            background: rgba(0, 0, 0, 0.3);
        }
        
        .game-card .game-info {
            padding: 16px;
        }
        
        .game-card .game-name {
            font-size: 16px;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 60vh;
            gap: 20px;
            color: rgba(255, 255, 255, 0.6);
        }
        
        .empty-state .icon {
            font-size: 80px;
            opacity: 0.5;
        }
        
        .toast {
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            padding: 16px 32px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 12px;
            color: white;
            font-size: 16px;
            animation: slideUp 0.3s ease;
            z-index: 1000;
        }
        
        .toast.success {
            background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .toast.error {
            background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}

// 创建UI
async function createUI() {
    const app = document.createElement('div');
    app.innerHTML = `
        <header class="header">
            <h1>🎮 游戏启动器</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" onclick="window.refreshGames()">🔄 刷新</button>
            </div>
        </header>
        <main class="main-content">
            <div id="loading" class="loading">
                <div class="spinner"></div>
                <div class="loading-text">正在扫描 Steam 游戏库...</div>
            </div>
            <div id="content" style="display: none;">
                <div id="game-grid" class="game-grid"></div>
            </div>
            <div id="empty" class="empty-state" style="display: none;">
                <div class="icon">🎮</div>
                <div>未检测到 Steam 游戏</div>
                <div style="font-size: 14px;">请确保 Steam 已安装并运行过游戏</div>
            </div>
        </main>
    `;
    document.body.appendChild(app);
    
    // 暴露刷新函数
    (window as any).refreshGames = scanGames;
}

// 扫描游戏
async function scanGames() {
    const loading = document.getElementById('loading')!;
    const content = document.getElementById('content')!;
    const empty = document.getElementById('empty')!;
    
    loading.style.display = 'flex';
    content.style.display = 'none';
    empty.style.display = 'none';
    
    try {
        games = await scanSteamGames();
        
        loading.style.display = 'none';
        
        if (games.length === 0) {
            empty.style.display = 'flex';
            return;
        }
        
        content.style.display = 'block';
        
        const gridContainer = document.getElementById('game-grid')!;
        gridContainer.innerHTML = '';
        
        games.forEach(game => {
            const card = document.createElement('div');
            card.className = 'game-card';
            card.onclick = () => launchGame(game);
            
            // 缩略图
            const img = document.createElement('img');
            img.src = game.thumbnail || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect fill="%231a1a2e" width="320" height="180"/><text x="50%" y="50%" text-anchor="middle" fill="%23666" font-size="40">🎮</text></svg>';
            img.onerror = () => {
                img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect fill="%231a1a2e" width="320" height="180"/><text x="50%" y="50%" text-anchor="middle" fill="%23666" font-size="40">🎮</text></svg>';
            };
            
            const info = document.createElement('div');
            info.className = 'game-info';
            info.innerHTML = `<div class="game-name">${game.name}</div>`;
            
            card.appendChild(img);
            card.appendChild(info);
            gridContainer.appendChild(card);
        });
        
        showToast(`已加载 ${games.length} 款游戏`, 'success');
    } catch (error) {
        console.error('扫描失败:', error);
        loading.style.display = 'none';
        empty.style.display = 'flex';
        showToast('扫描失败: ' + (error as Error).message, 'error');
    }
}

// 启动游戏
async function launchGame(game: Game) {
    try {
        showToast(`正在启动: ${game.name}`, 'success');
        await shell.openPath(game.exePath);
    } catch (error) {
        showToast('启动失败: ' + (error as Error).message, 'error');
    }
}

// 显示提示
function showToast(message: string, type: 'success' | 'error' = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
}

// 启动
init();
