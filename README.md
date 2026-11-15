# 逃离程丽 ESCAPE CHENGLI

**悰城中学 · 教务处 · 存档编号 3.5**

**中式校园悬疑文字冒险 · 纯前端 · 零构建**

作者：**ZHT**　协议：**CC BY 4.0**

---

## 一、这是什么

一款在浏览器里直接玩的**中式校园悬疑文字冒险**。



## 三、玩法

- **点击文字框**推进对白；遇到选项点选即可
- 恐惧值随剧情浮动，作为氛围演出呈现（**3.5 起不再触发死亡结局**）
- 章节中穿插四种课堂小游戏：**拼写 / 听写 / 抄写 / 闪避戒尺**
- 第十章返校日为**考卷式 Boss 战**：真实答题卡涂格，5 题定夺
- 随时**存档 / 读档**，进度保存在你自己的浏览器里

### 3.5 新增的 Galgame 标准操作

| 操作 | 说明 |
|---|---|
| **↶ 回退** | 回看上一句台词，并**连变量一起回滚**；无法跨越已做的选择 |
| **▷ 自动** | 按台词长度自动推进；任意操作即刻打断 |
| **≫ 跳过** | 高速掠过当前场景，到下一个选项自动停住，零副作用 |
| **防误触** | 选项出现后 0.4 秒内的连点会被朱砂「封」印拦下 1.5 秒 |

顶栏三枚按键为**复古机械拨杆**样式，按下有真实的下压行程与状态指示灯。

---

## 四、版本沿革

| 版本 | 内容 |
|---|---|
| **v1.0** | 第一章「名单」完整可玩；打字机对白、分支选项、四种小游戏、恐惧值系统 |
| **v2.0** | 极简黑白改版；免责声明条款化；云存档 |
| **v3.0** | 第十章「放假」上线（约 150 节点）；6+2 结局收集；考卷 Boss 战；100 槽存档与导入导出；调试面板 |
| **v3.1** | 引擎重构：打字机动画逐字丝滑、选项防误触保护、**正式废弃恐惧值死亡设定**、**彻底移除作弊菜单**、底层性能优化与全设备适配 |
| **v3.3** | 全站视觉重构为老式监控 CRT 风；代码模块化拆分；调试面板回归 |
| **v3.5**（当前） | **悰城中学档案换装**；全站动效程序化——Canvas 粉笔灰粒子场、试卷/遗书物理坠落、SVG 血迹书写、红线缝合边框、日光灯频闪、3D 探头视差；主页换装泛黄档案袋材质；剧情界面升级渗墨打字机、撕纸对话框、朱砂封印与机械拨杆 HUD |

---

## 五、目录结构

```
index.html          3.5 电影级开场（血字书写 / 粒子 / 视差 / 缝合）
home.html           游戏主页（档案袋材质 + 粉尘背景）
game.html           剧情界面（渗墨打字机 / 机械拨杆 / 朱砂封印）
loading.html        加载页
disclaimer.html     免责声明
bouncy.html         声控弹力球小游戏

story.json          第一章剧情（36 节点）
ch2.json            第二章剧情（46 节点）
ch3.json            第十章剧情（139 节点 · 8 结局 · Boss 战）
chapters.json       章节列表
images.json         立绘与背景映射

static/css/         index / home / skin(game) / dbg 样式
static/js/          引擎与动效
  ├─ game.js        剧情引擎（单例 rAF 打字机 / 回退 / 自动 / 跳过 / 防误触）
  ├─ save_local.js  存档系统（100 槽 + schema 校验 + 导入导出）
  ├─ endings.js     结局收集与隐藏支线判定
  ├─ minigames.js   四种课堂小游戏
  ├─ boss.js        考卷式 Boss 战
  ├─ fx.js          剧情特效（事件订阅制）
  ├─ intro-anim.js  程序化动效引擎（粒子 / 物理纸张 / 血字 / 缝合 / 视差）
  ├─ game-ui.js     游戏内动效（粉笔灰掉落 / 撕纸边 / 朱砂封印）
  ├─ settings.js    字号 / 速度 / 特效开关（含光敏保护）
  └─ …
static/img/         场景背景（正常 / 诡异悲凉）与立绘
static/data/        小游戏词库（人教版八年级单元词表）
```

