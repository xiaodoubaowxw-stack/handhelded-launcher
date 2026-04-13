// 掌机启动器 - Steam Big Picture Mode 风格 UI
import { win, shell, http, app, fs } from './api';
import { Game, scanSteamGames } from './scanner';

const CACHE_VERSION = 'v1';

async function getCacheDir(): Promise<string> {
    const appPath = await app.getPath('userData');
    return `${appPath}/thumbnails`;
}

async function ensureCacheDir(): Promise<string> {
    const cacheDir = await getCacheDir();
    try { await fs.mkdir(cacheDir); } catch {}
    return cacheDir;
}

async function downloadAndCache(url: string, appId: string, cacheDir: string): Promise<string> {
    const cachePath = `${cacheDir}/${appId}_${CACHE_VERSION}.jpg`;
    try {
        const stat = await fs.stat(cachePath);
        if (stat.isFile) return cachePath;
    } catch {}
    try {
        const res = await http.get(url);
        if (res.body && res.body.length > 1000) {
            await fs.writeTextFile(cachePath, res.body);
            return cachePath;
        }
    } catch {}
    return url;
}

async function preloadThumbnails(games: Game[], cacheDir: string): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    await Promise.all(games.slice(0, 12).map(g =>
        downloadAndCache(g.thumbnail, g.appId, cacheDir).then(p => map.set(g.appId, p))
    ));
    return map;
}

