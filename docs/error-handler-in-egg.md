---
title: "Egg中的错误处理"
date: '2019-01-09'
tag: node,egg
---

> 在实现WebServer的过程中，错误处理是一个必不可少的过程，提供优雅的兜底处理是所有Web框架需要解决的事情，Egg在[官方文档中](https://eggjs.org/zh-cn/core/error-handling.html)提到错误处理，除了自行`try catch`之外还会有统一的错误处理。

在文档中，明确的指出统一的错误处理是依靠一个`onerror`的插件来完成的，这个插件也是egg官方的一个默认开启的插件，官方提到会根据[content-negotiation](https://restfulapi.net/content-negotiation/)来判断具体的返回会使用JSON数据或者是一个html页面。我们可以自己启动一个server来验证一下，当我们直接请求的时候，返回的是一个html信息，当我们通过设定`Accept: application/json`的头部来请求的时候，返回的是一个JSON的数据，这也是onerror的处理逻辑。另外如果你的请求是以`.json`结尾的，也会返回一个JSON的数据。在没有认真读文档之前，我总是设置`Content-Type: application/json`来访问，最终得到的一直是一个Html的返回，这让我很疑惑。

源码中，整个`onerror`中的源码量不多，对于`app`大致做了两件事情：

- 定义了`app.on(error, handler)`的处理(输出一些日志)
- 使用执行`onerror(app, errOptions)`

`onerror`这个函数来自于[koa-onerror](https://github.com/koajs/onerror)，这个包差不多也是egg这些人开发的，在[koa源码中](https://github.com/koajs/koa/blob/master/lib/application.js):

```javascript
handleRequest(ctx, fnMiddleware) {
  const res = ctx.res;
  res.statusCode = 404;
  const onerror = err => ctx.onerror(err);
  const handleResponse = () => respond(ctx);
  onFinished(res, onerror);
  return fnMiddleware(ctx).then(handleResponse).catch(onerror);
}
```

`handleRequest(ctx, fnMiddleware)`中执行了`fnMiddleware(ctx).then(handleResponse).catch(onerror)`，这里的onerror取自`ctx.onerror`

原生的koa也处理了这个错误，大致的错误处理方式就是把错误信息返回了。

onerror中重写了这个错误处理：

```javascript
app.context.onerror = (err) => {
  // ....other code
  let type = 'text';
  if (options.accepts) {
    type = options.accepts.call(this, 'html', 'text', 'json');
  } else {
    type = this.accepts('html', 'text', 'json');
  }
  type = type || 'text';
  if (options.all) {
    options.all.call(this, err, this);
  } else {
    if (options.redirect && type !== 'json') {
      this.redirect(options.redirect);
    } else {
      options[type].call(this, err, this);
      this.type = type;
    }
  }
  if (type === 'json') {
    this.body = JSON.stringify(this.body);
  }
  this.res.end(this.body);
}
```

会先判断请求返回应该要返回什么类型，执行的`accepts`接受一系列返回枚举的字符串，返回应该返回的类型。这个accpets的参数可从外部传入，但默认会使用内部定义的accepts函数:

```javascript
exports.accepts = function(ctx) {
  if (ctx.acceptJSON) return 'json';
  if (ctx.acceptJSONP) return 'js';
  return 'html';
};
```

这里的`ctx.acceptJSON`和`ctx.accepJSONP`在egg的代码中有申明，具体的处理逻辑有兴趣的可以挖掘一下，找到头的话，链还是很长的。但是大致是遵循content-negotiation的设定的。

如果定义了`all`的处理的话，content-negotiation的设定，统一通过all来处理，但是需要注意的是只有返回type为json的情况才会在最后执行`this.body = JSON.stringify(this.body);`，所以all中的返回需要自行处理成字符串或者流。

其余的情况都会从传入的options中获取返回type对应的函数，除了json情况下能够返回对象外，其他的都应该返回字符串或者流。

egg的错误处理文档感觉是建立在对`koa-onerror`理解的角度上的，不然就只能浅用，所以使用egg最好还是了解好koa以及其各种配套设施。

