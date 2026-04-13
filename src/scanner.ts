// Steam 游戏扫描模块
import { fs, registry } from './api';

export interface Game {
    appId: string;
    name: string;
    exePath: string;
    thumbnail: string;
    libraryCover: string;
}

const STEAM_REGISTRY_KEY = 'Software\\Valve\\Steam';
const STEAM_REGISTRY_VALUE = 'SteamPath';

// 递归查找游戏主 exe（优先找常见启动器）
function findGameExe(dirPath: string, gameName: string): string {
    try {
        const files = fs.readDir(dirPath);
        const exeFiles = files.filter(f => f.isFile && f.name.toLowerCase().endsWith('.exe'));
        
        if (exeFiles.length === 0) return '';
        
        // 优先匹配游戏名
        const gameNameLower = gameName.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const exe of exeFiles) {
            const exeNameLower = exe.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (exeNameLower.includes(gameNameLower) || gameNameLower.includes(exeNameLower)) {
                return `${dirPath}\\${exe.name}`;
            }
        }
        
        // 其次匹配常见启动器
        const launchers = ['launcher', 'starter', 'start', 'game', 'play', 'client'];
        for (const exe of exeFiles) {
            const exeNameLower = exe.name.toLowerCase();
            for (const l of launchers) {
                if (exeNameLower.includes(l)) {
                    return `${dirPath}\\${exe.name}`;
                }
            }
        }
        
        // 返回第一个 exe
        return `${dirPath}\\${exeFiles[0].name}`;
    } catch {
        return '';
    }
}

// VDF 解析
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

// ACF 解析
function parseAppManifest(content: string): { appid: string; name: string; installdir: string } | null {
    try {
        const appidMatch = content.match(/"appid"\s*"(\d+)"/);
        const nameMatch = content.match(/"name"\s*"([^"]+)"/);
        const installDirMatch = content.match(/"installdir"\s*"([^"]+)"/);
        
        if (!appidMatch || !nameMatch || !installDirMatch) return null;
        
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
        console.error('[Scanner] 读取Steam路径失败');
    }
    return null;
}

// Steam CDN 缩略图
function getThumbnailUrl(appId: string): string {
    return `https://steamcdn.fastly.net/steam/apps/${appId}/library_600x900.jpg`;
}

// 扫描所有 Steam 游戏
export async function scanSteamGames(): Promise<Game[]> {
    const games: Game[] = [];
    
    const steamPath = await getSteamPath();
    if (!steamPath) {
        console.error('[Scanner] 未找到 Steam 安装路径');
        return games;
    }
    console.log('[Scanner] Steam路径:', steamPath);
    
    const libraryPaths = [steamPath];
    
    // 解析 libraryfolders.vdf
    const vdfPath = `${steamPath}\\steamapps\\libraryfolders.vdf`;
    try {
        const vdfContent = await fs.readTextFile(vdfPath);
        const additionalPaths = parseVDF(vdfContent);
        libraryPaths.push(...additionalPaths);
        console.log('[Scanner] 发现游戏库:', libraryPaths);
    } catch {
        console.error('[Scanner] 读取libraryfolders.vdf失败');
    }
    
    // 扫描每个游戏库
    for (const libPath of libraryPaths) {
        const manifestPath = `${libPath}\\steamapps`;
        
        try {
            const files = await fs.readDir(manifestPath);
            
            for (const file of files) {
                if (!file.isFile || !file.name.startsWith('appmanifest_') || !file.name.endsWith('.acf')) continue;
                
                const manifestFilePath = `${manifestPath}\\${file.name}`;
                
                try {
                    const manifestContent = await fs.readTextFile(manifestFilePath);
                    const gameInfo = parseAppManifest(manifestContent);
                    
                    if (!gameInfo) continue;
                    
                    const gamePath = `${libPath}\\steamapps\\common\\${gameInfo.installdir}`;
                    const exePath = findGameExe(gamePath, gameInfo.name);
                    
                    if (exePath) {
                        games.push({
                            appId: gameInfo.appid,
                            name: gameInfo.name,
                            exePath: exePath,
                            thumbnail: getThumbnailUrl(gameInfo.appid),
                            libraryCover: ''
                        });
                        console.log('[Scanner] 发现游戏:', gameInfo.name, '->', exePath);
                    } else {
                        console.warn('[Scanner] 未找到exe:', gameInfo.name, '路径:', gamePath);
                    }
                } catch (e) {
                    console.error('[Scanner] 解析manifest失败:', manifestFilePath, e);
                }
            }
        } catch (e) {
            console.error('[Scanner] 扫描目录失败:', manifestPath, e);
        }
    }
    
    console.log('[Scanner] 共扫描到', games.length, '款游戏');
    return games;
}
