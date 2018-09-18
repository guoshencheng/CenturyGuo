---
title: '浅析wepy源码'
date: '2018-05-23'
tag: wepy,小程序
---

> 首先让我们先恭喜RNG，其次我们恭喜LGD(data, lol的玩家一个都不能得罪)。wepy是腾讯自家出品的一个小程序框架。小程序在代码体验上会和vue差不多，很多人从vue转向小程序可以说门槛非常低，但是小程序的开发体验我觉得一直是个问题，样式的支持、js语法的支持、`node_modules`不能直接引入等问题，降低了初级开发者的学习成本，却降低了一些从习惯了前端模块化开发的同学对小程序的开发体验。而wepy的正是解决了这个问题。

类vue的框架对于笔者而言其实是有点反感的。笔者是一位vim使用者，但是vim的vue插件真的做的不是特别好，由于我们一般会进行这样的设置`autocmd BufRead,BufNewFile *.vue setlocal filetype=vue.html.javascript.css`，这会在`*.vue`的文件中加载所有`html.javascript.css`的插件，这会导致vim卡顿，而似乎市面上面没有更好的解决方案。当然笔者曾经也用过一段时间的atom，直到atom出现了切换网络就会crash的问题，又用回了vim。说到底vue终究是个门槛低的东西，在人才储备上有比较大的优势，自然也是不学不行。

几个月前开始接手了一个小程序的项目，当时还没有`mpvue`，面对一家独大的wepy我们选择了尝试，wepy让我们的开发体验提升了不少，但是依然存在了不少问题，有时恨不得直接用小程序原生写。项目进入了平缓的迭代维护期，我们也需要沉下心来研究一下我们开发了两个项目的框架wepy。话在前头，笔者不会像前面几篇一样非常详细的讲述`wepy`的源码，吃不消也没必要。

虽然再`packages`下的目录很多，但是我们这次只会涉及到这两个包
```bash
├── wepy
└── wepy-cli
```
其他的包我们这次暂时不会涉及到，大概介绍一下功能，比如`wepy-ant`是一个支付宝小程序的适配器，上面实现了一套和微信小程序wepy几乎一样的wepy接口，用于同构支付宝小程序和微信小程序, 相同的`wepy-web`也是相同的作用，`wepy-compiler-*`都是一些编译器，针对不同的语言进行编译，`wepy-plugin-*`是一些插件，`compiler`和`plugin`本次的源码阅读并没有涉及，两者差不多就是webpack中的loader和plugin。

那么其实我们这次主要讲的是wepy的api。这里可能描述不清，所谓的wepy的api就是指我们在编写wepy代码的时候用到的api，比如
```javascript
import wepy from 'wepy';
export class DogPage extends wepy.page {

}
```

关于wepy-cli这方面的东西这次只会作为辅助作用的涉及，并不会全篇讲述，因为一个wepy的api源码已经内容很多了...

#### wepy的api

> 随便瞭一眼出口文件大概输出了这么几个api：`app`、`event`、`component`、`page`、`mixin`、`$createApp`、`$createPage`以及一些工具api

##### app

> app对用着小程序的app，我们必不可少的会像这样使用这个api

```javascript
export default class extends wepy.app {
  config = {
    ...
  }
}
```
在文件的开头，我们会发现wepy定义了一个RequestMQ来处理同时发起超过5个请求在小程序中被限制的问题。

```javascript
push(param) {
  param.t = +new Date();
   while ((this.mq.indexOf(param.t) > -1 || this.running.indexOf(param.t) > -1)) {
     param.t += Math.random() * 10 >> 0;
   }
   this.mq.push(param.t);
   this.map[param.t] = param;
},
next () {
  let me = this;
  if (this.mq.length === 0) return;
  if (this.running.length < this.MAX_REQUEST - 1) {
    let newone = this.mq.shift();
    let obj = this.map[newone];
    let oldComplete = obj.complete;
    obj.complete = (...args) => {
      me.running.splice(me.running.indexOf(obj.t), 1);
      delete me.map[obj.t];
      oldComplete && oldComplete.apply(obj, args);
      me.next();
    }
    this.running.push(obj.t);
    return wx.request(obj);
  }
},
request (obj) {
  obj = obj || {};
  obj = (typeof(obj) === 'string') ? {url: obj} : obj;
  this.push(obj);
  return this.next();
}
```
撇开属性不谈，这个队列一共包含了三个函数，当我们调用`wx.request`的时候，会调用这个队列的request函数，也就是会先执行`push`，然后尝试执行`next`，`push`中，为传入的参数打上一个唯一的时间戳标志，然后将时间戳放置到队列中，并将时间戳和请求的选项在map中映射，在`next`中，会判断等待队列中的任务数量和执行中的任务数量，满足执行中空闲且等待中有任务就会执行请求任务，在执行完毕后递归调用`next`通知队列已经空闲。

