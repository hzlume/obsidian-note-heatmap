import { ItemView, WorkspaceLeaf } from "obsidian";
import type NoteHeatmapPlugin from "./main";
import { HeatmapRenderer } from "./heatmapRenderer";
import { t } from "./i18n";

export const HEATMAP_VIEW_TYPE = "note-heatmap-view";

export class HeatmapView extends ItemView {
  plugin: NoteHeatmapPlugin;
  private renderer: HeatmapRenderer | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: NoteHeatmapPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return HEATMAP_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t("view.title");
  }

  getIcon(): string {
    return "calendar-with-checkmark";
  }

  async onOpen(): Promise<void> {
    // Obsidian 会自动加载 styles.css，无需手动注入

    try {
      await this.plugin.dataCache.waitForReady();
      setTimeout(() => {
        this.render();
      }, 0);
    } catch (err) {
      console.error("[NoteHeatmap] Failed to wait for cache initialization:", err);
      this.render();
    }
  }

  async onClose(): Promise<void> {
    this.renderer = null;
  }

  render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    if (!this.renderer) {
      this.renderer = new HeatmapRenderer(this.plugin);
    }
    this.renderer.render(container);
  }
}