function createStyles() {
    const s = document.createElement('style');
    s.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Segoe UI', 'Roboto', sans-serif;
            background: #0a0a0f;
            color: #fff;
            min-height: 100vh;
            overflow: hidden;
            user-select: none;
        }
        
        /* Steam-style dark background */
        .steam-bg {
            position: fixed;
            inset: 0;
            background: 
                radial-gradient(ellipse at 20% 80%, rgba(45, 90, 140, 0.15) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(100, 50, 150, 0.1) 0%, transparent 50%),
                linear-gradient(180deg, #0d1117 0%, #161b22 50%, #0d1117 100%);
            z-index: -1;
        }
        
        /* Animated background grid */
        .steam-bg::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image: 
                linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 60px 60px;
            animation: gridMove 20s linear infinite;
        }
        
        @keyframes gridMove {
            0% { transform: translateY(0); }
            100% { transform: translateY(60px); }
        }
        
        /* Header bar */
        .header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.85) 100%);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 48px;
            z-index: 100;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(100,180,255,0.3), transparent);
        }
        
        .logo {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .logo-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        
        .logo-text {
            font-size: 26px;
            font-weight: 600;
            background: linear-gradient(135deg, #fff 0%, #8ab4f8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: 1px;
        }
        
        .header-right {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .header-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            color: #ccc;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .header-btn:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.2);
            color: #fff;
            transform: translateY(-1px);
        }
        
        /* Main content */
        .main {
            padding: 110px 48px 48px;
            height: 100vh;
            overflow-y: auto;
        }
        
        .main::-webkit-scrollbar {
            width: 6px;
        }
        
        .main::-webkit-scrollbar-track {
            background: transparent;
        }
        
        .main::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
        }
        
        /* Section title */
        .section-title {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 32px;
        }
        
        .section-title h2 {
            font-size: 22px;
            font-weight: 500;
            color: rgba(255,255,255,0.9);
            letter-spacing: 0.5px;
        }
        
        .section-title .line {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent);
        }
        
        .section-title .count {
            font-size: 14px;
            color: rgba(255,255,255,0.4);
            background: rgba(255,255,255,0.05);
            padding: 4px 12px;
            border-radius: 20px;
        }
        
        /* Game grid */
        .game-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 24px;
        }
        
        /* Game card */
        .game-card {
            position: relative;
            background: rgba(20, 25, 35, 0.8);
            border-radius: 16px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            border: 1px solid rgba(255,255,255,0.05);
        }
        
        .game-card:hover {
            transform: translateY(-8px) scale(1.02);
            border-color: rgba(100, 180, 255, 0.3);
            box-shadow: 
                0 20px 60px rgba(0,0,0,0.5),
                0 0 40px rgba(100, 180, 255, 0.1),
                inset 0 1px 0 rgba(255,255,255,0.1);
        }
        
        .game-card:hover .game-img {
            transform: scale(1.08);
        }
        
        .game-card:hover .game-overlay {
            opacity: 1;
        }
        
        .game-card:hover .play-btn {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
        }
        
        .game-img-wrap {
            position: relative;
            aspect-ratio: 16/10;
            overflow: hidden;
            background: #1a1a2e;
        }
        
        .game-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.6s ease;
        }
        
        .game-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.8) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .play-btn {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.8);
            width: 72px;
            height: 72px;
            background: linear-gradient(135deg, #00d4ff, #0078d4);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: all 0.3s ease;
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.4);
        }
        
        .play-btn::before {
            content: '';
            width: 0;
            height: 0;
            border-left: 20px solid #fff;
            border-top: 12px solid transparent;
            border-bottom: 12px solid transparent;
            margin-left: 4px;
        }
        
        .game-info {
            padding: 16px 20px;
        }
        
        .game-name {
            font-size: 16px;
            font-weight: 500;
            color: #fff;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
        }
        
        .game-meta {
            font-size: 13px;
            color: rgba(255,255,255,0.4);
        }
        
        /* Loading state */
        .loading {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #0a0a0f;
            z-index: 200;
        }
        
        .loading-logo {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            margin-bottom: 32px;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(100,180,255,0.2); }
            50% { transform: scale(1.05); box-shadow: 0 0 40px 10px rgba(100,180,255,0.1); }
        }
        
        .loading-text {
            font-size: 18px;
            color: rgba(255,255,255,0.6);
            margin-bottom: 24px;
        }
        
        .loading-bar {
            width: 200px;
            height: 4px;
            background: rgba(255,255,255,0.1);
            border-radius: 2px;
            overflow: hidden;
        }
        
        .loading-bar::after {
            content: '';
            display: block;
            width: 40%;
            height: 100%;
            background: linear-gradient(90deg, #00d4ff, #0078d4);
            border-radius: 2px;
            animation: loadingSlide 1s ease-in-out infinite;
        }
        
        @keyframes loadingSlide {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
        }
        
        /* Empty state */
        .empty {
            position: fixed;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #0a0a0f;
            z-index: 200;
        }
        
        .empty-icon {
            font-size: 100px;
            margin-bottom: 24px;
            opacity: 0.3;
        }
        
        .empty-title {
            font-size: 24px;
            color: rgba(255,255,255,0.8);
            margin-bottom: 12px;
        }
        
        .empty-desc {
            font-size: 16px;
            color: rgba(255,255,255,0.4);
            text-align: center;
            max-width: 400px;
            line-height: 1.6;
        }
        
        /* Toast */
        .toast {
            position: fixed;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            padding: 16px 32px;
            background: rgba(30, 35, 45, 0.95);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            color: #fff;
            font-size: 15px;
            backdrop-filter: blur(10px);
            z-index: 300;
            opacity: 0;
            transition: all 0.3s ease;
        }
        
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        
        .toast.success {
            border-color: rgba(0, 212, 255, 0.3);
            box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
        }
        
        .toast.error {
            border-color: rgba(255, 80, 80, 0.3);
            box-shadow: 0 8px 32px rgba(255, 80, 80, 0.1);
        }
        
        /* Fade in animation */
        .fade-in {
            animation: fadeIn 0.5s ease forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(s);
}

function createLoadingUI() {
    const el = document.createElement('div');
    el.className = 'loading';
    el.id = 'loading';
    el.innerHTML = `
        <div class="loading-logo">🎮</div>
        <div class="loading-text">正在扫描 Steam 游戏库...</div>
        <div class="loading-bar"></div>
    `;
    document.body.appendChild(el);
}

function createEmptyUI() {
    const el = document.createElement('div');
    el.className = 'empty';
    el.id = 'empty';
    el.style.display = 'none';
    el.innerHTML = `
        <div class="empty-icon">🎮</div>
        <div class="empty-title">未检测到 Steam 游戏</div>
        <div class="empty-desc">请确保 Steam 已安装在您的设备上，并且至少运行过一次游戏</div>
    `;
    document.body.appendChild(el);
}

function createMainUI() {
    const el = document.createElement('div');
    el.id = 'main';
    el.style.display = 'none';
    el.innerHTML = `
        <div class="header">
            <div class="logo">
                <div class="logo-icon">🎮</div>
                <div class="logo-text">掌机启动器</div>
            </div>
            <div class="header-right">
                <button class="header-btn" onclick="window.refreshGames()">
                    <span>🔄</span>
                    <span>刷新</span>
                </button>
            </div>
        </div>
        <div class="main">
            <div class="section-title">
                <h2>📚 游戏库</h2>
                <div class="line"></div>
                <div class="count" id="game-count">0 款游戏</div>
            </div>
            <div class="game-grid" id="game-grid"></div>
        </div>
    `;
    document.body.appendChild(el);
    
    (window as any).refreshGames = scanGames;
}

function showToast(msg: string, type: 'success' | 'error' = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    });
}