这段代码抽象出来我们能够做成一个任务队列，在很多高并发任务的场景下，我们能够利用这个队列来降低cpu和内存的急性消耗，曾经在一个electron项目中用到过相同的技术，面对用户电脑性能不佳的情况，多个任务同时执行会让用户的电脑边的卡顿，当时笔者就是使用了一个单任务队列来降低用户任务的并发从而降低cpu的消耗。

app的`$init`函数主要做了两件事：调用了`$initAPI`和将微信小程序的全局getApp()对象赋值给了`$wxapp`。在`$initAPI`中，做的事情也不多，就是将一些微信小程序原生的api进行了替换，request使用了之前提到的队列请求，在api中注入了拦截器，可选的将一些api的回调改为使用promise

##### component

> 又是一个我们非常熟悉的api, 当我们申明组件的时候，需要继承这个component

让我们从`$init`开始讲起吧，这个函数接收三个变量`$wxpage`, `$root`和`$parent`

```javascript
this.$wxpage = $wxpage;
if (this.$isComponent) {
  this.$root = $root || this.$root;
  this.$parent = $parent || this.$parent;
  this.$wxapp = this.$root.$parent.$wxapp;
}

if (this.props) {
  this.props = Props.build(this.props);
}
```
在`$init`函数中，会对当前的一些属性赋值，这里遇到了一个`Props.build`的函数，在文件的上部，已经申明过了

```javascript
build (props) {
  let rst = {};
  if (typeof(props) === 'string') {
    rst[props] = {};
  } else if (toString.call(props) === '[object Array]') {
    props.forEach((p) => {
      rst[p] = {};
    });
  } else {
    Object.keys(props).forEach(p => {
      if (typeof(props[p]) === 'function') {
        rst[p] = {
          type: [props[p]]
        }
      } else if (toString.call(props[p]) === '[object Array]') {
        rst[p] = {
          type: props[p]
        }
      } else
        rst[p] = props[p];
      if (rst[p].type && toString.call(rst[p].type) !== '[object Array]')
        rst[p].type = [rst[p].type];
    });
  }
  return rst;
},
```
简单的解释来说就是你定义props可以分为字符串、字符串数组和对象。处理成一个key对应一个空对象，字符串数组就是把数组中的每个元素按照字符串的方式处理，如果是个对象会将对象的值作出`value => { type: [].concat(value) }`的映射处理

最后的props大致可能长这样

```javascript
{
  a: {
    type: {
      type: String,
      defaultValue: 12121
    }
  },
  b: {
    type: String
  }
}
```

然后wepy对`$props`中的`.sync`字段生成一个`$mappingProps`，大致的源码是这样的
```javascript
if (this.$props) { // generate mapping Props
  for (key in this.$props) {
    for (binded in this.$props[key]) {
        if (/\.sync$/.test(binded)) { // sync goes to mapping
          if (!this.$mappingProps[this.$props[key][binded]])
            this.$mappingProps[this.$props[key][binded]] = {};
          this.$mappingProps[this.$props[key][binded]][key] = binded.substring(7, binded.length - 5);
        }
      }
    }
  }
}
```
先解释一下`$props`是什么，这个属性在这个文件中是没有赋值的地方的，当我们去cli里面寻找的时候，我们就会发现，这个`$props`是在编译的时候带进来的，我们在写wepy代码的时候假如使用组件，我们会在上面设置一些传递到组件中的属性值，而这个`$props`字段就是组件的实例在template编译的时候总结出来的属性，然后在编译后的代码中，插入到js里面的，所以这里的代码中会出现如此突兀的直接使用`$props`的代码。`$props`大概会长成这样:

```javascript
$props = {
  "search-bar": {
    "autoFocus": "{{auto-focus}}",
    "xmlns:v-on": "",
    "xmlns:v-bind": "",
    "v-bind:keyword.sync": "keyword",
    "v-bind:placeholder.once": "placeholder"
  }
}
```
这是我从某个项目中找到的编译出来的代码片段，用于作为示例，会更好理解最后生成的`$mappingProps`是个什么样的东西，上面的数据经过处理过后`$mappingProps`应该是一个这样的数据
```javascript
{
  "keyword": {
    "search-bar": "keyword"
  }
}
```
所以，`$props`是当前组件的子组件的xml属性集合，而`$mappingProps`是当前的组件被子组件所使用的属性和使用这个属性的子组件以及其映射属性的关系。

