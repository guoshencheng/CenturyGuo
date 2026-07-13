---
title: "从即梦里的一张图，到一整套 AI 绘本流水线"
date: 2026-07-13
tags: ["技术复盘", "AI", "绘本生成"]
description: "即梦上线后，我意识到 AI 出图正在从玩具走向产品。家里有小孩，我便想：能不能让 AI 把一本绘本从故事、分镜到出图全做完？38 天后，这个念头变成了一套工作流。"
---

![赛博朋克风格：AI 绘本生成流水线](/images/blog/moricho-project-retrospective/00-wechat-cover.webp)

## 一、一张图撬动的念头

2024 年 8 月，字节的即梦 AI 正式上线。AI 出图开始从极客圈里的新鲜玩具，走向普通用户也能直接使用的消费产品。

我第一时间开了会员。想法很朴素：家里有个小孩，每晚都要讲绘本，市面上的题材翻来覆去就是「一只小猫去钓鱼」「小熊学会分享」，讲到最后，连我自己都会背。如果 AI 能为他专门生成一本绘本——故事来自他当天遇到的事，画风也能按我的想法来——那张图背后就藏着一个完整的产品。

但即梦只解决了**最后一公里**：把一段文字描述变成一张画。前面的故事怎么写、分镜怎么拆、每个分镜该用什么镜头，以及人物在第 3 页和第 7 页怎么保持同一身衣服，它都解决不了。

我当时的工作流是这样的：

<svg viewBox="0 0 520 540" xmlns="http://www.w3.org/2000/svg" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px;">
  <defs>
    <marker id="arrow1" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8"/>
    </marker>
    <filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.06"/></filter>
  </defs>

  <!-- Step 1 -->
  <rect x="20" y="10" width="480" height="42" rx="8" fill="#f1f5f9" filter="url(#shadow)"/>
  <text x="40" y="28" font-size="11" fill="#64748b">晚上 9 点</text>
  <text x="40" y="43" font-size="12" fill="#1e293b">我在 ChatGPT 输入：「一只小猫去钓鱼，3 岁小孩听，要有教育意义」</text>

  <line x1="260" y1="52" x2="260" y2="72" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow1)"/>

  <!-- Step 2 -->
  <rect x="20" y="76" width="480" height="32" rx="8" fill="#f8fafc" filter="url(#shadow)"/>
  <text x="40" y="96" font-size="12" fill="#1e293b">ChatGPT 回一段 300 字故事</text>

  <line x1="260" y1="108" x2="260" y2="128" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow1)"/>

  <!-- Step 3 -->
  <rect x="20" y="132" width="480" height="42" rx="8" fill="#f1f5f9" filter="url(#shadow)"/>
  <text x="40" y="150" font-size="11" fill="#64748b">我手动抄到下一个 prompt</text>
  <text x="40" y="165" font-size="12" fill="#1e293b">「基于上面故事，拆成 8 个分镜，每个一句话」</text>

  <line x1="260" y1="174" x2="260" y2="194" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow1)"/>

  <!-- Step 4 -->
  <rect x="20" y="198" width="480" height="32" rx="8" fill="#f8fafc" filter="url(#shadow)"/>
  <text x="40" y="218" font-size="12" fill="#1e293b">ChatGPT 又回了 8 个分镜</text>

  <line x1="260" y1="230" x2="260" y2="250" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow1)"/>

  <!-- Step 5 -->
  <rect x="20" y="254" width="480" height="42" rx="8" fill="#f1f5f9" filter="url(#shadow)"/>
  <text x="40" y="272" font-size="11" fill="#64748b">我把第 3 个分镜抄进即梦</text>
  <text x="40" y="287" font-size="12" fill="#1e293b">「小猫坐在河边钓鱼，浅棕色毛发，绿色眼睛…」</text>

  <line x1="260" y1="296" x2="260" y2="316" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow1)"/>

  <!-- Step 6 -->
  <rect x="20" y="320" width="480" height="32" rx="8" fill="#f8fafc" filter="url(#shadow)"/>
  <text x="40" y="340" font-size="12" fill="#1e293b">等 45 秒出图</text>

  <line x1="260" y1="352" x2="260" y2="372" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arrow1)"/>

  <!-- Step 7 -->
  <rect x="20" y="376" width="480" height="32" rx="8" fill="#f8fafc" filter="url(#shadow)"/>
  <text x="40" y="396" font-size="12" fill="#1e293b">导出图片，发到家庭群里</text>

  <!-- Summary -->
  <rect x="120" y="440" width="280" height="36" rx="18" fill="#fef3c7" stroke="#f59e0b" stroke-width="1"/>
  <text x="260" y="463" font-size="13" fill="#b45309" text-anchor="middle" font-weight="600">耗时 30—40 分钟，风格不统一</text>
</svg>

整个过程要花 30—40 分钟，最后得到 8 张风格各异的图：**小猫在第 3 页还是绿眼睛，第 5 页变成了蓝眼睛，第 7 页干脆变成了一只狗**。

那晚给孩子讲完故事，我盯着这几张图开始想：**能不能做个工具，把这些步骤串起来？**

moricho 就起于这个念头。那时我没想过要做一个 AI 绘本产品，只想**把自己正在忍受的人工流程自动化**。

项目从念头变成代码，再从代码长成产品，恰好赶上 AI 行业最热闹的半年。38 天后，它定型为一套完整的工作流：输入一句话，自动生成一整套可打印的分镜图片。这篇文章记录的，就是「我和 AI 聊天」如何一步步变成「AI 自己跑流程」。

## 二、最早的尝试：把 AI 塞进聊天框

最早的版本直接照搬我当时的人工流程——三个聊天框，分别对应三步。

