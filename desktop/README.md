# 纸间 Apple Silicon 桌面版

Swift + Cocoa/WKWebView 原生窗口，离线资源随包分发。仅支持 Apple Silicon、macOS 14+。本地服务器仅绑定 127.0.0.1:49173，WKWebView 默认数据存储保留笔记。浏览器与桌面版的数据独立。

构建源：main.swift、Info.plist。静态资源来自 ../dist；当前发行包 web 使用轻量直接渲染和最高1.5倍分辨率，导出按钮通过 exportBackup 原生桥接保存 JSON。

编译：
```
xcrun swiftc desktop/main.swift -O -target arm64-apple-macos14.0 -module-cache-path /tmp/paperroom-swift-cache -framework Cocoa -framework WebKit -framework Network -o desktop/build/Paperroom.app/Contents/MacOS/Paperroom
codesign --force --deep --sign - desktop/build/Paperroom.app
```

本次是 ad-hoc 签名，未经 Apple 公证；不等于 Developer ID 签名。首次打开可由用户按安装包内的 Apple 官方步骤，为此应用设置例外。DMG 位于 ../releases。

## 应用图标（2026-09-26）

图标源图位于 assets/paperroom-icon-source.png，使用内置 ImageGen 生成。

**改图标请一律运行 `bash desktop/make-icon.sh`**，它会：源图 → `tools/build-icon.py` 生成满铺不透明、alpha 全 255 的 `paperroom-icon-1024.png` → sips 出标准尺寸 → iconutil 打包为 `assets/Paperroom.icns` → 校验各尺寸不含中间 alpha。Info.plist 用 `CFBundleIconFile` 引用图标。

### 为什么必须走这个脚本（踩坑记录）

macOS 26/27 收紧了图标规则，判定条件只看**边缘像素的 alpha**：

- `alpha >= 253` → 正常渲染，系统自己裁圆角；
- `alpha <= 252` → 判定为不合规图标，强制套一层灰色圆角方框（gray box / squircle jail）。

AI 生成的源图恰好踩线：不透明区域 alpha 是 **253**，而抗锯齿边缘与柔和阴影全是 252 以下的中间值，于是整个图标被关进灰框（表现为图标变小、外面多一圈浅灰底板）。`build-icon.py` 因此裁掉柔和阴影、用边缘像素外推填满四角，并把所有 alpha 强制成 255。参考：Apple 开发者论坛 thread/797971。

注意：**只把源图重新 `sips` + `iconutil` 是没用的**，问题在图内像素本身，不是 icns 结构或尺寸集。

带图标的 DMG 由 `bash desktop/build-release.sh` 生成。
