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

如果thenable是一个已经完成的`promise`的话，调用`fullfill()`

```javascript
function fulfill(promise, value) {
  if (promise._state !== PENDING) { return; }

  promise._result = value;
  promise._state = FULFILLED;

  if (promise._subscribers.length !== 0) {
    asap(publish, promise);
  }
}
```

再次介绍一下这里的入参，promise是当前的promise实例，value是resolve的promise在fulfill之后的返回值，首先`fullfill`本身也会校验`promise`的状态，然后将当前的promise实例赋值状态和当前的值。后续去判断了一个`promise._subscribers`的长度，关于这个`promise._subscribers`应该只是这个`es-promise`自己实现的需要，原生的`promise`是没有这个属性的，我们没有去关注原生的promise的实现方式，暂且关系这个`es-promise`的实现吧，而这个`promise._subscribers`在后续会讲到，可以先理解为一系列已经注册的观察者。至于这些观察者是什么时候注册，后续会娓娓道来。那么我们现在可能比较关心的就是如何理解`asap(publish, promise)`这个调用

```javascript
export var asap = function asap(callback, arg) {
  queue[len] = callback;
  queue[len + 1] = arg;
  len += 2;
  if (len === 2) {
    // If len is 2, that means that we need to schedule an async flush.
    // If additional callbacks are queued before the queue is flushed, they
    // will be processed by this flush that we are scheduling.
    if (customSchedulerFn) {
      customSchedulerFn(flush);
    } else {
      scheduleFlush();
    }
  }
}
```

`queue`是一个全局的变量，每次执行asap都会将回调函数callback和该回调函数所需的参数arg放到队列`queue`中，而len记录了当前queue的长度，当长度为2，也就是说，本来队列中为空的情况下会去执行`scheduleFlush()`这里有个判断，会判断`customSchedulerFn`这个变量，这个变量会在开发人员调用了`setScheduler`设置成开发人员自定义的`scheduleFlush`，而系统已经更具浏览器的兼容情况为我们提供了`scheduleFlush`

```javascript
let scheduleFlush;
// Decide what async method to use to triggering processing of queued callbacks:
if (isNode) {
  scheduleFlush = useNextTick();
} else if (BrowserMutationObserver) {
  scheduleFlush = useMutationObserver();
} else if (isWorker) {
  scheduleFlush = useMessageChannel();
} else if (browserWindow === undefined && typeof require === 'function') {
  scheduleFlush = attemptVertx();
} else {
  scheduleFlush = useSetTimeout();
}
```

我们先看`isNode`的情况

```javascript
function useNextTick() {
  return () => process.nextTick(flush);
}
```

可以发现，其实scheduleFlush就是想在下一个事件循环中执行flush的操作。

```javascript
function flush() {
  for (let i = 0; i < len; i+=2) {
    let callback = queue[i];
    let arg = queue[i+1];
    callback(arg);
    queue[i] = undefined;
    queue[i+1] = undefined;
  }
  len = 0;
}
```

而flush就是讲队列中的任务逐个执行，这里没有将队列中的数据排出，这就是为什么还需要个len来表示当前队列的实际长度

接下来的各种判断就是根据浏览器来决定用什么方式来实现“下个事件循环”中执行

```javascript
function useMutationObserver() {
  let iterations = 0;
  const observer = new BrowserMutationObserver(flush);
  const node = document.createTextNode('');
  observer.observe(node, { characterData: true });

  return () => {
    node.data = (iterations = ++iterations % 2);
  };
}
```

