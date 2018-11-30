---
date: '2018-11-22'
title: '尝试理解Promise源码'
tag: Promise,ES
---

> Promise 是一个老生常谈的题目，我们总会在前端的题目里多多少少的看到关于Promise的题目，奇怪的是，或许大部分人在日常编码中用的总会得心应手，可最后遇到这方面的题目的时候，总是会手足无措，主要原因可能还是对Promise的理解还不够深入吧，思来想去觉得可以去看一下Promise的补丁的代码，从源码的角度上理解一下Promise。

### 开场白

我们可以尝试从几个Promise的问题开始。

1. 如何终止一个Promise
2. 如上的代码会输出什么?

```javascript

new Promise((resolve) => {
  console.log(1);
  resolve();
  console.log(2)
}).then(() => {
  console.log(3)
})
console.log(4);
```

或许以往的编码经验已经让你得出一个答案了，无论这个答案是否能够是正确的，这并不是最重要的，最重要的是你得出这个答案的原因，如果只是背诵出这个答案或者通过一些介绍的文档让你得到这个答案，都不如因为自己理解这个Promise的工作原理来人让人安心。既然Promise是可以通过类似[bluebird]()或者[es-promise-polyfill]()patch出来的，那么我们不妨来看看Promise的实现吧。

我们这次主要是阅读[es5-promise](https://github.com/stefanpenner/es6-promise)的源码，没有选择bluebird是因为我觉得这个会相对简单点。


### 构造函数

```javascript
constructor(resolver) {
  this[PROMISE_ID] = nextId();
  this._result = this._state = undefined;
  this._subscribers = [];

  if (noop !== resolver) {
    typeof resolver !== 'function' && needsResolver();
    this instanceof Promise ? initializePromise(this, resolver) : needsNew();
  }
}
```

构造函数中为一个promise的实例初始化了一些属性，需要注意的是一个`promise`的实例在初始化的时候状态是`undefined`，我们可以查看一下promise定义的状态

```javascript
const PENDING   = void 0;
const FULFILLED = 1;
const REJECTED  = 2;
```

我们需要记住这个状态的定义，在后续阅读源码的时候会有用。

除此之外`promise`的初始化还创建了一个`_subscribers`的属性，这个在整个`promise`的运作过程中很重要，后续会提到。

在检查了resolve和该函数是否被当做构造函数使用之后，执行了`initializePromise`函数来继续初始化`promise`，之后的大部分逻辑都放在了`-internal.js`的文件中

```javascript
function initializePromise(promise, resolver) {
  try {
    resolver(function resolvePromise(value){
      resolve(promise, value);
    }, function rejectPromise(reason) {
      reject(promise, reason);
    });
  } catch(e) {
    reject(promise, e);
  }
}
```

这里的promise是构造函数生成的promise实例，这里的resolver指的是我们在创建Promise实例时传入的函数，比如

```javascript
var promise = new Promise((resolve, reject) => {})
```

上述例子中 resolver指的就是`(resolve, reject) => {}`，我们调用的`resolve(value)`相当于调用了内部定义的`resolve(promise, value)`，我们调用`reject(reason)`相当于调用了内部定义的`reject(promise, reason)`。因此可以看出，当我们创建了一个`Promise`之后，`Promise`的`resolver`会直接开始运行。

那么接下来让我们看一下`resolve(promise, value)`的实现

```javascript
function resolve(promise, value) {
  if (promise === value) {
    reject(promise, selfFulfillment());
  } else if (objectOrFunction(value)) {
    handleMaybeThenable(promise, value, getThen(value));
  } else {
    fulfill(promise, value);
  }
}
```

首先来看第一个判断，这个判断检查了当前的`promise`是否和`resolve`的`value`是相同的，如果相同则执行`reject`，关于 reject 我们可以稍后再来讲解，但是大致是一个跑出异常的途径，而`selfFulfillment`则返回一个错误

```javascript
function selfFulfillment() {
  return new TypeError("You cannot resolve a promise with itself");
}
```

也就是说，在promise和resolve的value相同的情况下，会返回一个异常，比如

```javascript
var a = new Promise(resolve => setTimeout(() => resolve(a), 1000));
setTimeout(() => console.log(a), 2000); // Promise reject with type error
```

这点和原生的Promise可能会有点出入，原生的`Promise`在执行上述第一行后会向外抛出一个异常，而且异常描述和`es-promise`不同，原生异常描述为`Chaining cycle detected for promise #<Promise>` 但是其实应该是一个意思。

接着下一个判断`objectOrFunction(value)`

```javascript
export function objectOrFunction(x) {
  let type = typeof x;
  return x !== null && (type === 'object' || type === 'function');
}
```

这是一个简单的判断是否为对象挥着函数的方法能够通过校验的有 `函数、纯对象、数组、类`

接着如果是个对象或者函数的话，执行一个`handleMaybeThenable`

```javascript
function handleMaybeThenable(promise, maybeThenable, then) {
  if (maybeThenable.constructor === promise.constructor &&
      then === originalThen &&
      maybeThenable.constructor.resolve === originalResolve) {
    handleOwnThenable(promise, maybeThenable);
  } else {
    if (then === TRY_CATCH_ERROR) {
      reject(promise, TRY_CATCH_ERROR.error);
      TRY_CATCH_ERROR.error = null;
    } else if (then === undefined) {
      fulfill(promise, maybeThenable);
    } else if (isFunction(then)) {
      handleForeignThenable(promise, maybeThenable, then);
    } else {
      fulfill(promise, maybeThenable);
    }
  }
}
```

这里先解释一下入参，`promise`是当前的promise，`maybeThenable`是`resolve`的`value`且这个value是对象或者函数，`then`是通过一个`getThen(value)`的函数来获取的

```javascript
function getThen(promise) {
  try {
    return promise.then;
  } catch(error) {
    TRY_CATCH_ERROR.error = error;
    return TRY_CATCH_ERROR;
  }
}
```

这个函数尝试获取了promise的then属性、这里的try/catch我不是很看得懂，应该只有一部分开发人员实在作死的情况下才能够抛出异常。

那么三个入参已经解释完了，我们首先来看第一个判断

```javascript
maybeThenable.constructor === promise.constructor
&& then === originalThen
&& maybeThenable.constructor.resolve === originalResolve
```

总的来说，先判断了当前resolve的value是否是一个promise的实例，然后判断value.then是否是一个正常的then(和定义的promise的then函数相同)，通过这个判断就能够确定当前的value就是一个正常的`promise`实例

针对返回的`promise`会调用函数`handleOwnThenable`来处理

```javascript
function handleOwnThenable(promise, thenable) {
  if (thenable._state === FULFILLED) {
    fulfill(promise, thenable._result);
  } else if (thenable._state === REJECTED) {
    reject(promise, thenable._result);
  } else {
    subscribe(thenable, undefined, value  => resolve(promise, value),
                                   reason => reject(promise, reason))
  }
}
```

这里的promise和thenable分别是当前的promise对象和resolve的value，而thenable其实经过判断也是一个合法的promise，这里校验了resolve的promise的`_state`。
