import { TFile, Plugin } from "obsidian";
import type NoteHeatmapPlugin from "./main";

export interface CommitInfo {
  hash: string;
  time: number;
  message?: string;
  /** 该提交时文件的路径（处理重命名情况） */
  fileName?: string;
}

export interface DayDiffResult {
  additions: number;
  deletions: number;
  diffText: string;
  commits: CommitInfo[];
  /** 日期范围之前的最后一个提交（用于对比基准） */
  previousCommit?: CommitInfo;
}

/** Obsidian Git 插件的 gitManager 接口 */
interface GitManager {
  log(filePath: string, limit?: number): Promise<GitLogEntry[]>;
  show(commitHash: string, filePath: string): Promise<string>;
}

/** Obsidian Git 插件接口 */
interface ObsidianGitPlugin extends Plugin {
  gitManager?: GitManager;
}

/** Git 日志条目 */
interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
  fileName?: string;
}

/**
 * Git 服务 - 使用 Obsidian Git 插件 API
 * 无缓存设计：每次查询直接调用 API，避免过期数据和内存占用
 */
export class GitService {
  private gitPlugin: ObsidianGitPlugin | null = null;

  constructor(private plugin: NoteHeatmapPlugin) {
    this.findGitPlugin();
  }

  /**
   * 查找 Obsidian Git 插件
   */
  private findGitPlugin(): void {
    try {
      this.gitPlugin = this.plugin.app.plugins.getPlugin("obsidian-git") as ObsidianGitPlugin | null;
    } catch {
      // 忽略错误
    }
  }

  /**
   * 检查 Git 功能是否可用
   */
  isGitPluginAvailable(): boolean {
    // 重新查找，以防插件是后安装的
    if (!this.gitPlugin) {
      this.findGitPlugin();
    }
    return this.gitPlugin != null;
  }

  /**
   * 获取 gitManager 实例
   * 提取公共模式：获取 + 空值检查
   */
  private getGitManager(): GitManager | null {
    if (!this.isGitPluginAvailable()) return null;
    return this.gitPlugin?.gitManager || null;
  }

  /**
   * 确定 diff 的起始 hash
   * 有 previousCommit 时用它，否则取第一个提交的父提交
   */
  private resolveFromHash(
    commits: CommitInfo[],
    previousCommit: CommitInfo | undefined
  ): string {
    if (previousCommit) {
      return previousCommit.hash;
    }
    // 没有 previousCommit 时，从已知 commits 中取第一个提交的父提交
    const parentHash = this.findParentCommitFromKnown(commits, commits[0].hash);
    return parentHash || commits[0].hash;
  }

  /**
   * 获取某文件在某日的变更统计
   * @returns DayDiffResult - 有插件时的结果（可能为空提交）
   * @returns null - 没有安装 Git 插件
   */
  async getDayDiff(file: TFile, date: string): Promise<DayDiffResult | null> {
    const gitManager = this.getGitManager();
    if (!gitManager) {
      return this.isGitPluginAvailable() ? { additions: 0, deletions: 0, diffText: "", commits: [] } : null;
    }

    try {
      // 解析日期范围
      const [y, m, d] = date.split("-").map(Number);
      const startTime = new Date(y, m - 1, d, 0, 0, 0);
      const endTime = new Date(y, m - 1, d, 23, 59, 59);

      const { commits, previousCommit } = await this.getCommitsInRange(gitManager, file, startTime, endTime);

      if (commits.length === 0) {
        return { additions: 0, deletions: 0, diffText: "", commits: [], previousCommit };
      }

      // 获取 diff：从 previousCommit（或第一个提交的父提交）到最后一个提交
      const fromHash = this.resolveFromHash(commits, previousCommit);
      const toHash = commits[commits.length - 1].hash;

      const diffText = await this.getDiffBetweenCommits(
        gitManager, file, fromHash, toHash, commits
      );

      const stats = this.parseDiffStats(diffText);

      return {
        additions: stats.additions,
        deletions: stats.deletions,
        diffText: diffText,
        commits: commits,
        previousCommit: previousCommit,
      };
    } catch (err) {
      console.error("[NoteHeatmap] 获取 Git diff 失败:", err);
      return { additions: 0, deletions: 0, diffText: "", commits: [] };
    }
  }

