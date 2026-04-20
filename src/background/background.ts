// Chrome 备忘录 - 后台脚本 (仅侧边栏模式)

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await chrome.storage.local.set({ openMode: 'sidePanel' });
  }
});

chrome.sidePanel.setOptions({
  path: 'index.html',
  enabled: true
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId !== undefined) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
});