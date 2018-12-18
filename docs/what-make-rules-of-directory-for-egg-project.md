---
title: "什么约束了基于Egg的项目的目录规范"
date: '2018-12-19'
tag: node,egg
---

> 在之前的文章[深入egg-core前篇](/posts/pre-deep-into-egg-core)中已经讲述了一个道理，node之所以没有成为一个比较流行的服务器语言，是因为node需要一个企业级的框架。而egg或许是一个不错的选择，针对egg-core的内部实现，将会在这篇文章中作出探索。之前有关注过[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的[overreacted](https://overreacted.io/)，我觉得他的抛出问题并循序渐进的从源码的角度来回答的方式非常好，决定模仿一番。

在Egg项目的实践中，我们发现我们的目录结果是被规范约束的，比如我们需要把controller放到`app/controller`目录下，扩展会放在`app/extend`下等等，那么egg是如何处理这些文件的呢？

以`controller`为例，比如我们在`app/controller`下新建了一个文件`post.js`

```javascript
const Controller = require('egg').Controller;
class PostController extends Controller {
  async create() {
    const { ctx, service } = this;
    const createRule = {
      title: { type: 'string' },
      content: { type: 'string' },
    };
    // 校验参数
    ctx.validate(createRule);
    // 组装参数
    const author = ctx.session.userId;
    const req = Object.assign(ctx.request.body, { author });
    // 调用 Service 进行业务处理
    const res = await service.post.create(req);
    // 设置响应内容和响应状态码
    ctx.body = { id: res.id };
    ctx.status = 201;
  }
}
module.exports = PostController;
```

而最后我们会在router中这么使用:

```javascript
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.post('createPost', '/api/posts', controller.post.create);
}
```

神奇的是，我们定义在`app/controller`下创建了一个名为`post.js`文件，输出一个class，这个class含有一个create的函数，那么我们就能够在router中，通过`app.controller.post.create`来访问到这个函数，这个过程背后的故事到底是怎样的？
