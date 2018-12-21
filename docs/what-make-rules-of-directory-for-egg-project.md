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

事实上，解析这个魔法，整个过程就是读取某个目录下的文件，解析文件目录为调用层级，解析文件内容为实际调用的函数，如果尝试写一下伪代码的话

```javascript
const path = require('path');
var controller = {}
var dir = /* PATH TO CONTROLLERS */ PATH_TO_CONTROLLERS // 比如 app/controllers
const load = () => {
  const files = fs.readdirSync(dir).filter(i => /\.js$/.test(i) && !/index|helper/.test(i)).map(i => i.replace(/\.js$/, ''));
  files.forEach((file) => {
    const key = handleFileName(file) // 处理一下文件名，规范成正常的key
    controller[key] = controller[key] || {};
    const Controller = require(path.join(dir, file))
    const c = new Controller();
    Object.keys(c).forEach((k) => {
      controller[key][k] = c[k];
    });
  })
}
```

像这么笨拙的实现一下，可能能够大致达到类似的效果，但是我们在使用egg的时候，egg不仅仅支持Class类型的Controller输出，还支持对象类型的输出:

```javascript
exports.create = async ctx => {
  const createRule = {
    title: { type: 'string' },
    content: { type: 'string' },
  };
  // 校验参数
  ctx.validate(createRule);
  // 组装参数
  const author = ctx.session.userId;
  const req = Object.assign(ctx.request.body, { author });
  // 调用 service 进行业务处理
  const res = await ctx.service.post.create(req);
  // 设置响应内容和响应状态码
  ctx.body = { id: res.id };
  ctx.status = 201;
};
```

所以上述的魔法应该再被变换一下，应该支持一下对象的定义：

```javascript
// 另外的代码不在赘述
  const Controller = require(path.join(dir, file))
  if (typeof Controller === 'function') {
    // 创建一个实例
  }
///
```

而定义Controller可以在更加深的层级，比如在`controller/sub/post.js`，在router中可以使用`app.controller.sub.post.xx`来调用这个文件中的某个函数，这点在上面的实现还不足以满足，但是稍作修改应该就能够做到这点。所以其实在egg的代码里也是需要一个load的函数来读取controller的。在egg中，除了读取controller之外，像service、config、plugin等等都需要类似的load来读取某个目录下的文件，那么我们就来寻找这个loader的存在吧。

```javascript
/**
 * Mixin methods to EggLoader
 * // ES6 Multiple Inheritance
 * https://medium.com/@leocavalcante/es6-multiple-inheritance-73a3c66d2b6b
 */
const loaders = [
  require('./mixin/plugin'),
  require('./mixin/config'),
  require('./mixin/extend'),
  require('./mixin/custom'),
  require('./mixin/service'),
  require('./mixin/middleware'),
  require('./mixin/controller'),
  require('./mixin/router'),
];

for (const loader of loaders) {
  Object.assign(EggLoader.prototype, loader);
}

module.exports = EggLoader;
```

在egg-core中最后存在这样的代码，首先引入了一系列的loader，然后将loader中的属性patch到EggLoader.prototype中，这些loader就是最后用于读取我们的目录结构中的模块的关键，也可以说，是这些loader的读取方式约束了我们的目录结构。

查看一下我们熟悉的controller吧:

```javascript
loadController(opt) {
    this.timing.start('Load Controller');
    opt = Object.assign({
      caseStyle: 'lower',
      directory: path.join(this.options.baseDir, 'app/controller'),
      initializer: (obj, opt) => {
        if (is.function(obj) && !is.generatorFunction(obj) && !is.class(obj) && !is.asyncFunction(obj)) {
          obj = obj(this.app);
        }
        if (is.class(obj)) {
          obj.prototype.pathName = opt.pathName;
          obj.prototype.fullPath = opt.path;
          return wrapClass(obj);
        }
        if (is.object(obj)) {
          return wrapObject(obj, opt.path);
        }
        // support generatorFunction for forward compatbility
        if (is.generatorFunction(obj) || is.asyncFunction(obj)) {
          return wrapObject({ 'module.exports': obj }, opt.path)['module.exports'];
        }
        return obj;
      },
    }, opt);
    const controllerBase = opt.directory;

    this.loadToApp(controllerBase, 'controller', opt);
    this.options.logger.info('[egg:loader] Controller loaded: %s', controllerBase);
    this.timing.end('Load Controller');
  },
};
```

这个函数主要做的是事情就是调用了`this.loadToApp(controllerBase, 'controller', opt)`，这个函数被是现在`egg_loader`中:

```javascript
const target = this.app[property] = {};
opt = Object.assign({}, {
  directory,
  target,
  inject: this.app,
}, opt);

const timingKey = `Load "${String(property)}" to Application`;
this.timing.start(timingKey);
new FileLoader(opt).load();
this.timing.end(timingKey);
```

这里的`property`是`controller`，opt的大致结构是这样的:

