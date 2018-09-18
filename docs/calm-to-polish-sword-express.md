---
date: '2017-09-06'
title: '静心打磨手中利刃之Express'
tag: 静心打磨手中利刃,node
---

> 不知从什么时候开始，node就开始风靡起来，我们甚至都没有谨慎的研究过他和其他服务器的区别，便开始跃跃欲试。相信很多人会和笔者一样，在接触node服务器的第一时刻，便接触到了express，我有个朋友也说过，学一个东西还是要结合框架来学比较好，当时我便听了话，开始了express+node的学习，当然，express非常顺手，给了我很好的体验。而今天，我们撇开浮躁，静下心来，仔细研究Express框架。

### 假如没有Express

说到底Express只是一个框架而已，那么，他是一个什么框架呢，我们撇开Express不谈，我们想要完成一个Node的服务，只要如下的代码就可以完成:

```javascript
var http = require("http");
var server = http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/html"});
  response.write("Hello World!");
  response.end();
});
server.listen(80);
```
很简单的几行代码就实现了一个服务器，假如我们的需求只是简单的渲染一个页面的话，我们大可以用这几行代码完成我们想做的事情，其实http这系列的库做了很多事情，非常建议大家回头去看看这一系列Express底层的Api。当然了最后我们还是会用框架的，自己整理的也好，用现在流行的Expres或者Koa也好，目的是为了应对复杂的使用场景，减少重复繁琐的代码。

### 小小的实现一下

说起Express的特点，大概就是中间件吧，所有的东西都是通过中间件来完成的，那么中间件实现是怎么样的呢，假如我们自己实现一个Express，我们就应该先解决中间件的问题，那让我们来尝试一下实现一个简单的Express。

首先我们抽离`createServer`的参数
```javascript
const app = function(req, res) {
  //TODO someting
}
var server = http.createServer(app);
server.listen(port)
```
这样我们逻辑处理就放到了app里面，有的时候一次运行可能产生多个app的实例，为了分隔环境，我们可以用一个工厂方法或者构造行数生成app
```javascript
const express = function() {
  return function(req, res) {
  //TODO someting
  }
}

const app = express();
var server = http.createServer(app)
server.listen(port)
```
接下来我们先实现`app.use`

```javascript

function Middleware = function(path, fn) {
  if (!(this instanceof Middleware)) {
    return new Middleware(...arguments);
  }
  this.path = path;
  this.fn = fn;
}

app.use = function(path, ...fns) {
  if (arguments.length == 1) {
    fns = path;
    path = '/';
  }
  for(var index in fns) {
    var fn = fns[index]
    const middleware = Middleware(path, fn);
    this.middlewares.push(middleware);
  }
}
```
我们定义了一个Middleware的对象，其中有个很多框架中常用的hack，也就是在一个class里面判断是否是使用new来创建对象的，因为使用new来创建对象的时候this一定是当前类的实例，所以我们可以根据this的类型来重定向一个`new Function`。Middleware用于封装一个中间件层,用于绑定中间件和对应的path。在`app.use`里面我们将中间件都保存在`app`的`middlewares`属性中，那么接下来，我们就要实现这个中间件的处理过程。

首先我们要增加一个handler的function

```javascript
function mathMiddleware(url, middleware) {
  // TODO match middleware
}
app.handler = function(req, res) {
  var url = req.url;
  var middlewares = app.middlewares;
  var idx = 0;
  var match = false;
  var middleware;
  function done() {
    //完成这次请求, 比如有error的情况
  }
  function next (err) {
    if (err) {
      done(err)
    }
    while(match === false && idx < middlewares.length) {
      middleware = middlewares[idx];
      match = mathMiddleware(url, middleware)
    }
    middleware.handle(req, res, next);
  }
}
```
在Middleware中加上一个`handle`

```javascript
Middleware.prototype.handle = function(req, res, next) {
  try {
    this.fn(req, res, next);
  } catch(e)  {
    next(e)
  }
}
```
这只是简单的实现了一下Express的中间件的逻辑，这也大致是Express的实现逻辑，我们知道了这种中间件的实现方式，那么今后在我们的应用中，对某一块逻辑要使用策略模式、装饰着模式或者工厂模式的时候，我们也可以用一个这样的中间件的策略去切割代码，让逻辑的处理变的非常简单而清晰。

### 别YY了，看一下官方实现

官方的代码其实写的非常易懂，总的来说，给我的感觉，express就是一个微型的框架。

##### 结构

```
├── application.js
├── express.js
├── middleware
│   ├── init.js
│   └── query.js
├── request.js
├── response.js
├── router
│   ├── index.js
│   ├── layer.js
│   └── route.js
├── utils.js
└── view.js
```

###### express.js

这是整个应用的入口，主要的工作的整合了`application.js`中的关于app的属性，构造了一个函数来输出app，将一些辅助函数输出，比如`Router`、`Request`等等

###### router

这个类我们应该不陌生，我们在使用express的时候经常使用
```javascript
var express = require('express');
var router = express.Router();
```

