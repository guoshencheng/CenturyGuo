---
date: '2018-12-09'
title: '翻译：setState是如何知道接下来需要更新什么的'
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

同样的，React Native也有相同的问题。但是不像React DOM，React在更新之后不会立刻强制要求像React Native这样的包更新。这些包拥有自己的更新计划。
The same caveat applies to React Native. However, unlike React DOM, a React release doesn’t immediately “force” a React Native release. They have an independent release schedule. The updated renderer code is [separately synced](https://github.com/facebook/react-native/commits/master/Libraries/Renderer/oss) into the React Native repository once in a few weeks. This is why features become available in React Native on a different schedule than in React DOM.

---

Okay, so now we know that the `react` package doesn’t contain anything interesting, and the implementation lives in renderers like `react-dom`, `react-native`, and so on. But that doesn’t answer our question. How does `setState()` inside `React.Component` “talk” to the right renderer?

**The answer is that every renderer sets a special field on the created class.** This field is called `updater`. It’s not something *you* would set — rather, it’s something React DOM, React DOM Server or React Native set right after creating an instance of your class:


```js{4,9,14}
// Inside React DOM
const inst = new YourComponent();
inst.props = props;
inst.updater = ReactDOMUpdater;

// Inside React DOM Server
const inst = new YourComponent();
inst.props = props;
inst.updater = ReactDOMServerUpdater;

// Inside React Native
const inst = new YourComponent();
inst.props = props;
inst.updater = ReactNativeUpdater;
```

Looking at the [`setState` implementation in `React.Component`](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react/src/ReactBaseClasses.js#L58-L67), all it does is delegate work to the renderer that created this component instance:

```js
// A bit simplified
setState(partialState, callback) {
  // Use the `updater` field to talk back to the renderer!
  this.updater.enqueueSetState(this, partialState, callback);
}
```

React DOM Server [might want to](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-dom/src/server/ReactPartialRenderer.js#L442-L448) ignore a state update and warn you, whereas React DOM and React Native would let their copies of the reconciler [handle it](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-reconciler/src/ReactFiberClassComponent.js#L190-L207).

And this is how `this.setState()` can update the DOM even though it’s defined in the React package. It reads `this.updater` which was set by React DOM, and lets React DOM schedule and handle the update.

---

We know about classes now, but what about Hooks?

When people first look at the [Hooks proposal API](https://reactjs.org/docs/hooks-intro.html), they often wonder: how does `useState` “know what to do”? The assumption is that it’s more “magical” than a base `React.Component` class with `this.setState()`.

But as we have seen today, the base class `setState()` implementation has been an illusion all along. It doesn’t do anything except forwarding the call to the current renderer. And `useState` Hook [does exactly the same thing](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react/src/ReactHooks.js#L55-L56).

**Instead of an `updater` field, Hooks use a “dispatcher” object.** When you call `React.useState()`, `React.useEffect()`, or another built-in Hook, these calls are forwarded to the current dispatcher.

```js
// In React (simplified a bit)
const React = {
  // Real property is hidden a bit deeper, see if you can find it!
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

And individual renderers set the dispatcher before rendering your component:

```js{3,8-9}
// In React DOM
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

For example, the React DOM Server implementation is [here](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-dom/src/server/ReactPartialRendererHooks.js#L340-L354), and the reconciler implementation shared by React DOM and React Native is [here](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-reconciler/src/ReactFiberHooks.js).

This is why a renderer such as `react-dom` needs to access the same `react` package that you call Hooks from. Otherwise, your component won’t “see” the dispatcher! This may not work when you have [multiple copies of React](https://github.com/facebook/react/issues/13991) in the same component tree. However, this has always led to obscure bugs so Hooks force you to solve the package duplication before it costs you.

While we don’t encourage this, you can technically override the dispatcher yourself for advanced tooling use cases. (I lied about  `__currentDispatcher` name but you can find the real one in the React repo.) For example, React DevTools will use [a special purpose-built dispatcher](https://github.com/facebook/react/blob/ce43a8cd07c355647922480977b46713bd51883e/packages/react-debug-tools/src/ReactDebugHooks.js#L203-L214) to introspect the Hooks tree by capturing JavaScript stack traces. *Don’t repeat this at home.*

This also means Hooks aren’t inherently tied to React. If in the future more libraries want to reuse the same primitive Hooks, in theory the dispatcher could move to a separate package and be exposed as a first-class API with a less “scary” name. In practice, we’d prefer to avoid premature abstraction until there is a need for it.

Both the `updater` field and the `__currentDispatcher` object are forms of a generic programming principle called *dependency injection*. In both cases, the renderers “inject” implementations of features like `setState` into the generic React package to keep your components more declarative.

You don’t need to think about how this works when you use React. We’d like React users to spend more time thinking about their application code than abstract concepts like dependency injection. But if you’ve ever wondered how `this.setState()` or `useState()` know what to do, I hope this helps.

---