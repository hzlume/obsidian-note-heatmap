// eslint.config.mjs - 与 ObsidianReviewBot 检查规范完全一致
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
  // 忽略文件
  {
    ignores: ["**/node_modules/", "**/main.js", "**/esbuild.config.mjs"],
  },

  // 使用 obsidianmd 推荐配置（包含 typescript-eslint recommended + obsidianmd 规范）
  ...obsidianmd.configs.recommended,

  // 补充 obsidianmd 未提供的 globals
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        console: "readonly",
        window: "readonly",
        document: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
  },
]);
