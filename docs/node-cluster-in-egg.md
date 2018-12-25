---
title: "egg的集群管理"
date: '2018-12-25'
tag: node,egg
---

> 在之前的文章[深入egg-core前篇](/posts/pre-deep-into-egg-core)中已经讲述了一个道理，node之所以没有成为一个比较流行的服务器语言，是因为node需要一个企业级的框架。而egg或许是一个不错的选择，针对egg-core的内部实现，将会在这篇文章中作出探索。

初学node来编写server一般都是简单的启动一个挂起的的node进程:

```javascript
// server.js
const server = require('http').createServer(function(req, res) {
  res.write('ok');
  res.end();
});
server.listen(3000);
```

启动这个server.js后，会启动一个挂起的node的进程，然后我们访问[页面](http://localhost:3000)的时候就会收到返回值了。

这是比较基本的启动一个node服务的方式，但是这种方式太基础，没有考虑到生产环境的需求。一个服务被部署到生产环境会衍生出一些额外的需求：

- **可扩展性** 生产环境中，用户的访问量不是像我们启动一个服务器来测试这样小的规模，有的时候会有较大的并发量，我们通常会采用集群的方式来解决这个问题，即发布启动若干个服务，然后让请求负载到这些服务上，就可以将较大的访问量拆解到比较合适的访问量，所以服务的可扩展性是很重要的。node是单进程处理请求的，所以有的时候我们可能会让一个端口的监听事件发布到若干个node进程中，也会起到负载均衡的作用。

- **健壮性** 在egg的[文档](https://eggjs.org/zh-cn/core/cluster-and-ipc.html#%E8%BF%9B%E7%A8%8B%E5%AE%88%E6%8A%A4)中也是有提到的，node在遇到未捕获异常的时候会退出，如果没有一个兜底的处理的话，最后应用会挂掉，这在生产环境中是不可容忍的，针对这点Node提供了`process.on('uncaughtException', handler)`来处理这个异常。

egg在这方面有相关的处理，这些处理大部分都被放在[egg-cluster](https://github.com/eggjs/egg-cluster)中，在官方文档中，有明确的图阐述了内部的egg-cluster的处理逻辑:

```
                +--------+          +-------+
                | Master |<-------->| Agent |
                +--------+          +-------+
                ^   ^    ^
               /    |     \
             /      |       \
           /        |         \
         v          v          v
+----------+   +----------+   +----------+
| Worker 1 |   | Worker 2 |   | Worker 3 |
+----------+   +----------+   +----------+
```

假如我们启动了一个生产环境的egg服务，我们通常会执行:

```bash
egg-scripts start --daemon --title=xxxxx
```

这里的egg-scripts的命令行工具，我们可以一窥

在其项目中的`start.js`的脚本中，组装了一些命令行参数，最后会执行`start-cluster`这个node脚本:

```javascript
const options = JSON.parse(process.argv[2]);
require(options.framework).startCluster(options);
```

这里的framework是什么，默认是egg提供的framework，你也可以像[文档](https://eggjs.org/zh-cn/advanced/framework.html)中说的一样，自己定义一个framework，在配置文件中指明使用自己的framework，在framework中，需要被导出一个`startCluster`的函数，这个函数就是这里被调用的函数。在官方默认的egg的framework中，只是直接引用了`egg-cluster`的输出:

```javascript
exports.startCluster = require('egg-cluster').startCluster;
```

关注一下`egg-cluster`中的实现，可以发现，startCluster的第一步，就是创建一个Master:

```javascript
exports.startCluster = function(options, callback) {
  new Master(options).ready(callback);
};
```

在官方文档中有这样的描述:

- **startCluster 启动传入 baseDir 和 framework，Master 进程启动**
- **Master 先 fork Agent Worker**
  - 根据 framework 找到框架目录，实例化该框架的 Agent 类
  - Agent 找到定义的 AgentWorkerLoader，开始进行加载
  - AgentWorkerLoader，开始进行加载 整个加载过程是同步的，按 plugin > config > extend > agent.js > 其他文件顺序加载
  - agent.js 可自定义初始化，支持异步启动，如果定义了 beforeStart 会等待执行完成之后通知 Master 启动完成。
- **Master 得到 Agent Worker 启动成功的消息，使用 cluster fork App Worker**
  - App Worker 有多个进程，所以这几个进程是并行启动的，但执行逻辑是一致的
  - 单个 App Worker 和 Agent 类似，通过 framework 找到框架目录，实例化该框架的 Application 类
  - Application 找到 AppWorkerLoader，开始进行加载，顺序也是类似的，会异步等待，完成后通知 Master 启动完成
- **Master 等待多个 App Worker 的成功消息后启动完成，能对外提供服务。**

在Master的构造函数中，我们会发现，master在创建的时候会检测端口号并启动一个agent服务:

```javascript
detectPort((err, port) => {
  if (err) {
    err.name = 'ClusterPortConflictError';
    err.message = '[master] try get free port error, ' + err.message;
    this.logger.error(err);
    process.exit(1);
  }
  this.options.clusterPort = port;
  this.forkAgentWorker();
});
```

这里的`detectPort`之前也没有很多的用到，简单的查看了一下官方的源代码，大致就是逐个端口去监听，检测到一个空闲的端口并返回，将这个端口号赋值在`options.clusterPort`上，我们可以在`Agent`中获取到这个参数:

```javascript
const args = [ JSON.stringify(this.options) ];
const agentWorker = childprocess.fork(this.getAgentWorkerFile(), args, opt);
```

这里的`getAgentWorkerFile()`返回的就是`egg-cluster`中的`agent_worker.js`文件，所以在Master创建的时候，会fork一个agent_worker的子进程，传入的参数就是master的options，因此检测的`clusterPort`会被使用在`agent`中，虽然再官方的framework中并没有使用这个端口，如果使用自定义的agent的话，可以考虑使用一下。

```javascript
// agent_worker.js
const Agent = require(options.framework).Agent;
debug('new Agent with options %j', options);
const agent = new Agent(options);
agent.ready(err => {
  if (err) return;
  agent.removeListener('error', startErrorHandler);
  process.send({ action: 'agent-start', to: 'master' });
});
```

在agent_worker中，直接创建了Agent的对象，这个Agent是从我们指定的Framework中获取的，在agent成功ready之后会向master发送一个`agent-start`的消息。

发送了这个消息之后，究竟会发生什么情况？上述的官方的描述中提到
  
  >Master 得到 Agent Worker 启动成功的消息，使用 cluster fork App Worker

那么，源码中的事实如何？我们可以搜索一下`agent-start`的关键词。

```javascript
this.on('agent-start', this.onAgentStart.bind(this));
// ......
this.once('agent-start', this.forkAppWorkers.bind(this));
```

前者大部分时间的情况下就是打印一下agent启动后的信息，后者顾明思议，启动了若干个workers。

查看了一下`forkAppWorkers`的源码，这可和`forkAgentWorker`这个做法不同，在`forkAgentWorker`中是使用`childprocess.fork`的方式来启动一个子进程的，而`forkAppWorkers`中用了很多的`cluster`库。Node官方是这么说明的：

> A single instance of Node.js runs in a single thread. To take advantage of multi-core systems, the user will sometimes want to launch a cluster of Node.js processes to handle the load.
> 每个node都是单进程运行的。为了充分利用多核系统，开发者期望组建一个node.js进程的集群来处理。

在egg的文档中也举出了这么个例子:

```javascript
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', function(worker, code, signal) {
    console.log('worker ' + worker.process.pid + ' died');
  });
} else {
  http.createServer(function(req, res) {
    res.writeHead(200);
    res.end("hello world\n");
  }).listen(8000);
}
```

这段代码fork了若干个进程，这些进程都会用于处理监听8000的端口号，在同一个端口号下作了负载，而使用`childProcess.fork`的话，监听相同端口号会失败，因此这就是cluster的用处。
