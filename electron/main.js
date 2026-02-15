const { app, BrowserWindow } = require('electron');
const path = require('path');

// 保持对窗口对象的全局引用，避免被垃圾回收
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // 启用Node.js集成
      nodeIntegration: true,
      contextIsolation: false,
      // 启用DevTools
      devTools: true
    },
    // 现代化窗口样式
    frame: true,
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../frontend/public/vite.svg')
  });

  // 加载前端应用
  // 在开发环境中加载Vite开发服务器
  // 在生产环境中加载打包后的文件
  const isDev = process.env.NODE_ENV !== 'production';
  const url = isDev 
    ? 'http://localhost:5174' 
    : `file://${path.join(__dirname, '../frontend/dist/index.html')}`;

  mainWindow.loadURL(url);

  // 打开DevTools
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 窗口关闭时的处理
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// 应用就绪后创建窗口
app.on('ready', createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  // 在macOS上，应用通常会保持活动状态直到用户明确退出
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在macOS上，点击dock图标时重新创建窗口
app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});
