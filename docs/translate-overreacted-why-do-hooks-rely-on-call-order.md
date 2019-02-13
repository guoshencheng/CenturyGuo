---
date: '2018-12-13'
title: '翻译：为什么React Hooks需要遵循调用顺序'
tag: translate,overreacted
---

> 本文出自[overreacted](https://overreacted.io/)，这是[Dan Abramov](https://mobile.twitter.com/dan_abramov)写的博客，我觉得对很有用所以特意做了这个翻译[系列](/posts/overreacted)，原文链接请查看[这里](https://overreacted.io/why-do-hooks-rely-on-call-order/)

在React Conf 2018大会上，React团队向大家呈现了[Hook提案](https://reactjs.org/docs/hooks-intro.html)

如果你想要理解什么是Hooks以及它们解决了什么问题，可以查看[我们在大会上介绍的视频](https://www.youtube.com/watch?v=dpw9EHDh2bM)以及我阐述大家对Hook的概念的误解的文章。

你可能刚开始不会特别喜欢Hooks这个提案:

![Negative HN comment](./hooks-hn1.png)

但Hooks就像是音乐一样，在你听了一段时间后，你对他的好感度会慢慢上升:

![Positive HN comment from the same person four days later](./hooks-hn2.png)

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

```jsx{2,3,4}
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

```jsx{6-7}
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

```jsx{4,11-17}
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

```jsx{4,5,19-29}
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

```jsx{12,23-27,32-42}
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

```jsx{5,6}
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

```js{2,3,7,8}
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

```js{4,5,16,17}
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

Out of different alternatives, I dislike this approach the least. I don’t think it’s worth it though.

Code passing non-unique or badly composed keys would *accidentally work* until a Hook is called multiple times or clashes with another Hook. Worse, if it’s meant to be conditional (we’re trying to “fix” the unconditional call requirement, right?), we might not even encounter the clashes until later.

Remembering to pass keys through all layers of custom Hooks seems fragile enough that we’d want to lint for that. They would add extra work at runtime (don’t forget they’d need to serve *as keys*), and each of them is a paper cut for bundle size. **But if we have to lint anyway, what problem did we solve?**

This might make sense if conditionally declaring state and effects was very desirable. But in practice I find it confusing. In fact, I don’t recall anyone ever asking to conditionally define `this.state` or `componentDidMount` either.

What does this code mean exactly?

```js{3,4}
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

```js{5-8}
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

### Flaw #7: Can’t Pass Values Between Hooks

One of the best features of Hooks is that you can pass values between them.

Here is a hypothetical example of a message recipient picker that shows whether the currently chosen friend is online:

```jsx{8,9}
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

When you change the recipient, our `useFriendStatus()` Hook would unsubscribe from the previous friend’s status, and subscribe to the next one.

This works because we can pass the return value of the `useState()` Hook to the `useFriendStatus()` Hook:

```js{2}
  const [recipientID, setRecipientID] = useState(1);
  const isRecipientOnline = useFriendStatus(recipientID);
```

Passing values between Hooks is very powerful. For example, [React Spring](https://medium.com/@drcmda/hooks-in-react-spring-a-tutorial-c6c436ad7ee4) lets you create a trailing animation of several values “following” each other:

```js
  const [{ pos1 }, set] = useSpring({ pos1: [0, 0], config: fast });
  const [{ pos2 }] = useSpring({ pos2: pos1, config: slow });
  const [{ pos3 }] = useSpring({ pos3: pos2, config: slow });
```

(Here’s a [demo](https://codesandbox.io/s/ppxnl191zx).)

Proposals that put Hook initialization into default argument values or that write Hooks in a decorator form make it difficult to express this kind of logic.

If calling Hooks doesn’t happen in the function body, you can no longer easily pass values between them, transform those values without creating many layers of components, or add `useMemo()` to memoize an intermediate computation. You also can’t easily reference these values in effects because they can’t capture them in a closure. There are ways to work around these issues with some convention but they require you to mentally “match up” inputs and outputs. This is tricky and violates React’s otherwise direct style.

Passing values between Hooks is at the heart of our proposal. Render props pattern was the closest you could get to it without Hooks, but you couldn’t get full benefits without something like [Component Component](https://ui.reach.tech/component-component) which has a lot of syntactic noise due to a “false hierarchy”. Hooks flatten that hierarchy to passing values — and function calls is the simplest way to do that.

### Flaw #8: Too Much Ceremony

There are many proposals that fall under this umbrella. Most attempt to avoid the perceived dependency of Hooks on React. There is a wide variety of ways to do it: by making built-in Hooks available on `this`, making them an extra argument you have to pass through everything, and so on.

I think [Sebastian’s answer](https://github.com/reactjs/rfcs/pull/68#issuecomment-439314884) addresses this way better than I could describe so I encourage you to check out its first section (“Injection Model”).

I’ll just say there is a reason programmers tend to prefer `try` / `catch` for error handling to passing error codes through every function. It’s the same reason why we prefer ES Modules with `import` (or CommonJS `require`) to AMD’s “explicit” definitions where `require` is passed to us.

```js
// Anyone miss AMD?
define(['require', 'dependency1', 'dependency2'], function (require) {
  var dependency1 = require('dependency1'),
  var dependency2 = require('dependency2');
  return function () {};
});
```

Yes, AMD may be more “honest” to the fact that modules aren’t actually synchronously loaded in a browser environment. But once you learn about that, writing the `define` sandwich becomes a mindless chore.

`try` / `catch`, `require`, and React Context API are pragmatic examples of how we want to have some “ambient” handler available to us instead of explicitly threading it through every level — even if in general we value explicitness. I think the same is true for Hooks.

This is similar to how, when we define components, we just grab `Component` from `React`. Maybe our code would be more decoupled from React if we exported a factory for every component instead:

```js
function createModal(React) {
  return class Modal extends React.Component {
    // ...
  };
}
```

But in practice this ends up being just an annoying indirection. When we actually want to stub React with something else, we can always do that at the module system level instead.

The same applies to Hooks. Still, as [Sebastian’s answer](https://github.com/reactjs/rfcs/pull/68#issuecomment-439314884) mentions, it is *technically possible* to “redirect” Hooks exported from `react` to a different implementation. ([One of my previous posts](/how-does-setstate-know-what-to-do/) mentions how.)

Another way to impose more ceremony is by making Hooks [monadic](https://paulgray.net/an-alternative-design-for-hooks/) or adding a first-class concept like `React.createHook()`. Aside from the runtime overhead, any solution that adds wrappers loses a huge benefit of using plain functions: *they are as easy to debug as it gets*.

Plain functions let you step in and out with a debugger without any library code in the middle, and see exactly how values flow inside your component body. Indirections make this difficult. Solutions similar in spirit to either higher-order components (“decorator” Hooks) or render props (e.g. `adopt` proposal or `yield`ing from generators) suffer from the same problem. Indirections also complicate static typing.

---

As I mentioned earlier, this post doesn’t aim to be exhaustive. There are other interesting problems with different proposals. Some of them are more obscure (e.g. related to concurrency or advanced compilation techniques) and might be a topic for another blog post in the future.

Hooks aren’t perfect either, but it’s the best tradeoff we could find for solving these problems. There are things we [still need to fix](https://github.com/reactjs/rfcs/pull/68#issuecomment-440780509), and there exist things that are more awkward with Hooks than classes. That is also a topic for another blog post.

Whether I covered your favorite alternative proposal or not, I hope this writeup helped shed some light on our thinking process and the criteria we consider when choosing an API. As you can see, a lot of it (such as making sure that copy-pasting, moving code, adding and removing dependencies works as expected) has to do with [optimizing for change](/optimized-for-change/). I hope that React users will appreciate these aspects.
