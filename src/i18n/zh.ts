import type { Translations } from "./en";

export const zh: Translations = {
  // Settings - General
  settings: {
    title: "Note Heatmap 设置",
    targetField: {
      name: "目标字段",
      desc: "用于统计修改日期的 frontmatter 字段名。支持单个值或列表。字段值格式：ISO 8601 (如 2026-04-14T10:30:00)、YYYY-MM-DD (如 2026-04-14)、Obsidian 日期对象",
    },
    createdField: {
      name: "创建时间字段",
      desc: "用于判断笔记是否为新增的 frontmatter 字段名。字段值格式：ISO 8601 (如 2026-04-14T10:30:00)、YYYY-MM-DD (如 2026-04-14)、Obsidian 日期对象。若字段不存在则使用文件创建时间",
    },
    targetFolder: {
      name: "目标文件夹",
      desc: "统计哪个文件夹下的笔记（相对于 vault 根目录）",
    },
  },

  // Settings - Colors
  colors: {
    title: "颜色配置",
    desc: "从左到右依次对应：无修改 / 1-3篇 / 4-7篇 / 8-12篇 / 13篇以上",
    labels: [
      "无修改（0篇）",
      "浅绿（1-3篇）",
      "中绿（4-7篇）",
      "深绿（8-12篇）",
      "最深（≥13篇）",
    ],
  },

  // Settings - Periodic Notes
  periodicNotes: {
    title: "周期笔记路径配置",
    yearly: {
      name: "年度笔记",
      desc: "开启后，点击年份时会显示跳转到年度笔记的链接",
      folder: {
        name: "文件夹路径",
        desc: "年度笔记的根文件夹（相对于 vault 根目录），留空表示 vault 根目录",
        placeholder: "留空表示根目录",
      },
      format: {
        name: "文件格式",
        desc: "年度笔记的文件路径格式，基于上述文件夹。",
        placeholder: "",
      },
    },
    daily: {
      name: "每日笔记",
      desc: "开启后，点击日期时会显示跳转到每日笔记的链接",
      folder: {
        name: "文件夹路径",
        desc: "每日笔记的根文件夹（相对于 vault 根目录），留空表示 vault 根目录",
        placeholder: "留空表示根目录",
      },
      format: {
        name: "文件格式",
        desc: "每日笔记的文件路径格式，基于上述文件夹。",
        placeholder: "",
      },
    },
    monthly: {
      name: "月度笔记",
      desc: "开启后，点击月份时会显示跳转到月度笔记的链接",
      folder: {
        name: "文件夹路径",
        desc: "月度笔记的根文件夹（相对于 vault 根目录），留空表示 vault 根目录",
        placeholder: "留空表示根目录",
      },
      format: {
        name: "文件格式",
        desc: "月度笔记的文件路径格式，基于上述文件夹。",
        placeholder: "",
      },
    },
  },

  // Settings - Git Diff
  gitDiff: {
    title: "Git Diff 功能",
    enable: {
      name: "启用 Git Diff 功能",
      descAllAvailable: "✅ 依赖已满足。需要：Obsidian Git + Version History Diff",
      descMissingObsidianGit: "⚠️ 缺少",
      descMissingVHD: "⚠️ 缺少",
      descMissingBoth: "⚠️ 缺少以下依赖：",
      pluginObsidianGit: "Obsidian Git",
      pluginVHD: "Version History Diff",
      separator: " + ",
    },
  },

  // Settings - Reset
  reset: {
    name: "重置为默认设置",
    button: "重置",
  },

  // Commands
  commands: {
    openView: "打开笔记热力图",
    refreshView: "刷新笔记热力图",
  },

  // Heatmap View
  view: {
    title: "笔记热力图",
    header: {
      refresh: "刷新",
      prevYear: "上一年",
      nextYear: "下一年",
      openYearlyNote: "打开 {{year}} 年度笔记",
    },
    tooltip: {
      noEdits: "无修改",
      edits: "修改了 {{count}} 篇",
      new: "其中 {{count}} 篇为新增",
      outOfYear: "不在{{year}}年内",
    },
    weekdays: ["日", "", "二", "", "四", "", "六"],
    months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
    periodicNote: {
      createFailed: "创建{{type}}笔记失败",
    },
  },

  // Result Panel
  resultPanel: {
    hint: "💡 点击上方方块查看该日修改记录",
    noEdits: "当日无修改记录",
    noEditsMonth: "当月无修改记录",
    close: "关闭文件列表",
    totalEdits: "共修改 {{total}} 篇，其中 {{new}} 篇为新增",
    diffButton: "查看 Diff",
    vhdButton: "查看 Diff",
    searchPlaceholder: "🔍 搜索笔记名称...",
    sortBy: {
      name: "名称",
      activeDays: "活跃天数",
      lastModified: "最后修改",
    },
    days: "{{count}}天",
  },

  // Git Service
  git: {
    installNotice: "💡 安装 Obsidian Git 插件可查看详细 Diff",
    noCommits: "无提交记录",
    vhdNotInstalled: "Version History Diff 插件未安装或未启用",
    vhdOpenFailed: "打开 Version History Diff 失败",
  },
};