<svg viewBox="0 0 520 140" xmlns="http://www.w3.org/2000/svg" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px;">
  <rect x="8" y="8" width="160" height="124" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
  <rect x="8" y="8" width="160" height="36" rx="10" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1"/>
  <rect x="8" y="34" width="160" height="10" fill="#eff6ff"/>
  <text x="88" y="30" text-anchor="middle" font-size="12" fill="#3b82f6" font-weight="600">聊天框 1</text>
  <text x="88" y="68" text-anchor="middle" font-size="11" fill="#475569">和 AI 聊</text>
  <text x="88" y="84" text-anchor="middle" font-size="11" fill="#475569">故事概要</text>
  <rect x="28" y="98" width="120" height="24" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="88" y="114" text-anchor="middle" font-size="10" fill="#94a3b8">输入框</text>

  <rect x="180" y="8" width="160" height="124" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
  <rect x="180" y="8" width="160" height="36" rx="10" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1"/>
  <rect x="180" y="34" width="160" height="10" fill="#f0fdf4"/>
  <text x="260" y="30" text-anchor="middle" font-size="12" fill="#22c55e" font-weight="600">聊天框 2</text>
  <text x="260" y="68" text-anchor="middle" font-size="11" fill="#475569">和 AI 聊</text>
  <text x="260" y="84" text-anchor="middle" font-size="11" fill="#475569">角色物品场景</text>
  <rect x="200" y="98" width="120" height="24" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="260" y="114" text-anchor="middle" font-size="10" fill="#94a3b8">输入框</text>

  <rect x="352" y="8" width="160" height="124" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
  <rect x="352" y="8" width="160" height="36" rx="10" fill="#fef3c7" stroke="#fde68a" stroke-width="1"/>
  <rect x="352" y="34" width="160" height="10" fill="#fef3c7"/>
  <text x="432" y="30" text-anchor="middle" font-size="12" fill="#f59e0b" font-weight="600">聊天框 3</text>
  <text x="432" y="68" text-anchor="middle" font-size="11" fill="#475569">和 AI 聊</text>
  <text x="432" y="84" text-anchor="middle" font-size="11" fill="#475569">分镜详情</text>
  <rect x="372" y="98" width="120" height="24" rx="6" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="432" y="114" text-anchor="middle" font-size="10" fill="#94a3b8">输入框</text>
</svg>

每个聊天框下面都有输入框：用户打字，AI 回复。我花了一周调 prompt，又把角色、物品和场景描述塞进每一条分镜 prompt，只为让 AI 「记得」第 3 页的小猫和第 1 页是同一只。

**这是 chat-based 阶段**——一切都围绕「人和 AI 的对话」展开：

- **三个 step 各自一个聊天框**：UI 表达的是「你正在和 AI 对话」
- **AI 的输出嵌在消息流里**：用户收到的是一段夹着 JSON 的 markdown
- **生成以一问一答为单位**：每按一次回车，就发起一次完整的 prompt round-trip

接下来的一周，我不断补错误处理、重试按钮和 markdown 渲染，也把聊天 UI 做得越来越漂亮。

但聊天框有一个我起初没有意识到的根本问题：

> **聊天框是给对话设计的，不是给生成式任务设计的。**

对话的节奏是「我问你答」，生成式任务的节奏则是「我给出输入，系统返回结构化结果」。**它们在 UI 上看起来相似，背后的用户期待却完全不同**。

聊天框的失败模式是这样的：

1. 用户输入：「一只小猫去钓鱼，要有教育意义」
2. AI 思考一会儿，回一段 markdown，里面夹了一个 JSON
3. JSON 偶尔格式不对，UI 报错「数据解析失败」
4. 用户点「重新生成」，AI 又重新跑一遍，可能还是不对
5. 用户开始怀疑「是不是我 prompt 写得不好」，于是开始 Google 怎么写更好的 prompt

**最后，用户开始为模型的不稳定背锅**。程序员或许愿意研究 JSON 和 prompt，但家长只想给孩子做一本绘本。他们不该先成为 prompt engineer。

为了缓解这个问题，我把完整的自由文本输入框拆成了几个表单字段。用户不用再组织一整段 prompt，只需选择年龄段、主题和风格，后端负责把这些字段拼起来。这是 chat-based 阶段走向工作流的第一个信号：**让用户回到需求提出者的位置，把 prompt 留给系统**。

## 三、聊天框撑不住了：multi-tool 重构

实现方式随之迎来一次关键升级：AI 不再直接吐出 JSON，而是**调用工具**。

```typescript
// 之前的 prompt
"请生成一个故事概要，包含 title、brief、summary 三个字段，输出 JSON"

// 之后的 tool-call
tool: updateStorySummary, params: { title, brief, summary }
tool: updateStoryElements, params: { characters, keyItems, ... }
tool: updateStoryboardDetails, params: { details: [...] }
```

LLM 不再负责「写出答案」，而是通过函数调用提交结构化参数。框架会校验每次工具调用；不符合 schema 的参数直接被拒绝，再进入重试流程。

这一步让聊天框的稳定性有了飞跃。但**聊天框本身的形态没变**——用户还是在和 AI 对话，只是 AI 的话语变得更稳定了。

接下来的 8 天，聊天体系又长出了若干零件：

- 完成回调：AI 聊完之后回调，把数据填到数据面板
- 数据支持：聊天消息携带故事状态
- 多工具混用：支持多种 tool 混合调用
- 快速提示词按钮：减少用户写 prompt 的负担
- 消息处理统一：减少重复逻辑
- 风格管理：把视觉风格的配置集中起来

这些功能补齐后，聊天 UI 已经很完整：三个步骤都有聊天区、快捷提示词、数据面板、markdown 渲染和复制按钮。**单看功能清单，它已经到了可以上线的程度**。

但我知道它不对劲。

用户在第 2 步和 AI 聊完之后，必须点「下一步」才能进入第 3 步。这个按钮承载了太多隐含含义：它表达的不是「继续聊」，而是「当前阶段已经完成，准备进入下一道工序」。可它偏偏藏在聊天框的角落里，用户很难从界面上理解这种状态变化。

更麻烦的是，三个聊天步骤彼此独立。第 2 步拿不到第 1 步的完整故事概要，第 3 步也拿不到第 2 步的完整角色和物品描述。LLM 每到一个新步骤都得重新理解上下文，用户则被迫反复提醒它「记住前面的内容」。

这就是聊天框在这类任务中的根本局限：**它把一条连续的生成流程切成了碎片，每块碎片都要重新建立上下文**。

## 四、转折：从聊天到工作流

第十五天前后，聊天框退到了幕后，**工作流正式登场**。

新版本的页面叫「编辑页」，文件名里开始出现 `edit-story` 这种命名。聊天框不见了，**进度条**出现了。

