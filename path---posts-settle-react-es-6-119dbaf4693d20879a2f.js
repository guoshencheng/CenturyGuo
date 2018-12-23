webpackJsonp([54342248932196],{390:function(n,s){n.exports={data:{markdownRemark:{html:'<p>转载自<a href="https://blog.hellojs.org/setting-up-your-react-es6-development-environment-with-webpack-express-and-babel-e2a53994ade#.8miz3jdjt">Setting up your React /ES6 Development environment with Webpack, Express and Babel</a></p>\n<p><em>在2016年，你需要尝试学习一下react, 而首先，你需要将React和React DOM这两个库加入到你的页面中</em></p>\n<p><em>加入你已经在页面中加入了这两个库，接下来我该怎么使用React呢？</em></p>\n<p><em>多说几句，你得在你的项目中加入Babel你才可以使用React</em></p>\n<p><em>“<a href="https://hackernoon.com/how-it-feels-to-learn-javascript-in-2016-d3a717dd577f#.aj48uvt4w">当下学习javascript是什么感受</a>”</em></p>\n<p>在我第一次接触<a href="https://facebook.github.io/react/">React</a>的时候，我做了一个<a href="http://how-far-hr.herokuapp.com">小玩意</a>来练习在页面上创建并渲染组件。虽然我非常喜欢react动态的页面和Redux的单状态项目，可我使用了太多的时间来配置配置文件以及安装开发依赖，浪费了大量的编码时间</p>\n<p>React项目初始化搭建非常痛苦是因为React不是一个面向一整个项目的库。根据Facebook的文档，<code class="language-text">it’s a view library for building user interfaces</code>这是一个用于建设用户界面的库，可随着React环境的慢慢成熟，当使用React开发的时候大量的开发者会普遍使用一些类似于Webpack或者Babel的工具来处理这个问题，可是这些工具经常变更，所以，每当你第一次初始化React开发环境的时候，会令人非常烦恼</p>\n<p>为了帮你解决这个困扰，我已经把把自己的项目初始化放到了这个<a href="https://gist.github.com/dengjonathan/79eb3d5fc55b5b6dd2fbc434dce352da">gist</a>上，其中包含了，我的webpack在开发环境和生产环境的配置和express服务器的代码。我会向你演示如何热更新模块，这个功能可以在你的浏览器在你修改代码后自动更新界面，不需要自己手动刷新这个界面，这一整个项目也在Github上面可以找到</p>\n<p>你可以直接使用我的配置然后开始使用React，可是我还是想唠叨一遍这些文件都在做一些什么事情，这样的话当出现了一些bug后，你不会在要解决一些问题的时候手足无措。当我刚开始搭建一个React项目的时候，有大量的关于使用es5语法和一些废弃的模块搭建的Webpack/React项目的教程。如果你是一个非常酷的选手，正在使用ES6编写React的话，我希望这篇文章能够帮到你</p>\n<p><em>/ 注意：在我写了这篇博客之后，我开发了一个<a href="1">Create-React-App</a>的项目，这个项目是一个我自己做的用以快速创建一个React的Helloworld项目的工具，它分装了webpack和Babel复杂的使用。\n但是配置Webpack和Babel是你开发React必须要掌握的技能，这个教程会很好的帮助你理解他们 /</em></p>\n<p>1、开始一个React项目需要准备些什么</p>\n<p>技术上，你只需要两个库：React和React-DOM（这两个库让你能够把React组件渲染到浏览器上）</p>\n<p>但是如果你要马上使用React，你必须要学会如何编写JSX</p>\n<p>什么是JSX？JSX是一个让你用HTML写法写组建的Javascript语法,使用了JSX，你的React代码就会变得非常美观，让其他的开发者能清楚的之后你的代码想要实现什么，比如这就是JSX：</p>\n<div class="gatsby-highlight" data-language="javascript">\n      <pre class="language-javascript"><code class="language-javascript">const Component = () =&gt; (&lt;div&gt;&lt;h1&gt;I am a component&gt;&lt;/h1&gt;&lt;/div&gt;);</code></pre>\n      </div>\n<p>可惜的是，现在的浏览器的Javascript解释器并不能理解JSX，他遇到JSX会抛出异常，所以你需要自己转换成通用JS语法：</p>\n<div class="gatsby-highlight" data-language="javascript">\n      <pre class="language-javascript"><code class="language-javascript">var Component = function Component() {\n  return React.createElement(\n    &quot;div&quot;,\n    null,\n    React.createElement(\n      &quot;h1&quot;,\n      null,\n      &quot;I am a component&gt;&quot;\n    )\n  );\n};</code></pre>\n      </div>\n<p>更多</p>\n<p>没有人愿意像这样写代码，这么写会显得代码非常冗余，而且这有点让人弄不懂这个代码到底在做些什么，可是浏览器只能解释通用版本的JS代码，所以我们在开发时候应该怎么办</p>\n<p>进入Babel。Babel是一个Javascript的编译器，无论你使用什么你喜欢的（JSX还是ES6）语法，他都会帮你转换成浏览器可以理解的语言</p>\n<p>我使用JSX和ES6来编写javascript并使用Babel来将他们转换成使用ES5规范的另一个文件中，这样浏览器就能够理解这些代码了</p>\n<p>好，那么现在我们有React，React-DOM还有Babel，我们还需要什么呢</p>\n<p>当我们编写React的时候，我们需要在把大量不同的组件写到不同的文件中，这些文件都会导入各自的依赖。如果我们将这些文件都通过sprite标签各自导入的话，会消耗大量时间。\n<img src="https://cdn-images-2.medium.com/max/800/1*XczR_8TRdpo1Sjj4CF1PNA.png">\n这就是我们为什么使用Webpack的原因，这是一个可以将我们需要的所有文件和库依赖整合成一个文件能够直接加入到页面中的打包工具\nWebpack还有一个非常方便的插件叫做webpack-dev-server，这个插件通过一个轻量级的Express服务器使得你可以很方便的看到你修改的地方在浏览器上的改变，很吊！\n所以在我们开始编写代码之前，我们需要：\n1、React\n2、React-DOM\n3、Babel\n4、Webpack</p>\n<p>安装依赖</p>\n<p>那么，我们要怎么准备这些东西呢</p>\n<p><img src="https://cdn-images-2.medium.com/max/800/1*PCoGIsHgytJ_uxR7q65nIg.jpeg">\n当然是npm install了\n在你的项目的根目录，运行下面的命令来安装React和React-DOM</p>\n<div class="gatsby-highlight" data-language="bash">\n      <pre class="language-bash"><code class="language-bash"><span class="token function">npm</span> <span class="token function">install</span> --save react\n<span class="token function">npm</span> <span class="token function">install</span> --save react-dom</code></pre>\n      </div>\n<p>运行下面的命令来安装开发依赖，这些依赖对你最后的应用是没有用的，但是在你的开发编译过程中有用</p>\n<div class="gatsby-highlight" data-language="bash">\n      <pre class="language-bash"><code class="language-bash"><span class="token function">npm</span> <span class="token function">install</span> --save-dev babel-core\n<span class="token function">npm</span> <span class="token function">install</span> --save-dev babel-cli\n<span class="token function">npm</span> <span class="token function">install</span> --save-dev babel-loader\n<span class="token function">npm</span> <span class="token function">install</span> --save-dev babel-preset-es2015\n<span class="token function">npm</span> <span class="token function">install</span> --save-dev babel-preset-react\n<span class="token function">npm</span> <span class="token function">install</span> --save-dev react-hot-loader\n<span class="token function">npm</span> <span class="token function">install</span> --save-dev webpack\n<span class="token function">npm</span> <span class="token function">install</span> --save-dev webpack-dev-middleware\n<span class="token function">npm</span> <span class="token function">install</span> --save-dev webpack-hot-middleware</code></pre>\n      </div>\n<p>我们使用的Babel被分为核心库（babel-core），命令行工具（babel-cli）和一个能够让babel和webpack协调使用的插件babel-loader。除此之外，我们还安装了babel-preset-react和babel-preset-es2015插件，这两个插件涵盖了把ES6和React代码编译成通用javascript的规则</p>\n<p>我现在不想深入react-hot-loader和webpack middleware模块，但我们会在将来的热更新模块章节中提及到他</p>\n<p>当你完成这些操作后，你的package.json应该像这样：</p>\n<div class="gatsby-highlight" data-language="json">\n      <pre class="language-json"><code class="language-json"><span class="token punctuation">{</span>\n  <span class="token property">"name"</span><span class="token operator">:</span> <span class="token string">"how_far_hr"</span><span class="token punctuation">,</span>\n  <span class="token property">"version"</span><span class="token operator">:</span> <span class="token string">"1.1.0"</span><span class="token punctuation">,</span>\n  <span class="token property">"engines"</span><span class="token operator">:</span> <span class="token punctuation">{</span>\n    <span class="token property">"node"</span><span class="token operator">:</span> <span class="token string">"5.12.0"</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n  <span class="token property">"description"</span><span class="token operator">:</span> <span class="token string">"A small toy app showing HR progress with React and ES6"</span><span class="token punctuation">,</span>\n  <span class="token property">"author"</span><span class="token operator">:</span> <span class="token string">"Jon Deng &lt;jondeng.com>"</span><span class="token punctuation">,</span>\n  <span class="token property">"license"</span><span class="token operator">:</span> <span class="token string">"MIT"</span><span class="token punctuation">,</span>\n  <span class="token property">"private"</span><span class="token operator">:</span> <span class="token boolean">false</span><span class="token punctuation">,</span>\n  <span class="token property">"scripts"</span><span class="token operator">:</span> <span class="token punctuation">{</span>\n    <span class="token property">"start"</span><span class="token operator">:</span> <span class="token string">"npm build &amp;&amp; node dist/app.js"</span><span class="token punctuation">,</span>\n    <span class="token property">"dev-start"</span><span class="token operator">:</span> <span class="token string">"node dist/app.js"</span><span class="token punctuation">,</span>\n    <span class="token property">"build"</span><span class="token operator">:</span> <span class="token string">"webpack --config ./webpack.deployment.config.js --progress --colors"</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n  <span class="token property">"dependencies"</span><span class="token operator">:</span> <span class="token punctuation">{</span>\n    <span class="token property">"bootstrap"</span><span class="token operator">:</span> <span class="token string">"^4.0.0-alpha.2"</span><span class="token punctuation">,</span>\n    <span class="token property">"express"</span><span class="token operator">:</span> <span class="token string">"^4.14.0"</span><span class="token punctuation">,</span>\n    <span class="token property">"react"</span><span class="token operator">:</span> <span class="token string">"^15.3.2"</span><span class="token punctuation">,</span>\n    <span class="token property">"react-dom"</span><span class="token operator">:</span> <span class="token string">"^15.3.2"</span><span class="token punctuation">,</span>\n    <span class="token property">"redux"</span><span class="token operator">:</span> <span class="token string">"^3.6.0"</span><span class="token punctuation">,</span>\n    <span class="token property">"underscore"</span><span class="token operator">:</span> <span class="token string">"^1.8.3"</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n  <span class="token property">"devDependencies"</span><span class="token operator">:</span> <span class="token punctuation">{</span>\n    <span class="token property">"babel-cli"</span><span class="token operator">:</span> <span class="token string">"^6.6.5"</span><span class="token punctuation">,</span>\n    <span class="token property">"babel-core"</span><span class="token operator">:</span> <span class="token string">"^6.17.0"</span><span class="token punctuation">,</span>\n    <span class="token property">"babel-loader"</span><span class="token operator">:</span> <span class="token string">"^6.2.5"</span><span class="token punctuation">,</span>\n    <span class="token property">"babel-preset-es2015"</span><span class="token operator">:</span> <span class="token string">"^6.16.0"</span><span class="token punctuation">,</span>\n    <span class="token property">"babel-preset-react"</span><span class="token operator">:</span> <span class="token string">"^6.16.0"</span><span class="token punctuation">,</span>\n    <span class="token property">"react-hot-loader"</span><span class="token operator">:</span> <span class="token string">"^3.0.0-beta.5"</span><span class="token punctuation">,</span>\n    <span class="token property">"webpack"</span><span class="token operator">:</span> <span class="token string">"^1.13.2"</span><span class="token punctuation">,</span>\n    <span class="token property">"webpack-dev-middleware"</span><span class="token operator">:</span> <span class="token string">"^1.8.3"</span><span class="token punctuation">,</span>\n    <span class="token property">"webpack-hot-middleware"</span><span class="token operator">:</span> <span class="token string">"^2.12.2"</span>\n  <span class="token punctuation">}</span>\n<span class="token punctuation">}</span></code></pre>\n      </div>\n<p>如果已经做好了的话，这是我的项目目录，我把我所有的源文件都放在了app下的目录，当这些文件被编译打包的时候，webpack会把这些文件都输出到dist下，在根目录下含有一个package.json文件和生产环境还有开发环境的webpack配置文件</p>\n<p><img src="https://cdn-images-2.medium.com/max/800/1*9LQp_r-ubJC5QMMrBmSndA.png"></p>\n<p>3、为开发环境配置Webpack</p>\n<p>为了使得webpack在开发环境上运作，我们需要对React进行配置，这可以在我们每次保存我的时候转义并打包并可以利用<code class="language-text">webpack-dev-server</code>直接在浏览器上显示修改。\n以下是我的开发环境的webpack.config.js文件</p>\n<div class="gatsby-highlight" data-language="javascript">\n      <pre class="language-javascript"><code class="language-javascript"><span class="token keyword">var</span> path <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'path\'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n<span class="token keyword">var</span> webpack <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'webpack\'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n\nmodule<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">{</span>\n  entry<span class="token punctuation">:</span> <span class="token string">\'./app/index.js\'</span><span class="token punctuation">,</span>\n  output<span class="token punctuation">:</span> <span class="token punctuation">{</span>\n    path<span class="token punctuation">:</span> __dirname<span class="token punctuation">,</span>\n    filename<span class="token punctuation">:</span> <span class="token string">\'bundle.js\'</span><span class="token punctuation">,</span>\n    publicPath<span class="token punctuation">:</span> <span class="token string">\'/app/assets/\'</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n  module<span class="token punctuation">:</span> <span class="token punctuation">{</span>\n    loaders<span class="token punctuation">:</span> <span class="token punctuation">[</span>\n      <span class="token punctuation">{</span>\n        test<span class="token punctuation">:</span> <span class="token regex">/.jsx?$/</span><span class="token punctuation">,</span>\n        loader<span class="token punctuation">:</span> <span class="token string">\'babel-loader\'</span><span class="token punctuation">,</span>\n        include<span class="token punctuation">:</span> path<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span>__dirname<span class="token punctuation">,</span> <span class="token string">\'app\'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>\n        exclude<span class="token punctuation">:</span> <span class="token regex">/node_modules/</span><span class="token punctuation">,</span>\n        query<span class="token punctuation">:</span> <span class="token punctuation">{</span>\n          presets<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token string">\'es2015\'</span><span class="token punctuation">,</span> <span class="token string">\'react\'</span><span class="token punctuation">]</span>\n        <span class="token punctuation">}</span>\n      <span class="token punctuation">}</span>\n    <span class="token punctuation">]</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n<span class="token punctuation">}</span><span class="token punctuation">;</span></code></pre>\n      </div>\n<p>第一行和第二行，我使用了require语法导入了path和webpack模块</p>\n<p>在第五行，我指明了这次打包的文件的入口，最简单的找到入口文件的方法就是去找那些调用React-DOM来渲染你的React组建到页面DOM的文件</p>\n<p>在第6行到第9行，我申明了我会把我所有的脚本文件打包到一个叫做<code class="language-text">bundle.js</code>的文件，并申明了公开文件目录为<code class="language-text">/app/assets</code></p>\n<p>最后，我在12~22行，我在每次webpack打包文件的时候都让webpack运行babel-loader。babel-loader会将用ES6和JSX编写的文件转移成浏览器可以识别的通用javascript文件，在第14行到16行，我申明了一个正则表达式来让webpack转义那些在<code class="language-text">app/</code>目录下后缀名为<code class="language-text">.jsx</code>的文件并屏蔽了<code class="language-text">node_modules</code>下的文件，在第16行，我设置了Babel使用RS6和React的规则去转义文件</p>\n<p>现在，你想要启动你的应用并动态编辑的话，你只要在命令行执行以下的操作：</p>\n<div class="gatsby-highlight" data-language="bash">\n      <pre class="language-bash"><code class="language-bash">webpack-dev-server --progress --colors</code></pre>\n      </div>\n<p>我喜欢使用progress和colors命令来让命令行的输出可读性更高</p>\n<p>也不是很难嘛，对不对~</p>\n<p>4、为生产环境配置Webpack</p>\n<div class="gatsby-highlight" data-language="javascript">\n      <pre class="language-javascript"><code class="language-javascript"><span class="token keyword">const</span> path <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'path\'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n<span class="token keyword">const</span> webpack <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'webpack\'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n\nmodule<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">{</span>\n  devtool<span class="token punctuation">:</span> <span class="token string">\'source-map\'</span><span class="token punctuation">,</span>\n\n  entry<span class="token punctuation">:</span> <span class="token punctuation">[</span>\n    <span class="token string">\'./app/index.js\'</span>\n  <span class="token punctuation">]</span><span class="token punctuation">,</span>\n  output<span class="token punctuation">:</span> <span class="token punctuation">{</span>\n    path<span class="token punctuation">:</span> path<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span>__dirname<span class="token punctuation">,</span> <span class="token string">\'dist\'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>\n    filename<span class="token punctuation">:</span> <span class="token string">\'bundle.js\'</span><span class="token punctuation">,</span>\n    publicPath<span class="token punctuation">:</span> <span class="token string">\'/dist/\'</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n  plugins<span class="token punctuation">:</span> <span class="token punctuation">[</span>\n    <span class="token keyword">new</span> <span class="token class-name">webpack<span class="token punctuation">.</span>optimize<span class="token punctuation">.</span>UglifyJsPlugin</span><span class="token punctuation">(</span><span class="token punctuation">{</span>\n      minimize<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>\n      compress<span class="token punctuation">:</span> <span class="token punctuation">{</span>\n        warnings<span class="token punctuation">:</span> <span class="token boolean">false</span>\n      <span class="token punctuation">}</span>\n    <span class="token punctuation">}</span><span class="token punctuation">)</span>\n  <span class="token punctuation">]</span><span class="token punctuation">,</span>\n  module<span class="token punctuation">:</span> <span class="token punctuation">{</span>\n    loaders<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token punctuation">{</span>\n      test<span class="token punctuation">:</span> <span class="token regex">/.jsx?$/</span><span class="token punctuation">,</span>\n      loader<span class="token punctuation">:</span> <span class="token string">\'babel-loader\'</span><span class="token punctuation">,</span>\n      include<span class="token punctuation">:</span> path<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span>__dirname<span class="token punctuation">,</span> <span class="token string">\'app\'</span><span class="token punctuation">)</span><span class="token punctuation">,</span>\n      exclude<span class="token punctuation">:</span> <span class="token regex">/node_modules/</span><span class="token punctuation">,</span>\n      query<span class="token punctuation">:</span> <span class="token punctuation">{</span>\n        presets<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token string">\'es2015\'</span><span class="token punctuation">,</span> <span class="token string">\'react\'</span><span class="token punctuation">]</span>\n      <span class="token punctuation">}</span>\n    <span class="token punctuation">}</span><span class="token punctuation">]</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n<span class="token punctuation">}</span><span class="token punctuation">;</span></code></pre>\n      </div>\n<p>你会发现生产环境的webpack配置回合开发环境的非常像</p>\n<p>主要的区别在于我们添加了一个叫做<code class="language-text">UglifyJSPlugin</code>的插件，这个插件可以混淆你的代码</p>\n<p>你也可以根据你自己的需要添加更多的webpack插件</p>\n<p>5、创建一个Express服务器</p>\n<p>当然，webpack-dev-server在开发的时候非常方便，但是你最好别把它用在开发环境上，如果你使用Express服务器的话你可以使用更多你想要的功能，如果你想要热更新功能，我们会在下个章节中提及</p>\n<p>在下面的文件中，我编写了一个工厂方法来新建一个express服务器对象，我们会把这个方法在应用入口文件中导入并创建一个express服务器</p>\n<div class="gatsby-highlight" data-language="javascript">\n      <pre class="language-javascript"><code class="language-javascript"><span class="token keyword">const</span> path <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'path\'</span><span class="token punctuation">)</span>\n<span class="token keyword">const</span> express <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'express\'</span><span class="token punctuation">)</span>\n\nmodule<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">{</span>\n  app<span class="token punctuation">:</span> <span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    <span class="token keyword">const</span> app <span class="token operator">=</span> <span class="token function">express</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n    <span class="token keyword">const</span> indexPath <span class="token operator">=</span> path<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span>__dirname<span class="token punctuation">,</span> <span class="token string">\'indexDep.html\'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n    <span class="token keyword">const</span> publicPath <span class="token operator">=</span> express<span class="token punctuation">.</span><span class="token keyword">static</span><span class="token punctuation">(</span>path<span class="token punctuation">.</span><span class="token function">join</span><span class="token punctuation">(</span>__dirname<span class="token punctuation">,</span> <span class="token string">\'../dist\'</span><span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n\n    app<span class="token punctuation">.</span><span class="token function">use</span><span class="token punctuation">(</span><span class="token string">\'/dist\'</span><span class="token punctuation">,</span> publicPath<span class="token punctuation">)</span><span class="token punctuation">;</span>\n    app<span class="token punctuation">.</span><span class="token keyword">get</span><span class="token punctuation">(</span><span class="token string">\'/\'</span><span class="token punctuation">,</span> <span class="token keyword">function</span> <span class="token punctuation">(</span>_<span class="token punctuation">,</span> res<span class="token punctuation">)</span> <span class="token punctuation">{</span> res<span class="token punctuation">.</span><span class="token function">sendFile</span><span class="token punctuation">(</span>indexPath<span class="token punctuation">)</span> <span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n\n    <span class="token keyword">return</span> app<span class="token punctuation">;</span>\n  <span class="token punctuation">}</span>\n<span class="token punctuation">}</span></code></pre>\n      </div>\n<p>在第10行，我为express对象指出<code class="language-text">/dist</code>目录来满足静态文件比如css，图片，javascript文件的直接获取的需求。因为我们webpack配置文件中，我们的打包的文件会导出到<code class="language-text">/dist</code>目录下</p>\n<p>在第11行，我告诉express当访问根目录的时候返回indexDep.html页面，这个文件中含有一个脚本标签来导入我们在dist下打包后的文件，使得React可以渲染到页面DOM上</p>\n<p>在下一个章节，我们会使用这个工厂方法，来创建一个express服务器对象</p>\n<p>6、添加动态模块动态模块更新</p>\n<p>开发React最炫酷的事情就是有很多开发功能上的优点，比如<a href="https://medium.com/@rajaraodv/webpack-hot-module-replacement-hmr-e756a726a07#.knlra5lut">动态模块更新</a>，这个功能可以让我们当组件代码被修改的时候让这些组件自动在页面更新，而不是重新渲染一边这个页面。使用动态模块更新，你会有一个非常好的动态响应编辑的体验。因为在你编辑这个组件的时候他们会持续重新渲染，所以你会马上看到自己的修改</p>\n<p>我发现使用动态模块更新最简单的方法就是在express服务器上面使用一个webpack中间件</p>\n<p>在继续下去之前，我想要花一点时间来了解一下<a href="http://expressjs.com/en/guide/using-middleware.html">中间件</a>，在express中，中间件是像管道一样的方法，接收数据流，输出处理过的数据流</p>\n<p>因为响应数据是数据流，我们可以在这些数据流入客户端之前利用这些中间件方法来修改这些数据</p>\n<p>所以我们使用<a href="https://github.com/webpack/webpack-dev-middleware">webpack-dev-middleware</a>来将react代码转义成浏览器可读的通用js，并将这些文件打包到一个可以被客户端读取的js文件中</p>\n<p>另外我们还将使用<a href="https://github.com/glenjamin/webpack-hot-middleware">webpack-hot-middleware</a>，这个中间件可以检测到文件的修改并通知客户端重新渲染组件</p>\n<p>根据下面的文档，可以看出webpack-hot-middleware是怎么工作的</p>\n<p><em>The middleware installs itself as a webpack plugin, and listens for compiler events.</em></p>\n<p>每个连接的客户端会建立一个服务器可推送的连接，服务器可以给连接的客户端推送重新编译事件的消息</p>\n<p>当客户端获取到这个消息的时候，他会检查代码是否更新了，如果本地的代码不是最新，就会触发重新读取代码的事件</p>\n<p>下面是<code class="language-text">app.js</code>文件，这个文件被用做我们服务器的入口。\n这个入口是服务器启动所调用的第一个文件，也是连接所有应用文件的一个文件，这个入口文件在node应用中经常被叫做app.js或者index.js，为了更好地理解，这个<a href="http://stackoverflow.com/questions/21063587/what-is-index-js-typically-used-for-in-node-js-projects">解答</a>会更有帮助</p>\n<p>常规的，我们的入口文件会创建一个新的express服务器对象来服务器我们的webpack，并监听一个指定的端口，这个服务器会提供一个index.html文件，这个html文件会通过一个脚本标签引入react组件，另外我们的入口文件会在开发环境的时候使用中间件来允许我们使用动态模块更新</p>\n<div class="gatsby-highlight" data-language="javascript">\n      <pre class="language-javascript"><code class="language-javascript"><span class="token keyword">const</span> Server <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'./server.js\'</span><span class="token punctuation">)</span>\n<span class="token keyword">const</span> port <span class="token operator">=</span> <span class="token punctuation">(</span>process<span class="token punctuation">.</span>env<span class="token punctuation">.</span><span class="token constant">PORT</span> <span class="token operator">||</span> <span class="token number">8080</span><span class="token punctuation">)</span>\n<span class="token keyword">const</span> app <span class="token operator">=</span> Server<span class="token punctuation">.</span><span class="token function">app</span><span class="token punctuation">(</span><span class="token punctuation">)</span>\n\n<span class="token keyword">if</span> <span class="token punctuation">(</span>process<span class="token punctuation">.</span>env<span class="token punctuation">.</span><span class="token constant">NODE_ENV</span> <span class="token operator">!==</span> <span class="token string">\'production\'</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n  <span class="token keyword">const</span> webpack <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'webpack\'</span><span class="token punctuation">)</span>\n  <span class="token keyword">const</span> webpackDevMiddleware <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'webpack-dev-middleware\'</span><span class="token punctuation">)</span>\n  <span class="token keyword">const</span> webpackHotMiddleware <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'webpack-hot-middleware\'</span><span class="token punctuation">)</span>\n  <span class="token keyword">const</span> config <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'../webpack.deployment.config.js\'</span><span class="token punctuation">)</span>\n  <span class="token keyword">const</span> compiler <span class="token operator">=</span> <span class="token function">webpack</span><span class="token punctuation">(</span>config<span class="token punctuation">)</span>\n\n  app<span class="token punctuation">.</span><span class="token function">use</span><span class="token punctuation">(</span><span class="token function">webpackHotMiddleware</span><span class="token punctuation">(</span>compiler<span class="token punctuation">)</span><span class="token punctuation">)</span>\n  app<span class="token punctuation">.</span><span class="token function">use</span><span class="token punctuation">(</span><span class="token function">webpackDevMiddleware</span><span class="token punctuation">(</span>compiler<span class="token punctuation">,</span> <span class="token punctuation">{</span>\n    noInfo<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>\n    publicPath<span class="token punctuation">:</span> config<span class="token punctuation">.</span>output<span class="token punctuation">.</span>publicPathdist\n  <span class="token punctuation">}</span><span class="token punctuation">)</span><span class="token punctuation">)</span>\n<span class="token punctuation">}</span>\n\napp<span class="token punctuation">.</span><span class="token function">listen</span><span class="token punctuation">(</span>port<span class="token punctuation">)</span>\nconsole<span class="token punctuation">.</span><span class="token function">log</span><span class="token punctuation">(</span><span class="token template-string"><span class="token string">`Listening at http://localhost:</span><span class="token interpolation"><span class="token interpolation-punctuation punctuation">${</span>port<span class="token interpolation-punctuation punctuation">}</span></span><span class="token string">`</span></span><span class="token punctuation">)</span></code></pre>\n      </div>\n<p>第一行，我们导入了工厂方法并创建了express服务器对象</p>\n<p>第五行，我检查是否是在开发环境</p>\n<p>第12~16行，我们在express服务器中添加了webpack中间件</p>\n<p>现在我们有了一个开发服务器，我们现在只需要在命令行打入下面命令就能本地启动应用了</p>\n<div class="gatsby-highlight" data-language="bash">\n      <pre class="language-bash"><code class="language-bash">node dist/app.js</code></pre>\n      </div>\n<p>与其每次都打着重复的命令，让我们把我们的运行脚本写入到package.json文件中吧，这可以帮助我们在像heroku这样的服务器上开发，这让我们可以使用start脚本来部署应用</p>\n<div class="gatsby-highlight" data-language="javascript">\n      <pre class="language-javascript"><code class="language-javascript"><span class="token punctuation">{</span>\n  <span class="token string">"name"</span><span class="token punctuation">:</span> <span class="token string">"how_far_hr"</span><span class="token punctuation">,</span>\n  <span class="token string">"version"</span><span class="token punctuation">:</span> <span class="token string">"1.1.0"</span><span class="token punctuation">,</span>\n  <span class="token string">"engines"</span><span class="token punctuation">:</span> <span class="token punctuation">{</span>\n    <span class="token string">"node"</span><span class="token punctuation">:</span> <span class="token string">"5.12.0"</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n  <span class="token string">"description"</span><span class="token punctuation">:</span> <span class="token string">"A small toy app showing HR progress with React and ES6"</span><span class="token punctuation">,</span>\n  <span class="token string">"author"</span><span class="token punctuation">:</span> <span class="token string">"Jon Deng &lt;jondeng.com>"</span><span class="token punctuation">,</span>\n  <span class="token string">"license"</span><span class="token punctuation">:</span> <span class="token string">"MIT"</span><span class="token punctuation">,</span>\n  <span class="token string">"private"</span><span class="token punctuation">:</span> <span class="token boolean">false</span><span class="token punctuation">,</span>\n  <span class="token string">"scripts"</span><span class="token punctuation">:</span> <span class="token punctuation">{</span>\n    <span class="token string">"start"</span><span class="token punctuation">:</span> <span class="token string">"npm build &amp;&amp; node dist/app.js"</span><span class="token punctuation">,</span>\n    <span class="token string">"dev-start"</span><span class="token punctuation">:</span> <span class="token string">"node dist/app.js"</span><span class="token punctuation">,</span>\n    <span class="token string">"build"</span><span class="token punctuation">:</span> <span class="token string">"webpack --config ./webpack.deployment.config.js --progress --colors"</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n  <span class="token string">"dependencies"</span><span class="token punctuation">:</span> <span class="token punctuation">{</span>\n    <span class="token string">"bootstrap"</span><span class="token punctuation">:</span> <span class="token string">"^4.0.0-alpha.2"</span><span class="token punctuation">,</span>\n    <span class="token string">"express"</span><span class="token punctuation">:</span> <span class="token string">"^4.14.0"</span><span class="token punctuation">,</span>\n    <span class="token string">"react"</span><span class="token punctuation">:</span> <span class="token string">"^15.3.2"</span><span class="token punctuation">,</span>\n    <span class="token string">"react-dom"</span><span class="token punctuation">:</span> <span class="token string">"^15.3.2"</span><span class="token punctuation">,</span>\n    <span class="token string">"redux"</span><span class="token punctuation">:</span> <span class="token string">"^3.6.0"</span><span class="token punctuation">,</span>\n    <span class="token string">"underscore"</span><span class="token punctuation">:</span> <span class="token string">"^1.8.3"</span>\n  <span class="token punctuation">}</span><span class="token punctuation">,</span>\n  <span class="token string">"devDependencies"</span><span class="token punctuation">:</span> <span class="token punctuation">{</span>\n    <span class="token string">"babel-cli"</span><span class="token punctuation">:</span> <span class="token string">"^6.6.5"</span><span class="token punctuation">,</span>\n    <span class="token string">"babel-core"</span><span class="token punctuation">:</span> <span class="token string">"^6.17.0"</span><span class="token punctuation">,</span>\n    <span class="token string">"babel-loader"</span><span class="token punctuation">:</span> <span class="token string">"^6.2.5"</span><span class="token punctuation">,</span>\n    <span class="token string">"babel-preset-es2015"</span><span class="token punctuation">:</span> <span class="token string">"^6.16.0"</span><span class="token punctuation">,</span>\n    <span class="token string">"babel-preset-react"</span><span class="token punctuation">:</span> <span class="token string">"^6.16.0"</span><span class="token punctuation">,</span>\n    <span class="token string">"react-hot-loader"</span><span class="token punctuation">:</span> <span class="token string">"^3.0.0-beta.5"</span><span class="token punctuation">,</span>\n    <span class="token string">"webpack"</span><span class="token punctuation">:</span> <span class="token string">"^1.13.2"</span><span class="token punctuation">,</span>\n    <span class="token string">"webpack-dev-middleware"</span><span class="token punctuation">:</span> <span class="token string">"^1.8.3"</span><span class="token punctuation">,</span>\n    <span class="token string">"webpack-hot-middleware"</span><span class="token punctuation">:</span> <span class="token string">"^2.12.2"</span>\n  <span class="token punctuation">}</span>\n<span class="token punctuation">}</span></code></pre>\n      </div>\n<p>后面没啥了，就酱</p>',
frontmatter:{title:"Setting up your React /ES6 Development environment with Webpack, Express and Babel",date:"27 January, 2017",tag:"react,webpack"}}},pathContext:{slug:"settle-react-es6"}}}});
//# sourceMappingURL=path---posts-settle-react-es-6-119dbaf4693d20879a2f.js.map