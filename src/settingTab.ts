import { App, PluginSettingTab, Setting } from "obsidian";
import type NoteHeatmapPlugin from "./main";
import { t, tArray } from "./i18n";

/** 创建可点击的外部链接元素 */
function createLink(text: string, href: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.textContent = text;
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  return a;
}

/** 周期笔记类型 */
type PeriodicNoteType = "daily" | "monthly" | "yearly";

export class HeatmapSettingTab extends PluginSettingTab {
  plugin: NoteHeatmapPlugin;

  constructor(app: App, plugin: NoteHeatmapPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(t("settings.title")).setHeading();

    this.renderBasicSettings(containerEl);
    this.renderColorSettings(containerEl);
    this.renderPeriodicNoteSettings(containerEl);
    this.renderGitDiffSettings(containerEl);
    this.renderResetButton(containerEl);
  }

  /** 基础设置 */
  private renderBasicSettings(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t("settings.targetField.name"))
      .setDesc(t("settings.targetField.desc"))
      .addText(text =>
        text
          .setPlaceholder("last-modified")
          .setValue(this.plugin.settings.targetField)
          .onChange(async (value) => {
            this.plugin.settings.targetField = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName(t("settings.createdField.name"))
      .setDesc(t("settings.createdField.desc"))
      .addText(text =>
        text
          .setPlaceholder("created")
          .setValue(this.plugin.settings.createdField)
          .onChange(async (value) => {
            this.plugin.settings.createdField = value.trim();
            await this.plugin.saveSettings();
            this.plugin.dataCache.updateSettings(this.plugin.settings.targetField, this.plugin.settings.targetFolder);
          })
      );

    new Setting(containerEl)
      .setName(t("settings.targetFolder.name"))
      .setDesc(t("settings.targetFolder.desc"))
      .addText(text =>
        text
          .setPlaceholder("")
          .setValue(this.plugin.settings.targetFolder)
          .onChange(async (value) => {
            this.plugin.settings.targetFolder = value.trim().replace(/\/$/, "");
            await this.plugin.saveSettings();
          })
      );
  }

  /** 颜色设置 */
  private renderColorSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("colors.title")).setHeading();
    containerEl.createEl("p", {
      text: t("colors.desc"),
      cls: "setting-item-description",
    });

    const colorLabels = tArray("colors.labels");
    this.plugin.settings.colors.forEach((color, index) => {
      new Setting(containerEl)
        .setName(`${t("colors.title")} ${index + 1}：${colorLabels[index]}`)
        .addColorPicker(picker =>
          picker
            .setValue(color)
            .onChange(async (value) => {
              this.plugin.settings.colors[index] = value;
              await this.plugin.saveSettings();
            })
        );
    });
  }

