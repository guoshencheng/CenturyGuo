---
date: '2018-12-02'
title: '翻译：React是如何将Function转变成类的'
tag: translate,overreacted
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/posts/overreacted)，原文链接请查看[这里](https://overreacted.io/how-does-react-tell-a-class-from-a-function/)

我们可以先来看一下这个用函数定义的`Greeting`组件:

```js
function Greeting() {
  return <p>Hello</p>;
}
```

React也支持将这个组件定义成一个类:

```js
class Greeting extends React.Component {
  render() {
    return <p>Hello</p>;
  }
}
```

(我们只能使用类的定义的方式来使用一些类似于state这样的功能，知道最近的[hooks](https://reactjs.org/docs/hooks-intro.html))

当你想要渲染`<Greeting />`时，你不用关系它究竟是如何定义的:

```jsx
// 无论是函数定义还是类定义
<Greeting />
```

但是 *React 自己* 会关心这两种定义方式的区别

如果`Greeting`是一个函数，React会直接调用它:

```js
// 你的代码
function Greeting() {
  return <p>Hello</p>;
}

// React内部的实现
const result = Greeting(props); // <p>Hello</p>
```

但是如果`Greeting`是一个类，React需要先试用`new`来实例化它，然后在调用它的`render`函数:

```js
// 你的代码
class Greeting extends React.Component {
  render() {
    return <p>Hello</p>;
  }
}

// React内部实现
const instance = new Greeting(props); // Greeting {}
const result = instance.render(); // <p>Hello</p>
```

在上面的两个例子中，React的目标都是一致的，就是将你需要渲染的React节点获取到（在这个例子中，是`<p>Hellp</p>`）。但是这些额外的操作取决于`Greeting`是如何定义的。

**那么React是如何知道这个组件是使用函数定义的还是类定义的呢？**

就想我[之前的文章](/posts/translate-overreacted-why-do-we-write-super-props)讲的那样，**对于使用React的时候，你并不*需要*了解这些** 很多年里，我也不知道这些。所以请不要将这些作为你的面试题目。事实上，这篇文章更多的是讲解Javascript而不是React

这篇文章是针对那些想知道React究竟如何工作的人的。你是这样的人么？那么让我们一起来探索吧。

**这是一篇非常长的旅程。系好安全带吧！这篇文章并不会有太多的关于React本身，但是我们会探索到一些概念，比如`new`,`this`,`class`,`arrow`,`functions`,`prototypela`, `_proto_`,`instanceof`,以及这些东西在Javascript中是如何一起工作的。非常幸运的是，你在使用React的时候并不需要太考虑这些。不过假如你在实现React的话，那就不一样了...**

(如果你真的只是想知道最终的答案的话，可以直接滚动到最底下)

----

首先，我们需要理解为什么有必要去对函数的申明方式和类的申明方式区分。可以注意一下我们在使用类的申明组件的时候发生了什么。

```js{5}
// 如果Greeting是一个函数
const result = Greeting(props); // <p>Hello</p>

// 如果Greeting是一个类
const instance = new Greeting(props); // Greeting {}
const result = instance.render(); // <p>Hello</p>
```

让我们深度的来了解一下当使用`new`的时候，Javascript做了什么

---

在比较早的时候，Javascript还没有定义类的方式。但是你可以通过纯函数来模拟出一个类的效果。**具体的来说就是，通过对函数使用`new`调用，你可以使用*任何*函数来作为一个类的构造函数**:

```js
// 这只是一个函数
function Person(name) {
  this.name = name;
}

var fred = new Person('Fred'); // ✅ Person {name: 'Fred'}
var george = Person('George'); // 🔴 并不起作用
```

这些代码依然可以使用，你可以在开发工具中尝试。

如果你在调用`Person('Fred')`的时候**不使用**`new`操作符，函数内的`this`指向就会指向一些全局或者没有什么用的对象(比如说，`window`或者`undefined`)。如果这么使用的话，我们的代码就会报错或者执行一些设置`window.name`之类的傻兮兮的事情。

通过在调用前添加`new`的操作符。我们相当于在说: "Hey Javascript，我知道`Person`是一个函数啦，但是可以不可以让我们假装它是一个构造函数"。**创建一个空对象，然后让`Person`函数中的`this`指向这个对象，这样我们就能够为这个对象设置像`this.name`这样的成员变量。然后将这个对象返回**

这就是`new`这个操作符做的事情

```js
var fred = new Person('Fred'); // 返回构造函数中的this
```

`new`这个操作也将`Person.prototype`中的成员变量代理到了`fred`的对象上:

```js
function Person(name) {
  this.name = name;
}
Person.prototype.sayHi = function() {
  alert('Hi, I am ' + this.name);
}

var fred = new Person('Fred');
fred.sayHi();
```

这就是大家在Javascript推出类的写法之前模拟出来的类

---

所以`new`在Javascript中已经存在了很长时间了，但是，classes是最近几年才有的。使用它，我们可以重新编写我们的代码，让我们离今天要探究的事情更加贴切。

```js
class Person {
  constructor(name) {
    this.name = name;
  }
  sayHi() {
    alert('Hi, I am ' + this.name);
  }
}

let fred = new Person('Fred');
fred.sayHi();
```

*抓住开发者想要的东西*在设计语言和API的时候是非常重要的。

如果你写了一个函数，Javascript不能够完全明白究竟者意味着是像`alert()`这样直接调用或者会像`new Person()`这样当做一个构造函数来调用。如果忘记掉在像`Person`这种函数前面加上`new`操作符会让代码出现一些神奇的现象。

**Class的预发让我们告诉Javascript的运行者: "这不是只是一个函数 - 这是一个类，他有一个构造函数"**，当你在调用它的时候忘记使用`new`操作符的时候，Javascript会抛出一个异常:

```js
let fred = new Person('Fred');
// ✅ 如果Person是一个函数，没有问题
// ✅ 如果Person是一个类，没有问题

let george = Person('George'); // 我们忘记添加`new`
// 😳 如果用户是一个类似构造函数的函数 这个函数执行会出现一些奇怪的情况
// 🔴 如果Person是一个类，会立马抛出异常
```

这让我们在出现一些类似于`this.name`被赋值为`window.name`而不是`georage.name`的问题之前就能够及早的发现问题。

所以，这就代表着React需要在创建类之前加上一个`new`，我们不能够像普通的函数那样调用它，因为Javascript会抛出一个异常

```js
class Counter extends React.Component {
  render() {
    return <p>Hello</p>;
  }
}

// 🔴 React 不能这么做:
const instance = Counter(props);
```

像这么写会有问题。

---

在我们了解React是如何处理这类问题之前，我们需要知道，大多数人在使用React的时候会用到类似于Babel这样的编译工具，从而能够在旧的浏览器上使用类似于class这样的语法。所以我们需要在我们的设计中考虑到编译工具的存在。

在一些老点的版本的Babel中，class不需要new也能够调用，但是这当时也是可以解决的 - 通过添加一些额外的代码:

```js
function Person(name) {
  // A bit simplified from Babel output:
  if (!(this instanceof Person)) {
    throw new TypeError("Cannot call a class as a function");
  }
  // Our code:
  this.name = name;
}

new Person('Fred'); // ✅ Okay
Person('George');   // 🔴 Can’t call class as a function
``` 

你可能可以在你的打包后的文件中能够看到这些类似的代码。其实这就是那些`_classCallCheck`的函数做的事情。(你可以使用一个疏松模式(loose mode)来通过不检查来减少最终打包后的包大小，但是这可能会让你想用上真正的class的时候变得更加复杂)

---

现在，你应该能够明白在调用函数的时候使用`new`和不使用`new`的区别:

|  | `new Person()` | `Person()` |
|---|---|---|
| `class` | ✅ `this` 是 `Person` 的实例 | 🔴 `TypeError`
| `function` | ✅ `this` 是 `Person` 实例 | 😳 `this` 是 `window` 或者 `undefined` |

这就是为什么你需要正确的调用你的组件。 **如果你的组件是使用class来定义的，React需要使用`new`来调用**

那么React是怎么确定组件究竟是类还是其他的类型呢?

这没有那么简单！即使我们本就可以[在Javascript中区分class和函数](https://stackoverflow.com/questions/29093396/how-do-you-check-the-difference-between-an-ecmascript-6-class-and-function)，但是这对那些通过类似Babael这样的工具编译的class没用，编译之后这些class会变成一个纯函数。React觉得很难玩儿。

---

OK! 那是不是React可以在每次调用的时候都使用`new`？非常不幸，这也不行。

在函数中，使用`new`来调用会在内部返回一个`this`的对象。这对构造函数(比如`Person`)会比较合理，但是对于纯函数定义的组件而言，看起来就就会比较奇怪了

```js
function Greeting() {
  // 我们不希望`this`是任何对象
  return <p>Hello</p>;
}
```

这么做或许可以勉强使用，但是这里还有*其他的*两个原因让我们不使用这种方式。

---

我们不能无脑使用`new`操作符的第一个原因就是如果函数是一个箭头函数(不是被Babel编译出来的)，使用`new`执行之后会抛出一个异常：

```js
const Greeting = () => <p>Hello</p>;
new Greeting(); // 🔴 Greeting不是一个构造函数
```

这里是故意使用箭头函数的。根据箭头函数的设计，箭头函数的其中一个优点就是我们*不用*在意这个函数自己的`this` - 因为这个`this`是指向最近的普通函数的`this`:

```js
class Friends extends React.Component {
  render() {
    const friends = this.props.friends;
    return friends.map(friend =>
      <Friend
        // `this`会使用`render`函数的`this`
        size={this.props.size}
        name={friend.name}
        key={friend.id}
      />
    );
  }
}
```

那么所以 *箭头函数自己本身没有`this`* 这就意味着他不可能成为一个构造函数!

```js
const Person = (name) => {
  // 🔴 这没有用
  this.name = name;
}
```

因此，**Javascript不允许使用`new`来调用箭头函数** 如果你这么做，那么你可能会导致代码出问题，所以需要提前抛出异常。这就和之前提到的为什么Javascript不能让你在调用类的时候不使用`new`的道理一样。

这是一个很合理的做法，但是这让我们之前的计划落空。React不能让我们在所有函数前面使用`new`，因为在使用箭头函数的时候会发生报错！我们只能够尝试检查一个函数是否为箭头函数，因为箭头函数没有`prototype`，并且对这类函数，不使用`new`来调用:

```js
(() => {}).prototype // undefined
(function() {}).prototype // {constructor: f}
```

但是这对Babel编译出来的函数[不起作用](https://github.com/facebook/react/issues/4599#issuecomment-136562930)。但是这看起来也不一定是个大问题(因为我们应该也不会在箭头函数里面写`this`)，但是这里另一个原因让我们的这个方案几乎完蛋。

---

另一个我们不能无脑使用`new`操作符的原因是我们还需要排除那些React支持的直接返回字符串或者其他基础类型的组件。

```js
function Greeting() {
  return 'Hello';
}

Greeting(); // ✅ 'Hello'
new Greeting(); // 😳 Greeting {}
```

额。。。我们需要再一次看一下[`new`操作符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/new)的设计。根据我们之前所知道的，`new`告诉Javascript引擎去创建一个对象，对构造函数的内部的`this`赋值，然后在最后返回一个对象给我们。

但是Javascript也允许一个使用`new`调用的函数返回一个另外的对象来覆盖这个函数内部的this。想必这是为了考虑这可能对类似重用对象实例之类的模式比较有用吧:

```js
// 懒加载
var zeroVector = null;

function Vector(x, y) {
  if (x === 0 && y === 0) {
    if (zeroVector !== null) {
      // Reuse the same instance
      return zeroVector;
    }
    zeroVector = this;
  }
  this.x = x;
  this.y = y;
}

var a = new Vector(1, 1);
var b = new Vector(0, 0);
var c = new Vector(0, 0); // 😲 b === c
```

但是，当一个函数返回非对象类型的值的时候，`new`就会无视这个返回值。比如说如果你返回一个字符串或者数字，它就会当做什么都没有返回。

```js
function Answer() {
  return 42;
}

Answer(); // ✅ 42
new Answer(); // 😳 Answer {}
```

因为使用`new`来调用函数的时候，返回一个基本类型(比如数字或者字符串)会被无视。所以如果React无脑使用`new`,就不能够支持哪些直接返回字符串类型的组建了!

这显然对开发者来说是不可接受的，所以我们只能在换个法子。

---

至今为止，我们一共总结了什么？React需要在调用class（包括Babel编译输出的）使用`new`操作符，但是我们需要在调用普通函数或者箭头函数的时候不使用`new`操作符。而现在好像还没有一个可行的方案来区分他们。

**如果我们不能够解决普遍的问题，那我们可以尝试去解决哪个比较特殊的问题吗?**

当我们使用类来定义组建的饿时候，我们一般会去继承`React.Component`，为了使用一些内置的函数，比如`this.setState()`。**换个想法来看，我们去区分所有的类无法做到的话，我们是不是可以考虑只检查React.Component的子类呢**

Spoiler: 这正式React做的事情

---

当然，常用的用来检查`Greeting`是否是React组件的类的子类的方式就是取检查是否`Greeting.prototype`是否是React.Component的实例:

```js
class A {}
class B extends A {}

console.log(B.prototype instanceof A); // true
```

我知道你在想什么，这段代码的运行结果为什么会是这样？！为了回答这个问题，我们需要理解Javascript原型。

你可能对Javascript原型链非常熟悉。每个在Javascript中的对象都会有一个原型，当我们在调用`gred.sayHi()`但是`fred`的对象没有`sayHi`的属性的时候，我们会在`fred`的原型链上寻找`sayHi`的属性，如果我们不能够在原型链上找到它，我们会在这个原型链上的下一个原型链（`fred`的原型的原型），就这么循环执行下去。

我不是在开玩笑...**有个很奇怪的问题，一个函数或者类的`prototype`属性 _并不_ 指向这个实例的`prototype`**

```js
function Person() {}

console.log(Person.prototype); // 🤪 Not Person's prototype
console.log(Person.__proto__); // 😳 Person's prototype
```

所以"原型链"应该是类似于`__proto__.__proto__.__proto__`，而不是`prototype.prototype.prototype`。我也是很多年才明白这点。

在类或者函数上设置了`prototype`, **但最后通过`new`操作符创建的对象我们是通过`__proto__`来获取原型上属性**

```js
function Person(name) {
  this.name = name;
}
Person.prototype.sayHi = function() {
  alert('Hi, I am ' + this.name);
}

var fred = new Person('Fred'); // Sets `fred.__proto__` to `Person.prototype`
```

Javascript就是使用`__proto__`链来查找属性的:

```js
fred.sayHi();
// 1. fred是否含有这个sayHi属性? No.
// 2. fred.__proto__ 是否有 sayHi的属性 ？ 是的. 那么就调用它!

fred.toString();
// 1. fred是否含有这个toString属性? No.
// 2. fred.__proto__ 是否有 toString的属性 ？ No.
// 3. fred.__proto__.__proto__ 是否有 toString的属性 ？ 是的. 那么就调用它!
```

在实际使用场景中，你可能不需要自己去在代码中直接接触`__proto__`，除非你需要对原型链上相关的东西做调试。如果你想要让某个成员变量挂载在`fred.__proto__`中，你可以在`Person.prototype`中设置这个成员变量，至少这是Javascript原生设计定义类的成员变量的方式。

`__proto__`这个属性在刚开始的时候在浏览器中甚至是不被暴露的，因为原型链是应该被当做一个内部的概念。但是有一些浏览器加上了`__proto__`，所以最后成为了一种标准(虽然最后还是被`Object.getPrototypeOf()`代替了)。

**但是至今关于一个类的prototype的属性在他的实例上，并不是叫做prototype这个问题依然让我很疑惑**（比如，`fred.prototype`是未定义，因为`fred`不是一个函数）。个人来说，我觉得这是造成一个Javascript开发者在原型链上比较容易搞错的地方，即使是非常有经验的开发者。

---

这是一篇比较长的文章，额。我其实想说，已经快读到80%了，别放弃。

我们都明白当我们使用`obj.foo`的时候，Javascript其实是在依次寻找`obj`上的`foo`、`obj.__proto__.foo`、`obj.__proto__.__proto__.foo` 等等

利用class，你可能不需要知道这些机制，但是继承也是基于这个原型链的。这也就是React的类的实例是如何获取到类似`setState`的父类函数的:

```js
class Greeting extends React.Component {
  render() {
    return <p>Hello</p>;
  }
}

let c = new Greeting();
console.log(c.__proto__); // Greeting.prototype
console.log(c.__proto__.__proto__); // React.Component.prototype
console.log(c.__proto__.__proto__.__proto__); // Object.prototype

c.render();      // 找到 c.__proto__ (Greeting.prototype)
c.setState();    // 找到 c.__proto__.__proto__ (React.Component.prototype)
c.toString();    // 找到 c.__proto__.__proto__.__proto__ (Object.prototype)
```

换句话来说，**当你使用类的时候，会这个实例的`__proto__`链来模拟类的继承**

```js
// 继承链
Greeting
  → React.Component
    → Object (implicitly)

// 原型链
new Greeting()
  → Greeting.prototype
    → React.Component.prototype
      → Object.prototype
```

如上的两个链

---

因为我们是使用`__proto__`来模拟类的继承，我们可以通过这点来确定`Greeting`是否继承于`React.Component`。我们可以顺着`__proto__`链来检查。

```js
// `__proto__` 链
new Greeting()
  → Greeting.prototype // 🕵️ 我们从这里开始
    → React.Component.prototype // ✅ 找到了!
      → Object.prototype
```

顺便一提，`x`继承于`y`其实也是依照这种方式，它通过寻找`x.__proto__`的链来寻找是否存在`Y.prototype`。

正常来说，这本来是用来确定某个实例是否是某个类的实例的:

```js
let greeting = new Greeting();

console.log(greeting instanceof Greeting); // true
// greeting (🕵️‍ 我们从这里开始)
//   .__proto__ → Greeting.prototype (✅ 找到了!)
//     .__proto__ → React.Component.prototype 
//       .__proto__ → Object.prototype

console.log(greeting instanceof React.Component); // true
// greeting (🕵️‍ 我们从这里开始寻找)
//   .__proto__ → Greeting.prototype
//     .__proto__ → React.Component.prototype (✅ 找到了!)
//       .__proto__ → Object.prototype

console.log(greeting instanceof Object); // true
// greeting (🕵️‍ 我们从这里开始寻找)
//   .__proto__ → Greeting.prototype
//     .__proto__ → React.Component.prototype
//       .__proto__ → Object.prototype (✅ 找到了!)

console.log(greeting instanceof Banana); // false
// greeting (🕵️‍ 我们从这里开始查找)
//   .__proto__ → Greeting.prototype
//     .__proto__ → React.Component.prototype 
//       .__proto__ → Object.prototype (🙅‍ 没有找到!)
```

而且这也对确定一个类是否是另一个类的子类有用:

```js
console.log(Greeting.prototype instanceof React.Component);
// greeting
//   .__proto__ → Greeting.prototype (🕵️‍ 我们从这里开始查找)
//     .__proto__ → React.Component.prototype (✅ 找到了!)
//       .__proto__ → Object.prototype
```

这个检查方式就能确定一个组件是React.Component的子类还是普通函数

---

然而这其实并不是React真实的实现。。。😳


另一个可行的方法就是去检查原型中是否存在`render`函数，但是当时并[不能确定](https://github.com/facebook/react/issues/4599#issuecomment-129714112)React的组件API将来会如何发展的。每一种检查方式都会有它不合适的地方。现在这种检查的方式当`render`被定义成当前实例的函数的时候就会不行了，比如定义在类的成员变量上。

所以，为了防止上面的问题，React [添加了](https://github.com/facebook/react/pull/4663) 一个特殊的标志在组件的基础父类上。React会检查这个标志是否存在，这就是React为什么会知道一个组件是React组件还是普通的函数。

一般来说，这个标志被定义在`React.Component`类里:

```js
// React内部
class Component {}
Component.isReactClass = {};

// 我可以像这样检查
class Greeting extends Component {}
console.log(Greeting.isReactClass); // ✅ 对的
```

但是，有些类的实现中[没有](https://github.com/scala-js/scala-js/issues/1900)继承静态的属性（或者不规范的设置了`__proto__`），然后标志就被丢失了。

这也就是为什么后来 React [移动](https://github.com/facebook/react/pull/5021)了标志到了`React.Component.prototype`:

```js
// React内部
class Component {}
Component.prototype.isReactComponent = {};

// 我们可以看看是否是这样的
class Greeting extends Component {}
console.log(Greeting.prototype.isReactComponent); // ✅ Yes
```

**顾名思义，这个变量名**

你可能会想，为什么这是一个对象，而不是一个bool值，这在开发使用中无伤大雅，但是在最近的几个Jest版本中(那时候Jest还不是很好用)默认打开了自动mock。它省略了mock基本数据，[使得React的check失效了](https://github.com/facebook/react/pull/4663#issuecomment-136533373)，谢谢Jest

这个`isReactComponent`的标识至今都还在[React中使用](https://github.com/facebook/react/blob/769b1f270e1251d9dbdce0fcbd9e92e502d059b8/packages/react-reconciler/src/ReactFiber.js#L297-L300)

如果你不继承`React.Component`，React不能在原型链上找到`isReactComponent`这个标志，所以React不会把这个类当做一个类来看，现在你就能明白[最频繁的问题](https://stackoverflow.com/a/42680526/458193) - 像`Cannot call a class a function`的错误需要通过继承React.Component解决。最后，如果你的组件的原型上有`render`函数，但是没有`isReactComponent`不存在的时候，会抛出一个[警告](https://github.com/facebook/react/pull/11168)。

---

你可能觉得这篇文章总是在用一种吊胃口的方式在引导你向下阅读。**最终的解决方案非常简单，但是我们花了大篇幅来解释*为什么*React最终会使用这个方案以及还有什么其他的选择**

以我的经验来看，这对于一个库的API来说是一件非常正常的事情。为了让一个API能够更简单的被使用，你总是需要考虑语言(如果可能的话，可以考虑多种语言或者语言的未来)，运行时性能，编译时或者其他的用户体验，生态系统的情况，打包的解决方案按，更少的警告等等。可能最后的解决方案并不会总是那么优雅，但是一定要非常实用。

**如果一个API是成功的，那么_他的使用者_完全不需要关心这个API内部是如何运行的**，他们只需要关心如何做自己的应用就可以了

如果你总是保持好奇心，你会觉得知道React的这些内幕会非常开心。