import { TFile, Notice } from "obsidian";
import type NoteHeatmapPlugin from "./main";
import type { NoteEntry } from "./dataCache";
import type { DayDiffResult } from "./gitService";
import { t, tArray } from "./i18n";
import { selectCommitsInVHD } from "./vhdUtils";

const BOX_SIZE = 12;
const GAP = 3;
const COLUMN_WIDTH = BOX_SIZE + GAP;

/**
 * Переиспользуемый рендерер тепловой карты.
 * Может рендериться в любой HTMLElement-контейнер:
 * - в отдельный view (HeatmapView)
 * - в codeblock внутри заметки (note-heatmap)
 */
export class HeatmapRenderer {
  plugin: NoteHeatmapPlugin;
  private tooltipDiv: HTMLElement | null = null;
  private container: HTMLElement | null = null;
  private currentYear: number;

  constructor(plugin: NoteHeatmapPlugin, year?: number) {
    this.plugin = plugin;
    this.currentYear = year ?? new Date().getFullYear();
  }

  /**
   * Рендерит тепловую карту в указанный контейнер.
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.empty();
    container.addClass("note-heatmap-container");

    const year = this.currentYear;
    const { colors } = this.plugin.settings;

    // --- 1. 数据准备 ---
    const dataMap = this.plugin.dataCache.getYearData(year);
    const monthlyData = this.prepareMonthlyData(dataMap);
    const monthOffsets = this.calcMonthOffsets(year);

    // --- 2. 构建 DOM ---
    const wrapper = this.createWrapper(container);
    const header = this.renderHeader(wrapper, year);
    const { calGrid, monthElements } = this.renderHeatmap(wrapper, year, colors, dataMap, monthOffsets);
    const resPanel = this.renderResultPanel(wrapper);

    // --- 3. 绑定事件 ---
    this.bindHeaderEvents(header, year);
    this.bindMonthEvents(monthElements, year, monthlyData, resPanel);
    this.bindGridEvents(calGrid, dataMap, resPanel);
  }

  /**
   * Перерендерить в сохранённый контейнер (например при обновлении данных).
   */
  rerender(): void {
    if (this.container) {
      this.render(this.container);
    }
  }

  /**
   * Форматирование пути по шаблону (YYYY/MM/DD + защита [text]).
   */
  private formatDatePath(format: string, year: string | number, month: string | number, day?: string | number): string {
    const m = window.moment();
    m.year(Number(year));
    m.month(Number(month) - 1);
    if (day !== undefined) {
      m.date(Number(day));
    }
    return m.format(format);
  }

  /** Создание обёртки */
  private createWrapper(container: HTMLElement): HTMLElement {
    const wrapper = container.createDiv({ cls: "heatmap-plugin-wrapper note-heatmap-flex-col note-heatmap-width-full" });
    return wrapper;
  }

  /** Рендер шапки (навигация по годам) */
  private renderHeader(wrapper: HTMLElement, year: number): HTMLElement {
    const header = wrapper.createDiv({ cls: "heatmap-header" });

    const yearNav = header.createDiv({ cls: "year-nav" });
    yearNav.createEl("button", { cls: "year-nav-btn prev-year", text: "‹", title: t("view.header.prevYear") });
    yearNav.createDiv({ cls: "year-display", text: String(year) });
    yearNav.createEl("button", { cls: "year-nav-btn next-year", text: "›", title: t("view.header.nextYear") });

    header.createEl("button", { cls: "heatmap-refresh-btn", text: t("view.header.refresh") });

    return header;
  }

  /** Рендер сетки тепловой карты */
  private renderHeatmap(
    wrapper: HTMLElement,
    year: number,
    colors: string[],
    dataMap: Record<string, NoteEntry[]>,
    monthOffsets: number[]
  ): { calGrid: HTMLElement; monthElements: HTMLElement[] } {
    const scrollContainer = wrapper.createDiv({ cls: "heatmap-scroll-container" });
    const heatmapSection = scrollContainer.createDiv({ cls: "heatmap-section" });

    const monthContainer = heatmapSection.createDiv({ cls: "month-container" });
    const monthElements: HTMLElement[] = [];
    const monthNames = tArray("view.months");

    for (let i = 0; i < 12; i++) {
      const mDiv = monthContainer.createDiv({ cls: "m-name" });
      mDiv.setCssStyles({ left: `${monthOffsets[i]}px` });
      mDiv.setText(monthNames[i]);
      mDiv.dataset.monthIndex = String(i);
      monthElements.push(mDiv);
    }

    const calBody = heatmapSection.createDiv({ cls: "cal-body" });
    const wLabs = calBody.createDiv({ cls: "w-labs" });
    const weekDays = tArray("view.weekdays");
    for (const w of weekDays) {
      wLabs.createDiv({ cls: "w-lab", text: w });
    }

    const calGrid = calBody.createDiv({ cls: "cal-grid" });
    this.buildCalendarGrid(calGrid, year, colors, dataMap);

    return { calGrid, monthElements };
  }

