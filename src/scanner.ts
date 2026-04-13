// Steam 游戏扫描模块
import { fs, registry, app } from './api';

export interface Game {
    appId: string;
    name: string;
    exePath: string;
    thumbnail: string;
    libraryCover: string;
}

// Steam 路径
const STEAM_REGISTRY_KEY = 'Software\\Valve\\Steam';
const STEAM_REGISTRY_VALUE = 'SteamPath';

// 缩略图缓存目录
const CACHE_DIR = 'cache/thumbnails';

// 获取缓存目录路径
async function getCacheDir(): Promise<string> {
    const appPath = await app.getPath('userData');
    return `${appPath}\\${CACHE_DIR}`;
}

// 获取缓存的图片路径
async function getCachedImagePath(appId: string, type: 'thumbnail' | 'cover'): Promise<string> {
    const cacheDir = await getCacheDir();
    const ext = type === 'thumbnail' ? '_600x900.jpg' : '_header.jpg';
    return `${cacheDir}\\${appId}${ext}`;
}

// 下载并缓存图片
async function downloadAndCacheImage(url: string, appId: string, type: 'thumbnail' | 'cover'): Promise<string> {
    const cachedPath = await getCachedImagePath(appId, type);
    const cacheDir = await getCacheDir();
    
    // 检查是否已有缓存
    try {
        const exist = await fs.stat(cachedPath);
        if (exist.isFile) {
            console.log(`[缓存命中] ${appId} ${type}`);
            return cachedPath;
        }
    } catch {
        // 缓存不存在，需要下载
    }
    
    // 确保缓存目录存在
    try {
        await fs.mkdir(cacheDir);
    } catch {
        // 目录可能已存在
    }
    
    // 下载图片（这里通过前端 fetch 加载）
    // 实际下载逻辑在 frontend 中通过 HTTP API 实现
    console.log(`[需要下载] ${appId} ${type} -> ${url}`);
    return url; // 返回原始 URL，由前端负责下载
}

// Steam libraryfolders.vdf 解析
function parseVDF(content: string): string[] {
    const paths: string[] = [];
    const lines = content.split('\n');
    let inLibraryFolder = false;
    let depth = 0;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.includes('"libraryfolders"')) {
            inLibraryFolder = true;
            depth = 0;
            continue;
        }
        
        if (!inLibraryFolder) continue;
        
        depth += (trimmed.match(/{/g) || []).length;
        depth -= (trimmed.match(/}/g) || []).length;
        
        const pathMatch = trimmed.match(/"path"\s*"([^"]+)"/);
        if (pathMatch) {
            paths.push(pathMatch[1].replace(/\\\\/g, '\\'));
        }
        
        if (depth <= 0 && inLibraryFolder && trimmed.includes('}')) {
            inLibraryFolder = false;
        }
    }
    
    return paths;
}

// 解析 appmanifest_acf 文件
function parseAppManifest(content: string): { appid: string; name: string; installdir: string } | null {
    try {
        const appidMatch = content.match(/"appid"\s*"(\d+)"/);
        const nameMatch = content.match(/"name"\s*"([^"]+)"/);
        const installDirMatch = content.match(/"installdir"\s*"([^"]+)"/);
        
        if (!appidMatch || !nameMatch || !installDirMatch) {
            return null;
        }
        
        return {
            appid: appidMatch[1],
            name: nameMatch[1],
            installdir: installDirMatch[1]
        };
    } catch {
        return null;
    }
}

// 获取 Steam 安装路径
async function getSteamPath(): Promise<string | null> {
    try {
        const steamPath = await registry.read('HKCU', STEAM_REGISTRY_KEY, STEAM_REGISTRY_VALUE);
        if (steamPath) {
            return steamPath.replace(/\//g, '\\');
        }
    } catch {
        console.error('读取Steam路径失败');
    }
    return null;
}

// 获取游戏缩略图URL (Steam CDN)
function getThumbnailUrl(appId: string): string {
    return `https://steamcdn.fastly.net/steam/apps/${appId}/library_600x900.jpg`;
}

// 获取库封面URL
function getLibraryCoverUrl(appId: string): string {
    return `https://steamcdn.fastly.net/steam/apps/${appId}/header.jpg`;
}

// 扫描所有 Steam 游戏
export async function scanSteamGames(): Promise<Game[]> {
    const games: Game[] = [];
    
    // 获取 Steam 路径
    const steamPath = await getSteamPath();
    if (!steamPath) {
        console.error('未找到 Steam 安装路径');
        return games;
    }
    
    console.log('Steam 路径:', steamPath);
    
    // 收集所有 library 路径
    const libraryPaths = [steamPath];
    
    // 读取 libraryfolders.vdf
    const vdfPath = `${steamPath}\\steamapps\\libraryfolders.vdf`;
    try {
        const vdfContent = await fs.readTextFile(vdfPath);
        const additionalPaths = parseVDF(vdfContent);
        libraryPaths.push(...additionalPaths);
        console.log('发现游戏库:', libraryPaths);
    } catch {
        console.error('读取 libraryfolders.vdf 失败');
    }
    
    // 扫描每个游戏库
    for (const libPath of libraryPaths) {
        const manifestPath = `${libPath}\\steamapps`;
        
        try {
            const files = await fs.readDir(manifestPath);
            
            for (const file of files) {
                if (file.isFile && file.name.startsWith('appmanifest_') && file.name.endsWith('.acf')) {
                    const manifestFilePath = `${manifestPath}\\${file.name}`;
                    
                    try {
                        const manifestContent = await fs.readTextFile(manifestFilePath);
                        const gameInfo = parseAppManifest(manifestContent);
                        
                        if (gameInfo) {
                            const gamePath = `${libPath}\\steamapps\\common\\${gameInfo.installdir}`;
                            
                            // 查找游戏主执行文件
                            let exePath = '';
                            try {
                                const gameFiles = await fs.readDir(gamePath);
                                const exeFiles = gameFiles.filter(f => f.isFile && f.name.toLowerCase().endsWith('.exe'));
                                if (exeFiles.length > 0) {
                                    exePath = `${gamePath}\\${exeFiles[0].name}`;
                                }
                            } catch {
                                // 游戏目录可能不存在
                            }
                            
                            if (exePath) {
                                games.push({
                                    appId: gameInfo.appid,
                                    name: gameInfo.name,
                                    exePath: exePath,
                                    thumbnail: getThumbnailUrl(gameInfo.appid),
                                    libraryCover: getLibraryCoverUrl(gameInfo.appid)
                                });
                                console.log('发现游戏:', gameInfo.name, '-', exePath);
                            }
                        }
                    } catch {
                        console.error(`读取 ${manifestFilePath} 失败`);
                    }
                }
            }
        } catch {
            console.error(`扫描 ${manifestPath} 失败`);
        }
    }
    
    console.log(`共扫描到 ${games.length} 款游戏`);
    return games;
}

// 清理旧缓存（可选功能）
export async function cleanThumbnailCache(maxAgeDays: number = 30): Promise<void> {
    const cacheDir = await getCacheDir();
    
    try {
        const files = await fs.readDir(cacheDir);
        const now = Date.now();
        const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
        
        for (const file of files) {
            if (file.isFile) {
                try {
                    const stat = await fs.stat(`${cacheDir}\\${file.name}`);
                    if (now - stat.mtime > maxAge) {
                        console.log(`[清理缓存] ${file.name}`);
                        // 删除旧文件（需要添加 deleteFile API）
                    }
                } catch {
                    // 忽略错误
                }
            }
        }
    } catch {
        // 缓存目录不存在，无需清理
    }
}