<svg viewBox="0 0 520 130" xmlns="http://www.w3.org/2000/svg" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px;">
  <!-- Step boxes & connectors -->
  <rect x="10" y="20" width="110" height="48" rx="8" fill="#dcfce7" stroke="#22c55e" stroke-width="1.5"/>
  <text x="65" y="42" text-anchor="middle" font-size="10" fill="#15803d">Step 1: 概要</text>
  <text x="65" y="57" text-anchor="middle" font-size="11" fill="#166534" font-weight="600">✓ 完成</text>
  <line x1="120" y1="44" x2="138" y2="44" stroke="#22c55e" stroke-width="2"/>

  <rect x="140" y="20" width="110" height="48" rx="8" fill="#dcfce7" stroke="#22c55e" stroke-width="1.5"/>
  <text x="195" y="42" text-anchor="middle" font-size="10" fill="#15803d">Step 2: 元素</text>
  <text x="195" y="57" text-anchor="middle" font-size="11" fill="#166534" font-weight="600">✓ 完成</text>
  <line x1="250" y1="44" x2="268" y2="44" stroke="#22c55e" stroke-width="2"/>

  <rect x="270" y="20" width="130" height="48" rx="8" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="335" y="38" text-anchor="middle" font-size="10" fill="#1d4ed8">Step 3: 分镜</text>
  <text x="335" y="55" text-anchor="middle" font-size="11" fill="#1e40af" font-weight="600">▸ 正在生成...</text>
  <line x1="400" y1="44" x2="418" y2="44" stroke="#e2e8f0" stroke-width="2"/>

  <rect x="420" y="20" width="90" height="48" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5"/>
  <text x="465" y="42" text-anchor="middle" font-size="10" fill="#94a3b8">Step 4: 出图</text>
  <text x="465" y="57" text-anchor="middle" font-size="11" fill="#cbd5e1">等待中</text>

  <!-- Progress bar -->
  <rect x="10" y="90" width="500" height="8" rx="4" fill="#e2e8f0"/>
  <rect x="10" y="90" width="300" height="8" rx="4" fill="#3b82f6"/>
</svg>

页面顶部变成了**进度条**，聊天输入框消失了。每一步都遵循同一种工作方式：

1. 用户点击「下一步」，后端执行工具调用并把结果写入数据库
2. 编辑页展示角色、物品、场景和分镜等**结构化数据**
3. 某项数据有问题时可以单独修改，不必重跑整个流程
4. 修改完成后点击「保存」，继续下一步

用户终于不用再为下一轮对话准备 prompt：每个步骤都有明确的输入和输出，拼装 prompt 的工作交给系统。

随后几天，我又把 4 个步骤精简成 3 个（概要 → 拆解 → 分镜），页面只展示当前阶段的进度；同时重新设计按钮，让「下一步」成为视觉上最明确的操作。

到这里，它在形态上已经不再是聊天产品，而是一个 AI 驱动的内容创作工具：用一句初始 prompt 启动流程，再在结构化的编辑界面里修正结果。

不过，产品形态只是站稳了。**真正难的工作才刚开始**。

## 五、工作流定型之后的九个坎

工作流定型之后，AI 生绘本这件事从「能不能跑通」变成了「跑出来的能不能用」。下面这九个坎不是按时间顺序排的，是按一个绘本从第一页到最后一页生成时会撞到的顺序排的——**每解决一个坎，绘本就离「能给孩子看」更近一步**。

### 第一个坎：故事和概念混在一起

最早上线的版本只有一个表单：「输入你的故事提示」。AI 收到一句话，回一份概要，回一份角色物品场景，回一份分镜。

问题在第三天出现。一个用户输入「教小孩认识颜色」，AI 返回了一个完整的小兔子冒险故事，因为它的训练数据里，「绘本」几乎等于「故事」。

我做了第一个分类：把绘本分成**故事类**和**非故事类**。

非故事类的代表是认知绘本。它做的是「一只小熊，红色的苹果，蓝色的鲸鱼，黄色的太阳」，**没有起承转合，只有一个概念序列**。这是认知心理学里的「重复 + 视觉化」原则——三岁小孩学颜色，靠的是看同一只熊在不同画面里指认不同颜色的东西。

从代码上看，这是一行配置：

```typescript
isStoryBased: boolean  // 故事类 vs 非故事类
```

从产品上看，这是整个项目最重要的一个 yes/no。**一个 yes/no 决定后面所有的 prompt 走向**：

- 故事类 → 走「三幕结构 → 情绪曲线 → 高潮 → 解决」
- 非故事类 → 走「一本书一个概念 → 每页一个知识点 → 文本重复有节奏」

最终的分类有十种：认知/概念、英语/语言启蒙、快速故事、情绪教育、社交、价值观/品格、习惯养成、成长节点、睡前、科普。每一种分类都有自己独立的内容创作指南、分镜拆分指南和节奏模板。这不是数据库配置，这是**儿童编辑学的目录学**。

### 第二个坎：规则写进 prompt，不等于模型会稳定执行

分类体系落地后，新的失败很快出现。我已经在 prompt 里写明「情绪类绘本只保留一个核心情绪」，AI 却仍然生成了一篇「小熊学会分享」：分享、勇气、礼貌、父子情全挤在同一个故事里。

这暴露出 LLM 的一个特点：**读懂规则，不等于每次都能稳定地执行规则**。

我的解法，是把要求拆成一组生成前的检查步骤，让模型在输出故事前逐项确认。下面是故事概要阶段的检查清单：

```
1. 唯一核心主题：明确故事只表达一个核心（怕黑、分享、勇气）
2. 适用年龄：根据年龄段决定语言难度与冲突深度
3. 主角设定：限定为一个主角，赋予可成长的小缺点作为剧情起点
4. 一件事件：围绕单一事件展开情节
5. 情绪曲线：设计起点→上升→高峰→缓和→落点的情绪波形
6. 三幕结构：开头（主角与触发事件）/ 中段（困扰推进）/ 结尾（转折与落地）
7. 可画化内容：所有描述都能直接被画面呈现
8. 节奏模板：根据主题匹配节奏
9. 故事完整性检查
```

**这里所谓的「思维链」，更接近一份显式的生成检查清单**：先确认主题、年龄、事件、情绪与可画性，再开始输出结果。它不能保证模型永不犯错，却能显著减少遗漏。

分镜阶段也有一份自己的 10 步检查清单：

```
1. 总页数确认：6-12 页或 24-32 页
2. 一页一个动作/情绪点
3. 节奏分区（起→承→转→合）：1-2 引入，3-5 加深，6-7 高潮，8-9 转折，10-12 落地
4. 跨页逻辑：情绪高潮用跨页或全幅大图
5. 画面镜头：近景强调情绪 / 中景展示行为 / 全景营造氛围
6. 页面转场：动作连续、视线方向统一
7. 可画性检查
8. 节奏控制：快→慢→快→静
9. 翻页体验：每页结尾设置推动翻页的悬念或动作未完成点
10. 分镜总检
```

注意第 9 条：「每页结尾设置推动翻页的悬念或动作未完成点」。**这是绘本编辑的专业技巧**——好的绘本在翻页的瞬间让孩子「想往下看」，靠的就是最后一格画面里那只小猫的爪子伸向画面之外、或者那只小狗的耳朵突然竖起来。