  /**
   * 获取指定时间范围内的提交，同时返回范围之前的最后一个提交
   * 合并了 getDayCommits/getMonthCommits + getPreviousCommit/getMonthPreviousCommit 的逻辑
   * 一次 log 查询同时获取两个结果，避免重复 API 调用
   */
  private async getCommitsInRange(
    gitManager: GitManager,
    file: TFile,
    startTime: Date,
    endTime: Date
  ): Promise<{ commits: CommitInfo[]; previousCommit?: CommitInfo }> {
    try {
      const logEntries = await gitManager.log(file.path);
      if (!logEntries || logEntries.length === 0) {
        return { commits: [], previousCommit: undefined };
      }

      const startMs = startTime.getTime();
      const endMs = endTime.getTime();
      const commits: CommitInfo[] = [];
      let previousCommit: CommitInfo | undefined;

      for (const entry of logEntries) {
        const commitDate = new Date(entry.date);
        const commitTime = commitDate.getTime();

        if (commitTime >= startMs && commitTime <= endMs) {
          commits.push({
            hash: entry.hash,
            time: commitTime,
            message: entry.message || "无提交信息",
            fileName: entry.fileName
          });
        } else if (commitTime < startMs && !previousCommit) {
          // log 是按时间倒序的，第一个早于 startTime 的就是最近的 previousCommit
          previousCommit = {
            hash: entry.hash,
            time: commitTime,
            message: entry.message || "无提交信息",
            fileName: entry.fileName || file.path
          };
        }
      }

      commits.sort((a, b) => a.time - b.time);
      return { commits, previousCommit };
    } catch (err) {
      console.error("[NoteHeatmap] 获取提交历史失败:", err);
      return { commits: [], previousCommit: undefined };
    }
  }

  /**
   * 获取两个提交之间的 diff
   * 使用 gitManager.show() 与 Version History Diff 保持一致
   * 支持文件重命名/移动场景
   */
  private async getDiffBetweenCommits(
    gitManager: GitManager,
    file: TFile,
    fromHash: string,
    toHash: string,
    knownCommits: CommitInfo[]
  ): Promise<string> {
    try {
      // 从已知提交列表查找 fileName，避免重复 log 查询
      const findFileName = (hash: string): string | null => {
        const commit = knownCommits.find(c => c.hash === hash);
        return commit?.fileName || null;
      };

      // 获取两个提交的文件路径（处理重命名场景）
      const fromFileName = findFileName(fromHash) || file.path;
      const toFileName = findFileName(toHash) || file.path;

      // 使用 gitManager.show() 获取特定提交的文件内容（与 Version History Diff 一致）
      let fromContent: string;
      let toContent: string;

      if (fromHash === toHash) {
        // 同一个提交，对比其父提交
        const parentHash = this.findParentCommitFromKnown(knownCommits, fromHash);
        if (parentHash) {
          const parentFileName = findFileName(parentHash) || file.path;
          fromContent = await this.tryShow(gitManager, parentHash, parentFileName, file.path);
        } else {
          fromContent = "";
        }
        toContent = await this.tryShow(gitManager, toHash, toFileName, file.path);
      } else {
        fromContent = await this.tryShow(gitManager, fromHash, fromFileName, file.path);
        toContent = await this.tryShow(gitManager, toHash, toFileName, file.path);
      }

      return this.generateUnifiedDiff(fromContent, toContent, file.path, fromHash, toHash);
    } catch (err) {
      console.error("[NoteHeatmap] 获取 diff 失败:", err);
      return "";
    }
  }

  /**
   * 从已知的 commits 列表中查找指定提交的父提交 hash
   * commits 按时间正序排列，父提交是列表中当前提交的前一个
   */
  private findParentCommitFromKnown(commits: CommitInfo[], hash: string): string | null {
    const index = commits.findIndex(c => c.hash === hash);
    if (index > 0) {
      return commits[index - 1].hash;
    }
    return null;
  }

  /**
   * 尝试用不同路径获取文件内容
   */
  private async tryShow(gitManager: GitManager, hash: string, preferredPath: string | null, fallbackPath: string): Promise<string> {
    const pathsToTry = preferredPath ? [preferredPath, fallbackPath] : [fallbackPath];
    
    for (const path of pathsToTry) {
      try {
        return await gitManager.show(hash, path);
      } catch {
        // 继续尝试下一个路径
      }
    }
    
    // 所有路径都失败，返回空字符串
    return "";
  }

