---
title: '静心打磨手中利刃之从Ghost到Passport'
date: '2017-10-22'
tag: 静心打磨手中利刃,node
---
> 其实一直有接触[Ghost](https://github.com/TryGhost/Ghost)这个博客系统，自从学习node开始，就有使用过这个系统，乃至现在公司的博客系统，都是使用这个搭建的，曾经没有好好的去看看源码。最近想要修改这个系统的后台系统，但是[Ghost-Admin](https://github.com/TryGhost/Ghost-Admin)的代码编译恕在下无能，真的有点难编译，或者可能就算编译通过了，也会比较难适应，于是就心生一个念头，自己写个[ghost-admin-react](https://github.com/guoshencheng/ghost-admin-react)，当然随之而来的就是这个这个后台系统的登录问题，虽然我们从原始后台系统的登录就可以了解这个系统的登录了，但是我们不妨一窥Ghost的登录源码，或许能有些惊喜。

### Ghost里面的接口登录校验

既然是接口的登录校验，那我们就直蹦`core/server/routes/api.js`的代码，我们会发现，这个Router在刚开始就声明了两种auth的中间件处理队列
```javascript
// no auth
var authenticatePublic = [
    middleware.api.authenticateClient,
    middleware.api.authenticateUser,
    middleware.api.requiresAuthorizedUserPublicAPI
]

// auth
// Require user for private endpoints
var authenticatePrivate = [
    middleware.api.authenticateClient,
    middleware.api.authenticateUser,
    middleware.api.requiresAuthorizedUser
];
```
从字面上就很容易理解，一个中间件是用于public的api的，一个中间件是用于private中间件的，那我们看一下`auth.js`这个中间件的实现吧

##### authenticateClient

先看一下代码吧

```javascript
  function authenticateClient(req, res, next) {
    //假如 在头部含有 authorization: Bearer <access_token>，进入到下个中间件
    if (isBearerAutorizationHeader(req)) {
      return next();
    }
    // 否则，视为登录的请求
    //校验client_id 和 client_secret
    //...此处省略若干行
    //passport是一个用于处理请求校验的中间件, oauth2-client-password是一个校验client_id的passport中间件。
    return passport.authenticate(['oauth2-client-password'], {session: false, failWithError: false},
      function authenticate(err, client) {
        var origin = null, error;
        //处理错误 ...省略若干行代码
        //取 origin
        if (req.headers && req.headers.origin) {
          origin = url.parse(req.headers.origin).hostname;
        }
        // passport 的策略处理中没有返回client的时候，报错, 此处省略该功能的若干行代码 if (!client || client.type !== 'ua') { ... } 如果是 ua 类型的 client直接进入下个中间件，关于client是怎么来的，我们后面会继续讲
        // 查看是否非有效的origin 如果有效，进入下个中间件，否则报错
        if (isValidOrigin(origin, client)) {
          // ...
        } else {
          // ...
        }
      }
    )(req, res, next);
  }
```

这个中间件，首先是使用了[passport](https://github.com/jaredhanson/passport)，我们将会在后面继续介绍这个优秀的请求校验相关的中间件。这个中间件主要用于登录和公开api的校验，因为私有的请求应该会在校验`authorization: Bearer <access_token>`的时候就会进入下个中间件，所以我们在登录的时候，需要加入两个有效的client_id和client_secret的秘钥对，这个请求校验可以用于像很多的开放平台拥有一个publicKey和privateKey秘钥对的需求。

##### authenticateUser

老样子吧，我们先看代码，(*^__^*) 嘻嘻……

```javascript
function authenticateUser(req, res, next) {
  // 熟悉的味道，使用了passport, 使用了passport-http-bearer的passport插件，用于校验 你使用的 access_token是否符合bearer规则
  return passport.authenticate('bearer', {session: false, failWithError: false},
    function authenticate(err, user, info) {
      // 处理错误，省略若干代码
      // 校验 user，并带入到接下来的中间件中，否则报错
      if (user) {
        req.authInfo = info;
        req.user = user;
        return next(null, user, info);
      } else {
        // ... 省略若干行代码
      }
    }
  )(req, res, next);
}
```
这个中间件是用于处理所有需要auth的请求的校验，所以所有需要auth的请求都需要在header里面加上一个`authorization: bearer <access_token>`，这样才能通过这个中间件的校验。

##### requiresAuthorizedUser & requiresAuthorizedUserPublicAPI

Ghost提供一个测试的选项，可以公开一些api，在这个选项打开的时候，我们可以访问一些接口，在这个选项没有打开的时候，`requiresAuthorizedUserPublicAPI`中间件等同于`requiresAuthorizedUser`，所以`authenticatePublic`也会等同于`authenticatePrivate`。

##### 小小总结一下

我们现在看完了这个auth的middleware，主要校验两个，一个是头部的authorization，一个是client_secre和client_id，主要用了一个passport的中间件，这个中间件非常灵活，可以使用很多的插件。关于这个passport的预处理，我们可以从`auth-strategies.js`中找到，代码先不上了，比较无聊，就是从数据库中查询相应的数据并返回。

Ghost是一个比较古老的系统，以至于这个系统是需要node4来跑的，但是它从很早就开始使用了passport这个灵活的中间件，使用至今，passport仍然在发展，可见passport除了是一个非常优秀的中间件之外，还是一种非常好的设计模式，分离出了请求校验的这个模块，非常灵活。那么接下来，我们来了解一下这个中间件

### passport

> 上述的Ghost只是一个引子，引出的主要是今天的主角[passport](https://github.com/jaredhanson/passport), passport是个处理请求的权限校验的中间件，是一个非常灵活的中间件，在express灵活的中间件系统中，独立了整个请求校验模块，使用插件的形式处理各种情况的校验。

我们可以先看入口文件，emmm... 都是一些输出的代码，很无聊，我们直接开始看`authenticator.js`，这个文件输出的模块就是我们使用的`passport`。

##### authenticator

```javascript
function Authenticator() {
  this._key = 'passport';
  this._strategies = {};
  this._serializers = [];
  this._deserializers = [];
  this._infoTransformers = [];
  this._framework = null;
  this._userProperty = 'user';
  this.init();
}
```
构造方法，无聊，初始化了一些属性，更多的属性会在init()中被初始化，其中`_userProperty`用于定义passport在作为中间件的时候在req注入的参数名

```javascript
Authenticator.prototype.framework = function(fw) {
  this._framework = fw;
  return this;
};

Authenticator.prototype.init = function() {
  this.framework(require('./framework/connect')());
  this.use(new SessionStrategy(this.deserializeUser.bind(this)));
  this._sm = new SessionManager({ key: this._key }, this.serializeUser.bind(this));
};
```
这个`init`需要关联三个模块，framework/connect模块，strategies/session.js模块，sessionManager模块，session.js我们先放一边，这是一个策略，当我们读了`use`策略的代码之后，在回过头来看看这个代码，我们先来看看sessionManager这个模块

```javascript
SessionManager.prototype.logIn = function(req, user, cb) {
  var self = this;
  this._serializeUser(user, req, function(err, obj) {
    if (err) {
      return cb(err);
    }
    if (!req._passport.session) {
      req._passport.session = {};
    }
    req._passport.session.user = obj;
    if (!req.session) {
      req.session = {};
    }
    req.session[self._key] = req._passport.session;
    cb();
  });
}

SessionManager.prototype.logOut = function(req, cb) {
  if (req._passport && req._passport.session) {
    delete req._passport.session.user;
  }
  cb && cb();
}
```
这个sessionManager的功能就和他的名字一样，是管理session中的user的，sessionManager分装了关于在session中添加用户信息和去除session中的用户信息的方法，我们可以知道passport的user信息是被存储在`req.session._passport.user`中的，这里的logOut我觉得是有问题的，因为`req.session._passport.user`并没有被删除。这也算是个不是特别有意思的模块。

相比之下framework/connect中的代码就很核心了。

```javascript
exports = module.exports = function() {
  exports.__monkeypatchNode();
  return {
    initialize: initialize,
    authenticate: authenticate
  };
};

exports.__monkeypatchNode = function() {
  var http = require('http');
  var IncomingMessageExt = require('../http/request');
  http.IncomingMessage.prototype.login =
  http.IncomingMessage.prototype.logIn = IncomingMessageExt.logIn;
  //...省略若干行代码
};
```
`__monkeypatchNode`这种函数应该很熟悉了，在运行时给内置函数加上补丁。给`http.IncomingMessage`加上了一些函数，req就是继承这个类的，这些函数定义在了`http/request.js`中，差不多就是logIn和logOut，和sessionManager对应。将authenticate和initialize输出。我们先看看initialize

```javascript
module.exports = function initialize(passport) {
  return function initialize(req, res, next) {
    req._passport = {};
    req._passport.instance = passport;
    if (req.session && req.session[passport._key]) {
      // load data from existing session
      req._passport.session = req.session[passport._key];
    }
    next();
  };
};
```
该函数的主要作用是输出一个中间件，中间件会在request进入服务器之后注入一些属性，这个函数会在passport.initialize中被输出，所以在应用中使用passport前先使用这个中间件`app.use(passport.initialize())`，再来看看authenticate，这个函数会很长，开始的几行只是对参数做一下解析，解析出正确的参数，对不同的参数形式做一下兼容，之后返回了一个中间件，我们逐行来读一下这个`function authenticate(req, res, next)`

```javascript
if (http.IncomingMessage.prototype.logIn
    && http.IncomingMessage.prototype.logIn !== IncomingMessageExt.logIn) {
  require('../framework/connect').__monkeypatchNode();
}
```
刚开始检查是否进行过monkeypatch，如果没有，先执行monkeypatch

```javascript
function allFailed() {
  //定义一个失败的回调，
  // 如果在定义中间件的时候，定义了回调，直接调用回调函数
  // 如果没有定义回调会根据定义的参数进行设置并返回
  // options.failureFlash 将错误信息放置到session的flash
  // options.failureMessage 将错误的信息放到session.message
  // options.failureRedirect 重定向到制定的地址,
  // 如果没有定义failureRedirect 会直接返回错误
}
```
以上定义了一个失败的回调函数，会在接下来的函数中被调用，接下来的函数是passport去尝试调用passport策略插件。attempt函数，代码会带上一些注释。可以跟着我一起读

```javascript
(function attempt(i) {
  var layer = name[i];
  // 当最后都取不到layer的时候，调用失败的回调。
  if (!layer) { return allFailed(); }
  // 从策略的栈中获取到对应name的策略， 如果没有取到的话，报错
  var prototype = passport._strategy(layer);
  if (!prototype) { return next(new Error('Unknown authentication strategy "' + layer + '"')); }
  // 获取到strategy，并定义一些必要的函数
  var strategy = Object.create(prototype);
  strategy.success = function(user, info) {
    // 策略成功的函数，太长了就省略一下，有兴趣的可以去看一下，大致讲解一下逻辑
    // 如果定义了callback，执行callback
    // 大致的和失败回调的很像，根据options的选项和失败的回调一样
    // 执行req.logIn并根据选线重定向
  };
  // 在失败了之后将失败的一些信息加入到失败栈中，进入下一个循环
  strategy.fail = function(challenge, status) {
    if (typeof challenge == 'number') {
      status = challenge;
      challenge = undefined;
    }
    failures.push({ challenge: challenge, status: status });
    attempt(i + 1);
  };

  // 重定向
  strategy.redirect = function(url, status) {
    res.statusCode = status || 302;
    res.setHeader('Location', url);
    res.setHeader('Content-Length', '0');
    res.end();
  };
  // 通过并继续下去
  strategy.pass = function() {
    next();
  };
  // 抛出异常
  strategy.error = function(err) {
    if (callback) {
      return callback(err);
    }
    next(err);
  };

  // 执行策略插件的authenticate方法
  strategy.authenticate(req, options);
})(0); // attempt

```

该函数主要是去循环的取的注册的策略插件，逐个的调用策略插件的`authenticate`函数，在这个函数中，会调用上面注册的函数，从而返回、重定向或者继续循环。这是passport的中间件的核心代码，主要的功能是去循环注册的中间件，逐个通过authenticate处理，动态的将当前的对象作为参数，将方法注入到strategy，写的很通用很动态，这种写法也是在平时的代码编写中指的学习的。那么既然我们知道了策略插件的使用，那么我们现在可以来读一读session策略的代码了，也作为一个例子，看看是如何写策略的。

```javascript
SessionStrategy.prototype.authenticate = function(req, options) {
  // 如果没有使用过initialize，报错
  if (!req._passport) { return this.error(new Error('passport.initialize() middleware not in use')); }
  // 省略若干代码
  // su = req._passport.session.user: 看是否含有user
  if (su || su === 0) {
    //解析user
    var paused = options.pauseStream ? pause(req) : null;
    this._deserializeUser(su, req, function(err, user) {
      // 省略若干代码
      self.pass();
      if (paused) {
        paused.resume();
      }
    });
  } else {
    self.pass();
  }
};
```
这个策略其实做的像是一个中间件，只调用了pass和error的参数，主要的功能在req中加入user其中user可以定义_userProperty来修改，我们要在应用开始的时候注册一下session的中间件，`app.use(passport.session())`

### 总结

这次的源码主要是passport这个模块，前面的Ghost主要是用来引出这个模块的。针对这个passport，很明显，贯穿全局的设计模式就和他里面的strategy名字一样，策略模式，这个模块提供了一个非常好的策略模式的实现方法，将除了除了策略的通用的方法抽离出来，将策略抽象出来，我们只要去实现特定的策略，然后在特定的地方使用特定的策略就可以了。这种方法减少了代码的冗余，梳清了代码的逻辑，把唯一可变的东西抽象了出来单独实现，是一种很好的设计模式。