代码再往下看发现看是处理`props`了，在文章的前面，我们已经解释过`props`的产生以及`props`的大致的数据结构，这边复习一下，`props`大概长这样:

```javascript
{
  a: {
    type: {
      type: String,
      defaultValue: 12121
    }
  },
  b: {
    type: String
  }
}
```

那么我们拿出源码中的代码片段:

```javascript
if ($parent && $parent.$props && $parent.$props[this.$name]) {
    val = $parent.$props[this.$name][key];
    binded = $parent.$props[this.$name][`v-bind:${key}.once`] || $parent.$props[this.$name][`v-bind:${key}.sync`];
    // ...之后解释
}
```

这里和我们之前讲过的差不多，wepy过滤除了父组件`props`中的，当前组件使用的，需要绑定的属性，从这里我们不难看出，我们在实际编码中也可以像这样的方式`this.$parent.$props[this.$name]`去获取当前这个组件所绑定的数据源，如果这些数据只是一些字符串量的话，我们会轻易的取到，虽然这种使用场景会比较少见，但是也是一个可以储备的hack方式

```javascript
if (binded) {
  if (typeof(binded) === 'object') {
    props[key].repeat = binded.for;
    props[key].item = binded.item;
    props[key].index = binded.index;
    props[key].key = binded.key;
    props[key].value = binded.value;
    inRepeat = true;
    let bindfor = binded.for, binddata = $parent;
    bindfor.split('.').forEach(t => {
      binddata = binddata ? binddata[t] : {};
    });
    if (binddata && (typeof binddata === 'object' || typeof binddata === 'string')) {
      repeatKey = Object.keys(binddata)[0];
    }
    if (!this.$mappingProps[key]) this.$mappingProps[key] = {};
    this.$mappingProps[key]['parent'] = {
      mapping: binded.for,
      from: key
    };
  } else {
    val = $parent[binded];
    if (props[key].twoWay) {
      if (!this.$mappingProps[key]) this.$mappingProps[key] = {};
      this.$mappingProps[key]['parent'] = binded;
    }
  }
} else if (typeof val === 'object' && val.value !== undefined) { // 静态传值
  this.data[key] = val.value;
}
```
这是后续的一段代码，wepy获取到绑定的父组件属性后，会对当前当前的`data`或者`$mappingProps`作出修改，如果没有绑定父组件的属性，直接将属性的值赋值给`data`中的相同key值，如果binded是一个非对象类型，一般是个字符串，会在父组件获取绑定的变量并赋值给当前组件，如果当前的属性是双向绑定的，wepy会在当前的组件的`$mappingProps`中添加关于父组件的属性绑定关系，所以`$mappingProps`不只是维护关于子组件的属性绑定关系，还维护了父组件的组件绑定关系，大致的结构应该是这样:
```javascript
{
  "keyword": {
    "search-bar": "keyword",
    "parent": "k"
  },
  ...
}
```
如果`binded`是一个对象类型，那么当前这个组件被认为是一个在`repeat`标签里面的组件，这里顺带提一下`<repeat for="" item="" index=""></repeat>`会被编译为`<block wx:for="" wx:item="" wx:index=""></block>`，如果组件被放置在`repeat`中，会通过for中的表达式，从父组件取到指定的数据，并在当前组件的属性绑定关系中记录当前属性和父组件的绑定关系，这里的绑定关系和非`repeat`的不同，非`repeat`中只需要记录一个父组件的属性的key值，而`repeat`中的组件会记录父组件用于循环的属性key值和当前的key

```javascript
if (typeof this.data === 'function') {
  this.data = this.data.apply(this.data);
}
```
如果定义component的data是一个函数的话，执行这个函数，并赋值给data

```javascript
for (k in this.data) {
  if (keyCheck(this, k)) {
    defaultData[`${this.$prefix}${k}`] = this.data[k];
    this[k] = this.data[k];
  }
}
```

将生成的`data`的合法key的数据赋值到`defaultData`中

```javascript
this.$data = util.$copy(this.data, true);
```
将`data`深拷贝到`$data`中

```javascript
if (inRepeat && repeatKey !== undefined)
    this.$setIndex(repeatKey);
```

如果这个组件是在`repeat`中，会更具在组件中的`index`重新获取一下数据，这个index，如果是字符串则是字符的下标，如果是对象，就是key，这里的`$setIndex`的函数就不放出来了，和`props`的处理是有一部分重复的代码的，也去取到了`binded`的数，然后从父组件中提取到index对应的属性，相同的，会对`this[key]`、`this.data[key]`和`this.$data[key]`都进行赋值。在获取`binded`这方面，我觉得是可以从`this.$mappingProps`中获取的，而不是像源码中写到的那样，使用重复的代码去获取。

