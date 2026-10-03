# 逃离程丽 · ESCAPE CHENGLI

恐怖校园文字冒险游戏。第一章「初见」、第二章「混乱」完整可玩。

作者：叶程丽
协议：CC BY 4.0（署名 4.0 国际）

---

## 一、作品简介

《逃离程丽》是一款纯前端文字冒险游戏。玩家扮演转学生，在诡异安静的校园里逐步揭开「名单」背后的秘密。

- 类型：恐怖 / 悬疑 / 文字冒险
- 玩法：打字机对白 + 分支选项 + 恐惧值驱动 + 小游戏
- 平台：任何现代浏览器
- 技术：纯 HTML / CSS / JavaScript，无后端、无构建

### 核心机制

- 剧情节点：由 story.json / ch2.json 驱动
- 分支选项：每个节点可挂 choices，选择影响变量与结局
- 状态变量：san（恐惧值）、trust、obey、memory、stamina、clue
- 恐惧值：累积到 100 触发「迷失」结局
- 小游戏：拼写 / 听写 / 抄写 / 闪避戒尺（QTE）
- 章节：第一章「初见」、第二章「混乱」
- 特效系统：由剧情 JSON 的 fx 字段驱动
- 存读档：纯前端本地存档（localStorage）

---

## 二、目录结构

site/
- index.html          主页
- disclaimer.html     免责声明页
- loading.html        加载页
- game.html           游戏本体
- story.json          第一章剧情数据
- ch2.json            第二章剧情数据
- chapters.json       章节列表
- images.json         图片别名映射表
- static/css/         全部样式
- static/js/          全部逻辑
- static/data/        小游戏词库
- static/img/         背景 / 立绘 / 素材

---

## 三、核心 JS 说明

- game.js       核心引擎：剧情加载 / 打字机 / 选项 / 变量 / 跳转
- fx.js         特效系统
- settings.js   设置面板
- ui_patch.js   手机端菜单 / 章节选择
- adaptive.js   自适应（100vh / 立绘高度）
- time.js       时间与精力系统
- transform.js  画风转换（清新 → 诡异）
- minigames.js  小游戏引擎
- exam.js       2D 网格考试
- exam3d.js     3D 考试（Three.js）
- puzzle.js     解谜 / 背包 / 提示
- map.js        地图探索
- index2.js     主页滚动动画

---

## 四、运行与部署

本地测试：

    cd site
    python3 -m http.server 8000

浏览器访问 http://127.0.0.1:8000

注意：不能直接双击 HTML 打开，file:// 协议会拦住 fetch。

部署：整个 site/ 就是网站根目录，可放 Cloudflare Pages / GitHub Pages / Netlify / 任何静态服务器。

---

## 五、怎么改剧情

加节点（写进 story.json 的 nodes）：

    "ch1_my_node": {
      "bg": "classroom",
      "sprite": "chengli_normal",
      "lines": [ { "type": "narration", "text": "台词。" } ],
      "next": "下一个节点id"
    }

加选项：

    "choices": [
      { "text": "选项文字", "next": "目标节点id", "effects": { "san": 2 } }
    ]

加特效：

    "fx": [
      { "type": "flashword", "text": "明 天 见" },
      { "type": "glitch" }
    ]

加小游戏：

    "minigame": {
      "type": "spell",
      "opts": { "time": 25 },
      "winNext": "ch1_win",
      "loseNext": "ch1_lose"
    }

---

## 六、版权与协议

本项目采用 CC BY 4.0（署名 4.0 国际）协议。

你可以自由使用、改编、商用本项目。
唯一条件：必须保留原作者署名「叶程丽」，并注明协议来源。

协议全文：https://creativecommons.org/licenses/by/4.0/

---

## 七、免责声明

本作品为个人非商业同人创作，仅供交流娱乐。
人物姓名、角色、身份、经历、对话均为虚构，与现实无关联。
如有雷同，纯属巧合。
含恐怖、惊悚内容，请自行判断是否适合游玩。

---

## 八、鸣谢

- DeepSeek  剧情 · 代码
- 豆包      图片素材
- Termux    运行环境

---

© 2026 叶程丽
