# 纸间 Windows 桌面版

Electron 窗口，打包同一份 `../dist` 网页应用。支持 Windows 10 / 11（64 位）。

## 工作方式

- 页面通过自定义协议 `paperroom://app/` 从安装目录的 `resources/web` 加载，不监听任何网络端口。`web-path.js` 负责把网址映射到文件，并拒绝跳出 web 目录的请求。
- 这个协议注册为安全来源，所以录音磁带可以使用麦克风；权限只授予本应用页面、只限音频。Windows 自身的「设置 → 隐私和安全性 → 麦克风」仍然生效。
- 笔记（localStorage）和磁带录音（IndexedDB）保存在 `%APPDATA%\Paperroom`。卸载程序不会删除这个目录，升级或重装都会沿用原有笔记。与网页版、Mac 版的数据互不相通。
- 外部链接一律交给系统浏览器打开；「导出备份」会弹出系统的另存为窗口。

## 开发与打包（在 Mac 或 Windows 上都可以）

```
cd windows
npm install
npm start                 # 本机运行（Mac 上也能跑，用于调试）
node smoke-test.cjs       # 冒烟测试：加载、重启后笔记仍在、权限与外链拦截（使用临时数据目录）
npm run build             # 生成 ../releases/windows/Paperroom-<版本>-windows-x64-setup.exe
```

`npm run build` 会先运行 `build/make-icon.py`，从 Mac 版图标生成带圆角透明边的多尺寸 `icon.ico`。

## 签名

安装包没有 Authenticode 代码签名（需要另购证书）。首次运行时 Windows SmartScreen 可能提示「Windows 已保护你的电脑」，点「更多信息 → 仍要运行」即可。
