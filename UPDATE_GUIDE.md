# 以后自己添加新表情

## 最简单的方法

1. 先把图片改成英文文件名，只用小写字母、数字和连字符，例如：`38-good-night.jpg`。
2. 图片建议使用 `.jpg`、`.png`、`.webp` 或 `.gif`，不要直接上传 HEIC。
3. 打开 GitHub 的 `stickers` 文件夹。
4. 点击 `Add file` → `Upload files`，选择新图片并提交。
5. 在 `CLAUDE_USER_PREFERENCES.md` 的清单中补一行，例如：

```text
- 晚安、准备睡觉：`38-good-night.jpg`
```

6. 把更新后的偏好文字重新复制到 Claude User Preferences。
7. 等待 jsDelivr 同步；通常几分钟内可用。若同名图片被替换但仍显示旧图，建议使用新文件名，而不是覆盖旧文件。

## 新图片的固定地址

```text
https://cdn.jsdelivr.net/gh/aubreywu0-source/claude-stickers@main/stickers/新文件名.jpg
```

如果以后数量很多，可以只在 `stickers.json` 中维护索引，再让 MCP 或自动化工具读取它。
