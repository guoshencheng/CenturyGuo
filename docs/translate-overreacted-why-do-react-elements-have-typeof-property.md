---
date: '2018-12-02'
title: '翻译：为什么React的元素有一个叫做$$typeof的属性'
tag: translate,overreacted
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/posts/overreacted)，原文链接请查看[这里](https://overreacted.io/why-do-react-elements-have-typeof-property/)

想象一下如果你编写了下面的一段代码

```jsx
<marquee bgcolor="#ffa7c4">hi</marquee>
```
事实上你是在调用这样一个函数:

```jsx
React.createElement(
  /* type */ 'marquee',
  /* props */ { bgcolor: '#ffa7c4' },
  /* children */ 'hi'
)
```

这个函数会返回你一个对象，我们把这个对象叫做React元素。React可以在之后渲染这个元素，你的组件一般会返回这个元素的树形结构。

```jsx
{
  type: 'marquee',
  props: {
    bgcolor: '#ffa7c4',
    children: 'hi',
  },
  key: null,
  ref: null,
  $$typeof: Symbol.for('react.element'), // 🧐 这是个什么
}
```

如果你使用过React，你可能会对`type`，`props`，`key`，`ref`这些属性名很熟悉。**但是这个`$$typeof`是个什么鬼？而且什么它是一个Symbol类型的数据**

这又是一个你其实在实际使用过程中并不需要知道的React的知识，但是当你知道了这个之后，你会觉得豁然开朗。这篇文章会包含一些有关安全的知识。可能有一天你会编写你自己的UI框架，今天这些知识会对你非常有用。我也希望这对你会很有帮助。

---

在客户端UI框架流行并加上一些基础的防御措施之前，大家普遍的做法是组织一个html代码，并插入到dom中去:

```jsx
const messageEl = document.getElementById('message');
messageEl.innerHTML = '<p>' + message.text + '</p>';
```

这样做一般没什么问题，但假如上面的`messsage.text`是像`'<img src onerror="stealYourPassword()">'`这样的内容。**你不会愿意把所有的陌生人发送的信息全都渲染在页面上**

(有趣的事实: 如果你只使用客户端的渲染，这里有一个[脚本](https://gomakethings.com/preventing-cross-site-scripting-attacks-when-using-innerhtml-in-vanilla-javascript)不会让你运行这些javascript。但是别让这些让你对安全问题越来越不明感)。

为了防止这种攻击，你还可以使用一些安全的API比如`document.createTextNode()`或者`textContent`，这种函数一般用来专门处理字符。你也可以通过替换掉一些类似于'<''>'可能比较危险的字符预先处理(escape)输入源。

无论如何，如果产生这种安全问题的代价至今依然是巨大的，但是开发者们依然总有时候会在将用户输入的字符串输出到页面上的时候忘记掉这些问题。**这就是为什么现在这些流行的框架比如React会默认对字符串默认做escape处理**

```jsx
<p>
  {message.text}
</p>
```

如果`message.text`是一个包含`<img>`或者其他的什么标签的攻击性字符串，他不会被运行成`<img>`标签。React会先escape文本内容然后插入到DOM中区。所以你不会看到一个`<img>`标签，你只会看到`<img>`的字符串在页面上。

如果想要真实的HTML渲染到React元素中，你需要使用`dangerouslySetInnerHTML={{ __html: message.text }}`。**虽然这么写很蠢，但这确实是一个功能**。 因为这样会非常明显，然后你就能够在代码review或者代码库审查的时候更方便的注意到它。

---

**这是不是意味着React对于这种注入的工具已经完全安全了呢？不是的** HTML和DOM还提供了[很多攻击的方式](https://github.com/facebook/react/issues/3473#issuecomment-90594748)，但是防御这些对于React或者其他的UI框架来说有一定的难度。大部分剩下的攻击方式都涉及在attributes中。比如，如果你渲染一个`<a href={user.website}>`组件，那你需要防范有人会设置website为`'javascript:stealYourPassword()'`。结构用户的输出，比如`<div {...userData}>`虽然这可能很少出现但是也非常危险。

随着时间推移，React[可以](https://github.com/facebook/react/issues/10506)提供更多的保护措施，但是大部分情况下这都是服务器造成的问题，这些[应该](https://github.com/facebook/react/issues/3473#issuecomment-91327040)在服务器端被修复。

现如今，escap文本内容是一个合理的解决这些隐藏攻击的第一道防线。当你知道下面这段代码是安全的时候是不是还是听安心的。

```jsx
// Escaped automatically
<p>
  {message.text}
</p>
```

**好吧，其实这也不是真的安全的** 所以这就是为什么有了`$$typeof`。
**Well, that wasn’t always true either.** And that’s where `$$typeof` comes in.

---

React元素在设计的时候是一个纯对象:

```jsx
{
  type: 'marquee',
  props: {
    bgcolor: '#ffa7c4',
    children: 'hi',
  },
  key: null,
  ref: null,
  $$typeof: Symbol.for('react.element'),
}
```

一般来说，你会使用`React.createElement()`来创建一个React元素，这也是必须的。
While normally you create them with `React.createElement()`, it is not required. There are valid use cases for React to support plain element objects written like I just did above. Of course, you probably wouldn’t *want* to write them like this — but this [can be](https://github.com/facebook/react/pull/3583#issuecomment-90296667) useful for an optimizing compiler, passing UI elements between workers, or for decoupling JSX from the React package.

However, **if your server has a hole that lets the user store an arbitrary JSON object** while the client code expects a string, this could become a problem:

```jsx{2-10,15}
// Server could have a hole that lets user store JSON
let expectedTextButGotJSON = {
  type: 'div',
  props: {
    dangerouslySetInnerHTML: {
      __html: '/* put your exploit here */'
    },
  },
  // ...
};
let message = { text: expectedTextButGotJSON };

// Dangerous in React 0.13
<p>
  {message.text}
</p>
```

In that case, React 0.13 would be [vulnerable](http://danlec.com/blog/xss-via-a-spoofed-react-element) to an XSS attack. To clarify, again, **this attack depends on an existing server hole**. Still, React could do a better job of protecting people against it. And starting with React 0.14, it does.

The fix in React 0.14 was to [tag every React element with a Symbol](https://github.com/facebook/react/pull/4832):

```jsx{9}
{
  type: 'marquee',
  props: {
    bgcolor: '#ffa7c4',
    children: 'hi',
  },
  key: null,
  ref: null,
  $$typeof: Symbol.for('react.element'),
}
```

This works because you can’t just put `Symbol`s in JSON. **So even if the server has a security hole and returns JSON instead of text, that JSON can’t include `Symbol.for('react.element')`.** React will check `element.$$typeof`, and will refuse to process the element if it’s missing or invalid.

The nice thing about using `Symbol.for()` specifically is that **Symbols are global between environments like iframes and workers.** So this fix doesn’t prevent passing trusted elements between different parts of the app even in more exotic conditions. Similarly, even if there are multiple copies of React on the page, they can still “agree” on the valid `$$typeof` value.

---

What about the browsers that [don’t support](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#Browser_compatibility) Symbols?

Alas, they don’t get this extra protection. React still includes the `$$typeof` field on the element for consistency, but it’s [set to a number](https://github.com/facebook/react/blob/8482cbe22d1a421b73db602e1f470c632b09f693/packages/shared/ReactSymbols.js#L14-L16) — `0xeac7`.

Why this number specifically? `0xeac7` kinda looks like “React”.