模型未必会主动补上这条规则；把它明确写进检查清单，执行结果才开始稳定下来。

### 第三个坎：人物会忘事

早期版本把「角色详细描述」「物品详细描述」「场景详细描述」**逐字逐句地拼进每一条分镜 prompt 里**。

这是基于一个朴素的想法：**给 AI 看一遍，它记得更牢**。

这套朴素做法很快被现实打脸。绘本通常有 12 页，生成到后半段时，模型可能漏掉前文里的稳定特征：第 1 页的小猫还是绿眼睛，到了第 7 页就换了颜色；第 3 页的小狗穿着蓝色背心，第 11 页却像从没穿过。**上下文窗口能容纳信息，却不保证模型会在每次生成时准确提取并遵守所有细节**。

最直接的办法，是把角色描述复制 12 遍，分别塞进每一条分镜 prompt。

代价也很直接：12 个分镜都附带角色、物品和场景描述，输入长度从约 1k tokens 涨到 8k tokens。调用成本和延迟都随之上升，真正属于当前分镜的信息反而被淹没在重复文本里。

解法是数据库层面的重构：把 Story 单表的 `storyData` JSON 字段拆成几张独立表——故事表、元素表（人物/物品/场景）、分镜表、资源表、任务表。每个元素有自己独立的描述字段。

但光拆表还不够。要让 AI 在第 7 页也记得第 1 页的眼睛颜色，我做了一件更狠的事：把工具描述里的指令从「请生成符合角色的分镜」改成 **「必须逐条摘录初步拆解中对应人物的名称与完整描述」**。

「**必须**逐条摘录」这五个字，是被无数次「AI 忘了角色特征」打出来之后刻进工具描述的：

```
人物的详细信息描述。必须逐条摘录初步拆解中对应人物的名称与完整描述。
包含：人物外貌特征、衣着打扮等稳定特征。
人物的即时动作/表情/情绪要写在 detailedDescription 中。
```

这种带「必须」字样的工具描述在数据建模模块里占了大约一半篇幅。

### 第四个坎：分镜描述不能既静态又动态

我给每个分镜加了一个新字段：`narration`，最长 10 个字。

为什么是 10 个字？因为绘本的旁白是给三岁小孩听的——或者说，是给父母念给三岁小孩听的。**「小猫轻轻放下了鱼竿」这种 9 字句子已经是上限**。

但加旁白字段的过程暴露了一个隐藏的设计问题：分镜的描述到底应该包含什么？

之前的分镜描述字段同时承担了两个角色：

| 角色 | 内容 | 本质 | 变化频率 |
|-----|------|------|---------|
| 场景环境 | 环境布局、光线、天气 | 静态 | 跨页一致 |
| 人物动作 | 小猫在做什么、发生了什么事件 | 动态 | 每页不同 |

AI 写出来的结果经常混在一起：「小猫坐在河边的石头上，河岸边有几块石头」。**这句话既是场景也是动作，但分镜是关于动作的，场景是关于环境的**。

于是分镜描述字段被明确分成三个：

- 场景描述：纯场景，**禁止**包含人物动作
- 综合描述：场景 + 动作 + 事件，单字符串
- 人物描述：纯人物稳定特征

图片提示词构建模块再按固定顺序组合这三类信息，交给即梦生成图片。字段拆分看起来枯燥，却直接影响角色一致性：稳定特征只保留一份，当前动作单独描述，能减少同一条 prompt 里重复甚至冲突的信息。

### 第五个坎：风格不能是单一标签

**视觉风格预设系统**让我做了很久。最终落地的有五种：

| 风格 ID | 中文名 | 关键词 | 适合题材 |
|---------|--------|--------|----------|
| watercolor-dreamy | 梦幻水彩 | soft, dreamy, fairy tale | 梦境、魔法、森林、花海 |
| crayon-texture | 蜡笔手绘 | textured, playful, childlike | 校园、游戏、小朋友 |
| gouache-bold | 厚涂丙烯 | bold, expressive, painterly | 冒险、勇敢、骑士、巨龙 |
| flat-graphic | 扁平几何 | flat, geometric, modern | 未来、机器人、城市、太空 |
| ink-wash | 国风水墨 | oriental, poetic, wash | 东方、山水、竹林、诗意 |

注意每个风格都有一个 `matchers` 数组——这是用来**自动推断**的关键词。当用户输入「一只勇敢的小骑士去救公主」，系统会按权重打分：

| 风格 | 匹配关键词 | baseWeight | 结果 |
|-----|-----------|-----------|------|
| gouache-bold | 「勇敢」「骑士」 | 0.9 | **高分** ✓ |
| crayon-texture | — | — | 不匹配 |
| watercolor-dreamy | — | — | 不匹配 |
| ink-wash | 「公主」（边缘） | — | 微弱 |

系统返回 gouache-bold。这就是**风格路由**——一个面向儿童内容编辑的、轻量级的、关键词驱动的推荐系统。

但更值得讲的是默认值的演化。第一版默认是「水彩」，因为听起来「绘本就该是水彩」；后来改回「梦幻水彩」，但 baseWeight 调到 1.2；再后来又加了「厚涂丙烯」处理冒险题材。**默认值的选择是产品对用户的承诺**：你打开这个产品，出来的东西看起来应该是什么样子。

### 第六个坎：节奏不是平均切分

工作流定型之后，分镜详情可以**并发**生成。

12 个分镜详情如果串行生成，用户要等 2 分钟；并发后用户等 30 秒。但并发不是简单地把 12 个任务并行起来——它是**为了让 AI 跑得更快的同时不破坏节奏**。

节奏这件事比想象中要复杂。一个 12 页绘本的分镜不是 12 个等距的格子：

| 页码范围 | 叙事阶段 | 节奏 | 镜头建议 |
|---------|---------|------|---------|
| 页 1—2 | 主角与事件引入 | 快速（每页一句话） | 中景、全景 |
| 页 3—5 | 情绪加深或困扰推进 | 稳定 | 中景为主 |
| 页 6—7 | 情绪高峰或冲突 | 放慢，考虑跨页 | 近景、特写 |
| 页 8—9 | 解决或转折 | 加快 | 中景 |
| 页 10—12 | 情绪落地结尾 | 安静 | 全景、中景

我做的时候把每个分镜的「节奏位置」作为一个独立信号传给 AI：

> 当前是 12 页绘本的第 7 页（情绪高潮位置）。建议使用近景/特写镜头，居中构图，强调情绪爆发。

