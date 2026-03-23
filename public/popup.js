// Popup script - 悬浮窗模式测试
// 调试版本

document.getElementById('btnSidebar').addEventListener('click', async () => {
  await chrome.storage.local.set({ openMode: 'sidePanel' });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.sidePanel.open({ windowId: tab.windowId });
  window.close();
});

document.getElementById('btnFloating').addEventListener('click', async () => {
  const btn = document.getElementById('btnFloating');
  btn.textContent = '正在打开...';
  btn.disabled = true;

  try {
    const current = await chrome.windows.getCurrent();

    const win = await chrome.windows.create({
      url: 'index.html',
      type: 'normal',
      width: 420,
      height: 650,
      top: 100,
      left: current.left + current.width - 440,
      focused: true
    });

    console.log('Window created, type:', win.type);
    setTimeout(() => window.close(), 200);
  } catch (e) {
    console.error('Error:', e);
    alert('Error: ' + e.message);
    window.close();
  }
});