  /** 周期笔记设置 */
  private renderPeriodicNoteSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("periodicNotes.title")).setHeading();
    this.injectStyles();

    const periodicTypes: PeriodicNoteType[] = ["daily", "monthly", "yearly"];
    for (const type of periodicTypes) {
      this.renderPeriodicNoteGroup(containerEl, type);
    }
  }

  /** 渲染单个周期笔记组 */
  private renderPeriodicNoteGroup(containerEl: HTMLElement, type: PeriodicNoteType): void {
    const enableKey = `enable${this.capitalize(type)}Note` as keyof typeof this.plugin.settings;
    const folderKey = `${type}NoteFolder` as keyof typeof this.plugin.settings;
    const formatKey = `${type}NoteFormat` as keyof typeof this.plugin.settings;
    const isEnabled = this.plugin.settings[enableKey] as boolean;

    // 开关
    new Setting(containerEl)
      .setName(t(`periodicNotes.${type}.name`))
      .setDesc(t(`periodicNotes.${type}.desc`))
      .setClass("heatmap-setting-group-header")
      .addToggle(toggle =>
        toggle
          .setValue(isEnabled)
          .onChange(async (value) => {
            (this.plugin.settings[enableKey] as boolean) = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    // 路径配置（仅在启用时显示）
    if (isEnabled) {
      this.renderTextSetting(containerEl, `periodicNotes.${type}.folder`, 
        this.plugin.settings[folderKey] as string,
        (value) => { (this.plugin.settings[folderKey] as string) = value.trim().replace(/\/$/, ""); }
      );
      this.renderTextSetting(containerEl, `periodicNotes.${type}.format`,
        this.plugin.settings[formatKey] as string,
        (value) => { (this.plugin.settings[formatKey] as string) = value.trim().replace(/^\//, ""); }
      );
    }
  }

  /** 渲染文本设置项 */
  private renderTextSetting(
    containerEl: HTMLElement, 
    key: string, 
    value: string, 
    onChange: (value: string) => void
  ): void {
    new Setting(containerEl)
      .setName(t(`${key}.name`))
      .setDesc(t(`${key}.desc`))
      .setClass("heatmap-setting-subitem")
      .addText(text =>
        text
          .setPlaceholder(t(`${key}.placeholder`))
          .setValue(value)
          .onChange(async (newValue) => {
            onChange(newValue);
            await this.plugin.saveSettings();
          })
      );
  }

  /** 注入样式 - 已迁移到 styles.css */
  private injectStyles(): void {
    // 样式已在 styles.css 中定义，此方法保留供未来扩展使用
  }

  /** 首字母大写 */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Git Diff 设置 */
  private renderGitDiffSettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("gitDiff.title")).setHeading();

    const gitAvailable = this.plugin.gitService?.isGitPluginAvailable() ?? false;
    const vhdAvailable = !!(this.app as any).plugins?.plugins?.["obsidian-version-history-diff"];
    const allDependenciesMet = gitAvailable && vhdAvailable;

    const gitDiffDesc = this.buildGitDiffDesc(gitAvailable, vhdAvailable, allDependenciesMet);

    new Setting(containerEl)
      .setName(t("gitDiff.enable.name"))
      .setDesc(gitDiffDesc)
      .addToggle(toggle =>
        toggle
          .setValue(allDependenciesMet && this.plugin.settings.enableGitDiff)
          .setDisabled(!allDependenciesMet)
          .onChange(async (value) => {
            if (value && !allDependenciesMet) {
              toggle.setValue(false);
              return;
            }
            this.plugin.settings.enableGitDiff = value;
            await this.plugin.saveSettings();
          })
      );
  }

  /** 构建 Git Diff 描述 */
  private buildGitDiffDesc(gitAvailable: boolean, vhdAvailable: boolean, allMet: boolean): DocumentFragment {
    const frag = document.createDocumentFragment();
    
    if (allMet) {
      frag.append(t("gitDiff.enable.descAllAvailable"));
    } else if (!gitAvailable && !vhdAvailable) {
      frag.append(t("gitDiff.enable.descMissingBoth"), " ");
      frag.append(createLink(t("gitDiff.enable.pluginObsidianGit"), "https://github.com/Vinzent03/obsidian-git"));
      frag.append(t("gitDiff.enable.separator"));
      frag.append(createLink(t("gitDiff.enable.pluginVHD"), "https://github.com/kometenstaub/obsidian-version-history-diff"));
    } else if (!gitAvailable) {
      frag.append(t("gitDiff.enable.descMissingObsidianGit"), " ");
      frag.append(createLink(t("gitDiff.enable.pluginObsidianGit"), "https://github.com/Vinzent03/obsidian-git"));
    } else {
      frag.append(t("gitDiff.enable.descMissingVHD"), " ");
      frag.append(createLink(t("gitDiff.enable.pluginVHD"), "https://github.com/kometenstaub/obsidian-version-history-diff"));
    }
    
    return frag;
  }

  /** 重置按钮 */
  private renderResetButton(containerEl: HTMLElement): void {
    containerEl.createEl("hr");
    new Setting(containerEl)
      .setName(t("reset.name"))
      .addButton(btn =>
        btn
          .setButtonText(t("reset.button"))
          .setWarning()
          .onClick(async () => {
            const { DEFAULT_SETTINGS } = await import("./settings");
            Object.assign(this.plugin.settings, DEFAULT_SETTINGS);
            await this.plugin.saveSettings();
            this.display();
          })
      );
  }
}
