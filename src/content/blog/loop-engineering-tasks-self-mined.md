---
title: "当 Agent 不再等你拍板"
date: "2026-06-22"
tags: [loop-engineering, agent, llm]
description: 'Loop Engineering 真正改的不是 Agent,是把"该做什么"也交给了系统。'
faq:
  - q: Loop Engineering 是什么？跟"加个 cron 定时跑 Agent"有什么区别？
    a: Loop Engineering 不是"加 cron"。它真正翻转的是 Agent 时代的 5 个默认前提：任务不再由人选、Prompt 不再由人写、启动不再靠按键、完成度不再由人判、记忆不止于会话。一个孤零零的 cron 只是个闹钟，闹钟加发现规则、加生成器、加执行器、加验证器、加状态文件，才是一个 Loop。Addy Osmani 给的定义里，Loop 由 trigger / discovery / generation / execution / verification / memory 六步闭环组成。
  - q: Karpathy 700 次超参实验和 Shopify 37 次实验是 Loop Engineering 吗？
    a: 不是。Karpathy 用 Python 写了个 `for` 循环跑超参数，参数范围手写的，跑完没跑完看一眼就懂。Shopify CEO Tobi Lütke 的 37 次实验也是同一范式，所有参数、所有 prompt、所有终止条件都是人硬编码。它们是脚本自动化，不是 Loop。脚本不会自己发现"下一个该跑什么实验"，不会读上一次的失败日志调整策略，不会跨 session 记忆你是谁。Loop 和脚本循环的最大差别：脚本的每一行都是人写的，Loop 的"每一行任务"是系统自己识别并生成的。
  - q: 完成度判定为什么不能让 Agent 自己判？
    a: 因为 Agent 太擅长给自己打分了。Loop 的做法是拆出独立的"判官"——Addy Osmani 在 `/goal` 命令定义里强调，每轮跑完后会有一个独立的小模型去检查终止条件是否满足，写代码的那个 Agent 自己不参与判定。Maker 和 Checker 必须分开。Claude Code 团队 Boris Cherny 的原话："I don't prompt Claude anymore. I have loops running. They're the ones that are prompting Claude and figuring out what to do. My job is to write loops."
  - q: Loop Engineering 的代价是什么？
    a: 两条代价：(1) comprehension debt 理解债务——代码库在涨，工程师的认知在掉；(2) cognitive surrender 认知缴械——循环太舒服，干脆不思考，按"通过"就行。Osmani 结尾："Two people can build the exact same loop and get completely opposite results. One uses it to move faster on work they understand deeply. The other uses it to avoid understanding the work at all. The loop doesn't know the difference. You do." 即使拆 Maker/Checker 两个子 Agent，"做完了"也是系统声明的，不是证明的——验证最终还是得人来完成。
---

# 当 Agent 不再等你拍板

![Loop Engineering 六步闭环:触发→发现→生成→执行→验证→记忆](/images/blog/loop-engineering-tasks-self-mined/01-six-step-loop.webp)

你打开终端，输入 `claude`，敲一句"帮我 review 这个 PR"，等它回话，看完，给下一句 prompt。

这套姿势我们做了一两年。Agent 时代的基本动作：人选任务、人写 prompt、人点启动、人判做没做完、隔天再开新会话又从头讲一遍项目背景。一切主动权在人手里，Agent 是被你握在手里的一件工具。

然后 Boris Cherny 把它拆了。

他是 Anthropic Claude Code 的负责人，最近在 WorkOS 的活动上讲了句话，二十四小时之内被引用了几百次：

> "I don't prompt Claude anymore. I have loops running. They're the ones that are prompting Claude and figuring out what to do. My job is to write loops."

我不再写 prompt 了。他说。是 loop 在告诉 Claude 该做什么。我的工作是写 loop。

Peter Steinberger 把它压成了十二个字：

> "You shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents."

这两句话合起来，是 2026 年上半年技术圈最值得停下来想清楚的一记。

很多人第一反应是把 Loop Engineering 理解成"自动化"或者"Agent 加个定时器"。不是。它真正翻转的，是 Agent 时代那几个默认你从来没质疑过的人的前提。

我数了一下，传统 Agent 工作流里至少有 **五个前提**是写死在空气里的：任务来自人、prompt 由人写、启动靠人按键、完成度由人判、记忆止于会话。Loop Engineering 把这五条都拆了。

拆完之后的差别，比你想象的大。

---

## 第一个被拆的前提:任务不再由人选

传统 Agent:你打开 Claude Code，看一眼今天的 PR 列表，挑一个最烦的，写"review 这个 PR #123，里面改了鉴权逻辑，重点看边界"，回车。Agent 看完给你意见，结束。

Loop:系统自己扫描所有 open PR，自己判断哪些需要处理——有冲突?CI 失败?review 评论没解决?作者刚 rebase?——为每一个需要处理的 PR **自动生成针对性的 prompt**。小 PR 一句"快速审一下"，大 PR 一段"深度审，重点看一致性"。然后启动 Agent 处理，处理完自己检查结果，记录到状态文件。下一轮触发时，再读这个状态文件继续。

人哪去了?人**退到了设计这一整套规则**的位置:扫描规则、判断逻辑、prompt 模板、质量标准、状态格式。

这是 Loop Engineering 最深的一层变化:**连"该做什么"这件事，都从人手里交了出去**。剩下的人在做的，是设计一个能识别"该做什么"的系统。

---

## 第二个被拆的前提:Prompt 不再由人写

这条很多人会低估。

传统 Agent 的 prompt 是一次写好反复用——你写一段"review 风格:先看测试覆盖、再看边界、看错误处理、看命名"的指令，每次复用。问题是，bug 报告和小重构用的 prompt 不该一样，深度审和快速审用的指令也不该一样。但你不会写 N 个版本。

