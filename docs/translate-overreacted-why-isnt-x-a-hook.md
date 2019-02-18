---
date: '2019-01-26'
title: '翻译: 为什么X不做成Hook'
tag: translate,overreacted
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/posts/overreacted)，原文链接请查看[这里](https://overreacted.io/why-isnt-x-a-hook/)

自从第一个拥有[React Hooks](https://reactjs.org/hooks)的React的alpha版本发布之后。不断地会有人提出一些类似于这样的问题: "为什么 *某个API* 不做成Hook"。

我们先来回顾一下，现已经有的是以下这些Hook:

* [`useState()`](https://reactjs.org/docs/hooks-reference.html#usestate) 让你能够定义组件内状态
* [`useEffect()`](https://reactjs.org/docs/hooks-reference.html#useeffect) 让你能够定义一些Effect
* [`useContext()`](https://reactjs.org/docs/hooks-reference.html#usecontext) 让你能够读取context中的值

但是，还有一些API，比如`React.memo()`和`<Context.Provider>`，这些还*没有*做成Hooks。
But there are some other APIs, like `React.memo()` and `<Context.Provider>`, that are *not* Hooks. Commonly proposed Hook versions of them would be *noncompositional* or *antimodular*. This article will help you understand why.

**备注：这篇文章可以帮助那些对API内部感兴趣的人更深度的理解React的API。如果只是为了在现实生产中使用，不需要关心这些**

---

这里有两点我们期望React API能够保持的:

1. **可整合性**: [自定义Hooks](https://reactjs.org/docs/hooks-custom.html)是我们队Hooks API 对期待的功能点。我们期望开发者能够更加频繁的创建他们自己的Hook，所以我们必须保证所有人都能够[正确的](https://overreacted.io/why-do-hooks-rely-on-call-order/#flaw-4-the-diamond-problem)使用Hooks

2. **调试体验**: 即使应用在不断变大，我们期望bug调试依然是[简单的](https://overreacted.io/the-bug-o-notation/)。React亮点之一就是当你发现页面上有什么问题的时候，你可以通过遍历React树来找到出问题的那个组件的状态值。

这两点限制了我们对Hook的可为和不可为。让我们来看一些例子吧。

---

##  一个已经存在的Hook: `useState()`

### 可整合性

多个自定义Hook在调用`useState()`的时候不会冲突:

```js
function useMyCustomHook1() {
  const [value, setValue] = useState(0);
  // What happens here, stays here.
}

function useMyCustomHook2() {
  const [value, setValue] = useState(0);
  // What happens here, stays here.
}

function MyComponent() {
  useMyCustomHook1();
  useMyCustomHook2();
  // ...
}
```

每添加一个无条件的`useState()`都是安全的。你不用关心当前组件使用到的其他的自定义Hook是不是定义了其他的状态变量。你也不用担心你会不小心更新其他的状态。

**审判书** ✅`useState`没有让React变的更加脆弱。

### 调试体验

Hooks非常有用，你可以将变量在它们之间传递:

```js{4,12,14}
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  // ...
  return width;
}

function useTheme(isMobile) {
  // ...
}

function Comment() {
  const width = useWindowWidth();
  const isMobile = width < MOBILE_VIEWPORT;
  const theme = useTheme(isMobile);
  return (
    <section className={theme.comment}>
      {/* ... */}
    </section>
  );
}
```

但假如我们的代码写错了呢，我们应该怎么调试?

就比如说假如`theme.comment`传递到class的值有问题。我们应该怎么调试呢？我们可以在组件体中大断点或者输出一些日志。

你可能会看到`theme`的值不对，但是`width`和`isMobile`是正确的。这就让我们知道了问题出在`useTheme()`。或者我们可以查看一下是不是`width`本身就是有问题的，如果有问题那我们就要去查看一下`useWindowWidth()`。

**简单直接的看一下这些变量的值我们就能够知道是哪个Hook产生的bug** 我们不用去查看所有Hook的实现。

然后我们就可以"深入"到哪个有问题的Hook中，重复检查哪个值产生的问题。

这在Hooks的深度增加的时候变得非常重要。假如我们的自定义Hook嵌套了三层，每层都用了不同的自定义Hook。那么只检查**三个地方**和需要检查潜在的**3 + 3 * 3 + 3 * 3 * 3 = 39 个地方**是有着巨大的[差距](https://overreacted.io/the-bug-o-notation/)的。幸运的是，`useState()`是不会在Hook和组件之间互相影响的。有问题的数据只是在Hook的最后被遗留下来，就好像是申明一个变量一样。🐛

**审判书:** ✅ `useState()`不会让我们的代码逻辑关系混乱。我们可以顺藤摸瓜的找到这个bug。

---

## 这不是Hook: `useBailout()`

我们在做优化的时候，组件可以使用Hook让重新渲染不是那么频繁。

实现这个效果的一种方式就是使用[`React.memo()`](https://reactjs.org/blog/2018/10/23/react-v-16-6.html#reactmemo)来包裹整个组件。这个函数的作用在于，当props和老的props浅比较相等的时候，我们可以不让组件重新渲染。就好像我们在类声明的组件中使用`PureComponent`一样。

`React.memo()`接收一个组件并返回一个组件:

```js{4}
function Button(props) {
  // ...
}
export default React.memo(Button);
```

**但是 为什么不做成Hook?**

无论你怎么称呼他`useShouldComponentUpdate()`, `usePure()`, `useSkipRender()`, or `useBailout()`, 这个提案大概使用像这样:

```js
function Button({ color }) {
  // ⚠️ Not a real API
  useBailout(prevColor => prevColor !== color, color);

  return (
    <button className={'button-' + color}>  
      OK
    </button>
  )
}
```

以上的变种还有很多(比如`usePure()`)，但是广义上还有一些缺陷。

### 可组合性

就举个例子，比如我们期望将`useBailout()`放到我们两个不同的自定义Hook中:


```js{4,5,19,20}
function useFriendStatus(friendID) {
  const [isOnline, setIsOnline] = useState(null);

  // ⚠️ Not a real API
  useBailout(prevIsOnline => prevIsOnline !== isOnline, isOnline);

  useEffect(() => {
    const handleStatusChange = status => setIsOnline(status.isOnline);
    ChatAPI.subscribe(friendID, handleStatusChange);
    return () => ChatAPI.unsubscribe(friendID, handleStatusChange);
  });

  return isOnline;
}

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  
  // ⚠️ Not a real API
  useBailout(prevWidth => prevWidth !== width, width);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  return width;
}
```

那么当我们在同一个组件使用两次这个Hook会发生什么呢？


```js{2,3}
function ChatThread({ friendID, isTyping }) {
  const width = useWindowWidth();
  const isOnline = useFriendStatus(friendID);
  return (
    <ChatLayout width={width}>
      <FriendStatus isOnline={isOnline} />
      {isTyping && 'Typing...'}
    </ChatLayout>
  );
}
```

那么什么时候会重新渲染呢?

如果每一个`useBailout()`都能够跳过重新渲染，那么被允许的`useWindowWidth()`更新有可能会阻碍`useFriendStatus()`的更新，反之亦然。**这些Hook会互相阻碍**。

而且，就算是`useBailout()`只有在所有的调用都"同意"阻止一次更新的时候才阻止更新，那么我们的`ChatThread`在`isTyping`属性变更的时候就会更新失败了。

更糟糕的是，像这样的语法 **之后新的调用`useBailout()`的Hook被加入到`ChatThread`中**，但是，我们不能"反对"在`useWindowWidth()`和`useFriendStatus()`中使用bailout之类的Hook。

**宣判：** 🔴 `useBailout()` 打破了可组合性的规则。将这样的Hook加入到组件中，会破坏其他Hook中的state的更新。我们期望我们的API能够更加[坚固](https://overreacted.io/optimized-for-change/)，但是这种行为为之相反。

### 调试体验

像`useBailout()`这类的Hook在调试方面的体验如何?
How does a Hook like `useBailout()` affect debugging?

我们可以使用相同的例子:

```js
function ChatThread({ friendID, isTyping }) {
  const width = useWindowWidth();
  const isOnline = useFriendStatus(friendID);
  return (
    <ChatLayout width={width}>
      <FriendStatus isOnline={isOnline} />
      {isTyping && 'Typing...'}
    </ChatLayout>
  );
}
```

就比如说`Typing...`这个文本，假如不管我们的上级属性如何的变动，显示的都不是我们所期望的。我们应该如何调试它?

**正常情况下，在React中通过从文本所在的组件向上寻找就能自信的回答这个问题**。我们可以打开渲染这个组件的地方`<ChatThread isTyping={myVar} />`并检查`myVar`等等，只要逐层寻找，你或许会发现有的地方的`shouldComponentUpdate()`有问题，或者`isTyping`的值向下传递的时候有问题。顺藤魔怪的就能够定位到这个问题的所在。


但是，假如我们加入了`useBailout()`Hook，除非你检查*所有的`ChatThread`和其调用链路上组件所使用的自定义Hook*，不然你可能还是不能确定为什么没有执行更新。因为组件的父组件也可能使用自定义Hook，这让[调试复杂度](https://overreacted.io/the-bug-o-notation/)疯狂增长。

就好像你在一个抽屉里面找螺丝刀，但是每个抽屉里面都有个更小的抽屉，所以你根本不知道这个兔子洞到底有多深。

**判决书:** 🔴 `useBailout()`这类Hook不仅仅破坏了可组合性原则，这种方案还大大的增加了调试的复杂度 - 在某种情况下，甚至是成本增长的。

---

`useState()`是我们已经发布的Hook，而`useBailout()`是大家普遍建议但我们故意没有将这个做成一个Hook。我通过可组合性和调试体验这两个原则比较了他们，并讨论了为什么他们其中的一个是可以工作的，而另一个是不能够工作的。

所以我们没有提供`memo()`或者`shouldComponentUpdate()`的"Hook版本"，但是React*确实*提供了一个名为[`useMemo()`](https://reactjs.org/docs/hooks-reference.html#usememo)的Hook。它提供了差不多的功能，但是使用方式会稍显不同，进而防止开发者坠入上述的陷阱。

`useBailout()`只是我提到的不应该被作为Hook的例子之一。还有很多类似的 - 比如`useProvider()`, `useCatch()`, or `useSuspense()`。

你现在知道为什么了么。

*(悄悄告诉你: 组合性... 调试体验...)*