  /** Рендер панели результатов (начальное состояние) */
  private renderResultPanel(wrapper: HTMLElement): HTMLElement {
    const resPanel = wrapper.createDiv({ attr: { id: "res-panel" } });
    const hint = resPanel.createEl("span", { cls: "note-heatmap-empty" });
    hint.setText(t("resultPanel.hint"));
    return resPanel;
  }

  /** Привязка событий шапки */
  private bindHeaderEvents(header: HTMLElement, year: number): void {
    const currentYear = new Date().getFullYear();

    const prevBtn = header.querySelector(".prev-year") as HTMLElement;
    const nextBtn = header.querySelector(".next-year") as HTMLElement;
    const yearDisplay = header.querySelector(".year-display") as HTMLElement;
    const refreshBtn = header.querySelector(".heatmap-refresh-btn") as HTMLElement;

    if (year >= currentYear) {
      (nextBtn as HTMLButtonElement).disabled = true;
    }

    prevBtn.addEventListener("click", () => {
      this.currentYear--;
      this.rerender();
    });

    nextBtn.addEventListener("click", () => {
      if (this.currentYear < currentYear) {
        this.currentYear++;
        this.rerender();
      }
    });

    if (this.plugin.settings.enableYearlyNote) {
      yearDisplay.addClass("clickable");
      yearDisplay.title = t("view.header.openYearlyNote", { year: String(year) });
      this.bindYearlyNoteHover(yearDisplay, year);
      yearDisplay.addEventListener("click", () => {
        void this.openPeriodicNote("yearly", year);
      });
    }

    refreshBtn.addEventListener("click", () => {
      void this.plugin.forceRefresh().then(() => this.rerender());
    });
  }

  /** Ховер-превью годовой заметки */
  private bindYearlyNoteHover(yearDisplay: HTMLElement, year: number): void {
    const yearStr = String(year);
    let filePath = this.formatDatePath(this.plugin.settings.yearlyNoteFormat, yearStr, "01", "01");
    if (this.plugin.settings.yearlyNoteFolder) {
      filePath = `${this.plugin.settings.yearlyNoteFolder}/${filePath}`;
    }
    if (!filePath.endsWith(".md")) {
      filePath += ".md";
    }

    yearDisplay.addEventListener("mouseover", (e) => {
      this.plugin.app.workspace.trigger("hover-link", {
        event: e,
        source: "preview",
        hoverParent: yearDisplay,
        targetEl: yearDisplay,
        linktext: filePath,
        sourcePath: "",
      });
    });
  }

  /** Привязка событий месяцев */
  private bindMonthEvents(
    monthElements: HTMLElement[],
    year: number,
    monthlyData: { totals: number[]; notes: NoteEntry[][]; newCounts: number[] },
    resPanel: HTMLElement
  ): void {
    const { totals, notes, newCounts } = monthlyData;

    for (let i = 0; i < 12; i++) {
      const el = monthElements[i];
      const tooltipText = `${year}-M${String(i + 1).padStart(2, "0")} ${t("view.tooltip.edits", { count: totals[i] })}, ${t("view.tooltip.new", { count: newCounts[i] })}`;

      el.addEventListener("mouseenter", () => this.showTooltip(el, tooltipText));
      el.addEventListener("mouseleave", () => this.hideTooltip());
      el.addEventListener("click", () => {
        const titleText = `${year}-M${String(i + 1).padStart(2, "0")}`;
        this.displayNotesList(resPanel, titleText, notes[i], i, year, () => this.resetPanel(resPanel));
      });
    }
  }