下面这段代码是处理computed的

```javascript
if (this.computed) {
  for (k in this.computed) {
    if (keyCheck(this, k)) {
      let fn = this.computed[k];
      defaultData[`${this.$prefix}${k}`] = fn.call(this);
      this[k] = util.$copy(defaultData[`${this.$prefix}${k}`], true);
    }
  }
}
```
首先这里定义computed一定是一个函数，而不是像vue中那样，可以有`get()`、`set()`的形式，wepy会将所有computed的函数的执行返回值插入到defaultData中，然后再讲defaultData中的值拷贝到当前的组件中

接下来执行了`this.setData(defaultData)`，那么接下来讲一下`setData`这个函数

```javascript
setData (k, v) {
  if (typeof(k) === 'string') {
      if (v) {
          let tmp = {};
          tmp[k] = v;
          k = tmp;
      } else {
          let tmp = {};
          tmp[k] = this.data[`${k}`];
          k = tmp;
      }
      return this.$wxpage.setData(k);
  }
  //========分割线
  let t = null, reg = new RegExp('^' + this.$prefix.replace(/\$/g, '\\$'), 'ig');
  for (t in k) {
    let noPrefix = t.replace(reg, '');
    this.$data[noPrefix] = util.$copy(k[t], true);
    if (util.isImmutable(k[t])) {
      k[t] = k[t].toJS()
    }
    if (k[t] === undefined) {
      delete k[t];
    }
  }
  if (typeof v === 'function') {
    return this.$root.$wxpage.setData(k, v);
  }
  return this.$root.$wxpage.setData(k);
}
```
分割线的前半段处理了只更新一部分值的情况，如果k是一个字符串，也就是说，只更新一个key的值，会将作出`setData(k, value) => setData({ [k]: value })`的转换，所以我们只关心后半段代码，wepy会读取传入的数据，将数据赋值到`$data`中，最后调用原生的$wxpage对象的`setData`函数来设置属性并更新界面。

```javascript
let coms = Object.getOwnPropertyNames(this.$com);
if (coms.length) {
    coms.forEach((name) => {
        const com = this.$com[name];
        com.$init(this.getWxPage(), $root, this);
    });
}
```

`$init`函数的最后这段代码用于递归的创建当前组件或者`page`的子组件。如此便完成了一个`$init`函数的源码阅读。

接下来的函数是`$initMixins()`用于初始化`mixins`
```javascript
$initMixins () {
  if (this.mixins) {
    if (typeof(this.mixins) === 'function') {
      this.mixins = [this.mixins];
    }
  } else {
    this.mixins = [];
  }
  this.mixins.forEach((mix) => {
    let inst = new mix();
    inst.$init(this);
    this.$mixins.push(inst);
  });
}
```
从源码开来，wepy将`mixins`中的构造函数都初始化了一遍，并调用了初始化对象的`$init`函数，并将`mixin`的实例放到了`$mixins`的数组中。如此不如我们先跳过components的源码来看一下mixin的相关部分

##### 麻烦让一让，我要插个队 - `mixins`

`mixins`的基类中就定义了一个上述中我们用到的一个`$init`函数，那让我们来看一下这个`$init`函数是干什么的。

```javascript
$init (parent) {
  let k;
  Object.getOwnPropertyNames(this)
    .concat(Object.getOwnPropertyNames(Object.getPrototypeOf(this))).forEach((k) => {
      if (k[0] + k[1] !== 'on' && k !== 'constructor') {
        if (!parent[k]) parent[k] = this[k];
      }
  });
  ['data', 'computed', 'events', 'components'].forEach((item) => {
    Object.getOwnPropertyNames(this[item]).forEach((k) => {
      if (k !== 'init' && !parent[item][k]) parent[item][k] = this[item][k];
    });
  });
}

```

一目了然的就是，`mixin`的`$init`其实就是将所有除了带`on`的属性如果传入的组件或者`page`没有的话，就赋值给它，简单的来说就是属性补充，而`data`, `computed`，`events`，`components`这种，会对这些属性的值做属性的补充。

##### 好了又回来了 - `components`

好了这下我们看完了`mixin`的大致逻辑了，回到`components`，接下来的函数是`$onLoad`。
```javascript
$onLoad (...args) {
  [].concat(this.$mixins, this).forEach((mix) => {
    mix['onLoad'] && mix['onLoad'].apply(this, args);
  });

  let coms = Object.getOwnPropertyNames(this.$com);
  if (coms.length) {
    coms.forEach((name) => {
      const com = this.$com[name];
      com.$onLoad.call(com);
    });
  }
}
```
相对于上面的`$init`函数来说，这个函数还有之后的几个都会比较简单，`$onLoad`首先执行了`mixin`中的`onLoad`的函数，然后执行了当前组件或者`page`的`onLoad`函数，最后递归的执行子组件的`onLoad`的函数，而后续的`$onUnload`的执行和`onLoad`的执行方式一样，只是把调用的`onLoad`函数换成了`onUnload`。

