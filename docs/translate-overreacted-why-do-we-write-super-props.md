---
date: '2018-11-30'
title: '翻译：为什么我们需要些super(props)'
tag: translate,overreacted
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/posts/overreacted)，原文链接请查看[这里](https://overreacted.io/why-do-we-write-super-props/)

听说最近好像[Hooks](https://reactjs.org/docs/hooks-intro.html)是一个热议的话题。可笑的是我的第一篇博客和这个相去甚远，我希望能够描述好组件class的内部巧妙的实现。不知道大家对这点是否有兴趣。

**这些内部巧妙的实现可能对在生产环境中使用React并*没有*特别大的益处，但是针对那些渴望知道React的内部的人来说会觉得非常有趣。**

那么第一个例子来了

---

我这辈子写过无数个`super(props)`，比如：

```js
class Checkbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isOn: true };
  }
  // ...
}
```

当然，[类属性提案](https://github.com/tc39/proposal-class-fields)让我们可以跳过这种写法

```js
class Checkbox extends React.Component {
  state = { isOn: true };
  // ...
}
```

为了使用纯类定义，有一个[语法](https://reactjs.org/blog/2015/01/27/react-v0.13.0-beta-1.html#es7-property-initializers)早在2015年React 0.13的时候就已经有计划了。定义`constructor`并调用`super(props)`只是在类属性提案提供一个人性化的选择之前作为一个临时的选择

所以，让我们回到这个例子的ES2015版本的写法:

```js{3}
class Checkbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isOn: true };
  }
  // ...
}
```

**为什么我们需要调用`super`? 我们可以*不*调用它么？如果我们调用它，如果我们不传`props`这个参数会发生什么？还可以传其他什么更多的参数么？** 让我们来了解一下

---

在Javascipt中, `super`引用了父类的构造函数。(在我们的例子中，这指向了`React.Component`的实现)

更加重要的是，你在构造函数中不能再调用父类的构造函数*之前*使用`this`。Javascript不会让你像这么做：

```js
class Checkbox extends React.Component {
  constructor(props) {
    // 🔴 还不能使用`this`
    super(props);
    // ✅ 嘿，现在可以了
    this.state = { isOn: true };
  }
  // ...
}
```

针对为什么JavaScript必须让你在使用`this`之前调用父类的构造函数的原因，这里有个关于类继承的例子:

```js
class Person {
  constructor(name) {
    this.name = name;
  }
}

class PolitePerson extends Person {
  constructor(name) {
    this.greetColleagues(); // 🔴 这是不被允许的，详细请看下面
    super(name);
  }
  greetColleagues() {
    alert('Good morning folks!');
  }
}
```

在`super`之前使用`this`*假如是*允许的. 一个月之后，我们可能修改`greetColleagues`的实现，并在弹出一个消息的时候使用了name的属性:

```js
  greetColleagues() {
    alert('Good morning folks!');
    alert('My name is ' + this.name + ', nice to meet you!');
  }
```

但是我们忘记了`this.greetColleagues()`在调用父类的构造函数之前被调用了，我们会以为`this.name`已经被初始化了。但是`this.name`并没有被定义，如你所见，这样的代码然人非常难理解。

为了避免这样的问题，**JavaScript必须让你在使用`this`之前调用父类的构造函数，你*必须*先调用父类的构造函数**。让父类做它自己的事情！但是这个定义类的限制也同样作用于React的组件定义:

```js
  constructor(props) {
    super(props);
    // ✅ 好啦！现在能够使用`this`了
    this.state = { isOn: true };
  }
```

这让我们产生了另一个问题：为什么需要传`props`

---

You might think that passing `props` down to `super` is necessary so that the base `React.Component` constructor can initialize `this.props`:

```js
// Inside React
class Component {
  constructor(props) {
    this.props = props;
    // ...
  }
}
```

And that’s not far from truth — indeed, that’s [what it does](https://github.com/facebook/react/blob/1d25aa5787d4e19704c049c3cfa985d3b5190e0d/packages/react/src/ReactBaseClasses.js#L22).

But somehow, even if you call `super()` without the `props` argument, you’ll still be able to access `this.props` in the `render` and other methods. (If you don’t believe me, try it yourself!)

How does *that* work? It turns out that **React also assigns `props` on the instance right after calling *your* constructor:**

```js
  // Inside React
  const instance = new YourComponent(props);
  instance.props = props;
```

So even if you forget to pass `props` to `super()`, React would still set them right afterwards. There is a reason for that.

When React added support for classes, it didn’t just add support for ES6 classes alone. The goal was to support as wide range of class abstractions as possible. It was [not clear](https://reactjs.org/blog/2015/01/27/react-v0.13.0-beta-1.html#other-languages) how relatively successful would ClojureScript, CoffeeScript, ES6, Fable, Scala.js, TypeScript, or other solutions be for defining components. So React was intentionally unopinionated about whether calling `super()` is required — even though ES6 classes are.

So does this mean you can just write `super()` instead of `super(props)`?

**Probably not because it’s still confusing.** Sure, React would later assign `this.props` *after* your constructor has run. But `this.props` would still be undefined *between* the `super` call and the end of your constructor:

```js{14}
// Inside React
class Component {
  constructor(props) {
    this.props = props;
    // ...
  }
}

// Inside your code
class Button extends React.Component {
  constructor(props) {
    super(); // 😬 We forgot to pass props
    console.log(props);      // ✅ {}
    console.log(this.props); // 😬 undefined 
  }
  // ...
}
```

It can be even more challenging to debug if this happens in some method that’s called *from* the constructor. **And that’s why I recommend always passing down `super(props)`, even though it isn’t strictly necessary:**

```js
class Button extends React.Component {
  constructor(props) {
    super(props); // ✅ We passed props
    console.log(props);      // ✅ {}
    console.log(this.props); // ✅ {}
  }
  // ...
}
```

This ensures `this.props` is set even before the constructor exits.

-----

There’s one last bit that longtime React users might be curious about.

You might have noticed that when you use the Context API in classes (either with the legacy `contextTypes` or the modern `contextType` API added in React 16.6), `context` is passed as a second argument to the constructor.

So why don’t we write `super(props, context)` instead? We could, but context is used less often so this pitfall just doesn’t come up as much.

**With the class fields proposal this whole pitfall mostly disappears anyway.** Without an explicit constructor, all arguments are passed down automatically. This is what allows an expression like `state = {}` to include references to `this.props` or `this.context` if necessary.

With Hooks, we don’t even have `super` or `this`. But that’s a topic for another day.