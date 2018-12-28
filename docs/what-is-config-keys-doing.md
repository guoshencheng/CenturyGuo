---
title: "Egg项目中配置文件的keys"
date: '2018-12-28'
tag: node,egg
---

> 在之前的文章[深入egg-core前篇](/posts/pre-deep-into-egg-core)中已经讲述了一个道理，node之所以没有成为一个比较流行的服务器语言，是因为node需要一个企业级的框架。而egg或许是一个不错的选择，针对egg-core的内部实现，将会在这篇文章中作出探索。

初始化Egg的项目后，如果我们没有在`config`中设置类似于:

```javascript
exports.keys = `<your keys>`;
```

启动egg应用后请求接口，不出意外应该会获得一个异常:

```
Cookie need secret key to sign and encrypt.
Please add `config.keys` in /xxxxxx/config.xxxx.js
```

我们在配置中定义的一般是插件配置或者自己需求的自定义配置，比如[插件配置的规范](https://eggjs.org/zh-cn/advanced/view-plugin.html#%E6%8F%92%E4%BB%B6%E9%85%8D%E7%BD%AE)中会定义config的键值为插件名，那么令我们奇怪的是，`keys`这个配置是怎么来的？

当我们读文档到了[cookie与session](https://eggjs.org/zh-cn/core/cookie-and-session.html#cookie-%E7%A7%98%E9%92%A5)的时候就会知道，这个`keys`是cookie在加密解密的时候的秘钥，而这个秘钥是可以通过,分割的，可以使用多个秘钥，这是用于灰度更新秘钥的，egg会使用最新的key来加密，而解密的时候会从新到旧的逐个解密，用于兼容老的秘钥生成的cookie，可以说在这点对于开发者的体验非常好了。

令人不舒服的是，这个`keys`可以说是'空降'的，我们可以说是一脸懵逼的接住了这个配置。但是其实这个算是一个egg内建framework的一个配置。

在egg这个包是egg官方为我们提供的一个framework，在这个包里面我们可以搜索到`config.keys`的用法:

```javascript
// application.js
  get keys() {
    if (!this[KEYS]) {
      if (!this.config.keys) {
        if (this.config.env === 'local' || this.config.env === 'unittest') {
          const configPath = path.join(this.config.baseDir, 'config/config.default.js');
          console.error('Cookie need secret key to sign and encrypt.');
          console.error('Please add `config.keys` in %s', configPath);
        }
        throw new Error('Please set config.keys first');
      }

      this[KEYS] = this.config.keys.split(',').map(s => s.trim());
    }
    return this[KEYS];
  }
```

在app的原型链上加上一个keys的只读属性，这个属性会读取`config.keys`，如果没有读取到`config.keys`，会直接抛出异常，这也是我们刚开始提到的，为什么在你不设置`config.keys`的时候，会抛出异常了。

而`app.keys`只是在`extends/context.js`中被使用的:

```javascript
// context.js
  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new this.app.ContextCookies(this, this.app.keys);
    }
    return this[COOKIES];
  },
```

`extends/context.js`在framework中是用于扩展egg中的几个基本对象的。这里应该是覆盖了Koa原本的cookies的原型，查看了一下Koa源码:

```javascript
  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      });
    }
    return this[COOKIES];
  },
```

总的来看，只是Cookie的实现从[cookies](https://github.com/pillarjs/cookies)变为了[egg-cookies](https://github.com/eggjs/egg-cookies)，这两个包还没有深究究竟有什么不同点，根据官方的说法，egg-cookies是cookies的扩展:

> Extends pillarjs/cookies to adapt koa and egg with some additional features.

但是看起来好像只要我们不调用`ctx.cookies`就不会报错，这样好像我们刚开始的报错就说不通了。所以问题就变成了是什么时候调用了`ctx.cookies`呢。

我们并没有在egg框架中找到`ctx.cookies`的使用，所以目标就锁定在了egg的默认插件中。在[文档](https://eggjs.org/zh-cn/basics/plugin.html#%E6%8F%92%E4%BB%B6%E5%88%97%E8%A1%A8)中和源码中我们都能了解到，egg的默认插件有

- [onerror](https://github.com/eggjs/egg-onerror) 统一异常处理
- [Session](https://github.com/eggjs/egg-session) Session 实现
- [i18n](https://github.com/eggjs/egg-i18n) 多语言
- [watcher](https://github.com/eggjs/egg-watcher) 文件和文件夹监控
- [multipart](https://github.com/eggjs/egg-multipart) 文件流式上传
- [security](https://github.com/eggjs/egg-security) 安全
- [development](https://github.com/eggjs/egg-development) 开发环境配置
- [logrotator](https://github.com/eggjs/egg-logrotator) 日志切分
- [schedule](https://github.com/eggjs/egg-schedule) 定时任务
- [static](https://github.com/eggjs/egg-static) 静态服务器
- [jsonp](https://github.com/eggjs/egg-jsonp) jsonp 支持
- [view](https://github.com/eggjs/egg-view) 模板引擎

egg-session其实就是使用了koa-session的插件，外加上一个关于application的扩展，koa-session是使用`ctx.cookies`的，因此使用这个插件的话，需要`exports.keys`这个配置。

但我们尝试将将一下代码写到插件配置中的时候:

```javascript
exports.session = {
  enable: false
}
```

重新启动egg服务，当我们访问页面的时候依旧会报错，从报错信息来看，会发现可以追溯到`egg-security`。关于这个包将来会有个主题来讲述的，不会再这里展开。

其实只是一个简单的`keys`的配置，啰嗦了半天。总是感觉不舒服，因为其实keys的依赖非常难找到，而且并不像插件依赖或者框架依赖描述得这么清晰，我觉得这可能是egg里面一个比价尴尬的设计。
