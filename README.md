# Claude 私人表情包（37 张）

这个文件夹可以直接上传到 GitHub，再通过 jsDelivr 让 Claude 在电脑和手机上访问图片。

## 第一次安装

1. 登录 GitHub，点击右上角 `+` → `New repository`。
2. 仓库名建议填写 `claude-stickers`。
3. 必须选择 `Public`，然后点击 `Create repository`。
4. 在新仓库里点击 `uploading an existing file`，把本文件夹里的所有内容拖进去并提交。
5. 等待约 1～3 分钟，让 jsDelivr 同步。
6. 打开 `CLAUDE_USER_PREFERENCES.md`，把两处占位符替换掉：
   - 本仓库已经配置为 `aubreywu0-source/claude-stickers`，无需再替换地址。
7. 将替换后的全文复制到 Claude 的 User Preferences（用户偏好）中。
8. 彻底退出并重新打开 Claude，最好新建一个对话测试：`给我发一个想我的表情包`。

## 检查是否上传成功

把下面地址里的用户名和仓库名换成自己的，再在浏览器打开：

```text
https://cdn.jsdelivr.net/gh/aubreywu0-source/claude-stickers@main/stickers/18-miss-you.jpg
```

能看到“想你了”图片，就说明 Claude 也能取得图片。

## 手机能不能用

- 图片已经放在公网 CDN 上，手机可以访问。
- 同一个 Claude 账号的 User Preferences 通常会同步。
- 但“直接显示成图片”还取决于手机端是否有教程里使用的 `visualize:show_widget` 工具。没有该工具时，Claude仍可发 CDN 链接，但可能只显示为可点击链接。
- 这套表情包本身不依赖你的电脑开机；和当前那个本地运行的小红书 MCP 不一样。

## 文件说明

- `stickers/`：37 张已经统一命名的图片。
- `CLAUDE_USER_PREFERENCES.md`：复制给 Claude 的完整规则。
- `STICKER_INDEX.md`：人类可读的表情含义表。
- `stickers.json`：机器可读的索引，方便以后接入 MCP 或自动管理。
- `UPDATE_GUIDE.md`：以后自己增加表情包的步骤。

## 隐私提醒

GitHub Public 仓库里的图片任何知道地址的人都能看到。不要上传私密照片、证件或包含敏感信息的截图。
