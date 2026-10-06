// 纸间 Paperroom · Windows 桌面版（Electron）
// 页面通过自定义协议 paperroom://app/ 从随包的 web 目录加载：不开任何本地端口，
// 来源固定，笔记（localStorage）和磁带录音（IndexedDB）保存在 %APPDATA%\Paperroom，卸载升级都不会删除。
const { app, BrowserWindow, Menu, dialog, net, protocol, session, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { SCHEME, ORIGIN, resolveWebFile } = require('./web-path');

const WEB_ROOT = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', 'dist');
const SITE = 'https://nuoyannotebook.xyz';
const REPO = 'https://github.com/haha362636-coder/paperroom';

// Must run before the app is ready: a standard, secure scheme gives the page a stable
// origin for storage and counts as a secure context, which the microphone requires.
protocol.registerSchemesAsPrivileged([{ scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

// Tests point this at a throwaway folder so they never touch real notes.
if (process.env.PAPERROOM_USER_DATA) app.setPath('userData', process.env.PAPERROOM_USER_DATA);
app.setAppUserModelId('xyz.nuoyannotebook.paperroom');
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
const isAppUrl = (url) => typeof url === 'string' && (url === ORIGIN || url.startsWith(ORIGIN + '/'));
const openExternal = (url) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); };

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 700, minHeight: 520,
    title: '纸间 Paperroom', backgroundColor: '#17181b', show: false, autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (event, url) => { if (!isAppUrl(url)) { event.preventDefault(); openExternal(url); } });
  win.loadURL(ORIGIN + '/');
}

function about() {
  dialog.showMessageBox(win, {
    type: 'info', title: '关于纸间', message: `纸间 Paperroom ${app.getVersion()}`,
    detail: 'Windows 版\n笔记和磁带录音只保存在这台电脑上（%APPDATA%\\Paperroom）。\n卸载或重装不会删除它们；换电脑前请先用右上角 ↗ 导出备份。',
  });
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: '文件', submenu: [{ label: '退出纸间', role: 'quit' }] },
    { label: '编辑', submenu: [
      { label: '撤销', role: 'undo' }, { label: '重做', role: 'redo' }, { type: 'separator' },
      { label: '剪切', role: 'cut' }, { label: '复制', role: 'copy' }, { label: '粘贴', role: 'paste' }, { label: '全选', role: 'selectAll' },
    ] },
    { label: '视图', submenu: [
      { label: '实际大小', role: 'resetZoom' }, { label: '放大', role: 'zoomIn' }, { label: '缩小', role: 'zoomOut' },
      { type: 'separator' }, { label: '全屏', role: 'togglefullscreen' },
    ] },
    { label: '帮助', submenu: [
      { label: '官网', click: () => openExternal(SITE) },
      { label: 'GitHub 开源地址', click: () => openExternal(REPO) },
      { type: 'separator' }, { label: '关于纸间', click: about },
    ] },
  ]));
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

app.whenReady().then(() => {
  protocol.handle(SCHEME, (request) => {
    const file = resolveWebFile(WEB_ROOT, request.url);
    if (!file) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // Cassette recording: only our own page may use the microphone, and only for audio.
  // Windows still applies its own privacy setting (设置 → 隐私和安全性 → 麦克风).
  const allowMedia = (permission, url, types) => permission === 'media' && isAppUrl(url) && (types ?? ['audio']).every((t) => t === 'audio');
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => callback(allowMedia(permission, details.requestingUrl, details.mediaTypes)));
  session.defaultSession.setPermissionCheckHandler((wc, permission, origin, details) => permission === 'media' ? allowMedia(permission, details.requestingUrl ?? origin, details.mediaType ? [details.mediaType] : undefined) : false);
  buildMenu();
  createWindow();
});

app.on('window-all-closed', () => app.quit());