具体的工具描述是这样：

```
镜头信息的详细文本描述，必须根据当前页的剧情功能与情绪强度，
自动选择最恰当的景别、视角、构图，并在描述中体现选择理由。
景别：远景（环境/转场/孤独感）、中景（故事推进/动作/互动）、
近景（情绪/紧张/表情）、特写（高峰/关键瞬间）。
视角：平视、俯视、仰视、主观视角。
构图：三分法（默认）、居中、留白、对角线。
```

**这是把儿童绘本编辑学的镜头表翻译成 LLM 能执行的指令**。

并发生成还逼着我把每一页的节奏位置和镜头要求都写清楚。这样不仅能提速，也更容易主动拉开镜头差异，避免 12 页全是中景平视，最后看起来像一套幻灯片。

### 第七个坎：AI 不知道「可画」是什么意思

这是我最想讲的一个坎。

任何用过 AI 写作的人都知道，LLM 喜欢输出这种句子：

> 小猫感受到了前所未有的勇气，它的心灵得到了升华。

「前所未有的勇气」是抽象概念。「心灵的升华」也是抽象概念。这两个句子**没有任何一个画家能画出来**。

绘本和小说最大的区别在这里：**每一个句子都必须可以被画成一个画面**。

我把这条规则放在了故事概要检查清单的第 7 条，也放在了分镜清单的第 7 条：

```
7. 可画化检查：避免抽象表达，所有信息都转换为可见的动作、表情或场景。
```

但光写在 prompt 里，AI 还是偶尔会溜过去。所以我又加了一条**事后校验**：生成完毕之后，用一个轻量的二次 prompt 让 AI 自查「每一句话是否可以被画成画面」，对可疑句子打回重写。

这不是过度设计，这是**绘本的硬约束**。一本画不出来的绘本等于一本不存在的绘本。

### 第八个坎：图片生成是异步的，而且很慢

绘本要变成真的绘本，必须有图。我用的图源是字节跳动的即梦 AI（背后是火山引擎的 CV API）。

图片生成模块的接口设计有一个反直觉的细节：**它不是 HTTP 同步接口，是一个 task-based 异步接口**。

整个流程是这样的：

<svg viewBox="0 0 480 110" xmlns="http://www.w3.org/2000/svg" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px;">
  <defs>
    <marker id="arr2" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#94a3b8"/>
    </marker>
  </defs>

  <rect x="10" y="15" width="130" height="80" rx="8" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/>
  <text x="75" y="42" text-anchor="middle" font-size="11" fill="#1d4ed8" font-weight="600">提交任务</text>
  <text x="75" y="60" text-anchor="middle" font-size="10" fill="#64748b">POST /submit</text>
  <text x="75" y="80" text-anchor="middle" font-size="11" fill="#3b82f6">→ task_id</text>

  <line x1="140" y1="55" x2="175" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr2)"/>

  <rect x="180" y="15" width="130" height="80" rx="8" fill="#fef3c7" stroke="#fde68a" stroke-width="1.5"/>
  <text x="245" y="38" text-anchor="middle" font-size="11" fill="#b45309" font-weight="600">轮询查询</text>
  <text x="245" y="58" text-anchor="middle" font-size="10" fill="#64748b">GET /status?task_id</text>
  <text x="245" y="78" text-anchor="middle" font-size="11" fill="#d97706">直到 status: done</text>

  <line x1="310" y1="55" x2="345" y2="55" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr2)"/>

  <rect x="350" y="15" width="120" height="80" rx="8" fill="#dcfce7" stroke="#bbf7d0" stroke-width="1.5"/>
  <text x="410" y="42" text-anchor="middle" font-size="11" fill="#15803d" font-weight="600">返回图片 URL</text>
  <text x="410" y="60" text-anchor="middle" font-size="10" fill="#64748b">有效期 24h</text>
  <text x="410" y="80" text-anchor="middle" font-size="11" fill="#22c55e">→ 导出、下载</text>
</svg>

为什么？因为生成一张 1024×1024 的绘本插画，平均要等 **45 秒**。把这段等待塞进同步请求，既容易撞上网关或函数运行时的超时限制，也会让用户长时间面对一个毫无反馈的页面。

解法是把图片生成变成一个**后台任务**。流程是这样的：

<svg viewBox="0 0 520 520" xmlns="http://www.w3.org/2000/svg" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px;">
  <defs>
    <marker id="arr3" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#64748b"/>
    </marker>
  </defs>

  <!-- Layer labels -->
  <rect x="10" y="10" width="100" height="24" rx="4" fill="#f1f5f9"/>
  <text x="60" y="27" text-anchor="middle" font-size="10" fill="#64748b" font-weight="600">应用层</text>

  <!-- App layer -->
  <rect x="120" y="10" width="200" height="24" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="220" y="27" text-anchor="middle" font-size="11" fill="#1e293b">用户发起请求</text>
  <line x1="220" y1="34" x2="220" y2="56" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr3)"/>

  <rect x="10" y="60" width="100" height="24" rx="4" fill="#f1f5f9"/>
  <text x="60" y="77" text-anchor="middle" font-size="10" fill="#64748b" font-weight="600">入队</text>

  <rect x="120" y="60" width="200" height="24" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="220" y="77" text-anchor="middle" font-size="11" fill="#1e293b">加入任务队列</text>
  <line x1="220" y1="84" x2="220" y2="106" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr3)"/>

  <rect x="10" y="110" width="100" height="24" rx="4" fill="#fef3c7"/>
  <text x="60" y="127" text-anchor="middle" font-size="10" fill="#b45309" font-weight="600">Redis 队列</text>

  <rect x="120" y="110" width="200" height="24" rx="4" fill="#fef3c7" stroke="#fde68a" stroke-width="1.5"/>
  <text x="220" y="127" text-anchor="middle" font-size="11" fill="#b45309">任务排队等待</text>
  <line x1="220" y1="134" x2="220" y2="156" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr3)"/>

  <rect x="10" y="160" width="100" height="24" rx="4" fill="#f1f5f9"/>
  <text x="60" y="177" text-anchor="middle" font-size="10" fill="#64748b" font-weight="600">拉取</text>

  <rect x="120" y="160" width="200" height="24" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="220" y="177" text-anchor="middle" font-size="11" fill="#1e293b">Worker 进程拉取任务</text>
  <line x1="220" y1="184" x2="220" y2="206" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr3)"/>

  <rect x="10" y="210" width="100" height="24" rx="4" fill="#eff6ff"/>
  <text x="60" y="227" text-anchor="middle" font-size="10" fill="#1d4ed8" font-weight="600">调用即梦</text>

  <rect x="120" y="210" width="200" height="24" rx="4" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5"/>
  <text x="220" y="227" text-anchor="middle" font-size="11" fill="#1d4ed8">调用即梦 API（45s 等待）</text>
  <line x1="220" y1="234" x2="220" y2="256" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr3)"/>

  <rect x="10" y="260" width="100" height="24" rx="4" fill="#f1f5f9"/>
  <text x="60" y="277" text-anchor="middle" font-size="10" fill="#64748b" font-weight="600">落库</text>

  <rect x="120" y="260" width="200" height="24" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
  <text x="220" y="277" text-anchor="middle" font-size="11" fill="#1e293b">回写结果到数据库</text>
  <line x1="220" y1="284" x2="220" y2="306" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr3)"/>

  <rect x="10" y="310" width="100" height="24" rx="4" fill="#dcfce7"/>
  <text x="60" y="327" text-anchor="middle" font-size="10" fill="#15803d" font-weight="600">前端轮询</text>

  <rect x="120" y="310" width="200" height="24" rx="4" fill="#dcfce7" stroke="#bbf7d0" stroke-width="1.5"/>
  <text x="220" y="327" text-anchor="middle" font-size="11" fill="#15803d">轮询获取结果 → 渲染图片</text>

  <!-- Right side: async task layer annotation -->
  <rect x="350" y="60" width="160" height="274" rx="8" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="4"/>
  <text x="430" y="82" text-anchor="middle" font-size="10" fill="#94a3b8" font-weight="600">异步任务层</text>
  <text x="430" y="102" text-anchor="middle" font-size="10" fill="#94a3b8">任务队列 + Worker</text>
  <text x="430" y="122" text-anchor="middle" font-size="10" fill="#94a3b8">从请求路径中隔离</text>
