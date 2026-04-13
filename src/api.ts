// QiangQiang API 桥接层
// 本文件为开发环境提供类型提示，实际 API 由 QiangQiang 运行时提供

// 导出类型定义
export interface WindowInfo {
    w: number;
    h: number;
}

export interface FileInfo {
    name: string;
    isFile: boolean;
    isDirectory: boolean;
}

export interface WatcherInfo {
    id: number;
}

// Window API
export const win = {
    setTitle: (title: string) => console.warn('[API Mock] win.setTitle'),
    setSize: (w: number, h: number) => console.warn('[API Mock] win.setSize'),
    setMinSize: (w: number, h: number) => console.warn('[API Mock] win.setMinSize'),
    center: () => console.warn('[API Mock] win.center'),
    maximize: () => console.warn('[API Mock] win.maximize'),
    minimize: () => console.warn('[API Mock] win.minimize'),
    close: () => console.warn('[API Mock] win.close'),
    setAlwaysOnTop: (on: boolean) => console.warn('[API Mock] win.setAlwaysOnTop'),
    startDrag: () => console.warn('[API Mock] win.startDrag'),
    setBackgroundColor: (color: string) => console.warn('[API Mock] win.setBackgroundColor'),
    setEffect: (effect: 'mica' | 'acrylic' | 'blur' | 'none') => console.warn('[API Mock] win.setEffect'),
    onResized: (cb: (info: WindowInfo) => void) => console.warn('[API Mock] win.onResized'),
    onFocus: (cb: () => void) => console.warn('[API Mock] win.onFocus'),
    onBlur: (cb: () => void) => console.warn('[API Mock] win.onBlur'),
    onFileDrop: (cb: (files: string[]) => void) => console.warn('[API Mock] win.onFileDrop'),
    show: () => console.warn('[API Mock] win.show'),
    hide: () => console.warn('[API Mock] win.hide'),
};

// Dialog API
export const dialog = {
    openFile: (options?: { filters?: { name: string; extensions: string[] }[]; multiple?: boolean }) => '',
    saveFile: (options?: { defaultName?: string }) => '',
    confirm: (title: string, message: string) => true,
};

// FS API
export const fs = {
    readTextFile: (path: string) => '',
    writeTextFile: (path: string, content: string) => {},
    readDir: (path: string): FileInfo[] => [],
    stat: (path: string) => ({ isFile: false, isDirectory: false, size: 0, mtime: 0 }),
};

// HTTP API
export const http = {
    get: (url: string) => ({ body: '' }),
    post: (url: string, body: string, headers?: Record<string, string>) => ({ body: '' }),
};

// Hotkey API
export const hotkey = {
    register: (id: number, modifiers: number, key: number) => true,
    unregister: (id: number) => {},
    onTriggered: (cb: (info: { id: number }) => void) => {},
};

export const MOD = { CONTROL: 2, SHIFT: 4, ALT: 1 };
export const VK = { A: 65, S: 83, D: 68 };

// Menu API
export const menu = {
    popup: (items: { label: string; disabled?: boolean }[]) => 0,
};

// Tray API
export const tray = {
    create: (tooltip: string) => {},
    onClick: (cb: () => void) => {},
    onRightClick: (cb: () => void) => {},
    setIcon: (icon: string) => {},
    remove: () => {},
};

// Notification API
export const notification = {
    show: (title: string, body: string) => {},
};

// Watcher API
export const watcher = {
    start: (path: string): number => 0,
    stop: (id: number) => {},
    onChange: (cb: (info: { action: string; path: string }) => void) => {},
};

// Registry API
export const registry = {
    read: (hive: string, key: string, name: string) => '',
    write: (hive: string, key: string, name: string, value: string) => {},
    delete: (hive: string, key: string, name: string) => {},
    exists: (hive: string, key: string) => true,
};

// Shell API
export const shell = {
    openPath: (path: string) => {},
    openUrl: (url: string) => {},
};

// App API
export const app = {
    exit: () => {},
    getPath: (name: string) => '',
    getVersion: () => '1.0.0',
};