这个router其实是整个app的核心，包括app.use的中间件实现也是通过Router实现的，以下是源码加上注释
```javascript
proto.use = function use(fn) {
  var offset = 0; //用于计算参数的个数来获取所有的中间件
  var path = '/'; //设置默认的path为 /
  if (typeof fn !== 'function') { // use('/', fn)的情况
    var arg = fn;
    while (Array.isArray(arg) && arg.length !== 0) {
      arg = arg[0];
    }
    if (typeof arg !== 'function') {
      offset = 1;
      path = fn;
    }
  }
  //通过offset获取所有的中间件
  var callbacks = flatten(slice.call(arguments, offset));
  //当中间件的个数为零的时候，抛出异常
  if (callbacks.length === 0) {
    throw new TypeError('Router.use() requires a middleware function')
  }

  for (var i = 0; i < callbacks.length; i++) {
    var fn = callbacks[i];
    if (typeof fn !== 'function') {
      throw new TypeError('Router.use() requires a middleware function but got a ' + gettype(fn))
    }
    debug('use %o %s', path, fn.name || '<anonymous>')
    // 创建一个Layer，类似于之前自己实现的Middleware
    var layer = new Layer(path, {
      sensitive: this.caseSensitive,
      strict: false,
      end: false
    }, fn);
    layer.route = undefined;
    this.stack.push(layer); //将这个layer加入到栈中
  }
  return this; //返回自己用于链式调用
};
```
之后会讲到这个Layer类，这是一个中间件的承载物，所有的中间件的处理方法和路径的绑定信息都被封装在这个类的实例中，而Router的use方法即使将这些中间件打包成为一个Layer，然后存储到自己的stack中用于之后使用。
然后是一个Router中的request处理类，用于使用中间件处理请求。
```javascript
proto.handle = function handle(req, res, out) {
  var self = this; //用self指向老的this
  var idx = 0; // 迭代stack的迭代器
  var protohost = getProtohost(req.url) || '' //获取协议名
  var removed = ''; // 定义删除字段
  var slashAdded = false;
  var paramcalled = {};
  var options = [];
  var stack = self.stack; // layer 的集合
  var parentParams = req.params;
  var parentUrl = req.baseUrl || '';
  var done = restore(out, req, 'baseUrl', 'next', 'params');
  req.next = next;
  if (req.method === 'OPTIONS') { // 处理Options的请求，跨域问题
    done = wrap(done, function(old, err) {
      if (err || options.length === 0) return old(err);
      sendOptionsResponse(res, options, old);
    });
  }
  req.baseUrl = parentUrl;
  req.originalUrl = req.originalUrl || req.url;
  next();
  // 中间件的迭代方法
  function next(err) {
    var layerError = err === 'route' ? null : err;
    //计算req.url, req.baseUrl
    if (slashAdded) {
      req.url = req.url.substr(1);
      slashAdded = false;
    }
    if (removed.length !== 0) {
      req.baseUrl = parentUrl;
      req.url = protohost + removed + req.url.substr(protohost.length);
      removed = '';
    }
    //处理特殊情况，结束这次访问
    if (layerError === 'router') {
      setImmediate(done, null)
      return
    }
    //处理特殊情况，结束这次访问, 没有匹配的路由了
    if (idx >= stack.length) {
      setImmediate(done, layerError);
      return;
    }
    var path = getPathname(req); //获取当前path
    if (path == null) {
      return done(layerError);
    }
    var layer;
    var match;
    var route;
    while (match !== true && idx < stack.length) {
      // TODO: 循环获取匹配的Layer
    }
    // 没有匹配的
    if (match !== true) {
      return done(layerError);
    }
    //TODO: 根据layer注入req.params
    //TODO: 根据需要调用layer.handle_request或者layer.handle_error
  }
};

```
当然了我省略了一部分代码，给大家大致的介绍了一下router是如何处理中间件的，处理中间件的关键就这么两个函数，一个是`use`，一个是`handle`，`handle`用于以中间件的形式迭代处理请求，`use`用于注册中间件

###### application.js

这是一个app的类，定义了app的属性和函数，那么application又和router有什么联系呢，我们从api中可以发现，几乎router有的函数，在app中都可以使用，比如router.use和app.use，router.get和app.get，那么官方的实现中，是怎么实现的呢，是否是简单的继承呢。我们带着疑问去观察这个类，我们会发现application中有个router的属性，在中间件的表现上，application只是一个傀儡，大部分的实现都还是依靠router的，application的中间件的操作都是交由其router来处理的，也就是说app.use()是约等于app.router.use()的。比如：
```javascript
app.param = function param(name, fn) {
  this.lazyrouter();
  if (Array.isArray(name)) {
    for (var i = 0; i < name.length; i++) {
      this.param(name[i], fn);
    }
    return this;
  }
  this._router.param(name, fn);
  return this;
};

```
话虽这么说，但是app的router是懒加载的，当调用use之类的函数的时候会判断当前是否已经创建了router，否则会创建一个router。除此之外，还会对参数做一些校验和转换，因此还是推荐不直接使用app.router的方式的。

###### middleware
(有点无聊)这个middleware目录下只是express内置的两个中间件，一个query是用于在req.query注入url中的query参数的，init是一个初始化的中间件，它把req、res相互引用了一些，并mixin了一些req, res的属性，还有x-powered-by额？默认给express打个广告?

###### Layer

(有那么点意思)这是一个藏在Router下的对象，用于包装中间件和对应的path。

###### request&response

(比较无聊)这两个类里面主要是一些api这个和express的核心部分的关系没有那么大，他的主要工作主要集中在封装了一些工具方法，一个方便开发者使用的req, res的属性集合的对象。


### 看源码有什么用?

总的来说，这次的Express源码之旅是很有帮助的，这是我开始这个源码计划的第一个项目，选择Express的原因是这个框架的代码确实看起来比较简单，不需要编译，其次Express还是我现在用的最多的node服务框架，当然之后会考虑使用koa，所以之后很有可能会带来koa的源码解读。作为一个node服务的框架，这次源码阅读让我更加了解Node的http这个模块的东西，有很多的基础的模块在[jshttp](https://github.com/jshttp)中，阅读它们会让我更加理解一些关于http的问题，查看了整个中间件的实现，让我对这种模式豁然开朗，之后希望能够在项目中灵活的运用。对request和response的阅读让我知道了很多之前看文档没有仔细观察到的api。
