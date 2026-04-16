import { Plugin, WorkspaceLeaf } from "obsidian";
import { HeatmapView, HEATMAP_VIEW_TYPE } from "./heatmapView";
import { HeatmapSettingTab } from "./settingTab";
import { DEFAULT_SETTINGS, HeatmapSettings } from "./settings";
import { DataCache } from "./dataCache";
import { GitService } from "./gitService";
import { t } from "./i18n";

export default class NoteHeatmapPlugin extends Plugin {
  settings: HeatmapSettings;
  dataCache: DataCache;
  gitService: GitService;

  async onload(): Promise<void> {
    await this.loadSettings();

    // 初始化数据缓存
    this.dataCache = new DataCache(this);
    this.addChild(this.dataCache);

    // 初始化 Git 服务
    this.gitService = new GitService(this);

    // 等 Obsidian 完全准备好后再初始化缓存和检测依赖插件
    // 确保 metadataCache 已经解析完所有文件，其他插件已加载
    this.app.workspace.onLayoutReady(() => {
      // 检测依赖插件，如果都安装了则默认开启 git diff
      this.checkAndAutoEnableGitDiff();

      this.dataCache.initialize().catch((err) => {
        console.error("[NoteHeatmap] 缓存初始化失败:", err);
      });
    });

    // 注册视图
    this.registerView(
      HEATMAP_VIEW_TYPE,
      (leaf) => new HeatmapView(leaf, this)
    );

    // 左侧 ribbon 图标
    this.addRibbonIcon("calendar-with-checkmark", "Note Heatmap", () => {
      this.activateView();
    });

    // 命令：打开热力图
    this.addCommand({
      id: "open-note-heatmap",
      name: t("commands.openView"),
      callback: () => {
        this.activateView();
      },
    });

    // 命令：刷新热力图
    this.addCommand({
      id: "refresh-note-heatmap",
      name: t("commands.refreshView"),
      callback: () => {
        this.refreshViews();
      },
    });

    // 设置面板
    this.addSettingTab(new HeatmapSettingTab(this.app, this));
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(HEATMAP_VIEW_TYPE);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);

    // 更新缓存设置
    if (this.dataCache) {
      this.dataCache.updateSettings(
        this.settings.targetField,
        this.settings.targetFolder
      );
    }

    // 刷新视图
    this.refreshViews();
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(HEATMAP_VIEW_TYPE);

    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({ type: HEATMAP_VIEW_TYPE, active: true });
    }

    workspace.revealLeaf(leaf);
  }

  /**
   * 检查指定插件是否已安装并启用
   */
  private isPluginInstalled(pluginId: string): boolean {
    try {
      // @ts-ignore
      const plugin = this.app.plugins.plugins[pluginId];
      return plugin != null;
    } catch {
      return false;
    }
  }

  /**
   * 检测依赖插件，如果都安装了则自动开启 git diff
   * 需要在 onLayoutReady 后调用，确保其他插件已加载
   */
  private async checkAndAutoEnableGitDiff(): Promise<void> {
    if (this.settings.enableGitDiff) {
      return; // 用户已手动开启，无需处理
    }

    const hasGitPlugin = this.isPluginInstalled('obsidian-git');
    const hasVHDPlugin = this.isPluginInstalled('obsidian-version-history-diff');

    if (hasGitPlugin && hasVHDPlugin) {
      console.log('[NoteHeatmap] 检测到依赖插件已安装，自动开启 Git Diff 功能');
      this.settings.enableGitDiff = true;
      await this.saveSettings();
    }
  }

  /**
   * 刷新所有热力图视图
   */
  refreshViews(): void {
    const leaves = this.app.workspace.getLeavesOfType(HEATMAP_VIEW_TYPE);
    for (const leaf of leaves) {
      const view = leaf.view as HeatmapView;
      if (view instanceof HeatmapView) {
        view.render();
      }
    }
  }

  /**
   * 强制刷新缓存并更新视图
   */
  async forceRefresh(): Promise<void> {
    if (this.dataCache) {
      await this.dataCache.forceRefresh();
      this.refreshViews();
    }
  }
}
