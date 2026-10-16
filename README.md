# 逃离 程丽

**恐怖校园文字冒险 · 纯前端**

作者：**ZHT**
协议：**CC BY 4.0**

---

## 这是什么

一款在浏览器里玩的**恐怖校园文字冒险**。

你是转学生，在一所安静得不太对劲的学校里，慢慢发现一份「名单」背后的东西。

不用下载，不用安装。打开网页，就能玩。

---

## 怎么玩

- **点击文字框**继续对话
- **遇到选项**，点一下做选择
- **恐惧值**会随剧情变化，攒满会触发坏结局
- 中途会插入**小游戏**：拼写、听写、抄写、闪避
- 随时**存档 / 读档**，进度存在你自己浏览器里

---

## 亮点

- **打字机对白** —— 一字一字浮出来
- **分支剧情** —— 每个选择都有后果
- **恐惧值系统** —— 情绪影响结局
- **章节切换** —— 从第一章玩到第十章
- **多结局收集** —— 找齐所有结局
- **画风切换** —— 从日常慢慢滑向诡异
- **多线路部署** —— 三条线路自动测速，选快的进

---

## 剧情数据

游戏支持 **三章**：

| 章节 | 文件 | 状态 |
|---|---|---|
| 第一章 · 初见 | `story.json` | 完整可玩 |
| 第二章 · 混乱 | `ch2.json` | 完整可玩 |
| 第十章 · 放假 | `ch3.json` | 完整可玩 |

章节列表写在 `chapters.json`。

---

## 目录

```

index.html        入口页（选择线路）
home.html         主页
game.html         游戏本体
loading.html      加载页
disclaimer.html   免责声明
bouncy.html       弹力球小游戏

story.json        第一章剧情
ch2.json          第二章剧情
ch3.json          第十章剧情
chapters.json     章节列表
images.json       图片映射

static/css/       样式
static/js/        逻辑
static/img/       背景 / 立绘 / 素材
static/data/      小游戏词库

```

---

## 怎么改剧情

### 加一个节点

打开 `story.json`，在 `nodes` 里加一条：

```json
"ch1_my_node": {
  "bg": "classroom",
  "sprite": "chengli_normal",
  "lines": [
    { "type": "narration", "text": "台词写这里。" }
  ],
  "next": "下一个节点id"
}
```

· bg：背景图别名（对应 images.json）
· sprite：立绘别名
· lines：对话内容，逐句显示
· next：下一节点 id

加一个选项

```json
"choices": [
  {
    "text": "选项文字",
    "next": "目标节点id",
    "effects": { "san": 2 }
  }
]
```

· effects：改变量（san / trust / obey / memory / stamina / clue）

加特效

```json
"fx": [
  { "type": "flashword", "text": "明 天 见" },
  { "type": "glitch" }
]
```

支持的 fx 类型见 static/js/fx.js。

加小游戏

```json
"minigame": {
  "type": "spell",
  "opts": { "time": 25 },
  "winNext": "ch1_win",
  "loseNext": "ch1_lose"
}
```

支持的小游戏：spell（拼写）、dictation（听写）、copy（抄写）、qte（闪避）。

加一个章节

1. 新建一个 chX.json，格式同 story.json
2. 在 chapters.json 里加一条：

```json
{
  "id": "ch4",
  "title": "第四章 · 标题",
  "available": true
}
```

---

本地看

```bash
cd site
python3 -m http.server 8000
```

浏览器开 http://127.0.0.1:8000。

不要直接双击 HTML —— file:// 协议会拦住文件加载。

---

版权

本项目采用 CC BY 4.0 协议。

你可以自由使用、改编、商用。

唯一条件：保留原作者署名 ZHT。

协议全文：https://creativecommons.org/licenses/by/4.0/

---

免责

个人非商业同人创作，仅供交流娱乐。

人物、角色、身份、剧情均为虚构，与现实无关。

如有雷同，纯属巧合。

含恐怖、惊悚内容，请自行判断是否适合游玩。

---

鸣谢

· DeepSeek —— 剧情 / 代码
· 豆包 —— 图片素材
· Termux —— 运行环境

---

<sub>© 2026 ZHT · 保留所有权利</sub>

```