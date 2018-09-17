---
title: 'React-redux解读'
date: '2017-09-11'
---

写react项目快一年了，最近写项目用到了[redux-saga](https://redux-saga.js.org/)这个框架，大家总是拿，`redux-saga`和[redux-thunk](https://github.com/gaearon/redux-thunk)相提并论，大概都是因为大家先用了`redux-thunk`，然后才用了`redux-saga`的缘由吧，因为我觉得确实`redux-saga`做的比`redux-thunk`做的多，而且用法相差甚远。很多人没有仔细阅读过文档或者用了更上层的框架来使用`redux-saga`，本文意在讲解作者理解的`redux-saga`，引导大家走向我觉得正确的使用路线上。

  首先，阅读[文档](https://redux-saga.js.org/docs/introduction/BeginnerTutorial.html)是必不可少的，这个框架几乎不存在`xxx看这篇就够了的道理`，当然，加入你的`javascript`基本功很扎实的话，也是能够理解的。

  略微的讲解一下`redux-saga`的一些概念（这些概念也不一定很正确，可以暂且理解一下）：
#### effects
  我们把根节点的子任务称之为`effect`，effect往往由一个`redux-saga`的effect函数加上一个promise函数组合而成，`redux-saga`的`effect`函数控制具体开启任务的方式，而promise中承载着具体的任务的具体实现。

介绍一些redux-saga的effect

- `take` 当前的generator会停止，等待一个满足take能够匹配上的action的时候才会进行下去
- `put` 将数据output到store，相当于redux的store.dispatch
- `call` 执行一个promise或者一个saga
- `fork` 同call一样去执行但是不阻碍当前任务队列
- `takeEvery` 当匹配到action的时候，执行一个saga
- `takeLatest` 当匹配到action的时候，取消上个同action的saga并执行一个新的saga

#### sagas
  我们把一系列任务的控制链的集合称之为`saga`，这也是我们任务链的入口，这是一个`generator`函数，我们能够通过`yield`来逐个执行我们的子任务（这些子任务可以是一个`saga`或者`effect`），并通过`while`、`if`语句来控制流程。

`redux-saga`提供了我们这么多控制流程的方法，那么我们就应该利用起来，所谓的利用起来，就是我们对自己应用的设计需要作出相应的改变。如果还是墨守成规的使用老方法强融`redux-saga`这个框架，那便是误了匠心了。

#### 举个栗子吧

假如我们要完成一个登陆登出的逻辑

我们会这么设计我们的任务链

```javascript
  function *loginFlow() {
    while (true) {
      let isLogin = yield call(checkLogin);
      if (!isLogin) {
        while (!isLogin) {
          const { type } = yield take(['LOGINFLOW_CHANGE_USERNAME', 'LOGINFLOW_CHANGE_PASSWORD, LOGINFLOW_LOGIN']);
          if (type == "LOGINFLOW_CHANGE_USERNAME" || type == "LOGINFLOW_CHANGE_PASSWORD") {
            yield put({ type: LOGINFLOW_LOGIN_UPDATE_FORM, key: type })
          } else {
            isLogin = yield call(login)
          }
        }
      }
      yield take(['LOGINFLOW_LOGOUT']);
      yield call(logout())
    }
  }
```

我们利用这个名为`loginFlow`的saga描述了一个关于登录登出的流程，我们可以在应用刚开始的时候就启动这个saga，首先我们用`while(true)`来描述一个登入登出的循环，进入流程后我们首先判断是否已经登录，如果已经登陆了，我们需要等待一个登出的action，如果没有登录，我们无限等待输入账号密码或者登录的指令，在登录之后我们改变登录的状态，并跳出循环，等待登出的指令。

可能这个任务链还会存在很多bug，但是我觉得我们应该做的事情通过这个栗子已经很明显了，我们在使用`redux-saga`的时候我们应该去定义一个主要的控制链，因为我觉得`redux-saga`最精华的部分就是帮助我们去控制任务，去定义什么时候应该或者能够监听怎样的任务才是`redux-saga`这个框架最具有特色的地方，不然的话，真的还是用回`redux-thunk`吧，`redux-thunk`也是一个非常优秀的开源项目，易懂且好用。

#### 项目结构

针对saga我们可以新建一个saga的目录，然后再针对应用中的流程，我们新建一个`flows`的目录来存放所有的流程saga，一个effects的目录来存放子任务的effects和sagas，模块可以先按照业务分类，在业务分类的基础上抽出一些通用的模块。