  /** Привязка кликов по ячейкам сетки */
  private bindGridEvents(
    calGrid: HTMLElement,
    dataMap: Record<string, NoteEntry[]>,
    resPanel: HTMLElement
  ): void {
    calGrid.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const box = target.closest(".h-box");
      if (!(box instanceof HTMLElement) || !box.dataset.date) return;

      calGrid.querySelectorAll(".h-box.active").forEach(b => b.removeClass("active"));
      box.addClass("active");

      const dateStr = box.dataset.date;
      const notes = dataMap[dateStr] || [];
      this.displayDayPanel(resPanel, dateStr, notes, dataMap, () => this.resetPanel(resPanel));
    });
  }

  /** Показать тултип */
  private showTooltip(el: HTMLElement, text: string): void {
    if (!this.tooltipDiv) {
      this.tooltipDiv = document.createElement("div");
      this.tooltipDiv.className = "heatmap-tooltip note-heatmap-tooltip";
      document.body.appendChild(this.tooltipDiv);
    }
    this.tooltipDiv.textContent = text;
    const rect = el.getBoundingClientRect();
    this.tooltipDiv.setCssStyles({
      left: `${rect.left}px`,
      top: `${rect.bottom + 5}px`
    });
    this.tooltipDiv.addClass("visible");
  }

  /** Скрыть тултип */
  private hideTooltip(): void {
    if (this.tooltipDiv) this.tooltipDiv.removeClass("visible");
  }

  /** Сброс панели результатов */
  private resetPanel(resPanel: HTMLElement): void {
    resPanel.empty();
    const span = resPanel.createEl("span", { cls: "note-heatmap-empty" });
    span.setText(t("resultPanel.hint"));
  }

  /** Открыть diff в VHD */
  private async openInVHD(note: NoteEntry, dateStr?: string, yearMonth?: string): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(note.path);
    if (!(file instanceof TFile)) {
      new Notice(t("git.noCommits"));
      return;
    }

    try {
      // @ts-ignore
      const vhdPlugin = this.plugin.app.plugins.plugins['obsidian-version-history-diff'];
      if (!vhdPlugin) {
        new Notice(t("git.vhdNotInstalled"));
        return;
      }

      let diff: DayDiffResult | null = null;
      if (dateStr) {
        diff = await this.plugin.gitService.getDayDiff(file, dateStr);
      } else if (yearMonth) {
        diff = await this.plugin.gitService.getMonthDiff(file, yearMonth);
      }

      vhdPlugin.openGitDiffModal(file);

      if (diff?.commits && diff.commits.length > 0) {
        setTimeout(() => {
          selectCommitsInVHD(diff.commits, diff.previousCommit);
        }, 500);
      }
    } catch (err) {
      console.error('[NoteHeatmap] 打开 Version History Diff 失败:', err);
      new Notice(t("git.vhdOpenFailed"));
    }
  }

  private createInternalLink(text: string, path: string): HTMLAnchorElement {
    const a = document.createElement("a");
    a.className = "res-link internal-link";
    a.textContent = text;
    a.setAttribute("data-href", path);
    a.setAttribute("href", path);
    a.addEventListener("click", (mouseEvt) => {
      mouseEvt.preventDefault();
      const useNewLeaf = mouseEvt.ctrlKey || mouseEvt.metaKey;
      void this.plugin.app.workspace.openLinkText(path, "", useNewLeaf);
    });
    a.addEventListener("mouseover", (evt) => {
      const target = evt.target as HTMLElement;
      this.plugin.app.workspace.trigger("hover-link", {
        event: evt,
        source: "preview",
        hoverParent: target,
        targetEl: target,
        linktext: path,
        sourcePath: "",
      });
    });
    return a;
  }

  private displayNotesList(
    resPanel: HTMLElement,
    titleText: string,
    notesArray: NoteEntry[],
    monthIndex: number,
    year: number,
    onClose: () => void
  ): void {
    resPanel.empty();
    resPanel.scrollTop = 0;

    const { newCount, monthStr } = this.calcMonthStats(notesArray, monthIndex, year);

    this.renderPanelHeader(resPanel, titleText, notesArray.length, newCount, onClose, "month", year, monthStr);

    if (notesArray.length === 0) {
      this.renderEmptyMessage(resPanel, t("resultPanel.noEditsMonth"));
      return;
    }

    const noteModDaysMap = this.buildNoteModDaysMap(year, monthIndex);

    const { searchQuery, sortKey, sortDesc } = this.renderSearchAndSortControls(resPanel, () => {
      renderList(searchQuery.value, sortKey.value, sortDesc.value);
    });

    const listContainer = resPanel.createDiv({ cls: "note-heatmap-list-container" });
    const ul = listContainer.createEl("ul", { cls: "note-heatmap-list" });

    const renderList = (search: string, key: 'name' | 'modifiedTime' | 'activeDays', desc: boolean) => {
      const filtered = this.filterNotes(notesArray, search);
      const sorted = this.sortNotes(filtered, key, desc, noteModDaysMap);
      this.renderNoteList(ul, sorted, year, monthIndex, noteModDaysMap, (note) => {
        const yearMonth = `${year}-${monthStr}`;
        return this.openInVHD(note, undefined, yearMonth);
      });
    };

    renderList(searchQuery.value, sortKey.value, sortDesc.value);
  }

  /** Статистика месяца */
  private calcMonthStats(notesArray: NoteEntry[], monthIndex: number, year: number): { newCount: number; monthStr: string } {
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
    const newCount = notesArray.filter((n) => {
      if (!n.createdDate) return false;
      const cd = new Date(n.createdDate);
      return cd >= firstDayOfMonth && cd <= lastDayOfMonth;
    }).length;
    return { newCount, monthStr: String(monthIndex + 1).padStart(2, "0") };
  }

  /** Карта «заметка → число активных дней» за месяц */
  private buildNoteModDaysMap(year: number, monthIndex: number): Map<string, number> {
    const yearData = this.plugin.dataCache.getYearData(year);
    const noteModDaysMap = new Map<string, number>();
    for (const [dateStr, notes] of Object.entries(yearData)) {
      const dateMonth = parseInt(dateStr.split("-")[1]) - 1;
      if (dateMonth !== monthIndex) continue;
      for (const note of notes) {
        noteModDaysMap.set(note.path, (noteModDaysMap.get(note.path) || 0) + 1);
      }
    }
    return noteModDaysMap;
  }

  /** Заголовок панели (месяц/день) */
  private renderPanelHeader(
    resPanel: HTMLElement,
    titleText: string,
    totalCount: number,
    newCount: number,
    onClose: () => void,
    type: "month" | "day",
    year: number,
    monthStr: string,
    dayStr?: string
  ): void {
    const titleDiv = resPanel.createDiv({ cls: "note-heatmap-title-row" });

    const leftDiv = titleDiv.createDiv({ cls: "title-left" });

    if ((type === "month" && this.plugin.settings.enableMonthlyNote) ||
        (type === "day" && this.plugin.settings.enableDailyNote)) {
      const format = type === "month" ? this.plugin.settings.monthlyNoteFormat : this.plugin.settings.dailyNoteFormat;
      const folder = type === "month" ? this.plugin.settings.monthlyNoteFolder : this.plugin.settings.dailyNoteFolder;
      const notePath = this.buildNotePath(format, folder, year, monthStr, dayStr);
      const link = this.createInternalLink(titleText, notePath);
      leftDiv.appendChild(link);
    } else {
      leftDiv.createEl("span", { text: titleText });
    }

    const modCountSpan = leftDiv.createEl("span", { cls: "mod-count" });
    if (totalCount === 0 && type === "day") {
      modCountSpan.setText(t("view.tooltip.noEdits"));
    } else {
      modCountSpan.setText(t("resultPanel.totalEdits", { total: totalCount, new: newCount }));
    }

    const closeBtn = titleDiv.createEl("button", { cls: "close-btn", text: "✕" });
    closeBtn.setAttribute("aria-label", t("resultPanel.close"));
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClose();
    });
  }

  /** Построить путь заметки */
  private buildNotePath(format: string, folder: string, year: number, monthStr: string, dayStr?: string): string {
    const path = this.formatDatePath(format, String(year), monthStr, dayStr || "01");
    const fullPath = folder ? `${folder}/${path}` : path;
    return fullPath.endsWith(".md") ? fullPath : `${fullPath}.md`;
  }

  /** Пустое сообщение */
  private renderEmptyMessage(resPanel: HTMLElement, message: string): void {
    const emptyDiv = resPanel.createDiv({ cls: "note-heatmap-empty" });
    emptyDiv.setText(message);
  }

  /** Поиск и сортировка */
  private renderSearchAndSortControls(
    resPanel: HTMLElement,
    onChange: () => void
  ): {
    searchQuery: { value: string };
    sortKey: { value: 'name' | 'modifiedTime' | 'activeDays' };
    sortDesc: { value: boolean };
  } {
    const state = {
      searchQuery: { value: "" },
      sortKey: { value: 'modifiedTime' as 'name' | 'modifiedTime' | 'activeDays' },
      sortDesc: { value: true }
    };

    const searchDiv = resPanel.createDiv({ cls: "note-heatmap-search-container" });

    const searchInput = searchDiv.createEl("input", { cls: "note-heatmap-search-input" });
    searchInput.type = "text";
    searchInput.placeholder = t("resultPanel.searchPlaceholder");
    searchInput.addEventListener("input", (e) => {
      state.searchQuery.value = (e.target as HTMLInputElement).value;
      onChange();
    });

    const sortDiv = resPanel.createDiv({ cls: "note-heatmap-sort-container" });

    const sortButtons: Map<string, HTMLButtonElement> = new Map();

    const updateSortButtons = () => {
      sortButtons.forEach((btn, key) => {
        const isActive = state.sortKey.value === key;
        const arrow = isActive ? (state.sortDesc.value ? "↓" : "↑") : "";
        btn.setText(`${t(`resultPanel.sortBy.${key === 'modifiedTime' ? 'lastModified' : key}`)} ${arrow}`.trim());
        if (isActive) {
          btn.addClass("active");
        } else {
          btn.removeClass("active");
        }
      });
    };

    const createSortBtn = (key: 'name' | 'modifiedTime' | 'activeDays') => {
      const btn = sortDiv.createEl("button", { cls: "note-heatmap-sort-btn" });
      sortButtons.set(key, btn);

      btn.addEventListener("click", () => {
        if (state.sortKey.value === key) {
          state.sortDesc.value = !state.sortDesc.value;
        } else {
          state.sortKey.value = key;
          state.sortDesc.value = true;
        }
        updateSortButtons();
        onChange();
      });

      return btn;
    };

    createSortBtn("name");
    createSortBtn("activeDays");
    createSortBtn("modifiedTime");
    updateSortButtons();

    return state;
  }

  /** Фильтр заметок */
  private filterNotes(notes: NoteEntry[], query: string): NoteEntry[] {
    if (!query.trim()) return notes;
    const lowerQuery = query.toLowerCase();
    return notes.filter(n => n.name.toLowerCase().includes(lowerQuery));
  }

  /** Сортировка заметок */
  private sortNotes(
    notes: NoteEntry[],
    key: 'name' | 'modifiedTime' | 'activeDays',
    desc: boolean,
    noteModDaysMap: Map<string, number>
  ): NoteEntry[] {
    const sorted = [...notes].sort((a, b) => {
      if (key === 'name') return a.name.localeCompare(b.name);
      if (key === 'activeDays') {
        const daysA = noteModDaysMap.get(a.path) || 1;
        const daysB = noteModDaysMap.get(b.path) || 1;
        return daysA - daysB;
      }
      return a.modifiedTime - b.modifiedTime;
    });
    return desc ? sorted.reverse() : sorted;
  }

  /** Список заметок (для месяца) */
  private renderNoteList(
    ul: HTMLElement,
    notes: NoteEntry[],
    year: number,
    monthIndex: number,
    noteModDaysMap: Map<string, number>,
    onVhdClick: (note: NoteEntry) => Promise<void>
  ): void {
    ul.empty();
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

    notes.forEach((note) => {
      const li = ul.createEl("li", { cls: "res-item note-heatmap-list-item" });

      const leftDiv = li.createDiv({ cls: "note-heatmap-list-item-left" });

      const createdDate = note.createdDate ? new Date(note.createdDate) : null;
      const isNew = createdDate !== null && createdDate >= firstDayOfMonth && createdDate <= lastDayOfMonth;
      const displayName = isNew ? `🆕 ${note.name}` : note.name;
      const a = this.createInternalLink(displayName, note.path);
      a.addClass("note-heatmap-link-text");
      leftDiv.appendChild(a);

      const modDays = noteModDaysMap.get(note.path) || 1;
      const daysSpan = leftDiv.createEl("span", { cls: "note-heatmap-days-badge" });
      daysSpan.setText(t("resultPanel.days", { count: modDays }));

      const modTime = new Date(note.modifiedTime);
      const timeStr = `${String(modTime.getMonth() + 1).padStart(2, "0")}-${String(modTime.getDate()).padStart(2, "0")} ${String(modTime.getHours()).padStart(2, "0")}:${String(modTime.getMinutes()).padStart(2, "0")}`;
      const timeSpan = leftDiv.createEl("span", { cls: "note-heatmap-time" });
      timeSpan.setText(timeStr);

      if (this.plugin.settings.enableGitDiff) {
        const vhdBtn = li.createEl("button", { cls: "diff-btn note-heatmap-vhd-btn", text: t("resultPanel.vhdButton") });
        vhdBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          void onVhdClick(note);
        });
      }
    });
  }

  /** Месячная статистика */
  private prepareMonthlyData(dataMap: Record<string, NoteEntry[]>): {
    totals: number[];
    notes: NoteEntry[][];
    newCounts: number[];
  } {
    const uniqueNotesMap: Map<string, NoteEntry>[] = Array.from({ length: 12 }, () => new Map());
    for (const [dateStr, notes] of Object.entries(dataMap)) {
      const month = parseInt(dateStr.split("-")[1]) - 1;
      if (month >= 0 && month < 12) {
        for (const note of notes) {
          if (!uniqueNotesMap[month].has(note.path)) {
            uniqueNotesMap[month].set(note.path, note);
          }
        }
      }
    }
    const totals = uniqueNotesMap.map((m) => m.size);
    const notes = uniqueNotesMap.map((m) => Array.from(m.values()));
    const newCounts = notes.map((monthNotes, monthIndex) =>
      monthNotes.filter((n) => {
        if (!n.createdDate) return false;
        const m = parseInt(n.createdDate.split("-")[1]) - 1;
        return m === monthIndex;
      }).length
    );
    return { totals, notes, newCounts };
  }

  /** Смещения месяцев */
  private calcMonthOffsets(year: number): number[] {
    const yearStartForOffset = new Date(year, 0, 1);
    const firstSunday = new Date(yearStartForOffset);
    firstSunday.setDate(yearStartForOffset.getDate() - yearStartForOffset.getDay());

    const offsets: number[] = [];
    for (let m = 0; m < 12; m++) {
      const firstDayOfMonth = new Date(year, m, 1);
      const daysSinceFirstSunday = Math.floor(
        (firstDayOfMonth.getTime() - firstSunday.getTime()) / (24 * 60 * 60 * 1000)
      );
      const colIndex = Math.floor(daysSinceFirstSunday / 7);
      offsets.push(colIndex * COLUMN_WIDTH);
    }
    return offsets;
  }

  /** Сетка ячеек */
  private buildCalendarGrid(
    calGrid: HTMLElement,
    year: number,
    colors: string[],
    dataMap: Record<string, NoteEntry[]>
  ): void {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const gridStart = new Date(yearStart);
    gridStart.setDate(yearStart.getDate() - yearStart.getDay());

    const gridEnd = new Date(yearEnd);
    if (yearEnd.getDay() !== 6) {
      gridEnd.setDate(yearEnd.getDate() + (6 - yearEnd.getDay()));
    }

    const toLocalDateString = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    let cur = new Date(gridStart);
    while (cur <= gridEnd) {
      const s = toLocalDateString(cur);
      const isInYear = cur.getFullYear() === year;
      const notes = isInYear ? dataMap[s] || [] : [];

      let color = colors[0];
      if (notes.length > 0) color = colors[1];
      if (notes.length > 3) color = colors[2];
      if (notes.length > 7) color = colors[3];
      if (notes.length > 12) color = colors[4];

      const newCount = notes.filter((n) => n.createdDate === s).length;
      let titleText: string;
      if (isInYear) {
        if (notes.length > 0) {
          titleText = `${s}: ${t("view.tooltip.edits", { count: notes.length })}, ${t("view.tooltip.new", { count: newCount })}`;
        } else {
          titleText = `${s}: ${t("view.tooltip.noEdits")}`;
        }
      } else {
        titleText = `${s}: ${t("view.tooltip.outOfYear", { year: String(year) })}`;
      }

      const box = calGrid.createDiv({ cls: "h-box" });
      box.setCssStyles({ backgroundColor: isInYear ? color : colors[0] });
      if (!isInYear) {
        box.addClass("out-of-year");
      }
      box.dataset.date = s;
      box.title = titleText;

      cur.setDate(cur.getDate() + 1);
    }
  }

  /** Панель дня */
  private displayDayPanel(
    resPanel: HTMLElement,
    dateStr: string,
    notes: NoteEntry[],
    dataMap: Record<string, NoteEntry[]>,
    resetPanel: () => void
  ): void {
    resPanel.empty();
    resPanel.scrollTop = 0;

    const newCount = notes.filter((n) => n.createdDate === dateStr).length;
    const [y, m, d] = dateStr.split("-");

    this.renderPanelHeader(resPanel, dateStr, notes.length, newCount, resetPanel, "day", parseInt(y), m, d);

    if (notes.length === 0) {
      this.renderEmptyMessage(resPanel, t("resultPanel.noEdits"));
      return;
    }

    const ul = resPanel.createEl("ul", { cls: "note-heatmap-list" });

    const uniqueNotes = this.deduplicateAndSortNotes(notes);

    this.renderSimpleNoteList(ul, uniqueNotes, dateStr);
  }

  /** Дедупликация и сортировка */
  private deduplicateAndSortNotes(notes: NoteEntry[]): NoteEntry[] {
    const seen = new Set<string>();
    return notes
      .filter((n) => {
        if (seen.has(n.path)) return false;
        seen.add(n.path);
        return true;
      })
      .sort((a, b) => b.modifiedTime - a.modifiedTime);
  }

  /** Простой список заметок (для дня) */
  private renderSimpleNoteList(ul: HTMLElement, notes: NoteEntry[], dateStr: string): void {
    ul.empty();

    notes.forEach((n) => {
      const li = ul.createEl("li", { cls: "res-item note-heatmap-list-item" });

      const leftDiv = li.createDiv({ cls: "note-heatmap-list-item-left" });

      const isNew = n.createdDate === dateStr;
      const displayName = isNew ? `🆕 ${n.name}` : n.name;
      const a = this.createInternalLink(displayName, n.path);
      leftDiv.appendChild(a);

      const timeSpan = leftDiv.createEl("span", { cls: "note-heatmap-time" });
      const date = new Date(n.modifiedTime);
      timeSpan.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (this.plugin.settings.enableGitDiff) {
        const vhdBtn = li.createEl("button", { cls: "diff-btn note-heatmap-vhd-btn", text: t("resultPanel.vhdButton") });
        vhdBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          void this.openInVHD(n, dateStr);
        });
      }
    });
  }

  /** Открыть периодическую заметку */
  private async openPeriodicNote(type: "yearly" | "monthly" | "daily", year: number, month?: number, day?: number): Promise<void> {
    let folder: string;
    let format: string;

    switch (type) {
      case "yearly":
        folder = this.plugin.settings.yearlyNoteFolder;
        format = this.plugin.settings.yearlyNoteFormat;
        break;
      case "monthly":
        folder = this.plugin.settings.monthlyNoteFolder;
        format = this.plugin.settings.monthlyNoteFormat;
        break;
      case "daily":
        folder = this.plugin.settings.dailyNoteFolder;
        format = this.plugin.settings.dailyNoteFormat;
        break;
    }

    const yearStr = String(year);
    const monthStr = month ? String(month).padStart(2, "0") : "01";
    const dayStr = day ? String(day).padStart(2, "0") : "01";

    let filePath = this.formatDatePath(format, yearStr, monthStr, dayStr);
    if (folder) {
      filePath = `${folder}/${filePath}`;
    }
    if (!filePath.endsWith(".md")) {
      filePath += ".md";
    }

    let file = this.plugin.app.vault.getAbstractFileByPath(filePath);

    if (!file) {
      try {
        file = await this.plugin.app.vault.create(filePath, "");
      } catch (err) {
        console.error(`[NoteHeatmap] Failed to create ${type} note:`, err);
        new Notice(t("view.periodicNote.createFailed", { type }));
        return;
      }
    }

    if (file instanceof TFile) {
      await this.plugin.app.workspace.getLeaf().openFile(file);
    }
  }
}