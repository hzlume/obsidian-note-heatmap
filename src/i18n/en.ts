export const en = {
  // Settings - General
  settings: {
    title: "Note heatmap settings",
    targetField: {
      name: "Target field",
      desc: "Frontmatter field name for tracking modification dates. Supports single value or list.",
    },
    createdField: {
      name: "Created field",
      desc: "Frontmatter field name for determining if a note is new. ",
    },
    targetFolder: {
      name: "Target folder",
      desc: "Which folder to track notes from (relative to vault root)",
    },
  },

  // Settings - Colors
  colors: {
    title: "Color configuration",
    desc: "From left to right: no edits / 1-3 notes / 4-7 notes / 8-12 notes / 13+ notes.",
    labels: [
      "No edits (0)",
      "Light green (1-3)",
      "Medium green (4-7)",
      "Dark green (8-12)",
      "Darkest (≥13)",
    ],
  },

  // Settings - Periodic Notes
  periodicNotes: {
    title: "Periodic note path configuration",
    yearly: {
      name: "Yearly note",
      desc: "Enable to show link to yearly note when clicking the year",
      folder: {
        name: "Folder path",
        desc: "Root folder for yearly notes (relative to vault root). Leave empty for vault root",
        placeholder: "Leave empty for root",
      },
      format: {
        name: "File format",
        desc: "File path format for yearly notes, based on the folder above.",
        placeholder: "YYYY",
      },
    },
    daily: {
      name: "Daily note",
      desc: "Enable to show link to daily note when clicking a date",
      folder: {
        name: "Folder path",
        desc: "Root folder for daily notes (relative to vault root). Leave empty for vault root",
        placeholder: "Leave empty for root",
      },
      format: {
        name: "File format",
        desc: "File path format for daily notes, based on the folder above. ",
        placeholder: "",
      },
    },
    monthly: {
      name: "Monthly note",
      desc: "Enable to show link to monthly note when clicking a month",
      folder: {
        name: "Folder path",
        desc: "Root folder for monthly notes (relative to vault root). Leave empty for vault root",
        placeholder: "Leave empty for root",
      },
      format: {
        name: "File format",
        desc: "File path format for monthly notes, based on the folder above.",
        placeholder: "",
      },
    },
  },

  // Settings - Git Diff
  gitDiff: {
    title: "Git diff feature",
    enable: {
      name: "Enable Git diff feature",
      descAllAvailable: "✅ all dependencies installed(Git and version-history-diff).",
      descMissingObsidianGit: "⚠️ missing",
      descMissingVHD: "⚠️ missing",
      descMissingBoth: "⚠️ missing both dependencies:",
      pluginObsidianGit: "Obsidian Git",
      pluginVHD: "Plugin version-history-diff",
      separator: " + ",
    },
  },

  // Settings - Reset
  reset: {
    name: "Reset to default settings",
    button: "Reset",
  },

  // Commands
  commands: {
    openView: "Open note heatmap",
    refreshView: "Refresh note heatmap",
  },

  // Heatmap View
  view: {
    title: "Note heatmap",
    header: {
      refresh: "Refresh",
      prevYear: "Previous year",
      nextYear: "Next year",
      openYearlyNote: "Open {{year}} yearly note",
    },
    tooltip: {
      noEdits: "No edits",
      edits: "{{count}} edits",
      new: "{{count}} new",
      outOfYear: "Not in {{year}}",
    },
    weekdays: ["Sun", "", "Tue", "", "Thu", "", "Sat"],
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    periodicNote: {
      createFailed: "Failed to create {{type}} note",
    },
  },

  // Result Panel
  resultPanel: {
    hint: "💡 click a square above to view edits for that day",
    noEdits: "No edits for this day",
    noEditsMonth: "No edits for this month",
    close: "Close file list",
    totalEdits: "{{total}} edits, {{new}} new",
    diffButton: "View diff",
    vhdButton: "View diff",
    searchPlaceholder: "🔍 search note names...",
    sortBy: {
      name: "Name",
      activeDays: "Active days",
      lastModified: "Last modified",
    },
    days: "{{count}}d",
  },

  // Git Service
  git: {
    installNotice: "💡 install the Obsidian Git plugin to view detailed diff",
    noCommits: "No commits found",
    vhdNotInstalled: "Plugin version-history-diff is not installed or enabled",
    vhdOpenFailed: "Failed to open version-history-diff plugin.",
  },
};

export type Translations = typeof en;
