// Popup script
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
      url: chrome.runtime.getURL('index.html') + '?mode=floating',
      type: 'popup',
      width: 420,
      height: 650,
      top: Math.max(50, current.top),
      left: Math.max(50, current.left + current.width - 460),
      focused: true
    });

    console.log('Floating window created, id:', win?.id);
    setTimeout(() => window.close(), 200);
  } catch (e) {
    console.error('Error:', e);
    alert('Error: ' + e.message);
    window.close();
  }
});