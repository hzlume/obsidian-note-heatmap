export const en = {
  // Settings - General
  settings: {
    title: "Note Heatmap Settings",
    targetField: {
      name: "Target Field",
      desc: "Frontmatter field name for tracking modification dates. Supports single value or list. Field value format: ISO 8601 (e.g., 2026-04-14T10:30:00), YYYY-MM-DD (e.g., 2026-04-14), or Obsidian date object",
    },
    createdField: {
      name: "Created Field",
      desc: "Frontmatter field name for determining if a note is new. Field value format: ISO 8601, YYYY-MM-DD, or Obsidian date object. Falls back to file creation time if not set",
    },
    targetFolder: {
      name: "Target Folder",
      desc: "Which folder to track notes from (relative to vault root)",
    },
  },

  // Settings - Colors
  colors: {
    title: "Color Configuration",
    desc: "From left to right: No edits / 1-3 notes / 4-7 notes / 8-12 notes / 13+ notes",
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
    title: "Periodic Note Path Configuration",
    yearly: {
      name: "Yearly Note",
      desc: "Enable to show link to yearly note when clicking the year",
      folder: {
        name: "Folder Path",
        desc: "Root folder for yearly notes (relative to vault root). Leave empty for vault root",
        placeholder: "Leave empty for root",
      },
      format: {
        name: "File Format",
        desc: "File path format for yearly notes, based on the folder above. Format: YYYY (year). Content in [brackets] is output as-is",
        placeholder: "YYYY",
      },
    },
    daily: {
      name: "Daily Note",
      desc: "Enable to show link to daily note when clicking a date",
      folder: {
        name: "Folder Path",
        desc: "Root folder for daily notes (relative to vault root). Leave empty for vault root",
        placeholder: "Leave empty for root",
      },
      format: {
        name: "File Format",
        desc: "File path format for daily notes, based on the folder above. Format: YYYY (year), MM (month), DD (day). Content in [brackets] is output as-is",
        placeholder: "YYYY-[daily]/YYYY-MM-[daily]/YYYY-MM-DD",
      },
    },
    monthly: {
      name: "Monthly Note",
      desc: "Enable to show link to monthly note when clicking a month",
      folder: {
        name: "Folder Path",
        desc: "Root folder for monthly notes (relative to vault root). Leave empty for vault root",
        placeholder: "Leave empty for root",
      },
      format: {
        name: "File Format",
        desc: "File path format for monthly notes, based on the folder above. Format: YYYY (year), MM (month). Content in [brackets] is output as-is",
        placeholder: "YYYY-[monthly]/YYYY-MM",
      },
    },
  },

  // Settings - Git Diff
  gitDiff: {
    title: "Git Diff Feature",
    enable: {
      name: "Enable Git Diff Feature",
      descAllAvailable: "✅ All dependencies installed. Requires: Obsidian Git + Version History Diff",
      descMissingObsidianGit: "⚠️ Missing",
      descMissingVHD: "⚠️ Missing",
      descMissingBoth: "⚠️ Missing both dependencies:",
      pluginObsidianGit: "Obsidian Git",
      pluginVHD: "Version History Diff",
      separator: " + ",
    },
  },

  // Settings - Reset
  reset: {
    name: "Reset to Default Settings",
    button: "Reset",
  },

  // Commands
  commands: {
    openView: "Open Note Heatmap",
    refreshView: "Refresh Note Heatmap",
  },

  // Heatmap View
  view: {
    title: "Note Heatmap",
    header: {
      refresh: "Refresh",
      prevYear: "Previous Year",
      nextYear: "Next Year",
      openYearlyNote: "Open {{year}} Yearly Note",
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
    hint: "💡 Click a square above to view edits for that day",
    noEdits: "No edits for this day",
    noEditsMonth: "No edits for this month",
    close: "Close file list",
    totalEdits: "{{total}} edits, {{new}} new",
    diffButton: "View Diff",
    vhdButton: "View Diff",
    searchPlaceholder: "🔍 Search note names...",
    sortBy: {
      name: "Name",
      activeDays: "Active Days",
      lastModified: "Last Modified",
    },
    days: "{{count}}d",
  },

  // Git Service
  git: {
    installNotice: "💡 Install Obsidian Git plugin to view detailed Diff",
    noCommits: "No commits found",
    vhdNotInstalled: "Version History Diff plugin is not installed or enabled",
    vhdOpenFailed: "Failed to open Version History Diff",
  },
};

export type Translations = typeof en;