```javascript
getWxPage () {
  return this.$wxpage;
}
getCurrentPages () {
  return getCurrentPages();
}

```

这几段代码都很无聊，一起讲了吧。`getWxPage`返回当前的原生微信Page对象，`getCurrentPages`返回当前所有原生微信页面，其实就是调用小程序全局的`getCurrentPages`。

```javascript
$getComponent(com) {
  if (typeof(com) === 'string') {
    if (com.indexOf('/') === -1) {
      return this.$com[com];
    } else if (com === '/') {
      return this.$parent;
    } else {
      let path = com.split('/');
      path.forEach((s, i) => {
        if (i === 0) {
          if (s === '') {   
            com = this.$root;
          } else if (s === '.') {
            com = this;
          } else if (s === '..') {
            com = this.$parent;
          } else {
            com = this.$getComponent(s);
          }
        } else if (s) {
          com = com.$com[s];
        }
      });
    }
  }
  return (typeof(com) !== 'object') ? null : com;
}
```
`$getComponent`用于通过路径获取组件，接收一个`com`的参数，如果`com`是一个数组，直接放回当前组件或者`page`的相同key的子组件，其余按照一定的规则匹配，'/'代表根组件，一般为`page`，'..'代表上级组件，'.'代表当前组件，不带特殊字符的字符串，直接获取所取到的组件或者`page`下的相同key的子组件。当然如果直接传入的就是一个`component`对象，直接会返回

```javascript
$invoke (com, method, ...args) {
  com = this.$getComponent(com);
  if (!com) {
    throw new Error('Invalid path: ' + com);
  }
  let fn = com.methods ? com.methods[method] : '';
  if (typeof(fn) === 'function') {
    let $evt = new event('', this, 'invoke');
    let rst = fn.apply(com, args.concat($evt));
    com.$apply();
    return rst;
  } else {
    fn = com[method];
  }
  if (typeof(fn) === 'function') {
    return fn.apply(com, args);
  } else {
    throw new Error('Invalid method: ' + method);
  }
}
```
`$invoke`这个函数相信大家不会陌生，这是一个官方介绍的函数，`$invoke`首先会根据我们传入的`com`参数调用上面讲到过的`$getComponent`来获取到对应的组件，wepy会首先使用调用组件的methods的函数，如果没有这个函数，才会使用组件的函数，这里我们可以观察到，在使用`methods`中的函数的时候，wepy会构造一个`event`对象，而调用组件函数的时候，并不会传入一个`event`对象。这里既然提及到一个`event`的对象，就让我们先看一下`event`类吧。

##### 插播一段广告 - `event`类

`wepy`使用了一个`event`类来定义事件。

```javascript
export default class {
  active = true;
  constructor (name, source, type) {
    this.name = name;
    this.source = source;
    this.type = type;
  }
  $destroy () {
    this.active = false;
  }
  $transfor(wxevent) {
    let k = 0;
    for (k in wxevent) {
      this[k] = wxevent[k];
    }
  }
}
```
---
title: '浅看wepy源码 (wepy 1.7.x)'
date: '2018-05-23'
---

源码中，`event`会有三个自定义属性，分别是`name`，`source`，`type`，event来的实例可以调用`$transfor`将原生事件中的属性赋值到当前自定义的事件中

##### 马上回来 - `component`

和`$invoke`相似，还有两兄弟，分别是`$broadcast`和`$emit`。接下来会逐个介绍

```javascript
$broadcast (evtName, ...args) {
  let com = this;
  let $evt = typeof(evtName) === 'string' ? new event(evtName, this, 'broadcast') : $evt;
  let queue = [com];
  while(queue.length && $evt.active) {
    let current = queue.shift();
    for (let c in current.$com) {
      c = current.$com[c];
      queue.push(c);
      let fn = getEventsFn(c, evtName);
      if (fn) {
        c.$apply(() => {
          fn.apply(c, args.concat($evt));
        });
      }
      if (!$evt.active) break;
    }
  }
}
```
这里并没有使用递归的方式处理事件的向下传递，`$broadcast`函数的功能是对自己的子组件进行事件的广播，并触发组件的组件的事件。这里看到一个陌生的函数`getEventsFn`，先看一下这个函数的实现