</svg>

从用户的视角，他看到的是「生成中…」的小转圈，40 秒后图片从无到有。从系统的视角，这是一个任务队列、一个 Worker 进程、一张数据库的任务表。

这部分基础设施不是「顺便做的」，是**为了把 12 张图的串行等待变成可观察、可中断、可重试的工程过程**。一个分镜出图失败，不能让整本书都白等。

中途还遇到过一次第三方 API 版本变更：项目沿用的旧版本号失效后，任务提交接口持续返回鉴权错误。排查到最后才发现，问题不在 token，也不在签名，而在那串藏在请求参数里的版本号。**第三方 AI 接口真正危险的地方，往往是这些看起来不会变化的细节**。

### 第九个坎：网页不是用户唯一在的地方

这是项目最后两周才意识到的问题。

moricho 的网页做得很好：分步导航、数据面板、风格选择、导出图片。但**用户实际工作的地方不是网页**。

家长的真实工作流是这样的：

| 步骤 | 在哪里 | 做什么 | 等待 |
|-----|--------|-------|------|
| 1 | — | 晚上想给小孩讲一个故事 | — |
| 2 | moricho 网页 | 输入提示词，等 30 秒看概要 | ~30s |
| 3 | moricho 网页 | 再点下一步，再等 30 秒看分镜 | ~30s |
| 4 | moricho 网页 | 看到分镜不错，但**真正的画要去即梦里生成** | — |
| 5 | 两个网站之间 | 复制分镜 prompt 到即梦 | — |
| 6 | 即梦 | 在即梦里再等 40 秒看图 | ~40s |

中间的第 5 步是**断裂点**——用户在两个网站之间复制粘贴。复制的还是一坨长达 200 字的 prompt，里面夹着各种风格关键词、人物描述、镜头要求。

我做插件就是为了消除这个断裂点。Chrome 插件是个 350 行的 React App，用户登录一次，存一个 30 天有效的 JWT，然后在任意网页的右上角点开 moricho 插件：

- 选择当前要生成分镜的故事
- 选择分镜序号
- 一键生成 → 一键复制到剪贴板 → 直接去即梦粘贴

整个插件的核心逻辑只有一句话：**把生成分镜 prompt 这件事从 moricho 流程里抽出来，放到用户实际需要它的地方**。

为了让插件独立登录、后端独立鉴权，我加了一个独立的插件 token 模块（用独立的 salt 签发 30 天有效的 JWT），在路由层给插件相关接口单独开了口子。

这种「在中间件里为一条路径开口子」的写法不算优雅，但很诚实——**这不是同一个产品的两个界面，这是同一个后端的两个前端**。

## 六、最终长成什么样

38 天后，moricho 的成品形态是这样的：

**输入**：一段家长写的话，比如「我家小孩今天第一天上幼儿园有点害怕，给他做一本关于分离焦虑的睡前绘本」。

**自动跑的工作流**：

1. AI 推断绘本分类 → 情绪 + 睡前
2. 用户确认分类和年龄（2-4 岁）
3. AI 生成故事概要（250 字以内，三幕结构）
4. AI 生成角色物品场景（3-5 个元素，每个 50-100 字）
5. AI 生成 8-12 个分镜概要
6. AI 并发生成每个分镜的详情（镜头、人物动作、视觉元素）
7. 12 张图并行提交到图片生成队列
8. 前端轮询，图片一张张出来
9. 用户可以单独重画某一张、改某个分镜的描述
10. 一键导出所有图片为 PNG / PDF

**用户做的事情**：写一句话、看进度条、偶尔点重画。

**总耗时**：约 3 分钟出一本完整绘本。**早期 30 分钟 + 一堆复制粘贴**的流程被压缩到 3 分钟的「看进度条」。

最后一个标志性的功能是「全部导出分镜画布图片」——让用户能把整本绘本的图片打包下载。**这个功能上线的当天，意味着绘本作为产品的最后一步不再是「网页里展示」，而是「可以带走的文件」**。

### 最终的架构图

