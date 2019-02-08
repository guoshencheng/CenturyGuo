---
date: '2019-01-30'
title: '翻译: "Bug-O"表示法'
tag: translate,overreacted
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/posts/overreacted)，原文链接请查看[这里](https://overreacted.io/the-bug-o-notation/)

当我们在编写一些需求高性能的代码的时候，我们需要养成一个时刻注意当前算法复杂度的习惯。我们通常通过大O表示法来评估。

大O表示法用于评估**当你输入大量数据来处理的时候你的代码的运行效率**。加入你的算法的复杂度是O(<i>n<sup>2</sup></i>)复杂度，那么处理50或更高量级的数据的时候大致会执行2500次以上。大O表示法不会给你一个准确的数字，但是它能够帮助你估算你的算法你的伸展性(当你的数据量增加的时候，你的算法的性能)。

比如: O(<i>n</i>), O(<i>n</i> log <i>n</i>), O(<i>n<sup>2</sup></i>), O(<i>n!</i>).

但是**本文并不是阐述算法或者算法性能的**，而是讲述API和调试的，以上的例子只是证明: API的设计也需要考虑类似的情况。

---

我们有大量的时间都花在了在我们的代码中寻找并修复问题，因此很多开发者都期望能够更快的找到问题的所在，虽然最后找到问题后可能还是会很开心，但是有时候你本可以一下子就完成的需求却需要花费一整天的时间来追踪某一个bug真的让人很不爽。

在我们选择抽象，库或者工具的时候，我们都需要考虑调试的体验。有些API或者语言设计让各种各样的问题都可能发生，有的甚至会产生数不清的问题。**那么我们应该怎么评估这些API呢**

很多在线的对于API的讨论主要是针对API的美感的。但是却[很少有](https://overreacted.io/optimized-for-change/)对API的使用体验作出评论的。

**我对API的体验有自认为比较公平的估量方式，我把它叫做*Bug-O*表示法:**

<font size="40">🐞(<i>n</i>)</font>

大O表示法描述了当输入增加的时候这个算法的减缓程度。而*Bug-O*表示法者描述了当你的代码量变多的时候，这个API会让你的效率降低多少。

---

比如，查看以下这段通过`node.appendChild()`和`node.removeChild()`来手动更新DOM的代码，这段代码还没有被重构：

```js
function trySubmit() {
  // Section 1
  let spinner = createSpinner();
  formStatus.appendChild(spinner);
  submitForm().then(() => {
  	// Section 2
    formStatus.removeChild(spinner);
    let successMessage = createSuccessMessage();
    formStatus.appendChild(successMessage);
  }).catch(error => {
  	// Section 3
    formStatus.removeChild(spinner);
    let errorMessage = createErrorMessage(error);
    let retryButton = createRetryButton();
    formStatus.appendChild(errorMessage);
    formStatus.appendChild(retryButton)
    retryButton.addEventListener('click', function() {
      // Section 4
      formStatus.removeChild(errorMessage);
      formStatus.removeChild(retryButton);
      trySubmit();
    });
  })
}
```

这段代码的问题并不是说这段代码有丑陋，我们现在没有讨论代码的美感。**这段代码的问题在于，如果这段代码里有bug，我们可能并不知道从何开始查找**

**根据这些回调和时间出发中的执行顺讯，可以组合出大量的不同的执行分支**，在这些不同的执行中，有些会抛出成功的信息，有些会有很多spinner、失败、错误信息的操作，有的会导致程序直接崩溃。

这个函数有4个不同的章节，并且我们不能保证他的执行顺序，我非常不靠谱的计算能力告诉我，这里有4×3×2×1 = 24不同的执行分支可以运行。如果我在增加4个相同的代码块，那就会有将近 8×7×6×5×4×3×2×1 - *4万* 种组合。调试这样的代码只能靠运气了。

**换句话来说，这样的代码的Bug-O复杂度应该接近 🐞(<i>n!</i>)**，这里的*n*就是对DOM操作的代码块的数量。对的，这是一个阶乘级的复杂度。所以，这是非常不合理的。不是所有的的执行在实际的环境下都可能发生。但是另一方面，每个代码块都有可能执行多次。<span style="word-break: keep-all">🐞(*¯\\_(ツ)_/¯*)</span>或许实际情况下会更加乐观但是依然是一种非常坏的情况。我们可以做的更好。

---

为了提升这段代码的Bug-O指数，我们可以限制状态和输出。我们可以不借助任何的框架就实现这些，总是使用一些框架在我们的代码中有时也会造成一些问题，以下是我们的一种实现方式:

```js
let currentState = {
  step: 'initial', // 'initial' | 'pending' | 'success' | 'error'
};

function trySubmit() {
  if (currentState.step === 'pending') {
    // 不允许提交两次
    return;
  }
  setState({ step: 'pending' });
  submitForm.then(() => {
    setState({ step: 'success' });
  }).catch(error => {
    setState({ step: 'error', error });
  });
}

function setState(nextState) {
  // 清除所有的已存在的子元素
  formStatus.innerHTML = '';

  currentState = nextState;
  switch (nextState.step) {
    case 'initial':
      break;
    case 'pending':
      formStatus.appendChild(spinner);
      break;
    case 'success':
      let successMessage = createSuccessMessage();
      formStatus.appendChild(successMessage);
      break;
    case 'error':
      let errorMessage = createErrorMessage(nextState.error);
      let retryButton = createRetryButton();
      formStatus.appendChild(errorMessage);
      formStatus.appendChild(retryButton);
      retryButton.addEventListener('click', trySubmit);
      break;
  }
}
```

代码并没有很大的变化，甚至看起来会更加的繁琐。但是这段代码显然更加容易调试，因为这行代码:

```js{3}
function setState(nextState) {
  // 清除所有的已存在的子元素
  formStatus.innerHTML = '';

  // ... 根据form的状态来添加子元素
```

通过在做任何操作之前清除form的状态，我们可以保证我们的DOM操作总是从一个掏空的容器开始的。这就是我们如何来处理不可避免的熵 - 通过*不*让问题积累，这段代码实现了相当于"关掉它重新打开"的效果，而这种方式效果好的让人意外。

**如果有一个问题出现在某个输入中，我们只需要从这个输出向前*单*步追溯 - 直到`setState`的调用** 这段代码调试渲染结果的Bug-O复杂度是🐞(*n*) ，其中*n*是渲染的代码执行分支数。这里只有4个(因为我们只有4中情况在`switch`中)。

这种方式会遗留一些逻辑判断来设置状态，但是调试这些状态的设置会相对简单一些，因为这些中间状态都可以被打印或者断点调试。我们甚至可以明确的阻止一些不期望发生的改变:

```js
function trySubmit() {
  if (currentState.step === 'pending') {
    // 不允许提交两次
    return;
  }
```

众所周知，频繁的设置DOM元素会造成一些消耗。天真的每次都移除并重新创建DOM元素会丢失DOM元素内部的状态，丢失焦点，在大型的应用中可能会造成严重的性能问题。

这就是一些类似于React的框架之所用。它们让你从总是重新创建UI元素的*思维*改变为不需要关心这些。

```js
function FormStatus() {
  let [state, setState] = useState({
    step: 'initial'
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (state.step === 'pending') {
      // Don't allow to submit twice
      return;
    }
    setState({ step: 'pending' });
    submitForm.then(() => {
      setState({ step: 'success' });
    }).catch(error => {
      setState({ step: 'error', error });
    });
  }

  let content;
  switch (state.step) {
    case 'pending':
      content = <Spinner />;
      break;
    case 'success':
      content = <SuccessMessage />;
      break;
    case 'error':
      content = (
        <>
          <ErrorMessage error={state.error} />
          <RetryButton onClick={handleSubmit} />
        </>
      );
      break;
  }

  return (
    <form onSubmit={handleSubmit}>
      {content}
    </form>
  );
}
```

这块代码可能看起来很不一样，但是设计原则是相同的。这种组件的定义方式框定了开发者，让开发者能够清楚的知道这个页面没有混淆了DOM和state操作的*其他*代码了。组件化降低了Bug-O指标

事实上，在React应用中如果*任何*在DOM中的值如果有问题的话，你可以通过逐个追踪这个组件的代码生成的React树来寻找这个问题的来源。无论这个应用的大小如何，寻找一个渲染的值的来源只需要🐞(*树的高度*)

**下次当你想对一个API评估，你就会思考：使用这个API并调试它的🐞(*n*)是什么** 有哪些API和设计原则你比较熟悉的？Redux, CSS, inheritance - 他们都拥有自己的Bug-O。

---