```javascript
function getEventsFn (comContext, evtName) {
  let fn = comContext.events ? comContext.events[evtName] : (comContext.$events[evtName] ? comContext.$events[evtName] : undefined);
  const typeFn = typeof(fn);
  let fnFn;
  if (typeFn === 'string') {
    // 如果 events[k] 是 string 类型 则认为是调用 methods 上方法
    const method = comContext.methods && comContext.methods[fn];
    if (typeof(method) === 'function') {
      fnFn = method;
    }
  } else if (typeFn === 'function' || Array.isArray(fn)) {
    fnFn = fn;
  }
  return fnFn;
}
```
wepy会优先使用传入的组件events中的event，其次会采用父组件传递给子组件的event，这里有个疑问就是`$event`是什么，这个可以在`wepy-cli/lib/compile-wpy`中找到线索，这是在编译wepy文件的template后解析出这个组件的`attrs`中的事件类型的`attr`，然后通过插入代码的方式注入到组件中的。获取到event之后会判断类型，是函数就返回这个函数，如果不是函数就当做是methods的`key`来获取函数，这里的代码中有个明显的bug，这里的使用`$events`几乎是没有用的，因为`$events`中获取到的是父组件传经来的eventKey，通常是一个字符串，但是如果这个key是一个字符串，wepy往往会使用当前的组件的`methods[key]`的函数。

`$broadcast`还使用了我们熟悉的`$apply`函数，他这里传入了一个函数，可能大家会以为这是一个回调函数，其实不然，让我们看一下源码。

```javascript
$apply (fn) {
  if (typeof(fn) === 'function') {
    fn.call(this);
    this.$apply();
  } else {
    if (this.$$phase) {
      this.$$phase = '$apply';
    } else {
      this.$digest();
    }
  }
}
```
从这里不难看出，`$apply(fn)`的`fn`参数会比真正执行`$apply`要早一些。所以`fn`只是做一些预处理。这里调用了一个`$digest`函数是做什么的以及我们应该如何设置`apply`的回调，这些我们在解释了`$digest`这个函数之后自然会明白。

这个函数有点长我们分段解释

```javascript
$digest () {
  let k;
  let originData = this.$data;
  this.$$phase = '$digest';
  this.$$dc = 0;
  while (this.$$phase) {
    this.$$dc++;
    if (this.$$dc >= 3) {
      throw new Error('Can not call $apply in $apply process');
    }
    let readyToSet = {};
    ...code will show later
    this.$$phase = (this.$$phase === '$apply') ? '$digest' : false;
  }
}
```
这个函数内部使用了一个while循环，在正常情况下这个while循环只会执行一次，我们在`$apply()`中设置了`$$phase`为`$apply`，在while的最后校验`$phase`的值，最后一般都会将`false`赋值给`$$phase`，因此循环也就不会继续下去了。那么什么时候会出现下一次循环呢，我们先把问题放一放，看一下这个while循环里面的代码，读到中间的若干代码了之后，就会明了了。

```javascript
if (this.computed) {
  for (k in this.computed) { // If there are computed property, calculated every times
    let fn = this.computed[k], val = fn.call(this);
    if (!util.$isEqual(this[k], val)) { // Value changed, then send to ReadyToSet
      readyToSet[this.$prefix + k] = val;
      this[k] = util.$copy(val, true);
    }
  }
}
```
这段的代码主要是重新计算`computed`中的数值并赋值到当前组件或者`page`的对象上

```javascript
for (k in originData) {
  if (!util.$isEqual(this[k], originData[k])) { // compare if new data is equal to original data
    if (this.watch) {
      if (this.watch[k]) {
        if (typeof this.watch[k] === 'function') {
          this.watch[k].call(this, this[k], originData[k]);
        } else if (typeof this.watch[k] === 'string' && typeof this.methods[k] === 'function') {
          this.methods[k].call(this, this[k], originData[k]);
        }
      }
    }
    readyToSet[this.$prefix + k] = this[k];
    this.data[k] = this[k];
    originData[k] = util.$copy(this[k], true);
    if (this.$repeat && this.$repeat[k]) {
      let $repeat = this.$repeat[k];
      this.$com[$repeat.com].data[$repeat.props] = this[k];
      this.$com[$repeat.com].$setIndex(0);
      this.$com[$repeat.com].$apply();
    }
    if (this.$mappingProps[k]) {
      Object.keys(this.$mappingProps[k]).forEach((changed) => {
        let mapping = this.$mappingProps[k][changed];
        if (typeof(mapping) === 'object') {
          this.$parent.$apply();
        } else if (changed === 'parent' && !util.$isEqual(this.$parent.$data[mapping], this[k])) {
          this.$parent[mapping] = this[k];
          this.$parent.data[mapping] = this[k];
          this.$parent.$apply();
        } else if (changed !== 'parent' && !util.$isEqual(this.$com[changed].$data[mapping], this[k])) {
          this.$com[changed][mapping] = this[k];
          this.$com[changed].data[mapping] = this[k];
          this.$com[changed].$apply();
        }
      });
    }
  }
}
```