<svg viewBox="0 0 660 700" xmlns="http://www.w3.org/2000/svg" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 660px;">
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#64748b"/>
    </marker>
  </defs>

  <!-- Layer 1: Client (Dual Frontend) -->
  <rect x="20" y="20" width="620" height="100" rx="10" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="2"/>
  <text x="40" y="44" font-size="13" fill="#166534" font-weight="700">客户端（双前端）</text>

  <rect x="60" y="60" width="240" height="48" rx="6" fill="#fff" stroke="#86efac" stroke-width="1.5"/>
  <text x="180" y="82" text-anchor="middle" font-size="12" fill="#1e293b" font-weight="600">Web 主站</text>
  <text x="180" y="98" text-anchor="middle" font-size="10" fill="#64748b">工作流界面</text>

  <rect x="360" y="60" width="240" height="48" rx="6" fill="#fff" stroke="#86efac" stroke-width="1.5"/>
  <text x="480" y="82" text-anchor="middle" font-size="12" fill="#1e293b" font-weight="600">Chrome 插件</text>
  <text x="480" y="98" text-anchor="middle" font-size="10" fill="#64748b">快速生成分镜 prompt</text>

  <!-- Arrow: Client -> Gateway -->
  <line x1="180" y1="120" x2="180" y2="140" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="480" y1="120" x2="480" y2="140" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr)"/>
  <path d="M180,140 L480,140" stroke="#64748b" stroke-width="1.5" fill="none"/>

  <!-- Layer 2: API Gateway -->
  <rect x="20" y="148" width="620" height="64" rx="10" fill="#eff6ff" stroke="#bfdbfe" stroke-width="2"/>
  <text x="40" y="172" font-size="13" fill="#1d4ed8" font-weight="700">API 网关 + 鉴权</text>
  <text x="60" y="192" font-size="11" fill="#475569">Web：NextAuth.js 登录 &nbsp;|&nbsp; 插件：独立 token（30 天有效）</text>

  <!-- Arrow: Gateway -> Business -->
  <line x1="330" y1="212" x2="330" y2="240" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Layer 3: Business Modules -->
  <rect x="20" y="248" width="620" height="110" rx="10" fill="#fefce8" stroke="#fde68a" stroke-width="2"/>
  <text x="40" y="272" font-size="13" fill="#a16207" font-weight="700">业务模块</text>

  <rect x="30" y="288" width="170" height="40" rx="6" fill="#fff" stroke="#fde68a" stroke-width="1"/>
  <text x="115" y="312" text-anchor="middle" font-size="11" fill="#1e293b" font-weight="600">故事概要</text>

  <rect x="215" y="288" width="170" height="40" rx="6" fill="#fff" stroke="#fde68a" stroke-width="1"/>
  <text x="300" y="312" text-anchor="middle" font-size="11" fill="#1e293b" font-weight="600">元素拆解</text>

  <rect x="400" y="288" width="170" height="40" rx="6" fill="#fff" stroke="#fde68a" stroke-width="1"/>
  <text x="485" y="312" text-anchor="middle" font-size="11" fill="#1e293b" font-weight="600">分镜详情</text>

  <!-- Arrow inside business: three modules converge -->
  <line x1="115" y1="340" x2="115" y2="348" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="300" y1="340" x2="300" y2="348" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="485" y1="340" x2="485" y2="348" stroke="#cbd5e1" stroke-width="1"/>
  <path d="M115,348 L300,348 L485,348" stroke="#cbd5e1" stroke-width="1" fill="none"/>

  <rect x="200" y="348" width="200" height="24" rx="4" fill="#fff" stroke="#fde68a" stroke-width="1"/>
  <text x="300" y="364" text-anchor="middle" font-size="10" fill="#64748b">图片提示词构建</text>

  <!-- Arrow: Business -> AI -->
  <line x1="330" y1="372" x2="330" y2="396" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Layer 4: AI Model Layer & Async Task Layer (side by side) -->
  <rect x="20" y="404" width="370" height="72" rx="10" fill="#faf5ff" stroke="#e9d5ff" stroke-width="2"/>
  <text x="40" y="428" font-size="13" fill="#7c3aed" font-weight="700">AI 模型层</text>
  <text x="40" y="450" font-size="11" fill="#475569">文本生成（多工具调用）</text>
  <text x="40" y="466" font-size="11" fill="#475569">图片生成（即梦异步接口）</text>

  <rect x="410" y="404" width="230" height="72" rx="10" fill="#fff7ed" stroke="#fed7aa" stroke-width="2"/>
  <text x="430" y="428" font-size="13" fill="#c2410c" font-weight="700">异步任务层</text>
  <text x="430" y="452" font-size="11" fill="#475569">Redis 队列 → Worker 进程</text>
  <text x="430" y="468" font-size="11" fill="#475569">图片生成慢操作隔离</text>

  <!-- Arrow: AI/Async -> Data -->
  <line x1="200" y1="476" x2="200" y2="500" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr)"/>
  <line x1="525" y1="476" x2="525" y2="500" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr)"/>

  <!-- Layer 5: Data Layer -->
  <rect x="20" y="508" width="620" height="54" rx="10" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2"/>
  <text x="40" y="532" font-size="13" fill="#334155" font-weight="700">数据层（PostgreSQL）</text>
  <text x="40" y="550" font-size="11" fill="#64748b">用户 · 故事 · 元素 · 分镜 · 资源 · 任务</text>

  <!-- Layer count callout -->
  <rect x="240" y="590" width="180" height="28" rx="14" fill="#e2e8f0"/>
  <text x="330" y="609" text-anchor="middle" font-size="11" fill="#475569" font-weight="600">五层：客户端 → 网关 → 业务 → AI/任务 → 数据</text>
</svg>

整个系统大致是五层：**客户端 → 网关 → 业务模块 → AI/任务层 → 数据层**。其中**业务模块**对应工作流的三个生成步骤（概要、拆解、分镜详情），**AI 模型层**分文本和图片两种调用方式，**异步任务层**专门负责把图片生成这种慢操作从请求路径里隔离出去。

## 七、它最后被废弃了

在我写完 38 天的总结，把 moricho 做成一套能交付给自己使用的工作流后不久，字节上线了一款新 App。用户只要输入「给我家小孩做一本关于分离焦虑的睡前绘本」，它就能自动完成我花 38 天才拼起来的那些步骤：分类、概要、元素、分镜、出图、导出。

至少在图像生成这一层，字节用的是自家的 Seedream 系列模型。

我打开那个 App 时，心情很复杂。一方面，它的用户体验比 moricho 完整得多——字节有成熟的客户端、分发渠道和设计团队；另一方面，它解决的问题和 moricho 几乎重合。

回头复盘，真正让我后背发凉的不是「有人做了同类产品」，而是下面三件事：

**第一，我以为是差异化的功能，大厂可以很快补齐。** 分类体系、生成检查清单、风格路由、可画化校验，我花了 38 天才逐步摸清；到了成熟团队手里，它们可以被迅速拆成产品需求和配置规则。

**第二，我的优势只是「把儿童编辑规则翻译成 prompt」，字节的优势却覆盖了模型和产品全链路。** 我用千问生成文本、用即梦生成图片，每跨一层都要承担调用费、延迟和 prompt 拼装失败的成本；字节能让模型、工作流和客户端一起迭代。差距不只在工程效率，更在整条链路的控制权。

