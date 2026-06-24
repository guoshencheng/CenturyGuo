---
title: "翻译：为什么React Hooks需要遵循调用顺序"
date: "2018-12-13"
tags: ["translate", "overreacted"]
description: "在React Conf 2018大会上，React团队向大家呈现了Hook提案"
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/tags/overreacted)，原文链接请查看[这里](https://overreacted.io/why-do-hooks-rely-on-call-order/)

在React Conf 2018大会上，React团队向大家呈现了[Hook提案](https://reactjs.org/docs/hooks-intro.html)

如果你想要理解什么是Hooks以及它们解决了什么问题，可以查看[我们在大会上介绍的视频](https://www.youtube.com/watch?v=dpw9EHDh2bM)以及我阐述大家对Hook的概念的误解的文章。

你可能刚开始不会特别喜欢Hooks这个提案:

![Negative HN comment](/images/blog/translate-overreacted-why-do-hooks-rely-on-call-order/hooks-hn1.png)

但Hooks就像是音乐一样，在你听了一段时间后，你对他的好感度会慢慢上升:

![Positive HN comment from the same person four days later](/images/blog/translate-overreacted-why-do-hooks-rely-on-call-order/hooks-hn2.png)

当你阅读这篇文章的时候，千万别落下了这篇关于如何构建自定义Hooks的[文章](https://reactjs.org/docs/hooks-custom.html)，这篇文章很重要哦！很多人会断章取义的来反驳我们对Hooks介绍(比如学习React class是比较难以理解的)，却没有看到Hooks产生背景原因。Hooks产生的背景原因是**Hooks 就像是 *函数Mixins* 那样让你能够抽象并组合你的逻辑**

Hooks[接受了先前的一些设计理念的影响](https://reactjs.org/docs/hooks-faq.html#what-is-the-prior-art-for-hooks), 
Hooks [are influenced by some prior art](https://reactjs.org/docs/hooks-faq.html#what-is-the-prior-art-for-hooks) but I haven’t seen anything *quite* like them until Sebastian shared his idea with the team. Unfortunately, it’s easy to overlook the connection between the specific API choices and the valuable properties unlocked by this design. With this post I hope to help more people understand the rationale for the most controversial aspect of Hooks proposal.

**接下来的文章会建立在你了解`useState()`Hook的API并且直到如何编写一个自定义的Hook之上。如果你还不会，请先查看之前的链接。不过我得提醒一点，Hook是一个测试阶段的API，你也可以现在不去立马去学习它。**

(免责声明: 这是一篇个人文章，并不代表React开发团队的意见。这个话题太大太复杂，在一些地方，我可能会误解)

---


当你看到Hooks之后最大的疑惑点大概就是Hooks是需要保持一定的执行顺序的。但做成这样是有原因的。

显然，Hooks这种做法是有争议的。为了遵循我们的开发原则，这也是为什么我们在觉得我们的提案已经有非常完善的文档并且我们能够描述这个功能足够好且开发者愿意尝试使用这个提案了之后才发布了它。

**如果你还是对Hooks API设计方面有疑问的话，我建议你去阅读Sebastian对于1000多个意见征求讨论的[全部回答](https://github.com/reactjs/rfcs/pull/68#issuecomment-439314884)** 这些讨论都非常彻底也非常深入。我甚至可以将他的讨论的每个段落都写成一篇文章。(事实上，我已经写过[一篇了](https://overreacted.io/how-does-setstate-know-what-to-do/))

以下是我这次特别要讲解的。当你在组件中多次调用Hooks的时候。比如，我们可以多次使用`useState()`定义[多个state变量](https://reactjs.org/docs/hooks-state.html#tip-using-multiple-state-variables):

```jsx
function Form() {
  const [name, setName] = useState('Mary');              // State variable 1
  const [surname, setSurname] = useState('Poppins');     // State variable 2
  const [width, setWidth] = useState(window.innerWidth); // State variable 3

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  function handleNameChange(e) {
    setName(e.target.value);
  }

  function handleSurnameChange(e) {
    setSurname(e.target.value);
  }

  return (
    <>
      <input value={name} onChange={handleNameChange} />
      <input value={surname} onChange={handleSurnameChange} />
      <p>Hello, {name} {surname}</p>
      <p>Window width: {width}</p>
    </>
  );
}
```

这里我们需要注意的是，我们使用了结构数组的语法糖来定义`useState()`产生的状态变量，但是这些变量名并没有被传入React。在这个例子里 **React把"第一个状态变量"定义为`name`, 把"第二个状态变量"定义为`surname`**。这些`useState()`的调用顺序让我们能够在重新渲染这个组件的时候识别这些state，这种实现思路在这篇[文章中](https://medium.com/@ryardley/react-hooks-not-magic-just-arrays-cd4f1857236e)讲解的很好。

表面上来看，依赖调用顺序是一个错误的选择。勇气很有用但是常常让人产生错误 - 尤其是你还不知道其内部是如何做成这样的。**这篇文章中，我会提取一些其他的实现Hook的通用的解决方案的设计，并解释为什么它们最后都不能被使用**

---

这篇文章不会让你太累。不过这取决你想要了解的数量，因为我们的提案少则几十多则几百。过去的五年，我们[想了](https://github.com/reactjs/react-future)很多关于组件API的提案。

像我这篇文章这么介绍会比较讨巧，因为即使介绍了所有的提案，依然会有人跳出来怼你说: "哈？你没有提到*那个*!"

在实际生产环境中，不同的提案一般只会覆盖提议者当下的场景。我会通过一些特殊的例子来演示这些提案的普遍缺陷，而不是枚举所有建议的提案(这些天有的也花了我好几个月)，通过这些API的问题来归类它们对于一个读者来说是一种锻炼。🧐

*这不是说Hooks是完美无瑕的* 只不过，当你开始了解其他解决方案的缺陷的时候，你会对Hooks的设计更有好感

---

### 缺陷 #1: 不能够提取出自定义Hook

令人惊讶的是，很多的提案根本不支持[自定义Hook](https://reactjs.org/docs/hooks-custom.html)。或许我们没有在"Hook的动机"的文档中对自定义Hook的注重还不够。在能够很好的理解我们做Hook的初衷之前，作出这个提案是一个很难的事情。所以，这是一个先有鸡还是先有蛋的问题。但是自定义Hook确实是这个提案相对重要的需求。

比如，除了在组件的顶端调用多次`useState()`来使用state，你还可以将所有state放置在单个对象中，这样还可以在class中也使用，对吗?

```jsx
function Form() {
  const [state, setState] = useState({
    name: 'Mary',
    surname: 'Poppins',
    width: window.innerWidth,
  });
  // ...
}
```

需要澄清的是，Hooks*当然*支持这种写法的。你不必将你的state分割成多个变量(查看我们在问答中的[建议](https://reactjs.org/docs/hooks-faq.html#should-i-use-one-or-many-state-variables))

其实支持调用多次`useState()`的目的是在于能够从你的组件中提取关于状态的逻辑(state和effects)到自定义的Hook中，在这些自定义的Hook中，我们能够单独管理自己的state和effects：

```jsx
function Form() {
  // Declare some state variables directly in component body
  const [name, setName] = useState('Mary');
  const [surname, setSurname] = useState('Poppins');

  // We moved some state and effects into a custom Hook
  const width = useWindowWidth();
  // ...
}

function useWindowWidth() {
  // Declare some state and effects in a custom Hook
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    // ...
  });
  return width;
}
```

如果你只允许你的组件调用一次`useState()`，你就会失去使用一个自定义Hooks的方式来定义state。这也是自定义Hooks想解决的问题。

### 缺陷 #2: 命名奔溃

还有一个比较普遍的建议是让`useState()`接受一个key的参数(比如一个字符串)，这个参数是唯一定义一个组件的某个状态变量的。

这个想法的设计有很多方式，但是他们大致是像这么做的:

```jsx
  // ⚠️  这不是React Hook的API
function Form() {
  // We pass some kind of state key to useState()
  const [name, setName] = useState('name');
  const [surname, setSurname] = useState('surname');
  const [width, setWidth] = useState('width');
  // ...
```

这种方式防止了对调用顺序的依赖(通过明确的定义键值)但是却产生了另一个问题 - 命名奔溃。

理所应当的，你一般不会再你的组件中重复调用`useState('name')`两次，除非是你写错了代码。但是这偶然也是会发生的，一旦发生了，我们会找这个问题很久。而且，在你定义一个*自定义组件*的时候会特别容易发生。

使用这种方式的实现，每当你在你的自定义Hook中添加一个state的时候，你将冒着任何在使用这个自定义Hook组件(直接的或者间接的)出问题的风险，因为*这些组件可能已经有了相同命名的state*。

这种实现方式是关于API[需要能够顺应未来的改变](https://overreacted.io/optimized-for-change)的反例。这些代码看起来是"优雅的"，但是当需求变动的时候，这些代码是非常脆弱的。我们应当冲我们的失败中[吸取教训](https://reactjs.org/blog/2016/07/13/mixins-considered-harmful.html#mixins-cause-name-clashes)

事实上最后Hooks提案是通过依赖调用顺序来解决这个问题的: 即使两个Hook使用了相同的`name`状态变量，他们互相之间都是隔离的。每个`useState()`的调用都分配给了他们属于自己的"记忆单元"。

其实还有很多的方式来解决这个缺陷，但是这些方案都有它们自己本身的问题。让我们更深入的来看看这些问题。

### 缺陷 #3: 只能调用同一个Hook一次

另一种实现索引`useState()`的方式就是使用类似Symbols，这样就不会出事了，对吗?

```jsx
// ⚠️ This is NOT the React Hooks API
const nameKey = Symbol();
const surnameKey = Symbol();
const widthKey = Symbol();

function Form() {
  // We pass some kind of state key to useState()
  const [name, setName] = useState(nameKey);
  const [surname, setSurname] = useState(surnameKey);
  const [width, setWidth] = useState(widthKey);
  // ...

```

这种方式在我们提取`useWidowWidth()`Hooks的时候看起来没什么问题:

```jsx
// ⚠️ This is NOT the React Hooks API
function Form() {
  // ...
  const width = useWindowWidth();
  // ...
}

/*********************
 * useWindowWidth.js *
 ********************/
const widthKey = Symbol();
 
function useWindowWidth() {
  const [width, setWidth] = useState(widthKey);
  // ...
  return width;
}
```

但是，当我们想要提取input的处理的时候，就会有问题了:

```jsx
// ⚠️ This is NOT the React Hooks API
function Form() {
  // ...
  const name = useFormInput();
  const surname = useFormInput();
  // ...
  return (
    <>
      <input {...name} />
      <input {...surname} />
      {/* ... */}
    </>    
  )
}

/*******************
 * useFormInput.js *
 ******************/
const valueKey = Symbol();
 
function useFormInput() {
  const [value, setValue] = useState(valueKey);
  return {
    value,
    onChange(e) {
      setValue(e.target.value);
    },
  };
}
```

（我承认`useFormInput()`这个Hook并不是非常有用，但是你应该想象，假如说要做类似于校验或者给一些不合法的状态标记比如[Formik](https://github.com/jaredpalmer/formik)的时候）

知道这个bug出在哪里了吗?

我们调用了`useFormInput()`了两次，但是`useFromInput()`都调用`useState()`，并使用了同一个命名，因此，事实上，我们就是在做类似这样的事情:

```jsx
  const [name, setName] = useState(valueKey);
  const [surname, setSurname] = useState(valueKey);
```

因此我们的代码就又出问题了。

而实际上的Hooks的实现不会有这些问题，因为**每当我们_调用_ `useState()` 都会获取到一个相互隔离的状态** 依赖一个固定的调用顺序却释放了我们对于State命名的忧虑。

### 缺陷 #4: 菱形问题

从技术上来讲，其实这个权限和之前的问题差不多。但由于实在臭名昭著因而不得不提。这甚至被[描述在了Wikipedia](https://en.wikipedia.org/wiki/Multiple_inheritance#The_diamond_problem)。(众所众知，这也被我们称作"致命方块" - 非常酷的名字)

我们的mixin系统[也有可能存在这种问题](https://reactjs.org/blog/2016/07/13/mixins-considered-harmful.html#mixins-cause-name-clashes)

假如两个自定义Hook`useWindowWidth()`和`useNetworkStatus()`可能会使用相同的一个自定义Hook，比如`useSubscription()`：

```jsx
function StatusMessage() {
  const width = useWindowWidth();
  const isOnline = useNetworkStatus();
  return (
    <>
      <p>Window width is {width}</p>
      <p>You are {isOnline ? 'online' : 'offline'}</p>
    </>
  );
}

function useSubscription(subscribe, unsubscribe, getValue) {
  const [state, setState] = useState(getValue());
  useEffect(() => {
    const handleChange = () => setState(getValue());
    subscribe(handleChange);
    return () => unsubscribe(handleChange);
  });
  return state;
}

function useWindowWidth() {
  const width = useSubscription(
    handler => window.addEventListener('resize', handler),
    handler => window.removeEventListener('resize', handler),
    () => window.innerWidth
  );
  return width;
}

function useNetworkStatus() {
  const isOnline = useSubscription(
    handler => {
      window.addEventListener('online', handler);
      window.addEventListener('offline', handler);
    },
    handler => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    },
    () => navigator.onLine
  );
  return isOnline;
}
```

这个例子完全是合理的。**对于一个自定义Hook的开发者来说，在使用或者移除调用另一个自定义Hook的时候不需要考虑这个Hook的调用链上是否还有其他的地方在调用是安全的** 在实际生产中，*你可能很难知道*整个Hook的调用链，除非你审查了所有组件调用的Hook。

(作为一个补充例子，React中遗留的代码`createClass()` mixins 不能够实现比如你有两个mixin都是你想要实现的，但是他们互相矛盾，因为他们都继承了同一个"基础"的mixin)

一下的实现方式形成了”方块问题“: 💎

```
       / useWindowWidth()   \                   / useState()  🔴 Clash
Status                        useSubscription() 
       \ useNetworkStatus() /                   \ useEffect() 🔴 Clash
```

依赖一个固定的调用顺序解决了这个问题:

```
                                                 / useState()  ✅ #1. State
       / useWindowWidth()   -> useSubscription()                    
      /                                          \ useEffect() ✅ #2. Effect
Status                         
      \                                          / useState()  ✅ #3. State
       \ useNetworkStatus() -> useSubscription()
                                                 \ useEffect() ✅ #4. Effect
```

函数调用不会含有"方块问题"因为最后的调用会形成树桩。🎄 

###  权限 #5: 复制黏贴会造成代码问题

或许我们能够通过命名空间的方式来挽救命名state这种设计。实现这种做法的方式有很多。

其中一种就是通过闭包来隔离这些state的命名。这需要你在使用自定义Hook的时候实例化它，并且在每个Hook外添加一个函数闭包:

```jsx
/*******************
 * useFormInput.js *
 ******************/
function createUseFormInput() {
  // Unique per instantiation
  const valueKey = Symbol();  

  return function useFormInput() {
    const [value, setValue] = useState(valueKey);
    return {
      value,
      onChange(e) {
        setValue(e.target.value);
      },
    };
  }
}
```

这种方式增加了我们编写代码的负担。我们在做Hook的时候的其中一个设计目标就是想要避免过深的函数嵌套，这种方式在高阶组件和render属性渲染的设计中已经被过分的使用。在这种设计中，我们必须要实例化我们想使用的自定义Hook - 然后在组件的函数中使用生成的函数(其实就一次)。这比我们无条件的使用Hook要复杂不少。

另外，像这样的使用方式，你需要在你的组件中维护两个地方，你需要在文件的顶部(或者在自定Hook的函数闭包中)定义一次，在调用的地方调用一次。这意味着你需要在render函数和文件顶部的定义之间跳转，即使是一丁点的改动。

```js
// ⚠️ This is NOT the React Hooks API
const useNameFormInput = createUseFormInput();
const useSurnameFormInput = createUseFormInput();

function Form() {
  // ...
  const name = useNameFormInput();
  const surname = useNameFormInput();
  // ...
}
```

你还需要精确的定义他们的名字，你一般需要定义两种层次的名字 - 工厂函数定义成`createUseFormInput`而Hook实例会被定义为类似`useNameFormInput`或者`useSurnameFormInput`。

如果你调用了同一个Hook实例两次，你代码可能就会出现bug了，事实上，以上的代码就有这个问题 - 你注意到了吗? 这段你代码应该写成:

```js
  const name = useNameFormInput();
  const surname = useSurnameFormInput(); // Not useNameFormInput!
```

这些问题往往是不可避免的，但是我对有些人总喜欢增加这么多问题而不愿意遵守[Hook的编写规则](https://reactjs.org/docs/hooks-rules.html)感到生气。

更重要的是，他们打破了我们所期望的复制粘贴即可提取Hook的期望，当一个API需要强制你在调用所有东西的时候都加上一个闭包的时候会让人多么不爽。

### 缺陷 #6: 我们还是需要一个Linter

我们还有一个方法来避免state的索引值冲突。如果你了解过这个方法，你可能会对我还没有承认这种方式而感到生气! 抱歉。

这个方法就是我们可以在使用自定义Hook的时候拼接键值。比如像这样:

```js
// ⚠️ This is NOT the React Hooks API
function Form() {
  // ...
  const name = useFormInput('name');
  const surname = useFormInput('surname');
  // ...
  return (
    <>
      <input {...name} />
      <input {...surname} />
      {/* ... */}
    </>    
  )
}

function useFormInput(formInputKey) {
  const [value, setValue] = useState('useFormInput(' + formInputKey + ').value');
  return {
    value,
    onChange(e) {
      setValue(e.target.value);
    },
  };
}
```

和其他的选择不同，我根本不喜欢这种方式。我觉得这不值得尝试。

Code passing non-unique or badly composed keys would *accidentally work* until a Hook is called multiple times or clashes with another Hook. Worse, if it’s meant to be conditional (we’re trying to “fix” the unconditional call requirement, right?), we might not even encounter the clashes until later.

Remembering to pass keys through all layers of custom Hooks seems fragile enough that we’d want to lint for that. They would add extra work at runtime (don’t forget they’d need to serve *as keys*), and each of them is a paper cut for bundle size. **But if we have to lint anyway, what problem did we solve?**

This might make sense if conditionally declaring state and effects was very desirable. But in practice I find it confusing. In fact, I don’t recall anyone ever asking to conditionally define `this.state` or `componentDidMount` either.

What does this code mean exactly?

```js
// ⚠️ This is NOT the React Hooks API
function Counter(props) {
  if (props.isActive) {
    const [count, setCount] = useState('count');
    return (
      <p onClick={() => setCount(count + 1)}>
        {count}
      </p>;
    );
  }
  return null;
}
```

Is `count` preserved when `props.isActive` is `false`? Or does it get reset because `useState('count')` wasn’t called?

If conditional state gets preserved, what about an effect?

```js
// ⚠️ This is NOT the React Hooks API
function Counter(props) {
  if (props.isActive) {
    const [count, setCount] = useState('count');
    useEffect(() => {
      const id = setInterval(() => setCount(c => c + 1), 1000);
      return () => clearInterval(id);
    }, []);
    return (
      <p onClick={() => setCount(count + 1)}>
        {count}
      </p>;
    );
  }
  return null;
}
```

It definitely can’t run *before* `props.isActive` is `true` for the first time. But once it becomes `true`, does it ever stop running? Does the interval reset when `props.isActive` flips to `false`? If it does, it’s confusing that effect behaves differently from state (which we said wouldn’t reset). If the effect keeps running, it’s confusing that `if` outside the effect doesn’t actually make the effect conditional. Didn’t we say we wanted conditional effects?

If the state *does* get reset when we don’t “use” it during a render, what happens if multiple `if` branches contain `useState('count')` but only one runs at any given time? Is that valid code? If our mental model is a “map with keys”, why do things “disappear” from it? Would the developer expect an early `return` from a component to reset all state after it? If we truly wanted to reset the state, we could make it explicit by extracting a component:

```jsx
function Counter(props) {
  if (props.isActive) {
    // Clearly has its own state
    return <TickingCounter />;
  }
  return null;
}
```

That would probably become the “best practice” to avoid these confusing questions anyway. So whichever way you choose to answer them, I think the semantics of conditionally *declaring* state and effects itself end up weird enough that you might want to lint against it.

If we have to lint anyway, the requirement to correctly compose keys becomes “dead weight”. It doesn’t buy us anything we actually *want* to do. However, dropping that requirement (and going back to the original proposal) *does* buy us something. It makes copy-pasting component code into a custom Hook safe without namespacing it, reduces bundle size paper cuts from keys and unlocks a slightly more efficient implementation (no need for Map lookups).

Small things add up.

### 缺陷 #7: 不能再Hook之间传递参数

我们所期望的Hook的最重要的功能之一就是要能够在Hook之间互相传值。

假想这么一个例子，一个在线的好友选择器。

```jsx
const friendList = [
  { id: 1, name: 'Phoebe' },
  { id: 2, name: 'Rachel' },
  { id: 3, name: 'Ross' },
];

function ChatRecipientPicker() {
  const [recipientID, setRecipientID] = useState(1);
  const isRecipientOnline = useFriendStatus(recipientID);

  return (
    <>
      <Circle color={isRecipientOnline ? 'green' : 'red'} />
      <select
        value={recipientID}
        onChange={e => setRecipientID(Number(e.target.value))}
      >
        {friendList.map(friend => (
          <option key={friend.id} value={friend.id}>
            {friend.name}
          </option>
        ))}
      </select>
    </>
  );
}

function useFriendStatus(friendID) {
  const [isOnline, setIsOnline] = useState(null);
  const handleStatusChange = (status) => setIsOnline(status.isOnline);
  useEffect(() => {
    ChatAPI.subscribeToFriendStatus(friendID, handleStatusChange);
    return () => {
      ChatAPI.unsubscribeFromFriendStatus(friendID, handleStatusChange);
    };
  });
  return isOnline;
}
```

当你选择选择的好友的id的时候，我们的`useFriendStatus()`Hook会取消订阅好友的状态，并订阅下一个好友。

我们能够实现这个这归功于我们能够将`useState()`的变量传递到`useFriendState()`Hook中:

```js
  const [recipientID, setRecipientID] = useState(1);
  const isRecipientOnline = useFriendStatus(recipientID);
```

在Hook之间传递变量这个Feature是非常有用的。比如[React Spring](https://medium.com/@drcmda/hooks-in-react-spring-a-tutorial-c6c436ad7ee4) 让你能够创建多个逐个执行的动画：

```js
  const [{ pos1 }, set] = useSpring({ pos1: [0, 0], config: fast });
  const [{ pos2 }] = useSpring({ pos2: pos1, config: slow });
  const [{ pos3 }] = useSpring({ pos3: pos2, config: slow });
```

(这里有个[例子](https://codesandbox.io/s/ppxnl191zx).)

提案期望能够将初始的值作为一个默认参数传入，或者传入一个装饰器来补充一些需要特殊处理的逻辑。

如果Hook不在组件函数中的函数体中，你就不能够在它们之间轻松的传递参数，你也就不能在不使用高阶组件嵌套的情况下使用这些state，或者使用`useMemo()`来记录中间的计算结果。你也不能轻松的在effect中使用这些变量，因为这些变量不是在闭包中的。针对这些问题，常规手段有很多，但是这些手段往往需要你的大脑里记住函数执行的时候的输入或者输出，这些都是比较取巧的做法，违反了React的设计规范 。

在Hook之间传递参数是我们这个提案的核心。你可以使用嵌套Render属性组件的方式来避免使用Hook，但是除非你使用了类似于[Component Component](https://ui.reach.tech/component-component), 不然要使用全部的功能还是很困难的，Hook扁平化了状态的层级，并将这些状态互相传递 - 函数的调用是能做到这点的最简单的实现方式。

### 缺陷 #8: 太矫情

有很多的实现方案的自我安全意识太强了。很多人在实现Hook的时候期望Hook不去依赖React。但实际上，实现Hook的方式很多: 在React中内建一个Hook来使用`this`，或者将这些所需要的参数都通过参数来传递，等等。

我觉得[Sebastian的回答](https://github.com/reactjs/rfcs/pull/68#issuecomment-439314884)这里比我说的要好，所以我强烈建议你去查看这个章节("模块注入")。

比起在函数中传递错误，开发者更喜欢使用`try` / `catch`来处理错误，就好像是比起AMD明确的定义`require`并传递给我们调用，我们更喜欢直接使用ES Module的`import`(或者 CommonJS的`require`)

```js
// 大家忘了AMD了吗？
define(['require', 'dependency1', 'dependency2'], function (require) {
  var dependency1 = require('dependency1'),
  var dependency2 = require('dependency2');
  return function () {};
});
```

对的，AMD可能更加"诚实"的告诉你在浏览器中读取模块是一个异步的过程。单当你知道了这点之后，总是写一个`define`的闭包就会变得很蠢。

`try` / `catch`, `require` 以及React Context API 证明了我们比起在层级之间传递明确的传递参数更期望能够让”环境“提供一些API来帮助我们处理。至少我觉得这对于Hook而言是对的。

这就好像是当我们要定义一个组件的时候，我们从`React`中获取`Component`。或许这样的为每个组件加上一个工厂函数的闭包的代码就能够从React中解耦出来了

```js
function createModal(React) {
  return class Modal extends React.Component {
    // ...
  };
}
```

但是事实上这一定会造成开发者的愤怒，假如我们有一天真的想要在项目中移除对React的依赖并使用另外的框架，我们通常会在模块系统层面做一些工作。

这也被应用在Hooks上。至今，正如[Sebastian的回答](https://github.com/reactjs/rfcs/pull/68#issuecomment-439314884)提到的，我们也可以通过技术的手段”直接“让从`react`中导出的Hooks变成不同的实现([我之前的一篇文章也有提到](https://overreacted.io/how-does-setstate-know-what-to-do/))

另一个我觉得比较矫情的做法就是让Hook[链式](https://paulgray.net/an-alternative-design-for-hooks/)或者添加一个一级类概念比如`React.createHook()`。除了运行时的消耗，任何使用额外闭包的方式都会丢失一个使用纯函数的一个巨大优势: *良好的调试体验*

纯函数让你能够直接单步进入函数调试，并且能够直观的查看变量是如何在你的组件内部流动的。间接性(额外的闭包)让这些都变得困难。类似的解决方案比如高阶组件或者render属性就拥有这种问题。另外间接性解决方案会复杂化静态检查。

---

如我之前提到的，这篇文章并不会让你感觉太累。不同的解决放啊还有很多有意思的问题，有一些会更加灰度，可能会在之后的话题中提到。

Hook还不是那么完美，但是在现今的解决方案中是一个更好的选择。还有一些问题我们是[需要修复的](https://github.com/reactjs/rfcs/pull/68#issuecomment-440780509)，而且还有一些问题比如现在Hook的用法比起class来说会更显得笨拙。这可能也会是之后的一篇文章的话题。

不知道我是否覆盖了你所认可的实现方式，我只希望这篇文章能够帮助大家更好的理解我们对Hook的实现的心路以及我们在选择API的标准。就如你看到的，很多的解决方案()需要对[将来的需求做一些优化](https://overreacted.io/optimized-for-change/)。我希望React的开发者们能够认可这个观点。