---

## 六、运行与部署

**本地运行**（必须走 HTTP，`file://` 会拦截剧情加载）：

```bash
cd 逃离程丽
python3 -m http.server 8000
# 浏览器打开 http://127.0.0.1:8000/
```

**部署**：本作是纯静态目录，扔进任何静态托管即可——

- GitHub Pages：推送到仓库后开启 Pages（本页顶部 GitHub 链接即线上仓库）
- Cloudflare Pages：直接绑定仓库，无需构建命令
- 或任意服务器 / 手机本地（Termux、iSH 等）起一个静态服务

**兼容性**：核心引擎为 ES5，无构建、无框架；推荐 Chrome / Edge / Safari /
Firefox 近两年版本。全站适配 `prefers-reduced-motion`，低端设备自动降级粒子。

---

## 七、怎么改剧情

所有剧情都在 JSON 里，改文字不需要碰引擎。

### 加一个节点

```json
"ch1_my_node": {
  "bg": "classroom",
  "sprite": "chengli_normal",
  "lines": [
    { "type": "narration", "text": "台词写这里。" },
    { "type": "inner",     "text": "（内心 OS 自动套灰色样式。）" }
  ],
  "effects": { "san": 2 },
  "next": "下一个节点id"
}
```

- `bg` / `sprite`：对应 `images.json` 里的别名
- `type`：`narration`（旁白）/ `inner`（内心）/ `dialogue`（对话，带 `speaker`）
- `effects`：`san / trust / obey / memory / stamina / clue`
- `fx`：数组，见 `static/js/fx.js`（glitch、whisper、heartbeat、vignette…）
- `page: true`：整屏大字节点；`sleep` / `stamina` / `time`：时段系统
- `minigame`：`{ "type": "spell", "winNext": "...", "loseNext": "..." }`
- `boss: true`：进入考卷 Boss 战（题目在 `static/js/boss.js`）

### 加一个选项

```json
"choices": [
  { "text": "选项文字", "next": "目标节点", "effects": { "trust": 2 } },
  { "text": "直接结局", "ending": { "id": "自定义id", "title": "结局名", "desc": "结语" } }
]
```

> 自定义结局 id 需同步登记进 `static/js/endings.js` 的白名单才会进收集册。

### 加一个章节

1. 新建 `chX.json`，结构与 `story.json` 相同（`meta.start` 指向首节点）
2. 在 `chapters.json` 里登记 `{ "id": "chX", "title": "第 X 章 · 标题", "available": true }`
3. 玩家即可在游戏内「菜单 → 章节选择」直接进入

---

## 八、版权

本项目采用 **CC BY 4.0** 协议。

你可以自由使用、改编、商用，唯一条件：保留原作者署名 **ZHT**。

协议全文：<https://creativecommons.org/licenses/by/4.0/>

---

## 九、免责

个人非商业同人创作，仅供交流娱乐。

人物、角色、身份、剧情均为虚构，与现实中的任何学校、任何人无关。

含恐怖、惊悚演出，请自行判断是否适合游玩；全站提供
`prefers-reduced-motion` 与「关闭恐怖特效」开关，光敏不适者请开启后游玩。

---

## 十、鸣谢

**Engine Powered by:** DeepSeek4.1Flash / Tencent HY4 / Qwen3.8 / Kimi 3.1K

**Special Thanks:** DeepSeek / 腾讯混元 / 阿里千问 / GitHub

剧情 · 代码：DeepSeek　图片素材：豆包　运行环境：Termux
