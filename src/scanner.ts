// Steam 游戏扫描模块
import { fs, registry } from './api';

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

// Steam libraryfolders.vdf 解析
function parseVDF(content: string): string[] {
    const paths: string[] = [];
    const lines = content.split('\n');
    let inLibraryFolder = false;
    let depth = 0;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // 检测 libraryfolders 块开始
        if (trimmed.includes('"libraryfolders"')) {
            inLibraryFolder = true;
            depth = 0;
            continue;
        }
        
        if (!inLibraryFolder) continue;
        
        // 统计大括号深度
        depth += (trimmed.match(/{/g) || []).length;
        depth -= (trimmed.match(/}/g) || []).length;
        
        // 提取路径
        const pathMatch = trimmed.match(/"path"\s*"([^"]+)"/);
        if (pathMatch) {
            paths.push(pathMatch[1].replace(/\\\\/g, '\\'));
        }
        
        // 检查是否退出 libraryfolders 块
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
            // 将 / 转换为 \\
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
            // 读取目录下所有 appmanifest_*.acf 文件
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
                                // 优先查找 .exe 文件
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
