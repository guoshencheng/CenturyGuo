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