```js
{
  inject: app, // 应用
  caseStyle: 'lower',
  initializer: function() {}, // 回看
  directory: 'app/controller', // 通常情况下
}
```

最后这个函数，又会把任务交给 `FileLoader().load()` 来处理, 具体的读取逻辑由于有很多代码所以不会过多讲述，我们可以查看一下核心的代码，比如以下代码用于将路径解析成函数访问层级的，

```javascript
function defaultCamelize(filepath, caseStyle) {
  const properties = filepath.substring(0, filepath.lastIndexOf('.')).split('/');
  return properties.map(property => {
    if (!/^[a-z][a-z0-9_-]*$/i.test(property)) {
      throw new Error(`${property} is not match 'a-z0-9_-' in ${filepath}`);
    }
    property = property.replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
    let first = property[0];
    switch (caseStyle) {
      case 'lower':
        first = first.toLowerCase();
        break;
      case 'upper':
        first = first.toUpperCase();
        break;
      case 'camel':
      default:
    }
    return first + property.substring(1);
  });
}
```

`const properties = filepath.substring(0, filepath.lastIndexOf('.')).split('/');`文件目录的后缀刨除后，根据`/`分成数组，然后对这个数组循环，对不合理的文件名抛出异常，然后将带有`-`或者`_`转换为驼峰，针对传入的`caseStyle`处理首个字母。

处理的结果会作为一个`properties`的属性，用于后续的处理。关于文件内容的处理，实现逻辑是这样的:

```javascript
function getExports(fullpath, { initializer, call, inject }, pathName) {
  /** utils.loadFile()
    try {
      const extname = path.extname(filepath);
      if (extname && !require.extensions[extname]) {
        return fs.readFileSync(filepath);
      }
      const obj = require(filepath);
      if (!obj) return obj;
      if (obj.__esModule) return 'default' in obj ? obj.default : obj;
      return obj;
    } catch (err) {
      err.message = `[egg-core] load file: ${filepath}, error: ${err.message}`;
      throw err;
    }
  **/
  let exports = utils.loadFile(fullpath);
  if (initializer) {
    exports = initializer(exports, { path: fullpath, pathName });
  }
  if (is.class(exports) || is.generatorFunction(exports) || is.asyncFunction(exports)) {
    return exports;
  }
  if (call && is.function(exports)) {
    exports = exports(inject);
    if (exports != null) {
      return exports;
    }
  }
  return exports;
}
```

`utils.loadFile`的逻辑大致是如果是不支持的扩展名，则直接读取文件内容，如果是支持的扩展名，则require文件，require之后会对esModule做兼容处理。对exports会通过initializer函数再做一次预处理，如果输出是一个类或者generator或者异步函数的话，直接返回exports，如果是一个普通的函数的话，先传入inject并执行exports的函数，然后将结果作为exports返回。

想起来我们看controller的loader的时候，有看到过一个initializer，我们可以看一下:

```javascript
if (is.function(obj) && !is.generatorFunction(obj) && !is.class(obj) && !is.asyncFunction(obj)) {
  obj = obj(this.app);
}
if (is.class(obj)) {
  obj.prototype.pathName = opt.pathName;
  obj.prototype.fullPath = opt.path;
  return wrapClass(obj);
}
if (is.object(obj)) {
  return wrapObject(obj, opt.path);
}
// support generatorFunction for forward compatbility
if (is.generatorFunction(obj) || is.asyncFunction(obj)) {
  return wrapObject({ 'module.exports': obj }, opt.path)['module.exports'];
}
return obj;
```

所以我们可以知道，，如果你的文件输出的是函数的话，执行这个函数。如果是一个类，则会递归查询Controller的父类，然后逐个获取prototype，对函数绑定一个上下文。如果是对象，也会逐个获取key，对函数绑定上下文。

上面我们获取到了exports和properties，接下来看一下是如何整合的:

```javascript
item.properties.reduce((target, property, index) => {
  let obj;
  const properties = item.properties.slice(0, index + 1).join('.');
  if (index === item.properties.length - 1) {
    if (property in target) {
      if (!this.options.override) throw new Error(`can't overwrite property '${properties}' from ${target[property][FULLPATH]} by ${item.fullpath}`);
    }
    obj = item.exports;
    if (obj && !is.primitive(obj)) {
      obj[FULLPATH] = item.fullpath;
      obj[EXPORTS] = true;
    }
  } else {
    obj = target[property] || {};
  }
  target[property] = obj;
  debug('loaded %s', properties);
  return obj;
}, target);
```

循环的遍历`properties`的`key`，逐个获取`exports`中的`key`的值，并将值赋值到target中，最后target就是讲目录结构转化为数据结构后的结果。

通过看了这些代码，我们大致知道了egg中loader的读取逻辑，我们知道了为什么我们的目录结构是这样的，以及每个文件的输出应该能够写成什么样。egg抽象了一个loader就是因为egg中像controller这样读取的逻辑有很多，不同的只是在读取的时候`initializer`的处理逻辑有所不同。