`useMutationObserver`是通过MutationObserver的监听来实现事件循环，关于MutationObserver的浏览器兼容问题，可以查看[can i use ](https://caniuse.com/#search=MutationObserver)

```javascript
// web worker
function useMessageChannel() {
  const channel = new MessageChannel();
  channel.port1.onmessage = flush;
  return () => channel.port2.postMessage(0);
}
```

`useMessageChannel`是通过web worker的`MessageChannel`来实现事件循环的，关于`MessageChannel`的浏览器兼容问题，可以查看[can i use](https://caniuse.com/#search=MessageChannel)

最后，保底会使用setTimeout来实现事件循环

```javascript
function useSetTimeout() {
  const globalSetTimeout = setTimeout;
  return () => globalSetTimeout(flush, 1);
}
```

当然这并不是很科学的下个事件循环的实现，只是模拟的一个简短的延迟执行。

回过头来我们继续看调用这个`asap`的代码

```javascript
function fulfill(promise, value) {
  // ...
    asap(publish, promise);
  // ...
}
```

通过查看刚才对`asap`这个函数的立即，上述代码可以理解为下个事件循环执行`publish(promise)`函数，那么再看查看一下`publish(promise)`这个函数

```javascript
function publish(promise) {
  let subscribers = promise._subscribers;
  let settled = promise._state;
  if (subscribers.length === 0) { return; }
  let child, callback, detail = promise._result;
  for (let i = 0; i < subscribers.length; i += 3) {
    child = subscribers[i];
    callback = subscribers[i + settled];
    if (child) {
      invokeCallback(settled, child, callback, detail);
    } else {
      callback(detail);
    }
  }
  promise._subscribers.length = 0;
}
```

publish获取了promise的subscribers，subscribers中的数据是循环的使用`[...<promise>, <resolved callback>, <rejected callback>...]` 如果 subscribers 中没有观察者，则什么都不做，否则循环。在每个循环中，取到观察者promise，通过当前的promise的状态来获取应该使用resolve还是reject

```javascript
callback = subscribers[i + settled];
```

由于`es-promise`对state的定义为:

```javascript
const PENDING   = void 0;
const FULFILLED = 1;
const REJECTED  = 2;
```

所以可以直接通过`subscribers[i + settled]`来获取到当前的callback, 获取到callback之后会校验观察者的promise是否存在，如果存在就调用`invokeCallback`，否则就调用`callback(detail)`，相当于直接调用注册的的resolve或者reject的回调，`callback(detail)`这个很好理解，那么我们再看看`invokeCallback`做了什么

```javascript
function invokeCallback(settled, promise, callback, detail) {
  let hasCallback = isFunction(callback),
      value, error, succeeded, failed;

  if (hasCallback) {
    value = tryCatch(callback, detail);

    if (value === TRY_CATCH_ERROR) {
      failed = true;
      error = value.error;
      value.error = null;
    } else {
      succeeded = true;
    }

    if (promise === value) {
      reject(promise, cannotReturnOwn());
      return;
    }

  } else {
    value = detail;
    succeeded = true;
  }

  if (promise._state !== PENDING) {
    // noop
  } else if (hasCallback && succeeded) {
    resolve(promise, value);
  } else if (failed) {
    reject(promise, error);
  } else if (settled === FULFILLED) {
    fulfill(promise, value);
  } else if (settled === REJECTED) {
    reject(promise, value);
  }
}
```

这又是一个需要回顾入参的函数，settled为当前Promise的状态，promise为当前的观察的promise的实例，callback为当前观察者注册的父promise在resolve或者reject后的回调，detail是当前promise在fullfill后的返回值

```javascript
function reject(promise, reason) {
  if (promise._state !== PENDING) { return; }
  promise._state = REJECTED;
  promise._result = reason;
  asap(publishRejection, promise);
}
```

```javascript
function publishRejection(promise) {
  if (promise._onerror) {
    promise._onerror(promise._result);
  }
  publish(promise);
}
```

```javascript
function subscribe(parent, child, onFulfillment, onRejection) {
  let { _subscribers } = parent;
  let { length } = _subscribers;
  parent._onerror = null;
  _subscribers[length] = child;
  _subscribers[length + FULFILLED] = onFulfillment;
  _subscribers[length + REJECTED]  = onRejection;
  if (length === 0 && parent._state) {
    asap(publish, parent);
  }
}
```

```javascript
function handleForeignThenable(promise, thenable, then) {
   asap(promise => {
    var sealed = false;
    var error = tryThen(then, thenable, value => {
      if (sealed) { return; }
      sealed = true;
      if (thenable !== value) {
        resolve(promise, value);
      } else {
        fulfill(promise, value);
      }
    }, reason => {
      if (sealed) { return; }
      sealed = true;

      reject(promise, reason);
    }, 'Settle: ' + (promise._label || ' unknown promise'));

    if (!sealed && error) {
      sealed = true;
      reject(promise, error);
    }
  }, promise);
}

```

```javascript
function tryThen(then, value, fulfillmentHandler, rejectionHandler) {
  try {
    then.call(value, fulfillmentHandler, rejectionHandler);
  } catch(e) {
    return e;
  }
}
```

```javascript
export default function then(onFulfillment, onRejection) {
  const parent = this;

  const child = new this.constructor(noop);

  if (child[PROMISE_ID] === undefined) {
    makePromise(child);
  }
  const { _state } = parent;

  if (_state) {
    const callback = arguments[_state - 1];
    asap(() => invokeCallback(_state, child, callback, parent._result));
  } else {
    subscribe(parent, child, onFulfillment, onRejection);
  }
  return child;
}
```
