# 拾光备忘录

一个 Windows 专用的本地备忘录。无需联网，支持分行记录、自动保存、逐条删除和清空全部记录。

## 安装

从 GitHub Actions 的 `windows-packages` 构建产物中下载：

- `Shiguang-Memo-Setup-1.0.0.exe`：安装版，可选择安装位置。
- `Shiguang-Memo-Portable-1.0.0.exe`：免安装版，直接双击运行。

当前版本不包含自动更新。

发布新版本时，在提交代码后推送版本标签即可自动构建并创建 GitHub
Release：

```powershell
git tag v1.0.0
git push origin v1.0.0
```

## 本地开发

```powershell
npm install
npm start
```

构建 Windows 安装版和免安装版：

```powershell
npm run dist:win
```

构建产物位于 `release/`。

## 网页版本

开发时可以直接双击 `index.html`，或运行 `node serve.js` 后访问
`http://127.0.0.1:8765`。

## 数据与隐私

记录只保存在当前 Windows 用户的本地应用数据目录中，不会上传至网络。数据未加密，请勿存放重要密码或敏感信息。软件不提供自动更新。