从originData中按照key逐个取值，如果这些key对应的值已经被改过了，则需要调用该key的监听，会优先执行`watch`中的监听，如果`watch`中没有，会尝试调用`mathods`中的同key函数，所以这里可以看出，wepy的watch只有在`apply`之后才会被调用。接着`digest`会通知`repeat`的组件进行更新，然后通知绑定了当前组件的所有组件更新(递归的调用`$apply`)

```javascript
if (Object.keys(readyToSet).length) {
  this.setData(readyToSet, () => {
    if (this.$$nextTick) {
      let $$nextTick = this.$$nextTick;
      this.$$nextTick = null;
      if ($$nextTick.promise) {
        $$nextTick();
      } else {
        $$nextTick.call(this);
      }
    }
  });
} else {
  if (this.$$nextTick) {
    let $$nextTick = this.$$nextTick;
    this.$$nextTick = null;
    if ($$nextTick.promise) {
      $$nextTick();
    } else {
      $$nextTick.call(this);
    }
  }
}
```
这段代码应该才是执行回调函数，在调用了微信小程序原生`setData`的回调后，调用了`$$nextTick`，而这个`$$nextTick`关系到另一个函数的实现`$nextTick()`

```javascript
$nextTick (fn) {
  if (typeof fn === 'undefined') {
    return new Promise((resolve, reject) => {
      this.$$nextTick = function () {
        resolve();
      };
      this.$$nextTick.promise = true;
    });
  }
  this.$$nextTick = fn;
}
```

调用这个函数会给`$$nextTick`赋值，我们可以传入一个回调函数或者直接处理Promise，不同的是如果使用回调函数的话，我们可以获取到`this`的指向当前的组件或者`page`，那么假如我们在`$nextTick`的使用了`$apply`，那么`this.$$phase`会再次赋值，那么`while`就会继续执行下去，如果嵌套的`$nextTick`次数太多，就会触发`this.$$dc >= 3`的条件，导致报错

想起来大家应该忘了我们其实本来是在讲`$broadcast`这个函数的，确实扯远了，但是这些也是必须要理解的。

```javascript
$emit (evtName, ...args) {
    let com = this;
    let source = this;
    let $evt = new event(evtName, source, 'emit');
    args = args.concat($evt);
    if (this.$parent && this.$parent.$events && this.$parent.$events[this.$name]) {
      let method = this.$parent.$events[this.$name]['v-on:' + evtName];
      if (method && this.$parent.methods) {
        let fn = this.$parent.methods[method];
        if (typeof(fn) === 'function') {
          this.$parent.$apply(() => {
            fn.apply(this.$parent, args);
          });
          return;
        } else {
          throw new Error(`Invalid method from emit, component is ${this.$parent.$name}, method is ${method}. Make sure you defined it already.\n`);
        }
      }
    }
    while(com && com.$isComponent !== undefined && $evt.active) {
      let comContext = com;
      let fn = getEventsFn(comContext, evtName);
      if (fn) {
        if (typeof fn === 'function') {
          comContext.$apply(() => {
            fn.apply(comContext, args);
          });
        } else if (Array.isArray(fn)) {
          fn.forEach(f => {
            f.apply(comContext, args);
          })
          comContext.$apply();
        }
      }
      com = comContext.$parent;
    }
}
```

`$emit`首先先定义了一个事件，如果父组件定义了事件就会去父组件的methods查找事件函数，如果查找不到就会报错，如果找到了就会执行并在执行之后调用`$apply`，如果没有查找到父组件的事件定义，就会更具事件名从当前组件开始查找methods中的函数名，查找到了就执行函数并继续向上查找，如此循环直到`page`。

后面的几个函数`$on`，`$once`，`$off`都是和事件相关的，`$on`就是向`$event`中注册一个事件监听，`$once`只会执行一次，`$off`是移除一个监听

到此为止，一个component的源码已经不清不楚的讲完了。

##### app 继承于 component

> app是继承与component的，拥有所有的component的函数，执行逻辑也是相同的，这里主要介绍app中特殊定义的一些函数的源码

