import { TFile, Component } from "obsidian";
import type NoteHeatmapPlugin from "./main";

export interface NoteEntry {
  path: string;
  name: string;
  createdDate: string | null;
  modifiedTime: number; // 修改时间的时间戳（毫秒），用于排序
}

export interface YearData {
  [date: string]: NoteEntry[];
}

export interface CacheData {
  [year: number]: YearData;
}

function parseDateString(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "object" && val !== null) {
    const anyVal = val as Record<string, unknown>;
    if (typeof anyVal["toISODate"] === "function") {
      return (anyVal["toISODate"] as () => string)();
    }
    if (typeof anyVal["toISOString"] === "function") {
      return (anyVal["toISOString"] as () => string)().split("T")[0];
    }
    // 普通对象无法转换为有效日期字符串
    return null;
  }
  const str = String(val);
  
  // 支持 ISO 8601: 2026-04-14T10:30:00 或 2026-04-14
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  
  return null;
}

/**
 * 数据缓存管理器
 * 负责：
 * 1. 维护按年份组织的笔记数据缓存
 * 2. 监听文件变化事件进行增量更新
 * 3. 提供按年份快速查询接口
 */
export class DataCache extends Component {
  private plugin: NoteHeatmapPlugin;
  private cache: CacheData = {};
  private targetField: string;
  private targetFolder: string;
  private isInitialized = false;

  // 等待初始化的 Promise
  private initPromise: Promise<void> | null = null;

  // 防抖定时器
  private updateTimeout: number | null = null;

  // 初始化取消标志（用于 forceRefresh 时中断正在进行的初始化）
  private initCancelled = false;

  constructor(plugin: NoteHeatmapPlugin) {
    super();
    this.plugin = plugin;
    this.targetField = plugin.settings.targetField;
    this.targetFolder = plugin.settings.targetFolder;
  }

