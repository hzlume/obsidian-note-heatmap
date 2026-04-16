export interface HeatmapSettings {
  targetField: string;
  targetFolder: string;
  colors: string[];
  // 年度笔记配置
  enableYearlyNote: boolean;
  yearlyNoteFolder: string;
  yearlyNoteFormat: string;
  // 月度笔记配置
  enableMonthlyNote: boolean;
  monthlyNoteFolder: string;
  monthlyNoteFormat: string;
  // 日记配置
  enableDailyNote: boolean;
  dailyNoteFolder: string;
  dailyNoteFormat: string;
  enableGitDiff: boolean;
  createdField: string; // 创建时间字段，用于判断是否为新增笔记
}

export const DEFAULT_SETTINGS: HeatmapSettings = {
  targetField: "last-modified",
  targetFolder: "", // 空字符串表示整个 vault
  colors: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  // 年度笔记默认配置（文件夹路径为空表示根目录）
  enableYearlyNote: true,
  yearlyNoteFolder: "",
  yearlyNoteFormat: "YYYY",
  // 月度笔记默认配置（文件夹路径为空表示根目录）
  enableMonthlyNote: true,
  monthlyNoteFolder: "",
  monthlyNoteFormat: "YYYY-[monthly]/YYYY-MM",
  // 日记默认配置（文件夹路径为空表示根目录）
  enableDailyNote: true,
  dailyNoteFolder: "",
  dailyNoteFormat: "YYYY-[daily]/YYYY-MM-[daily]/YYYY-MM-DD",
  enableGitDiff: false, // 将在 onload 时根据依赖检测自动设置
  createdField: "created", // 默认使用 "created" 字段
};