app定义了两个额外的对象`$preloadData`和`$prefetchData`，先讲一下和`$preloadData`相关的函数
```javascript
$preload(key, data) {
  if (typeof(key) === 'object') {
    let k;
    for (k in key) {
      this.$preload(k, key[k]);
    }
  } else {
    this.$preloadData[key] = data;
  }
}
```

很简单`$preload`为`$preloadData`的对象设置键值对

```javascript
$route(type, url, params = {}) {
  if (typeof(url) === 'string') {
    let s = url + '?';
    if (params) {
      let k;
      for (k in params) {
        s += `${k}=${params[k]}&`
      }
    }
    s = s.substring(0, s.length - 1);
    url = {url: s};
  } else {
    params = util.$getParams(url.url);
  }
  // __route__ will be undefined if it called from onLoad
  if (!this.$parent.__route__) {
    this.$parent.__route__ = getCurrentPages()[0].__route__;
    this.$parent.__wxWebviewId__ = getCurrentPages()[0].__wxWebviewId__;
  }
  let absoluteRoute = this.$parent.__route__[0] !== '/' ? ('/' + this.$parent.__route__) : this.$parent.__route__;
  let realPath = util.$resolvePath(absoluteRoute, url.url.split('?')[0]);
  let goTo = this.$parent.$pages[realPath];
  if (goTo && goTo.onPrefetch) {
    let prevPage = this.$parent.__prevPage__;
    let preloadData = {};
    if (prevPage && Object.keys(prevPage.$preloadData).length > 0) {
        preloadData = prevPage.$preloadData;
    }
    goTo.$prefetchData = goTo.onPrefetch(params, {from: this, preload: preloadData});
  }
  return native[type](url);
}
```
`$route`函数先将`params`使用qs的形式拼接到`url`的后面，在跳转页面前，记录当前的`__route__`和`__wxWebviewId__`，通过绝对路径访问即将跳转的page的对象，并尝试调用该`page`的onPrefetch函数，将`onPrefetch`的返回结果赋值给下个页面的`$prefetchData`。然后跳转下个`page`，这里的`onPrefetch`从源码上看起来应该是不能异步的，因为返回值直接赋值给了`$prefetchData`

其余的`$redirect`、`$navigate`、`$switch`都是基于`$route`的，只是最后调用的原生api不同而已A

##### 总结

这次的wepy源码之旅耗时可以说是比较长的了，关于源码的介绍只是半斤八两，有些地方是没有介绍的，还是需要读者自己有机会去阅读以下。那么这次阅读源码的起因是为了了解一下我们在使用的wepy框架，就让我在最后发表一下比较粗浅的看法。

这次主要阅读的是wepy的api源码，在api上wepy在帮助用户从使用上尽可能的接近vue，几乎像是实现了一个比较蹩脚的vue框架，在事件的传递上，computed的实现上，都有像vue靠拢，但是始终，还是后很多地方没有做好。当然了，我还没有去mpvue的源码，这里说些话为时尚早，以下关于mpvue和wepy的比较的mpvue部分都纯属猜测和大致阅读文档的感觉。mpvue是直接使用vue的api的，在这点上，mpvue做的更加彻底，从学习成本上，降低了vue使用者使用mpvue开发小程序的成本，从实现上，更加接近vue的良好的api，很多特性wepy因为没有很好的实现所以并没有支持甚至会有难以忍受的bug。

从编译的角度上来说，wepy自己实现了编译的整个过程，从解析文件到拆分样式模板脚本，到脚本和模板的编译，都是自定义的。而mpvue则是在webpack的基础上，自己写了一些插件和loader来实现编译。wepy从头造轮子的精神让人佩服，而mpvue应该算是踩在巨人的肩膀上，只是踩起来也算是比较费劲了。两者的比较就好像，前者是自己从头造房子并装修，而后者是直接在造好的房子里面装修，前者在造房子的时候会时刻考虑将来的装修，所以在装修的时候就会轻松很多，但是后者只能在别人造的房子里面装修，很多格局都是受限的，但是好在这个房子的制造商确实比较好。mpvue采用webpack为基石我觉得是很智慧的，受限在webpack上写这样的插件和loader是对webpack的插件系统和loader系统要比较了解的，而针对广大已经在大范围使用的webpack的用户而言，会更加熟悉且容易上手，比如很多配置项，即使官方不作出解释，用户也会知道怎么设置，所以官方只需要作出自己核心的loader和插件的配置和说明，而wepy却要维护各方各面，对于开发者、维护者和使用者而言，都会有些痛苦。

说实话，比较了一段时间的mpvue和wepy之后，对`mpvue`可以说是长草了，最近甚至有计划会对其中的一个小程序作出重构，希望那时候能带来下一篇文章。
