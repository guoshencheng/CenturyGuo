---
date: '2018-12-08'
title: '翻译：我对热更新的期望'
tag: translate,overreacted
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/posts/overreacted)，原文链接请查看[这里](https://overreacted.io/my-wishlist-for-hot-reloading/)

你可能总是会有个一个项目，让你反复的去思考你的方案的利弊，有时候会停止一段时间，然后继续尝试新的方案 - 如是反复。对于你们，可能是一个路由或者一个虚拟滚动列表。对于我而言，应该算是热更新了


My first exposure to the idea of changing code on the fly was a brief mention in a book about Erlang that I read as a teenager. Much later, like many others, I fell in love with [Bret Victor’s beautiful demos](https://vimeo.com/36579366). I’ve read somewhere Bret was unhappy with people cherry-picking “easy” parts of his demos and screwing up the big vision. (I don’t know if this is true.) **In either case, to me shipping even small incremental improvements that people take for granted later is a success.** Smarter people than me will work on Next Big Ideas.

现在我必须要澄清，这篇文章讨论的中没有一个`想法`是出自我本人的。我是被很多项目和开发人员[启发](https://redux.js.org/#thanks)的。事实上，很多我没接触过他们项目的人告诉过，我正在抢占和他们做的相似的领域。

我不是一个发明家。如果我有个”想法“，那一定是有什么启发了我，我只是通过文字、代码、例子来吧这个想法分享给更多的人。

而 热更新 启发了我

---

我已经做了很多尝试来实现React的热更新。

回想起来，我拼凑出来的[第一个例子]改变了我的人生。也让我有个第一个Twitter关注者，在Github上第一次超过1K星，第一次[HN fontage](https://news.ycombinator.com/item?id=8982620)，以及第一次[conference talk](https://www.youtube.com/watch?v=xsSnOQynTHs)(在现有的项目中使用Redux)。之后的迭代都工作的非常完美。但是，很快React*移除*了`createClass`，这让我的热更新功能变的不那么有效。

之后，我[尝试了很多](https://medium.com/@dan_abramov/hot-reloading-in-react-1140438583bf?source=user_profile---------6------------------)来修复这个问题，每个尝试都会存在些许缺陷。其中有一种问题依然存在于ReactNative中(因为我的问题导致热更新函数在ReactNative中不起作用，非常抱歉!)

我对我因为能力不足或缺少时间而不能处理好一些issues感到很沮丧，我曾将React Hot Loader 交给一些更加有天赋的源码贡献者。他们推动了React Hot Loader的发展并且找到了很多很棒的解决方案来处理我之前设计上的漏洞。我非常感谢他们能够在众多困难面前依然能够保证项目的良好状态。

---

**说实话，React中的热更新非常有用** 事实上，这篇文章是使用gatsby构建的，gatsby是建立在React Hot Loader上的。我在我的编辑器里编辑这篇文章并保存后，页面不需要刷新就能够更新。这简直是魔法！在某种程度上，我对React Hot Loader的将来的主流使用方式已经可以很放心了。

但是还是有不少的人觉得React Hot Loader应该还可以做的更好点。甚至有人觉得这只是雕虫小技，这让我觉得有点心碎，但是我觉得他们可能真实想说的是：**使用的体验还不够完美**， 如果总是让用户感觉不到是否热更新起作用了，或者总是异常而开发者却不知道原因，或者非常容易导致页面的刷新，那么这个热更新的功能就没什么用了。我非常赞同，但是对于我来说，这意味着我们还有很多事情要做。接着我就开始兴奋的思考，如果将来React官方来支持热更新会是什么样的。

(如果你在使用类似于Elm, Reason或者ClojureScript之类的语言，这些问题可能已经在你的原本的生态系统中解决了。我为你的幸福而感到开心。即使这样，我也还是希望能够为Javascript带来类似的功能)

---

我想我现在应该要准备另一种方式来实现热更新了，一下是一些原因。

自从`createClass`这种方式方式来定义组件是个主流的年代的终结，**React Hot Loader的大部分源代码用于处理为组件提供复杂而且容易出错的动态类替换** 如何使用一个新的"版本"含有不同函数的类的实例为一个老的已存在的实例打上补丁？最简单的答案大概是 "替换他的prototype" 但是即使使用 Proxy，以我的经验来看，这种解决方案还是太粗糙，没有考虑很多边界情况，这种解决方案还不够可靠。

打个比方，热更新方案非常简单。这里有个Babel插件，它可以将一个函数申明的组件输出成两个函数:

```jsx
// 重新申明最新的版本
window.latest_Button = function(props) {
  // 你实际的代码被插件移动到了这里
  return <button>Hello</button>;
}

// 把这个当成一个"代理"
// 这样其他的组件就能够使用了
export default function Button(props) {
  // 总是指向最新的组件
  return window.latest_Button(props);
}
```

每当这个组件重新编辑后重新编译，`window.last_Button`总是会指向最新的实现，在模块中重用这个`Button`组件让我们能够在不卸载我们的组件的情况下替换组建的实现。

有很长的一段时间，我觉得我只针对函数实现的热更新功能会误导用户，这可能让用户强行的去写一些函数定义的组件，而不是类定义，这种强行用函数写组件定义的方式，这有可能会产生一些奇怪的代码。但是通过[Hook](https://reactjs.org/docs/hooks-intro.html)，函数定义的组件就可以实现几乎所有类定义的组件的需求了，因此我的忧虑也就消除了。下面这种写法的代码通过Hooks也能够"顺利运行":

```jsx
// 重新定义最近的版本
window.latest_Button = function(props) {
  // 你真正的实现代码被放到这里
  const [name, setName] = useState('Mary');
  const handleChange = e => setName(e.target.value);
  return (
    <>
      <input value={name} onChange={handleChange} />
      <h1>Hello, {name}</h1>
    </>
  );
}

// 想象这是一个"代理"
// 其他的组件会用到这个 that other components would use
export default function Button(props) {
  // 总是指向最新的版本
  return window.latest_Button(props);
}
```


As long as the Hook call order doesn’t change, we can preserve the state even as `window.latest_Button` is replaced between file edits. And replacing event handlers “just works” too — because Hooks rely on closures, and we replace the whole function.

---

这只是其中一种方案的粗糙的描述，还有很多方案。那么我们应该怎么对这些方案做比较呢？

为了防止我深度研究某一个方案，而这个方案可能在某些地方有坑，**我决定去写下我觉得对判断一个实现组件代码热更新是否是个好的实现的几个重要原则**

将来有可能会把其中的几个原则变成测试用例，这非常棒。这些规则也不是死的，有时候我们可以取折中的方案，但是如果我们的方案非要打破规则，那这个方案一定要是一个成熟的设计方案，而不是灵光一闪。

这里是我对React组件热更新的期望的原则:

### 正确性

* **热更新应该在组件在第一次更新之前是不需要监听的** 在你保存文件之前，代码应该表现的如同热更新没有被启用一样。It’s expected that things like `fn.toString()` don’t match, which is already the case with minification. But it shouldn’t break reasonable application and library logic.

* **热更新不应该打破React的规则** 在交换两个不相干的React节点树的state或者其他的非常规的React操作的时候，组件的生命周期不应该被热更新的操作额外调用。

* **React元素的类型应该始终保持原始的类型**，有一些方案会在组件外层包装一层类型，但是这会打破 `<MyTing />.type === MyThing`这样的判断。这种常见问题不应该发生。

* **这个方案需要能够简单的支持所有的React type** `lazy`, `memo`, `forwardRef` - 这些都应该被支持，而且这些不需要因为有更多的类型而维护。嵌套的使用比如`memo(memo(...))`也需要能够使用。我们应该在类型改变的时候总是重载这些组件。

* **这个方案不应该重新实现一个React的一个不常用的模块** 和React保持同步很难，如果一个方案重新实现了React，那他可能在长期内都会有问题，比如React添加了一个类似Suspense这样的功能。

* **重新导出模块不应该让热更新失效** 如果一个组件重新将其他模块中的模块重新导出了，这不一样会造成任何问题。

* **静态属性不能失效** 如果你定义了一个`ProfilePage.onEnter`这样的静态函数，你也会希望他在被import整个module的时候也能被读取到，有些框架会依赖这种静态值，所以让这些静态属性的读写正常进行非常重要，而组件自己对这些静态属性的使用也非常重要。

* **我们宁愿丢失一些组件内state，而不是让组件出现异常** 如果我们不能正常的为某些代码(比如，一个类)打补丁，那么最好只是丢失他自己内部的状态。开发者会觉得很奇怪，他们可能会觉得这是一个刷新页面的行为。我们必须要负责的知道哪些是我开门有能力做到的，而剩下的，我们应该放弃。

* **我们宁愿丢失一些组件内的state，而不是使用老版本的state** 这是上面这条原则的特例。比如，一个类不能被热更新，代码需要使用心得组件强制重载这个组件，而不是一直渲染之前没用的东西。

### 局部性

* **编辑过一个模块后，我们应该竟可能的少重新编译模块** 组件模块在初始化的时候会产生一些副作用，这通常是不允许的。但是你执行的代码量越多，你的逻辑就有可能会越混乱，有时甚至会导致一些逻辑被重复调用。我们正在写的Javascript和React组件现在还是处于一个相对比较不完整的境地，即使是这样，我们也不敢担保我们的做的逻辑没问题。因此，如果我们编辑一个模块，我的热更新应该尽量只更新这个模块。

* **编辑一个组件不应该影响他的父组件和隔壁组件的状态** 这就和`setState()`一样，只会影响自己的子组件的状态，编辑一个组件不应该超过这样的影响力。

* **编辑一个非React的代码的时候应该向上传播的更新** 如果你编辑一个含有纯函数或者常量的文件，假如这个文件被多个组件所引用，应该只更新这些组件，像这些组件丢失一些状态是可以接受的。

* **一个在热更新时抛出运行时的错误不应该被传播** 如果你在写组件的时候产生了错误，这不应该让你的应用崩溃。在React中，通常的解决方案是使用错误边界。但是这对于我们编辑时候无数的错别字而言，是一种比较粗鲁的解决方案啊。我们的热更新需要能够处理一些编译时的错误，让我们在编辑组件的时候，这些错误不会让相邻组件被卸载。但是我们必须保证那些不在热更新产生的错误(用户自己的本来的错误)应该被传播。

* **在开发者确定不需要这个状态之前，我们需要保持组件的状态** 如果你只是在调整样式，如果每次编辑代码都会让组件的状态被重置，这会让人非常不爽。如果是另一种情况，你修改了状态的结构或者初始状态，你会期望这个状态被重置。默认情况下，我们需要尽量去保持组件的状态。但是如果修改状态在热更新的时候产生了异常，这一般标志着有状态可能已经被修改了，所以我们需要重置状态并*尝试*重新渲染这个组件。注释掉或者注释回来一些代码再编码中非常常见，所以处理好这些也会非常重要。比如，在组件最后删除Hook不应该重置状态。

* **Discard state when it’s clear the developer wants to.** In some cases we can also proactively detect that the user wants to reset. For example, if the Hook order changed, or if primitive Hooks like `useState` change their initial state type. We can also offer a lightweight annotation that you can use to force a component to reset on every edit. Such as `// !` or some similar convention that’s fast to add and remove while you focus on how component mounts.

* **Support updating “fixed” things.** If a component is wrapped in `memo()`, hot reload should still update it. If an effect is called with `[]`, it should still be replaced. Code is like an invisible variable. Previously, I thought it was important to force deep updates below for things like `renderRow={this.renderRow}`. But in the Hooks world, we rely on closures anyway this seems unnecessary anymore. A different reference should be sufficient.

* **Support multiple components in one file.** It is a common pattern that multiple components are defined in the same file. Even if we only keep the state for function components, we want to make sure putting them in one file doesn’t cause them to lose state. Note these can be mutually recursive.

* **When possible, preserve the state of children.** If you edit a component, it’s always frustrating if its children unintentionally lose state. As long as the element types of children are defined in other files, we expect their state to be preserved. If they’re in the same file, we should do our best effort.

* **Support custom Hooks.** For well-written custom Hooks (some cases like `useInterval()` can be a bit tricky), hot reloading any arguments (including functions) should work. This shouldn’t need extra work and follows from the design of Hooks. Our solution just shouldn’t get in the way.

* **Support render props.** This usually doesn’t pose problems but it’s worth verifying they work and get updated as expected.

* **Support higher-order components.** Wrapping export into a higher-order component like `connect` shouldn’t break hot reloading or state preservation. If you use a component created from a HOC in JSX (such as `styled`), and that component is a class, it’s expected that it loses state when instantiated in the edited file. But A HOC that returns a function component (potentially using Hooks) shouldn’t shouldn’t lose state even if it’s defined in the same file. In fact, even edits to its arguments (e.g. `mapStateToProps`) should be reflected.

### 反馈

* **Both success and failure should provide visual feedback.** You should always be confident whether a hot reload succeeded or failed. In case of a runtime or a syntax error you should see an overlay which should be automatically be dismissed after it is irrelevant. When hot reload is successful, there should be some visual feedback such as flashing updated components or a notification.

* **A syntax error shouldn’t cause a runtime error or a refresh.** When you edit the code and you have a syntax error, it should be shown in a modal overlay (ideally, with a click-through to the editor). If you make another syntax error, the existing overlay is updated. Hot reloading is only attempted *after* you fix your syntax errors. Syntax error shouldn’t make you lose the state.

* **A syntax error after reload should still be visible.** If you see a modal syntax error overlay and refresh, you should still be seeing it. It categorically should not let you run the last successful version (I’ve seen that in some setups).

* **Consider exposing power user tools.** With hot reloading, code itself can be your “terminal”. In addition to the hypothetical `// !` command to force remount, there could be e.g. an `// inspect` command that shows a panel with props values next to the component. Be creative!

* **Minimize the noise.** DevTools and warning messages shouldn’t expose that we’re doing something special. Avoid breaking `displayName`s or adding useless wrappers to the debug output.

* **Debugging in major browsers should show the most recent code.** While this doesn’t exactly depend on us, we should do our best to ensure the browser debugger shows the most recent version of any file and that breakpoints work as expected.

* **Optimize for fast iteration, not long refactoring.** This is JavaScript, not Elm. Any long-running series of edits likely won’t hot reload well due to a bunch of mistakes that need to be fixed one by one. When in doubt, optimize for the use case of tweaking a few components in a tight iteration loop rather than for a big refactor. And be predictable. Keep in mind that if you lose developer’s trust they’ll refresh anyway.

---

This was my wish list for how hot reloading in React — or any component system that offers more than templates — should work. There’s probably more stuff I will add here with time.

I don’t know how many of these goals we can satisfy with JavaScript. But there’s one more reason I’m looking forward to working on hot reloading again. As an engineer I’m more organized than before. In particular, **I’ve finally learned my lesson to write up requirements like this before diving into another implementation.**

Maybe this one will actually work! But if it doesn’t, at least I’ve left some breadcrumbs for the next person who tries it.

