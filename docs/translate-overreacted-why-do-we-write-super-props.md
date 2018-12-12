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

但是我们忘记了`this.greetColleagues()`在调用父类的构造函数之前被调用了，我们会以为`this.name`已经被初始化了。但是`this.name`并没有被定义，如你所见，这样的代码任然非常难理解。

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

你可能会觉得将props传递到父类的构造函数中，这样父类`React.Component`的构造函数就能够初始化`this.props`

```js
// React内部
class Component {
  constructor(props) {
    this.props = props;
    // ...
  }
}
```

其实这里真相已经不远了 - [React真正做的事情](https://github.com/facebook/react/blob/1d25aa5787d4e19704c049c3cfa985d3b5190e0d/packages/react/src/ReactBaseClasses.js#L22)其实是这样的

接下来有个令人不解的问题就是，即使你在调用父类的构造函数的时候没有传递`props`参数，你也依然可以在`render`或者其他的成员函数中访问`this.props`(如果你不相信我，可以自己尝试一下)

*上述*的现象是如何产生的？显而易见,这个现象证明了**React还会在调用*你的*构造函数之后，为生成的实例的`props`赋值**

```js
  // React内部
  const instance = new YourComponent(props);
  instance.props = props;
```

所以即使你忘记掉在调用`super()`的时候传入`props`，React依然会在构造函数结束之后将`props`赋值，这就是产生这个现象的原因

当React要添加对class的支持的时候，这不只是代表着React单纯的只是支持ES6 class，React的目标是尽可能的支持最宽泛的class的概念。当时还[不能够确定](https://reactjs.org/blog/2015/01/27/react-v0.13.0-beta-1.html#other-languages)ClojureScript, CoffeeScript, ES6, Fable, Scala.js, TypeScript或者其他语言那种相对来说用于定义组件会比较好。所以React特意对是否必须调用`super()`不敢妄自约束 - 即使是ES6的类。

那么难道这就意味着你能够使用`super()`而不去调用`super(props)`？

**可能还是不可以这么做，因为这还存在一些问题** 当然，React会在调用构造函数之后为`this.props`赋值。但是在调用了`super`和构造函数结束之间`this.props`还是`undefuned`:

```js
// Inside React
class Component {
  constructor(props) {
    this.props = props;
    // ...
  }
}

// 你的代码
class Button extends React.Component {
  constructor(props) {
    super(); // 😬 我们忘记了将props传入
    console.log(props);      // ✅ {}
    console.log(this.props); // 😬 undefined 
  }
  // ...
}
```

你也可以做更多的尝试，比如在一些函数中调用`this.props`，然后在*构造函数中*调用这些函数，看看结果如何。**这也是为什么我推荐你最好能够总是将props传到父类的构造函数中，即使这并不是严格上必须的**

```js
class Button extends React.Component {
  constructor(props) {
    super(props); // ✅ 我们传入了props
    console.log(props);      // ✅ {}
    console.log(this.props); // ✅ {}
  }
  // ...
}
```

这确保了`this.props`在构造函数结束之前就被初始化

-----

这里还有一点，很长的一段时间里，React的使用者都非常的好奇。

你可能注意到，当你在class中使用 context api(无论是老的`contextTypes`或者现在的React16.6的`contextType`API)，`context`会作为第二个参数传递到构造函数中。

但是我们会像`super(props, context)`这么写么？我们可以这么做，但是context会用的比较低频，相同的context的问题并不会像props这么多。

**通过类属性提案，这些问题大多数都能够解决**即使没有明确构造函数的定义，所有的参数都能够自动的传入父类，这让我们可以通过类似于`state = {}`的表达式来赋值`this.props`或者`this.contxt`

通过 Hooks，我们甚至可以不使用`super`或者`this`。但这是下次的话题了