async function launchGame(game: Game) {
    showToast(`正在启动: ${game.name}`, 'success');
    try {
        await shell.openPath(game.exePath);
    } catch (e) {
        showToast('启动失败: ' + (e as Error).message, 'error');
    }
}

async function scanGames() {
    const loading = document.getElementById('loading')!;
    const empty = document.getElementById('empty')!;
    const main = document.getElementById('main')!;
    
    loading.style.display = 'flex';
    empty.style.display = 'none';
    main.style.display = 'none';
    
    try {
        const games = await scanSteamGames();
        
        loading.style.display = 'none';
        
        if (games.length === 0) {
            empty.style.display = 'flex';
            return;
        }
        
        main.style.display = 'block';
        
        const cacheDir = await ensureCacheDir();
        const thumbnailMap = await preloadThumbnails(games, cacheDir);
        
        const grid = document.getElementById('game-grid')!;
        const count = document.getElementById('game-count')!;
        count.textContent = `${games.length} 款游戏`;
        
        grid.innerHTML = '';
        
        games.forEach((game, i) => {
            const card = document.createElement('div');
            card.className = 'game-card fade-in';
            card.style.animationDelay = `${i * 50}ms`;
            
            const imgSrc = thumbnailMap.get(game.appId) || game.thumbnail;
            const placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 280"><rect fill="%231a1a2e" width="448" height="280"/><text x="50%" y="50%" text-anchor="middle" fill="%23445566" font-size="60">🎮</text></svg>';
            
            card.innerHTML = `
                <div class="game-img-wrap">
                    <img class="game-img" src="${imgSrc}" onerror="this.src='${placeholder}'">
                    <div class="game-overlay"></div>
                    <div class="play-btn"></div>
                </div>
                <div class="game-info">
                    <div class="game-name">${game.name}</div>
                    <div class="game-meta">点击启动游戏</div>
                </div>
            `;
            
            card.onclick = () => launchGame(game);
            grid.appendChild(card);
        });
        
        showToast(`已加载 ${games.length} 款游戏`, 'success');
    } catch (e) {
        console.error('扫描失败:', e);
        loading.style.display = 'none';
        empty.style.display = 'flex';
        showToast('扫描失败: ' + (e as Error).message, 'error');
    }
}

async function init() {
    await win.setTitle('掌机启动器');
    await win.setSize(2560, 1600);
    await win.center();
    await win.setEffect('none');
    
    createStyles();
    
    const bg = document.createElement('div');
    bg.className = 'steam-bg';
    document.body.appendChild(bg);
    
    createLoadingUI();
    createEmptyUI();
    createMainUI();
    
    await scanGames();
}

init();
