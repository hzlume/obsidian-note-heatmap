import type { Translations } from "./en";
import { en } from "./en";
import { zh } from "./zh";

const translations: Record<string, Translations> = {
  en,
  zh,
};

/**
 * 获取当前语言
 * 优先使用 Obsidian 的语言设置，其次检测 moment  locale
 */
function getCurrentLang(): string {
  // 尝试从 moment 获取语言
  const momentLocale = window.moment?.locale?.() || "en";
  
  // 中文相关 locale 映射到 zh
  if (momentLocale.startsWith("zh")) {
    return "zh";
  }
  
  // 默认返回英文
  return "en";
}

/**
 * 翻译函数
 * 支持嵌套路径如 "settings.year.name"
 * 支持变量替换如 "{{count}}"
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const lang = getCurrentLang();
  const trans = translations[lang] || translations.en;
  
  // 按路径获取翻译
  const keys = key.split(".");
  let value: unknown = trans;
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // 找不到翻译，返回 key
      return key;
    }
  }
  
  if (typeof value !== "string") {
    return key;
  }
  
  // 变量替换
  if (vars) {
    return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return vars[varName]?.toString() ?? match;
    });
  }
  
  return value;
}

/**
 * 获取数组翻译
 */
export function tArray(key: string): string[] {
  const lang = getCurrentLang();
  const trans = translations[lang] || translations.en;
  
  const keys = key.split(".");
  let value: unknown = trans;
  
  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return [];
    }
  }
  
  if (Array.isArray(value)) {
    return value as string[];
  }
  
  return [];
}

// 重新导出类型
export type { Translations };
