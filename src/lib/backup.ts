import { db } from "./db";

// File System Access API 类型声明
interface FileSystemDirectoryHandle {
  kind: "directory";
  name: string;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string): Promise<void>;
}

interface FileSystemFileHandle {
  kind: "file";
  name: string;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: string | BufferSource): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
}

// 备份状态
interface BackupState {
  enabled: boolean;
  directoryHandle?: FileSystemDirectoryHandle;
  lastBackupTime?: Date;
  autoSync: boolean;
}

let backupState: BackupState = {
  enabled: false,
  autoSync: true,
};

// 检查浏览器是否支持 File System Access API
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

// 获取备份状态
export function getBackupState(): BackupState {
  return { ...backupState };
}

// 选择备份目录
export async function selectBackupDirectory(): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    throw new Error("您的浏览器不支持文件系统访问功能。请使用 Chrome、Edge 或 Safari 16+。");
  }

  try {
    const dirHandle = await window.showDirectoryPicker();
    backupState.directoryHandle = dirHandle;
    backupState.enabled = true;

    // 保存目录名称到 localStorage（用于显示）
    localStorage.setItem("backupDirectoryName", dirHandle.name);

    // 立即执行一次备份
    await performBackup();

    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      // 用户取消了选择
      return false;
    }
    throw err;
  }
}

// 获取备份目录名称
export function getBackupDirectoryName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("backupDirectoryName");
}

// 清除备份设置
export function clearBackupSettings(): void {
  backupState = {
    enabled: false,
    autoSync: true,
  };
  localStorage.removeItem("backupDirectoryName");
}

// 导出所有数据
export async function exportAllData(): Promise<{
  articles: unknown[];
  vocabularies: unknown[];
  sentencePatterns: unknown[];
  quizRecords: unknown[];
  studyPlans: unknown[];
  dailyLogs: unknown[];
  appSettings: unknown[];
  exportTime: string;
  version: string;
}> {
  const [
    articles,
    vocabularies,
    sentencePatterns,
    quizRecords,
    studyPlans,
    dailyLogs,
    appSettings,
  ] = await Promise.all([
    db.articles.toArray(),
    db.vocabularies.toArray(),
    db.sentencePatterns.toArray(),
    db.quizRecords.toArray(),
    db.studyPlans.toArray(),
    db.dailyLogs.toArray(),
    db.appSettings.toArray(),
  ]);

  return {
    articles,
    vocabularies,
    sentencePatterns,
    quizRecords,
    studyPlans,
    dailyLogs,
    appSettings,
    exportTime: new Date().toISOString(),
    version: "1.0",
  };
}

// 执行备份
export async function performBackup(): Promise<boolean> {
  if (!backupState.enabled || !backupState.directoryHandle) {
    return false;
  }

  try {
    const data = await exportAllData();
    const jsonString = JSON.stringify(data, null, 2);
    // 添加 UTF-8 BOM 头，帮助系统识别文件类型
    const BOM = '\uFEFF';
    const content = BOM + jsonString;

    // 创建带时间戳的文件名
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, "-");
    const fileName = `leanbizeng_backup_${dateStr}_${timeStr}.json`;

    // 创建或覆盖主备份文件
    const mainFileHandle = await backupState.directoryHandle.getFileHandle(
      "leanbizeng_backup_latest.json",
      { create: true }
    );
    const mainWritable = await mainFileHandle.createWritable();
    await mainWritable.write(content);
    await mainWritable.close();

    // 同时创建带时间戳的历史备份
    const historyFileHandle = await backupState.directoryHandle.getFileHandle(
      fileName,
      { create: true }
    );
    const historyWritable = await historyFileHandle.createWritable();
    await historyWritable.write(content);
    await historyWritable.close();

    backupState.lastBackupTime = new Date();

    return true;
  } catch (err) {
    console.error("备份失败:", err);
    throw err;
  }
}

// 下载备份文件（降级方案）
export function downloadBackupFile(data: unknown): void {
  const jsonString = JSON.stringify(data, null, 2);
  // 添加 UTF-8 BOM 头，帮助 macOS 识别文件类型
  const BOM = '\uFEFF';
  const content = BOM + jsonString;
  const blob = new Blob([content], { type: "application/json; charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10);
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, "-");
  const fileName = `leanbizeng_backup_${dateStr}_${timeStr}.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  // 添加 referrer 策略
  a.referrerPolicy = "no-referrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 从文件导入数据
export async function importFromFile(file: File): Promise<{
  success: boolean;
  message: string;
  stats?: {
    articles: number;
    vocabularies: number;
    patterns: number;
  };
}> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // 验证数据格式
    if (!data.version || !data.exportTime) {
      return { success: false, message: "无效的备份文件格式" };
    }

    // 清空现有数据
    await Promise.all([
      db.articles.clear(),
      db.vocabularies.clear(),
      db.sentencePatterns.clear(),
      db.quizRecords.clear(),
      db.studyPlans.clear(),
      db.dailyLogs.clear(),
    ]);

    // 导入数据
    if (data.articles?.length) {
      await db.articles.bulkAdd(data.articles);
    }
    if (data.vocabularies?.length) {
      await db.vocabularies.bulkAdd(data.vocabularies);
    }
    if (data.sentencePatterns?.length) {
      await db.sentencePatterns.bulkAdd(data.sentencePatterns);
    }
    if (data.quizRecords?.length) {
      await db.quizRecords.bulkAdd(data.quizRecords);
    }
    if (data.studyPlans?.length) {
      await db.studyPlans.bulkAdd(data.studyPlans);
    }
    if (data.dailyLogs?.length) {
      await db.dailyLogs.bulkAdd(data.dailyLogs);
    }
    // appSettings 保留当前的，不导入

    return {
      success: true,
      message: "数据导入成功",
      stats: {
        articles: data.articles?.length || 0,
        vocabularies: data.vocabularies?.length || 0,
        patterns: data.sentencePatterns?.length || 0,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "导入失败";
    return { success: false, message };
  }
}

// 设置自动同步
export function setAutoSync(enabled: boolean): void {
  backupState.autoSync = enabled;
  localStorage.setItem("backupAutoSync", enabled ? "true" : "false");
}

// 获取自动同步设置
export function getAutoSync(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("backupAutoSync");
  return stored !== "false";
}

// 初始化备份状态
export function initBackupState(): void {
  if (typeof window === "undefined") return;

  const dirName = localStorage.getItem("backupDirectoryName");
  if (dirName) {
    backupState.enabled = true;
  }

  const autoSync = localStorage.getItem("backupAutoSync");
  backupState.autoSync = autoSync !== "false";
}

// 监听数据变化并自动备份（需要在应用初始化时调用）
let dataChangeTimeout: NodeJS.Timeout | null = null;

export function scheduleAutoBackup(): void {
  if (!backupState.enabled || !backupState.autoSync) return;

  // 防抖，避免频繁备份
  if (dataChangeTimeout) {
    clearTimeout(dataChangeTimeout);
  }

  dataChangeTimeout = setTimeout(() => {
    performBackup().catch(console.error);
  }, 5000); // 5秒后执行备份
}