**第三，我没有分发渠道，也没有品牌信任。** 家长在「字节官方 App」和「GitHub 上的独立项目」之间选择时，答案几乎不需要思考。moricho 解决的问题没有错；我错在高估了单纯工程能力在这条赛道上的防御力。

**moricho 最终没有上线。**

这次停下带给我的教训，比前 38 天积累的工程经验更深。

## 八、38 天后我留下了什么

回头看，这篇文章表面上在讲技术，真正记录的却是一个念头如何长成产品，又如何被市场按下暂停键。

最初，它只是一个家长晚上 9 点的麻烦：想给孩子讲点新故事，AI 能写、能画，却要靠人一次次复制粘贴才能把结果拼起来。后来，moricho 从三个聊天框变成一条工作流，又一路撞上分类、角色一致性、字段拆分、视觉风格、叙事节奏、可画性、异步出图和跨端使用等具体问题。

每撞上一道坎，我就把一条儿童编辑规则翻译成系统能够执行的约束：有时是一句 prompt，有时是工具 schema 里的一个字段，有时是一张数据库表。最后，它终于能做到输入一句话，自动跑完流程，输出 8—12 张可打印的图片。

然后，同类能力出现在了字节自己的产品里。

这件事把一个结论钉得很牢：**公开模型之上的 prompt 和工作流可以构成产品，却很难单独构成护城河。**

如果要把这 38 天压缩成四条对 AI 内容产品有用的经验：

**第一条：聊天框不是生成式任务的正确形态。** Chat-based UI 看起来亲切，实际上让用户为模型的不稳定背锅。当你发现用户在搜索「怎么写更好的 prompt」的时候，就是该把聊天框换成工作流的时候了。

**第二条：先把分类体系立起来。** 在「绘本」这种大概念下，模型常常输出你不想看到的东西；把它收窄到「情绪类睡前绘本」一类带边界的小概念，效果会立刻稳一档。

**第三条：别让用户在多个工具间复制粘贴。** AI 内容产品最关键的一步，往往是「生成的内容能不能顺利进入用户下一步真正要用的工具」。

**第四条，也是最重要的一条：不要把公开模型、prompt 和工作流本身误当成护城河。**

我用 38 天积累下来的分类、检查清单、字段拆分、风格路由、可画化校验和异步队列，都有工程价值；但这些能力同样容易被更大的团队吸收。一旦模型能力升级，原本需要多层 prompt 才能补上的差距，也可能在一次版本更新后迅速缩小。

这让我重新思考了一个问题：**在 AI 时代，独立开发者到底应该做什么？**

我自己现在倾向于把护城河归到三类资源里：模型、行业和数据。moricho 一项也没占。

- **模型：** 自研也好、微调也好，至少能稳定地产出别人复刻不出的结果。moricho 用的是千问加上即梦，调用方式、prompt 拼装规则都是公开的。
- **行业：** 绘本编辑、儿童心理、幼儿园课程体系，这些是大厂产品经理需要几个月时间调研才能摸清的东西。深耕过的人，对「分镜检查清单」的理解可能远比外部工程师更深。
- **数据：** 长期沉淀的某个垂类私有数据，是训练差异化模型的关键原料。

在 AI 时代做 C 端产品，这三条里至少要占一条；如果暂时都占不到，不如先把时间和精力花在能占其中一条的事情上。

moricho 就是典型的「三条路都没占」的项目。我是个工程师，不是幼教专家；用的是公开模型，没有自研；没有私有数据，全靠 prompt 拼装。**它能跑通、它能解决我的痛点、它能在 3 分钟里产出一本绘本，但面对有模型、有分发、有品牌的同类产品时，几乎没有还手余地。**

最后留两个问题给你：

第一个问题：**你在做的 AI 产品，是占了上面三条路里的哪一条？**

如果都没占——不是劝你放弃，是劝你**先想清楚护城河再写第一行代码**，免得你在投入大量精力之后，打开新闻发现某大厂上线了同类产品。

第二个问题：**如果你已经为同类产品付出过几个月时间，你愿意把它开源吗？**

moricho 的代码我没有删掉。它的分类元数据、检查清单、风格路由、可画化校验、异步队列——这些是我用 38 天换来的工程经验，**对有行业根基或正在做模型的人来说，可能有用**。

一个深耕幼教行业十年的人看到 moricho 的代码，可能会说：「分镜检查清单的第七条可画化检查，应该再加上『避免使用具体年龄数字（如 3 岁 5 个月）』这种画不出来的概念」——这种意见可能我花一年也想不出来。

**AI 时代最稀缺的，往往不是 prompt 工程能力，而是 prompt 工程的反馈源。**

把代码开源，就是把反馈源送给行业里的人。这是我从 moricho 失败里学到的最后一课。

---

**附：moricho 项目的全周期**

| 阶段 | 形态 | 解决的问题 | 引入的新问题 |
|------|------|------------|--------------|
| 起源 | 人工流程 | 无 | 太慢、风格不一致 |
| 聊天产品 | 三步聊天框 | 把人工流程串起来 | 用户替模型的不稳定背锅 |
| 工作流 | 进度条 + 编辑页 | 把用户从 prompt 中解放出来 | 系统需要更精确的提示词 |
| 双前端 | Web + 浏览器插件 | 用户的工作场景不止网页 | 鉴权体系要分两套 |
| 废弃 | 项目停止维护 | 同类产品被字节官方覆盖 | 工程经验仍可复用 |

**附：moricho 留下的 9 个工程模块**

| # | 解决的问题 | 模块 | 价值 |
|---|----|------|------|
| 1 | 故事和概念混在一起 | 分类元数据模块 | 概念词典 |
| 2 | 规则写进 prompt 不等于稳定执行 | 检查清单配置模块 | 工序模板 |
| 3 | 角色一致性丢失 | 数据建模 + 工具描述 | 字段约束规则 |
| 4 | 同一字段混了静态与动态 | 分镜字段拆分 | 内容分层模型 |
| 5 | 风格是单一标签 | 风格路由模块 | 关键词打分机制 |
| 6 | 节奏按页均匀分布 | 分镜生成调度 | 位置信号 |
| 7 | AI 输出抽象句子 | 校验模块 | 可画化规则 |
| 8 | 单张图生成约 45 秒 | 任务队列模块 | 异步模式 |
| 9 | 用户实际工作场景在网页之外 | 鉴权扩展模块 | 多端复用 |