Loop 把这件事做成动态生成:扫描器读完 PR 之后，根据 PR 大小、文件数、变更类型、CI 状态，**自己拼出一段针对这个 PR 的 prompt**。小变更走快速模板，大变更走深度模板，CI 失败的走带"先看失败日志"的模板。

而且 prompt 不是孤立的——它通常挂在 Skill 文件里。Skill 是项目的"机构记忆":你的代码规范、命名约定、build 步骤、"上次为啥不用这个库"的踩坑史，都写在一个 `SKILL.md` 里。Loop 触发后调用 Skill 生成 prompt，prompt 再喂给 Agent。整个 prompt 工程从"写一句话"变成了"写一套可被调用的知识"。

---

## 第三个被拆的前提:启动不再靠按键

这一条最直白:你不用再点"启动"了。

触发器有三种:

- **定时**:每 5 分钟、每小时、每天早上 8 点;
- **事件**:新 PR、CI 失败、Slack 消息、Jira ticket 更新;
- **状态**:上次任务队列没处理完、某个条件变 true。

Boris 公开的 `/loop 5m /babysit` 就是定时触发:每 5 分钟，调用 `/babysit` 这个 Skill，让系统跑一遍完整流程。

这听起来像是"加个 Cron 有什么稀奇"——稀奇的不是定时，是上面那三件事(发现、生成、验证)能跟定时器**串成闭环**。一个孤零零的 Cron 只是个闹钟，闹钟加发现规则、加生成器、加执行器、加验证器、加状态文件，才是一个 Loop。

---

## 第四个和第五个:完成度不再由人判，记忆不再止于会话

这两条放一起讲，因为它们是一体两面。

传统 Agent 跑完一轮，你说"行"或"不行";传统 Agent 隔天再开新会话，昨天的项目背景忘得一干二净。这两件事都靠人。

Loop 把这两件事都拆了。

**完成度的判定，从 Agent 手里挪给了一个独立的"判官"**。Addy Osmani 在他的定义文里特别强调过这个细节:`/goal` 命令每轮跑完后，会有一个**独立的小模型**去检查终止条件是否满足——不是写代码的那个 Agent 自己判自己。Maker 和 Checker 必须分开，写代码的太擅长给自己打分了，换一个清醒的来。

**记忆不在上下文中，在硬盘上**。Agent 每次启动都是失忆的，Loop 不指望它记住什么——所有已完成任务、待处理队列、上次结果、错误记录，全部写到 markdown 文件、SQLite 数据库、或者 Linear 看板里。下一轮触发时再读回来。

打个比方:传统 Agent 流程里，做没做完靠流水线上的质检员**在外部检查**;Loop 里，车间里永远站着一个独立的"判官"工头，不参与制造，只盯着"做没做完"。Agent 失忆没关系，仓库里记着账。

---

## 那 Karpathy 700 次实验、Shopify 37 次实验,是 Loop 吗?

不是。

最近很多文章把这两个例子硬套上 Loop Engineering 的标签。但拆开看——Karpathy 用 Python 写了个 `for` 循环跑超参数，参数范围是手写的，跑完没跑完他看一眼就懂。Shopify CEO Tobi Lütke 的 37 次实验是同一个范式，**所有参数、所有 prompt、所有终止条件都是人硬编码的**。

它们是脚本自动化，**不是 Loop**。脚本不会自己发现"下一个该跑什么实验"，不会读上一次的失败日志调整策略，不会跨 session 记忆你是谁。

Loop 和脚本循环的最大差别:脚本的每一行都是人写的，Loop 的"每一行任务"是**系统自己识别并生成的**。

---

## 代价

杠杆不是白来的。Osmani 在文末留了句话我反复读:

> "Build the loop. Stay the engineer."

他又说:

> "Two people can build the exact same loop and get completely opposite results. One uses it to move faster on work they understand deeply. The other uses it to avoid understanding the work at all. The loop doesn't know the difference. You do."

翻译过来:循环跑得越顺滑，人越容易变成"按同意键的人"。代码自己改，PR 自己开，test 自己跑。但代码到底改了什么、为什么这么改、是不是真改对了，你越来越不知道。

Osmani 管这叫 **comprehension debt(理解债务)**。代码库在涨，工程师的认知在掉。**cognitive surrender(认知缴械)** 是更狠的那个:循环太舒服，干脆不思考，按"通过"就行。

还有一个真相:**"做完了"是系统声明的，不是证明的**。Agent 说"测试通过"是声明，验证必须人来完成。你可以拆 Maker 和 Checker 两个子 Agent，但子 Agent 也不可信。Loop 把"判断"这件事从单人移到多人，从在线移到离线，**但没把它从人手里拿走**。

Boris 不是说工作变简单了，他是说**杠杆点移动了**。你不再打字员了，你是系统设计员。系统设计比写 prompt 难。

---

## 从 `/goal` 开始

如果你想感受一下"自我驱动"到底是什么样，最便宜的一步是 Claude Code 的 `/goal` 命令:

```
/goal "所有 tests in test/auth 通过且 lint 干净"
```

人只定义**终止条件**。中间的"写→测→改→再测"全交给系统。每轮结束后一个独立小模型检查条件是否满足。

这一句话里没有任何 prompt engineering 技巧，没有任何"AI 使用心法"——**它就是让 Agent 自己决定下一步该做什么**。

剩下还有 `/loop`、Codex 的 Automations、自己的 Skill 文件、工作树隔离、子 Agent 分工——但这些都是 Loop Engineering 的一楼二楼三楼，地基是这一步:**你愿意把"该做什么"这件事，也交出去吗?**

如果交出去了，那就别忘记 Osmani 那句结尾——

**Build the loop. Stay the engineer.**
