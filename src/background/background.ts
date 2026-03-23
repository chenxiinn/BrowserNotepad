// Chrome 备忘录 - 后台脚本
// 功能：处理侧边栏模式的打开逻辑

console.log('Background script loaded');

// 插件安装时初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details.reason);
  if (details.reason === 'install') {
    await chrome.storage.local.set({ openMode: 'sidePanel' });
  }
});

// 配置侧边栏
chrome.sidePanel.setOptions({
  path: 'index.html',
  enabled: true
}).then(() => {
  console.log('Side panel configured');
}).catch(err => {
  console.error('Side panel config error:', err);
});

// 消息处理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.action);

  switch (request.action) {
    case 'openSidePanel':
      chrome.sidePanel.open({ windowId: sender.tab?.windowId })
        .then(() => sendResponse({ status: 'opened' }))
        .catch(err => {
          console.error('Open sidepanel error:', err);
          sendResponse({ error: err.message });
        });
      return true;

    case 'getOpenMode':
      chrome.storage.local.get('openMode', (result) => {
        sendResponse({ openMode: result.openMode || 'sidePanel' });
      });
      return true;

    case 'setOpenMode':
      chrome.storage.local.set({ openMode: request.mode });
      sendResponse({ status: 'saved' });
      break;

    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// 关键：监听工具栏图标点击 - 打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Icon clicked for tab:', tab.id);

  try {
    // 打开浏览器侧边栏
    await chrome.sidePanel.open({ windowId: tab.windowId });
    console.log('Side panel opened successfully');
  } catch (err) {
    console.error('Failed to open side panel:', err);
  }
});

console.log('Background script initialization complete');