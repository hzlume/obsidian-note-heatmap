import type { CommitInfo } from "./gitService";

/**
 * 在 Version History Diff 中选中指定提交
 * 逻辑：
 * - 有 previousCommit：左侧选中它，右侧选中范围内最后一个（显示"昨天做了什么"）
 * - 无 previousCommit 且多个提交：左侧选中第一个，右侧选中最后一个（显示当天内部变化）
 * - 无 previousCommit 且只有一个提交：只选中右侧该提交，左侧保持当前文件（显示"创建时的完整内容"）
 */
export function selectCommitsInVHD(commits: CommitInfo[], previousCommit?: CommitInfo): void {
  try {
    const vhdModal = document.querySelector('.modal-container .diff');
    if (!vhdModal) return;

    const historyListContainers = vhdModal.querySelectorAll('.sync-history-list-container');
    if (historyListContainers.length < 2) return;

    const leftList = historyListContainers[0].querySelector('.sync-history-list');
    const rightList = historyListContainers[1].querySelector('.sync-history-list');

    if (!leftList || !rightList) return;

    const rightCommitHash = commits[commits.length - 1]?.hash;
    if (!rightCommitHash) return;

    // 右侧始终选中范围内最后一个提交
    selectCommitInList(rightList, rightCommitHash);

    // 左侧逻辑
    if (previousCommit) {
      selectCommitInList(leftList, previousCommit.hash);
    } else if (commits.length > 1) {
      selectCommitInList(leftList, commits[0].hash);
    }
  } catch (err) {
    console.error('[NoteHeatmap] 设置选中状态失败:', err);
  }
}

/**
 * 在列表中选中指定 hash 的提交，并滚动到可见区域
 */
export function selectCommitInList(listContainer: Element, targetHash: string): HTMLElement | null {
  const items = Array.from(listContainer.querySelectorAll('.sync-history-list-item-header'));
  if (items.length === 0) return null;

  for (const item of items) {
    const itemText = item.textContent || '';
    if (itemText.includes(targetHash.substring(0, 7))) {
      const element = item as HTMLElement;
      element.click();
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return element;
    }
  }

  return null;
}
