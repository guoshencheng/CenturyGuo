---
date: '2018-12-09'
title: '翻译：setState是如何处理更新的'
tag: translate,overreacted
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/posts/overreacted)，原文链接请查看[这里](https://overreacted.io/how-does-setstate-know-what-to-do/)


当你在组件里调用`setState`的时候，你觉得发生了设么？

```jsx
import React from 'react';
import ReactDOM from 'react-dom';

class Button extends React.Component {
  constructor(props) {
    super(props);
    this.state = { clicked: false };
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() {
    this.setState({ clicked: true });
  }
  render() {
    if (this.state.clicked) {
      return <h1>Thanks</h1>;
    }
    return (
      <button onClick={this.handleClick}>
        Click me!
      </button>
    );
  }
}

ReactDOM.render(<Button />, document.getElementById('container'));
```

或许和你想的一样，React 通过接下来的`{ clicked: true }`状态，重新执行了渲染的函数并且将让DOM更新成了`<h1>Thanks</h1>`元素。

看起来非常简单。那么现在的问题是，究竟是*React*做了这些？还是*React DOM*?

更新DOM看起来应该是ReactDOM的职责。但当我们调用`this.setState()`，这却不应该是React DOM的任务。而`React.Component`这个基类的任务则是定义React元素内部的结构。

那么，我们是怎么能够在`React.Component`中调用`setState()`来更新DOM的呢？

**放弃的分割线：就想[大部分](/trasnlate-overreacted-how-does-react-tell-a-class-from-a-function/)[其他的在这个blog中的](/trasnlate-overreacted-why-do-we-write-super-props/)[文章一样](/trasnlate-overreacted-why-do-react-elements-have-typeof-property)。你在生产环境中使用React，你并不需要了解这么多。这篇文章是针对那些想要解开React工作内幕的。是否看下去，完全取决于读者的选择**

---

你可能会猜测，是不是`React.Component`这个类包含了更新DOM的逻辑

但是如果是这么做的话，那为什么`this.setState()`能够在这么多的生态中都能使用？比如，React Native应用中的组件也是继承于`React.Component`。在React Native中像上面那样调用`this.setState()`，在Android或者iOS原生的页面上都能够非常正常的运行。

你可能对React对React Test Renderer 或者 Shallow Renderer比较熟悉。这些测试方案让你能够在运行这些测试的时候也能够渲染这些组件。而这些都没有涉及DOM。

如果你使用过其他的渲染器比如[React ART](https://github.com/facebook/react/tree/master/packages/react-art)，你就会知道，在同一个页面，我们还能同时使用很多渲染器。(比如说，在ReactDOM的DOM树中渲染ART组件)。这使得全局标志或变量无法维持。

因此 **`React.Component`将对于状态的改变的实现委托给了各个平台各自的代码** 在我们能够理解这是怎么做到的之前，我们先研究一下为什么这些包会被分开以及是怎么分开的。

---

这里有个普遍的误区就是大家会觉得React"渲染引擎"是在react的包内的。但这并不是对的。

事实上自从[React0.14的包分割](https://reactjs.org/blog/2015/07/03/react-v0.14-beta-1.html#two-packages)，`react`包只用于暴露一些定义组建的API接口。大部分的*实现*都被放到了"renderer"中

`react-dom`, `react-dom/server`, `react-native`, `react-test-renderer`, `react-art`这些都是`renderer`(或者你也可以[编写你自己的](https://github.com/facebook/react/blob/master/packages/react-reconciler/README.md#practical-examples))

这就是为什么`react`包不关注你所使用的平台是什么。他所输出的模块，比如`React.Component`，`React.createElement`，`React.Children`这些工具或者[Hooks](https://reactjs.org/docs/hooks-intro.html)，都是和目标平台无关的。无论你是使用React DOM或者React DOM Server或者React Native，你都可以把你的组件引入并使用。

相比之下，这些renderer包暴露了平台相关的API，比如 `ReactDOM.render()`让你能够将一个React树渲染到一个DOM节点上。每个renderer都提供了类似的API。通过这种方案，组件就不需要将关于renderer的东西引入了。这让他们更接口化。

**众所周知，React的渲染引擎在各个renderer中被实现** 很多renderers在背部包含了一份react内部相同的代码 - 我们把这个叫做["调节算法"](https://github.com/facebook/react/tree/master/packages/react-reconciler)。这些renderer将调节算法和renderer的代码整合成了一个高性能的渲染库。(复制核心的调节算法代码通常会影响最后包的大小，但是对于那些通常只是用一种renderer的开发者来说，还是可以接受的，比如`react-dom`)。

`react`赋予你可以使用React的功能，但是不会让你知道他们是怎么实现的。这些renderer(`react-dom`, 'react-native' 等等)完成了React最后渲染和逻辑在各自平台上的实现。他们其中可能有的引用了内部的调节器，然后对于各自的平台，完成相应的实现。

---

现在我们知道为什么`react`和`react-dom`包对于某一个功能都需要更新一个版本。比如，当React 16.3 添加了 Context API之后，React的包就暴露了`React.createContext()`的接口。

但是`React.createContext()`不是React自己实现了context这个功能。具体的实现在React DOM和React DOM Server中是不同的。所以`createContext()`只是返回若干个对象:

```js
// 做了一点简化
function createContext(defaultValue) {
  let context = {
    _currentValue: defaultValue,
    Provider: null,
    Consumer: null
  };
  context.Provider = {
    $$typeof: Symbol.for('react.provider'),
    _context: context
  };
  context.Consumer = {
    $$typeof: Symbol.for('react.context'),
    _context: context,
  };
  return context;
}
```

当你使用`<MyContext.Provider>` 或者 `<MyContext.Consumer>`的时候，其实是*renderer*来决定如何处理这些对象。React DOM和React DOM Server各自都会用不同的方式来处理context。

**所以当你更新到`react` 16.3+但是你没有跟新`react-dom`的话，你的renderer可能不能够准确的识别`Provider`和`Consumer`的结构** 这也是为什么老版本的`react-dom`可能会[不能识别新的context的结构](https://stackoverflow.com/a/49677020/458193)

同样的，React Native也有相同的问题。但是不像React DOM，React在更新之后不会立刻强制要求像React Native这样的包更新。这些包拥有自己的更新计划。renderer的更新是在React更新后的几周之内[同步更新](https://github.com/facebook/react-native/commits/master/Libraries/Renderer/oss)的。所以React Native和React DOM拥有不同的更新周期。

---

所以我们现在知道`react`包没有什么update的实现，这些实现都被实现在了`react-dom`、`react-native`这些包里面，但这并没有解决我们的问题。`React.Component`的`setState()`是如何和这些renderer交互的。

**答案就是每个renderer都给React的实例添加了一个字段** 这个字段被命名为`updater`。这个字段对于开发者来说是没有用的，也不需要去操作，这个字段应该由React DOM，React DOM Server或者React Native来设置，这些renderer会在创建一个React实例的时候创建这个字段:


```js
// React DOM 内部
const inst = new YourComponent();
inst.props = props;
inst.updater = ReactDOMUpdater;

// React DOM Server 内部
const inst = new YourComponent();
inst.props = props;
inst.updater = ReactDOMServerUpdater;

// React Native 内部
const inst = new YourComponent();
inst.props = props;
inst.updater = ReactNativeUpdater;
```

查看一下[`setState`在`React.Component`中的实现](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react/src/ReactBaseClasses.js#L58-L67)，`setState`做的只是将所有的处理交给创建React实例时候的renderer:

```js
// 简化一下
setState(partialState, callback) {
  // 使用`updater`来调用renderer的逻辑!
  this.updater.enqueueSetState(this, partialState, callback);
}
```

React DOM Server [可能会](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-dom/src/server/ReactPartialRenderer.js#L442-L448)忽略state的更新并抛出一个警告，而React DOM 和React Native会让他们的调节器来[处理](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-reconciler/src/ReactFiberClassComponent.js#L190-L207)state的更新 

这就是为什么`this.setState()`可以更新DOM，即使在React的包中并没有定义如何更新DOM。这个函数会地调用React DOM 添加的`this.updater`的处理方法，并且让React DOM来主持这次更新。

---

我们现在明白了React.Component的类是如何工作的了，那么Hooks又是如何工作的呢？

当开发者看到[Hook 提案 API](https://reactjs.org/docs/hooks-intro.html)了之后，可能会疑惑：`useState`又是怎么知道具体应该怎么更新的呢？他们可能会猜想这实现的方式可能会比`React.Component`的`this.setState()`更加"神奇"。

但是从我们现在来看，其实React.Component的`setState()`的实现只是一个空壳。他只是将任务交给了renderer。而其实`useState`Hook[做了相同的事情](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react/src/ReactHooks.js#L55-L56)

**相比于添加了一个`updater`的字段，Hooks添加了一个"dispatcher"的字段** 当你在调用`React.useState()`或者`React.useEffect()`之类的Hook的时候，其实最后会被交给当前的disaptcher来处理。

```js
// 在 React 中(简化了一下) 
const React = {
  // 真实的属性被藏在更深处，你可以尝试自己找一下
  __currentDispatcher: null,

  useState(initialState) {
    return React.__currentDispatcher.useState(initialState);
  },

  useEffect(initialState) {
    return React.__currentDispatcher.useEffect(initialState);
  },
  // ...
};
```

每个renderer会在渲染一个组件之前先设置dispatcher:

```js{3,8-9}
// 在 React DOM中
const prevDispatcher = React.__currentDispatcher;
React.__currentDispatcher = ReactDOMDispatcher;
let result;
try {
  result = YourComponent(props);
} finally {
  // Restore it back
  React.__currentDispatcher = prevDispatcher;
}
```

比如React DOM Server的实现是[这样的](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-dom/src/server/ReactPartialRendererHooks.js#L340-L354)，而React DOM 和React Native中的调解器实现是[这样的](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-reconciler/src/ReactFiberHooks.js)。

这也是为什么一些像`react-dom`这样的renderer在使用Hooks的时候需要相同版本的`react`包，否则，你的组件可能不能找到dispatcher!当你使用[不同版本的React](https://github.com/facebook/react/issues/13991)的时候，Hook就会不起作用。像这种情况总是会产生一些无法归宿问题的bug，所以Hooks会在这些bug出现之前，强制让你使用相同的React包。

虽然我们不推荐这么做，但是在特定的调试情况下，你也可以自己重写dispatcher。(我之前说的`__currentDispatcher`这个字段不是真实的，你可以通过React仓库自行找出真实的字段)比如 React DevTools就会使用一个特殊的[dispatcher](ttps://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-debug-tools/src/ReactDebugHooks.js#L203-L214) 来通过追踪Javascript的调用栈来审查Hooks树。*Don’t repeat this at home.*(小朋友别乱玩)


这也意味着Hooks并不是强关联React。如果之后会有更多的库来使用这些基本的Hooks，理论上disaptcher会被分到其他的包里面并暴露一个更加友善的API。

`updater`和`__currentDispatcher`这两个字段遵循了一个*依赖注入*的通用编程理念。这两种实现中，renderer将`setState`的实现注入到React的包中，让你的组件可以被方便的定义。

你在使用React的时候并不需要去思考这些。我们希望React的开发者能够花更多的事件在他们的应用代码上，而不是这些抽象的概念，比如 依赖注入。但是如果你曾对`this.setStete()`护着`useState()`是如何工作的非常好奇，这篇文章会帮助到你。

---