import { MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";
import type NoteHeatmapPlugin from "./main";
import { HeatmapRenderer } from "./heatmapRenderer";

/**
 * Встроенная в заметку тепловая карта (codeblock).
 *
 * Синтаксис:
 * ```note-heatmap
 * year: 2026
 * ```
 *
 * Опциональный параметр `year` задаёт год, с которого начинается отображение.
 */
export class EmbeddedHeatmap extends MarkdownRenderChild {
  plugin: NoteHeatmapPlugin;
  renderer: HeatmapRenderer;
  private year: number | undefined;

  constructor(plugin: NoteHeatmapPlugin, el: HTMLElement, source: string) {
    super(el);
    this.plugin = plugin;
    this.year = this.parseYear(source);
    this.renderer = new HeatmapRenderer(plugin, this.year);
  }

  onload(): void {
    this.plugin.embeddedHeatmaps.add(this.renderer);
    this.register(() => {
      this.plugin.embeddedHeatmaps.delete(this.renderer);
    });
    void this.render();
  }

  /**
   * Разобрать год из содержимого codeblock (опционально).
   */
  private parseYear(source: string): number | undefined {
    if (!source) return undefined;
    const match = source.match(/^\s*year\s*[:=]\s*(\d{4})\s*$/im);
    if (!match) return undefined;
    const year = parseInt(match[1], 10);
    if (isNaN(year)) return undefined;
    return year;
  }

  private async render(): Promise<void> {
    try {
      await this.plugin.dataCache.waitForReady();
      this.renderer.render(this.containerEl);
    } catch (err) {
      console.error("[NoteHeatmap] Failed to render embedded heatmap:", err);
    }
  }
}

/**
 * Регистрирует codeblock-процессор `note-heatmap`.
 */
export function registerEmbedCodeblock(plugin: NoteHeatmapPlugin): void {
  plugin.registerMarkdownCodeBlockProcessor(
    "note-heatmap",
    (source, el, ctx) => {
      const embedded = new EmbeddedHeatmap(plugin, el, source);
      ctx.addChild(embedded);
    }
  );
}

/**
 * Регистрирует встроенные хитмапы для автообновления при изменении данных.
 */
export function refreshEmbeddedHeatmaps(plugin: NoteHeatmapPlugin): void {
  const registry = (plugin as unknown as { embeddedHeatmaps: Set<HeatmapRenderer> }).embeddedHeatmaps;
  if (!registry) return;
  for (const renderer of registry) {
    renderer.rerender();
  }
}