import Cocoa
import WebKit
import Network

final class LocalServer {
    let root: URL
    var listener: NWListener?
    let queue = DispatchQueue(label: "paperroom.server", attributes: .concurrent)
    init(root: URL) { self.root = root }
    func start(ready: @escaping () -> Void, failed: @escaping (String) -> Void) {
        do {
            let p = NWParameters.tcp
            p.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: 49173)
            let l = try NWListener(using: p)
            listener = l
            l.stateUpdateHandler = { state in
                switch state { case .ready: DispatchQueue.main.async(execute: ready)
                case .failed(let e): DispatchQueue.main.async { failed(e.localizedDescription) }
                default: break }
            }
            l.newConnectionHandler = { [weak self] c in c.start(queue: self?.queue ?? .global()); self?.receive(c, Data()) }
            l.start(queue: queue)
        } catch { failed(error.localizedDescription) }
    }
    func receive(_ c: NWConnection, _ buffer: Data) {
        c.receive(minimumIncompleteLength: 1, maximumLength: 16384) { [weak self] data, _, done, error in
            guard let self = self else { c.cancel(); return }
            var b = buffer; if let data = data { b.append(data) }
            if b.count > 32768 { c.cancel(); return }
            if let request = String(data: b, encoding: .utf8), request.contains("\r\n\r\n") { self.respond(c, request) }
            else if !done && error == nil { self.receive(c, b) } else { c.cancel() }
        }
    }
    func respond(_ c: NWConnection, _ request: String) {
        let pieces = request.components(separatedBy: "\r\n")[0].split(separator: " ")
        guard pieces.count >= 2, ["GET", "HEAD"].contains(String(pieces[0])) else { c.cancel(); return }
        let raw = String(pieces[1]).components(separatedBy: "?")[0].removingPercentEncoding ?? ""
        let path = raw == "/" ? "index.html" : String(raw.drop(while: { $0 == "/" }))
        let file = root.appendingPathComponent(path).standardizedFileURL.resolvingSymlinksInPath()
        let allowed = file.path.hasPrefix(root.standardizedFileURL.resolvingSymlinksInPath().path + "/")
        let body = allowed ? try? Data(contentsOf: file) : nil
        let types = ["html":"text/html; charset=utf-8", "js":"text/javascript; charset=utf-8", "css":"text/css", "png":"image/png", "svg":"image/svg+xml", "json":"application/json"]
        let payload = body ?? Data("Not found".utf8)
        let status = body == nil ? "404 Not Found" : "200 OK"
        let header = "HTTP/1.1 \(status)\r\nContent-Type: \(types[file.pathExtension] ?? "application/octet-stream")\r\nContent-Length: \(payload.count)\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n"
        var output = Data(header.utf8); if pieces[0] == "GET" { output.append(payload) }
        c.send(content: output, completion: .contentProcessed { _ in c.cancel() })
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKDownloadDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: WKWebView!
    var server: LocalServer!
    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu(); let item = NSMenuItem(); menu.addItem(item)
        let appMenu = NSMenu(); appMenu.addItem(withTitle: "关于纸间", action: #selector(about), keyEquivalent: "")
        appMenu.addItem(.separator()); appMenu.addItem(withTitle: "退出纸间", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"); item.submenu = appMenu
        let editItem = NSMenuItem(); menu.addItem(editItem); let edit = NSMenu(title: "编辑")
        for (title, selector, key) in [("撤销", "undo:", "z"), ("剪切", "cut:", "x"), ("复制", "copy:", "c"), ("粘贴", "paste:", "v"), ("全选", "selectAll:", "a")] { edit.addItem(withTitle:title, action:Selector(selector), keyEquivalent:key) }; editItem.submenu=edit
        NSApp.mainMenu = menu
        let config = WKWebViewConfiguration(); config.websiteDataStore = .default(); config.preferences.javaScriptCanOpenWindowsAutomatically = false
        config.userContentController.add(self, name: "exportBackup")
        web = WKWebView(frame: .zero, configuration: config); web.navigationDelegate = self
        window = NSWindow(contentRect: NSRect(x:0,y:0,width:1280,height:820),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
        window.title="纸间 Paperroom";window.minSize=NSSize(width:700,height:520);window.contentView=web;window.center();window.makeKeyAndOrderFront(nil);NSApp.activate(ignoringOtherApps:true)
        server=LocalServer(root:Bundle.main.resourceURL!.appendingPathComponent("web"))
        server.start(ready:{ self.web.load(URLRequest(url:URL(string:"http://127.0.0.1:49173/")!)) },failed:{ message in let alert=NSAlert();alert.messageText="纸间暂时无法启动";alert.informativeText="请确认没有其他纸间窗口运行，然后重新打开。\n"+message;alert.runModal();NSApp.terminate(nil) })
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.host == "127.0.0.1", message.frameInfo.securityOrigin.port == 49173,
              let body = message.body as? [String:String], let text = body["text"] else { return }
        let panel = NSSavePanel(); panel.nameFieldStringValue = "paperroom-backup.json"
        panel.beginSheetModal(for: window) { result in
            guard result == .OK, let url = panel.url else { return }
            do { try text.write(to: url, atomically: true, encoding: .utf8) }
            catch { let alert = NSAlert(); alert.messageText = "备份保存失败"; alert.informativeText = error.localizedDescription; alert.runModal() }
        }
    }
    @objc func about(){let a=NSAlert();a.messageText="纸间 Paperroom 1.0.0 RC1";a.informativeText="Apple 芯片版\n笔记仅保存在本机。卸载或清理应用数据前，请先导出备份。";a.runModal()}
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool { true }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.shouldPerformDownload { decisionHandler(.download); return }
        guard let url=navigationAction.request.url else {decisionHandler(.cancel);return}
        if url.host == "127.0.0.1" && url.port == 49173 || url.scheme == "blob" {decisionHandler(.allow)} else {decisionHandler(.cancel);if ["http","https"].contains(url.scheme ?? ""){NSWorkspace.shared.open(url)}}
    }
    func webView(_ webView:WKWebView,navigationAction:WKNavigationAction,didBecome download:WKDownload){download.delegate=self}
    func download(_ download:WKDownload,decideDestinationUsing response:URLResponse,suggestedFilename:String,completionHandler:@escaping(URL?)->Void){let panel=NSSavePanel();panel.nameFieldStringValue=suggestedFilename;panel.beginSheetModal(for:window){result in completionHandler(result == .OK ? panel.url : nil)}}
}
let app=NSApplication.shared
let delegate=AppDelegate();app.delegate=delegate;app.setActivationPolicy(.regular);app.run()