  /**
   * 初始化缓存 - 全量扫描（仅在插件加载时执行一次）
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    // 重置取消标志
    this.initCancelled = false;

    try {
      this.cache = {};
      const files = this.getTargetFiles();

      // 分批处理文件，避免阻塞主线程
      const batchSize = 100;
      for (let i = 0; i < files.length; i += batchSize) {
        // 检查是否被取消
        if (this.initCancelled) {
          console.debug("[NoteHeatmap] 缓存初始化被取消");
          return;
        }

        const batch = files.slice(i, i + batchSize);
        for (const file of batch) {
          this.processFile(file);
        }
        // 让出主线程，允许 UI 更新
        if (i + batchSize < files.length) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // 检查是否被取消
      if (this.initCancelled) {
        console.debug("[NoteHeatmap] 缓存初始化被取消");
        return;
      }

      this.isInitialized = true;

      // 注册事件监听（Component 会自动管理事件生命周期）
      this.registerEventListeners();

      // 通知视图缓存已就绪
      this.plugin.refreshViews();
    } catch (err) {
      console.error("[NoteHeatmap] 缓存初始化出错:", err);
      // 即使出错也标记为初始化完成，避免视图一直等待
      this.isInitialized = true;
      throw err;
    }
  }

  /**
   * 注册文件变化事件监听
   */
  private registerEventListeners(): void {
    const metadataCache = this.plugin.app.metadataCache;
    const vault = this.plugin.app.vault;

    // 文件元数据变化（frontmatter 修改）
    this.registerEvent(
      metadataCache.on("changed", (file) => {
        if (file instanceof TFile && this.isTargetFile(file)) {
          this.handleFileChanged(file);
        }
      })
    );

    // 文件创建
    this.registerEvent(
      vault.on("create", (file) => {
        if (file instanceof TFile && this.isTargetFile(file)) {
          this.handleFileCreated(file);
        }
      })
    );

    // 文件删除
    this.registerEvent(
      vault.on("delete", (file) => {
        if (file instanceof TFile && this.isTargetFile(file)) {
          this.handleFileDeleted(file);
        }
      })
    );

    // 文件重命名
    this.registerEvent(
      vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile && this.isTargetFile(file)) {
          this.handleFileRenamed(file, oldPath);
        }
      })
    );
  }

  /**
   * 获取目标文件夹内的所有 Markdown 文件
   * targetFolder 为空字符串时表示整个 vault
   */
  private getTargetFiles(): TFile[] {
    if (!this.targetFolder) {
      return this.plugin.app.vault.getMarkdownFiles();
    }
    return this.plugin.app.vault.getMarkdownFiles().filter((f) =>
      f.path.startsWith(this.targetFolder + "/") || f.path === this.targetFolder
    );
  }

  /**
   * 判断文件是否在目标文件夹内
   * targetFolder 为空字符串时表示整个 vault
   */
  private isTargetFile(file: TFile): boolean {
    if (!this.targetFolder) {
      return true;
    }
    return file.path.startsWith(this.targetFolder + "/") || file.path === this.targetFolder;
  }

  /**
   * 处理单个文件，提取日期数据
   */
  private processFile(file: TFile): void {

    const cache = this.plugin.app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    if (!fm) return;

    let rawDates = fm[this.targetField];
    if (!rawDates) return;
    if (!Array.isArray(rawDates)) rawDates = [rawDates];

    // 获取创建日期（使用配置的创建时间字段）
    let createdDate: string | null = null;
    const createdField = this.plugin.settings.createdField;
    if (fm[createdField]) {
      createdDate = parseDateString(fm[createdField]);
    }
    if (!createdDate) {
      createdDate = new Date(file.stat.ctime).toISOString().split("T")[0];
    }

    for (const d of rawDates) {
      if (!d) continue;
      let dateStr: string;
      let modifiedTime: number;
      try {
        const str = String(d);
        // 直接从字符串提取日期部分，避免时区转换问题
        // 支持: 2026-04-15, 2026-04-15T10:30:00, 2026-04-15T10:30:00Z
        const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!isoMatch) continue;
        const [, year, month, day] = isoMatch;
        dateStr = `${year}-${month}-${day}`;
        // 使用原始字符串解析时间戳（用于排序）
        const dateObj = new Date(str);
        if (isNaN(dateObj.getTime())) continue;
        modifiedTime = dateObj.getTime();
      } catch {
        continue;
      }

      const year = parseInt(dateStr.split("-")[0]);
      if (isNaN(year)) continue;

      // 初始化年份缓存
      if (!this.cache[year]) {
        this.cache[year] = {};
      }
      if (!this.cache[year][dateStr]) {
        this.cache[year][dateStr] = [];
      }

      // 检查是否已存在同一文件的记录（同一天去重）
      const existingIndex = this.cache[year][dateStr].findIndex(
        (entry) => entry.path === file.path
      );

      if (existingIndex !== -1) {
        // 已存在，保留修改时间较晚的记录
        if (modifiedTime > this.cache[year][dateStr][existingIndex].modifiedTime) {
          this.cache[year][dateStr][existingIndex] = {
            path: file.path,
            name: file.basename,
            createdDate,
            modifiedTime,
          };
        }
      } else {
        // 添加到缓存
        this.cache[year][dateStr].push({
          path: file.path,
          name: file.basename,
          createdDate,
          modifiedTime,
        });
      }

    }
  }

  /**
   * 从缓存中移除文件的所有记录
   */
  private removeFileFromCache(filePath: string): void {
    for (const year in this.cache) {
      for (const dateStr in this.cache[year]) {
        this.cache[year][dateStr] = this.cache[year][dateStr].filter(
          (n) => n.path !== filePath
        );

        // 清理空数组
        if (this.cache[year][dateStr].length === 0) {
          delete this.cache[year][dateStr];
        }
      }

      // 清理空年份
      if (Object.keys(this.cache[year]).length === 0) {
        delete this.cache[year];
      }
    }
  }

  /**
   * 处理文件修改
   */
  private handleFileChanged(file: TFile): void {
    this.removeFileFromCache(file.path);
    this.processFile(file);
    this.notifyUpdate();
  }

  private handleFileCreated(file: TFile): void {
    this.processFile(file);
    this.notifyUpdate();
  }

  private handleFileDeleted(file: TFile): void {
    this.removeFileFromCache(file.path);
    this.notifyUpdate();
  }

  private handleFileRenamed(file: TFile, oldPath: string): void {
    this.removeFileFromCache(oldPath);
    this.processFile(file);
    this.notifyUpdate();
  }

  /**
   * 通知所有热力图视图更新
   */
  private notifyUpdate(): void {
    // 使用防抖避免频繁更新
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = window.setTimeout(() => {
      this.plugin.refreshViews();
    }, 300);
  }

  /**
   * 获取指定年份的数据
   */
  getYearData(year: number): YearData {
    return this.cache[year] || {};
  }

  /**
   * 检查缓存是否已初始化
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * 等待缓存初始化完成
   */
  async waitForReady(): Promise<void> {
    if (this.isInitialized) return;
    await this.initialize();
  }

  /**
   * 清理资源（在重新初始化前调用）
   */
  private cleanup(): void {
    // 清理防抖定时器
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    // 设置取消标志，中断正在进行的初始化
    this.initCancelled = true;

    // 取消所有已注册的事件监听（Component 基类方法）
    // 注意：Obsidian 的 Component 类会在 unload 时自动清理事件
    // 但我们需要在重新初始化前手动清理，避免重复注册
    // @ts-ignore - unload 是受保护的方法
    if (this.isInitialized) {
      // 只有在完成初始化后才需要 unload，正在进行的初始化会被 initCancelled 中断
      // @ts-ignore
      this.unload();
      // @ts-ignore - 重新加载 Component 以重置事件注册状态
      this.load();
    }
  }

  /**
   * 更新设置（当用户在设置面板修改时调用）
   */
  updateSettings(targetField: string, targetFolder: string): void {
    if (this.targetField !== targetField || this.targetFolder !== targetFolder) {
      this.targetField = targetField;
      this.targetFolder = targetFolder;

      // 清理资源
      this.cleanup();

      // 清空缓存并重新初始化
      this.cache = {};
      this.isInitialized = false;
      this.initPromise = null;
      this.initialize();
    }
  }

  /**
   * 强制刷新缓存
   */
  async forceRefresh(): Promise<void> {
    this.cleanup();
    this.cache = {};
    this.isInitialized = false;
    this.initPromise = null;
    await this.initialize();
  }
}
