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

因此 **`React.Component`**
So somehow **`React.Component` delegates handling state updates to the platform-specific code.** Before we can understand how this happens, let’s dig deeper into how packages are separated and why.

---

There is a common misconception that the React “engine” lives inside the `react` package. This is not true.

In fact, ever since the [package split in React 0.14](https://reactjs.org/blog/2015/07/03/react-v0.14-beta-1.html#two-packages), the `react` package intentionally only exposes APIs for *defining* components. Most of the *implementation* of React lives in the “renderers”.

`react-dom`, `react-dom/server`, `react-native`, `react-test-renderer`, `react-art` are some examples of renderers (and you can [build your own](https://github.com/facebook/react/blob/master/packages/react-reconciler/README.md#practical-examples)).

This is why the `react` package is useful regardless of which platform you target. All its exports, such as `React.Component`, `React.createElement`, `React.Children` utilities and (eventually) [Hooks](https://reactjs.org/docs/hooks-intro.html), are independent of the target platform. Whether you run React DOM, React DOM Server, or React Native, your components would import and use them in the same way.

In contrast, the renderer packages expose platform-specific APIs like `ReactDOM.render()` that let you mount a React hierarchy into a DOM node. Each renderer provides an API like this. Ideally, most *components* shouldn’t need to import anything from a renderer. This keeps them more portable.

**What most people imagine as the React “engine” is inside each individual renderer.** Many renderers include a copy of the same code — we call it the [“reconciler”](https://github.com/facebook/react/tree/master/packages/react-reconciler). A [build step](https://reactjs.org/blog/2017/12/15/improving-the-repository-infrastructure.html#migrating-to-google-closure-compiler) smooshes the reconciler code together with the renderer code into a single highly optimized bundle for better performance. (Copying code is usually not great for bundle size but the vast majority of React users only needs one renderer at a time, such as `react-dom`.)

The takeaway here is that the `react` package only lets you *use* React features but doesn’t know anything about *how* they’re implemented. The renderer packages (`react-dom`, `react-native`, etc) provide the implementation of React features and platform-specific logic. Some of that code is shared (“reconciler”) but that’s an implementation detail of individual renderers.

---

Now we know why *both* `react` and `react-dom` packages need to be updated for new features. For example, when React 16.3 added the Context API, `React.createContext()` was exposed on the React package.

But `React.createContext()` doesn’t actually *implement* the context feature. The implementation would need to be different between React DOM and React DOM Server, for example. So `createContext()` returns a few plain objects:

```js
// A bit simplified
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

When you use `<MyContext.Provider>` or `<MyContext.Consumer>` in the code, it’s the *renderer* that decides how to handle them. React DOM might track context values in one way, but React DOM Server might do it differently.

**So if you update `react` to 16.3+ but don’t update `react-dom`, you’d be using a renderer that isn’t yet aware of the special `Provider` and `Consumer` types.** This is why an older `react-dom` would [fail saying these types are invalid](https://stackoverflow.com/a/49677020/458193).

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