  /**
   * 生成统一格式的 diff
   */
  private generateUnifiedDiff(
    fromContent: string,
    toContent: string,
    filePath: string,
    fromHash: string,
    toHash: string
  ): string {
    const fromLines = fromContent.split("\n");
    const toLines = toContent.split("\n");

    let diff = `diff --git a/${filePath} b/${filePath}\n`;
    diff += `index ${fromHash.substring(0, 7)}..${toHash.substring(0, 7)} 100644\n`;
    diff += `--- a/${filePath}\n`;
    diff += `+++ b/${filePath}\n`;

    // 简单的行级 diff
    const maxLines = Math.max(fromLines.length, toLines.length);
    let hunkStarted = false;
    let hunkFromStart = 1;
    let hunkToStart = 1;
    let hunkLines: string[] = [];

    for (let i = 0; i < maxLines; i++) {
      const fromLine = fromLines[i] ?? null;
      const toLine = toLines[i] ?? null;

      if (fromLine !== toLine) {
        if (!hunkStarted) {
          hunkFromStart = i + 1;
          hunkToStart = i + 1;
          hunkStarted = true;
        }

        if (fromLine !== null && toLine !== null) {
          // 修改的行
          hunkLines.push("-" + fromLine);
          hunkLines.push("+" + toLine);
        } else if (fromLine !== null) {
          // 删除的行
          hunkLines.push("-" + fromLine);
        } else {
          // 新增的行
          hunkLines.push("+" + toLine);
        }
      } else {
        if (hunkStarted && hunkLines.length > 0) {
          // 结束当前 hunk
          const fromCount = hunkLines.filter(l => l.startsWith("-")).length;
          const toCount = hunkLines.filter(l => l.startsWith("+")).length;
          diff += `@@ -${hunkFromStart},${fromCount} +${hunkToStart},${toCount} @@\n`;
          diff += hunkLines.join("\n") + "\n";
          hunkLines = [];
        }
        hunkStarted = false;
      }
    }

    // 处理最后一个 hunk
    if (hunkStarted && hunkLines.length > 0) {
      const fromCount = hunkLines.filter(l => l.startsWith("-")).length;
      const toCount = hunkLines.filter(l => l.startsWith("+")).length;
      diff += `@@ -${hunkFromStart},${fromCount} +${hunkToStart},${toCount} @@\n`;
      diff += hunkLines.join("\n") + "\n";
    }

    return diff;
  }

  /**
   * 解析 diff 统计行数
   */
  private parseDiffStats(diffText: string): { additions: number; deletions: number } {
    let additions = 0;
    let deletions = 0;

    const lines = diffText.split("\n");
    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }

    return { additions, deletions };
  }

  /**
   * 获取某文件在某月的变更统计（整个月的所有提交）
   * @param yearMonth - 格式 "2026-02"
   * @returns DayDiffResult - 有插件时的结果（可能为空提交）
   * @returns null - 没有安装 Git 插件
   */
  async getMonthDiff(file: TFile, yearMonth: string): Promise<DayDiffResult | null> {
    const gitManager = this.getGitManager();
    if (!gitManager) {
      return this.isGitPluginAvailable() ? { additions: 0, deletions: 0, diffText: "", commits: [] } : null;
    }

    try {
      // 解析月份范围
      const [year, month] = yearMonth.split("-").map(Number);
      const startTime = new Date(year, month - 1, 1, 0, 0, 0);
      const lastDay = new Date(year, month, 0).getDate();
      const endTime = new Date(year, month - 1, lastDay, 23, 59, 59);

      const { commits, previousCommit } = await this.getCommitsInRange(gitManager, file, startTime, endTime);

      if (commits.length === 0) {
        return { additions: 0, deletions: 0, diffText: "", commits: [], previousCommit };
      }

      // 获取 diff：从 previousCommit（或第一个提交的父提交）到最后一个提交
      const fromHash = this.resolveFromHash(commits, previousCommit);
      const toHash = commits[commits.length - 1].hash;

      const diffText = await this.getDiffBetweenCommits(
        gitManager, file, fromHash, toHash, commits
      );

      const stats = this.parseDiffStats(diffText);

      return {
        additions: stats.additions,
        deletions: stats.deletions,
        diffText: diffText,
        commits: commits,
        previousCommit: previousCommit,
      };
    } catch (err) {
      console.error("[NoteHeatmap] 获取月度 Git diff 失败:", err);
      return { additions: 0, deletions: 0, diffText: "", commits: [] };
    }
  }
}
