webpackJsonp([0xd2a57dc1d883],{69:function(e,n){"use strict";function o(e,n,o){var t=r.map(function(o){if(o.plugin[e]){var t=o.plugin[e](n,o.options);return t}});return t=t.filter(function(e){return"undefined"!=typeof e}),t.length>0?t:o?[o]:[]}function t(e,n,o){return r.reduce(function(o,t){return t.plugin[e]?o.then(function(){return t.plugin[e](n,t.options)}):o},Promise.resolve())}n.__esModule=!0,n.apiRunner=o,n.apiRunnerAsync=t;var r=[]},183:function(e,n,o){"use strict";n.components={"component---src-pages-posts-js":o(294),"component---src-templates-post-js":o(295),"component---src-pages-404-js":o(292),"component---src-pages-index-js":o(293)},n.json={"layout-index.json":o(296),"posts-静心打磨手中利刃.json":o(329),"posts-node.json":o(307),"posts-docker.json":o(303),"posts-egg.json":o(305),"posts-promise.json":o(311),"posts-es.json":o(306),"posts-react.json":o(312),"posts-redux.json":o(315),"posts-webpack.json":o(325),"posts-wepy.json":o(326),"posts-小程序.json":o(328),"posts-translate.json":o(318),"posts-overreacted.json":o(309),"posts-calm-to-polish-sword-express.json":o(301),"posts-calm-to-polish-sword-ghost-to-passport.json":o(302),"posts-docker-my-fontend-project.json":o(304),"posts-node-cluster-in-egg.json":o(308),"posts-pre-deep-into-egg-core.json":o(310),"posts-read-code-es-promise-polyfill.json":o(313),"posts-read-react-redux.json":o(314),"posts-settle-react-es-6.json":o(316),"posts-shallow-into-wepy-source-code.json":o(317),"posts-translate-overreacted-how-does-react-tell-a-class-from-a-function.json":o(319),"posts-translate-overreacted-how-does-setstate-know-what-to-do.json":o(320),"posts-translate-overreacted-my-wishlist-for-hot-reloading.json":o(321),"posts-translate-overreacted-optimized-for-change.json":o(322),"posts-translate-overreacted-why-do-react-elements-have-typeof-property.json":o(323),"posts-translate-overreacted-why-do-we-write-super-props.json":o(324),"posts-what-make-rules-of-directory-for-egg-project.json":o(327),"404.json":o(297),"index.json":o(299),"posts.json":o(300),"404-html.json":o(298)},n.layouts={"layout---index":o(291)}},184:function(e,n,o){"use strict";function t(e){return e&&e.__esModule?e:{default:e}}function r(e,n){if(!(e instanceof n))throw new TypeError("Cannot call a class as a function")}function s(e,n){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!n||"object"!=typeof n&&"function"!=typeof n?e:n}function a(e,n){if("function"!=typeof n&&null!==n)throw new TypeError("Super expression must either be null or a function, not "+typeof n);e.prototype=Object.create(n&&n.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),n&&(Object.setPrototypeOf?Object.setPrototypeOf(e,n):e.__proto__=n)}n.__esModule=!0;var u=Object.assign||function(e){for(var n=1;n<arguments.length;n++){var o=arguments[n];for(var t in o)Object.prototype.hasOwnProperty.call(o,t)&&(e[t]=o[t])}return e},i=o(2),c=t(i),l=o(7),p=t(l),f=o(114),d=t(f),m=o(51),h=t(m),y=o(69),g=o(429),v=t(g),j=function(e){var n=e.children;return c.default.createElement("div",null,n())},x=function(e){function n(o){r(this,n);var t=s(this,e.call(this)),a=o.location;return d.default.getPage(a.pathname)||(a=u({},a,{pathname:"/404.html"})),t.state={location:a,pageResources:d.default.getResourcesForPathname(a.pathname)},t}return a(n,e),n.prototype.componentWillReceiveProps=function(e){var n=this;if(this.state.location.pathname!==e.location.pathname){var o=d.default.getResourcesForPathname(e.location.pathname);if(o)this.setState({location:e.location,pageResources:o});else{var t=e.location;d.default.getPage(t.pathname)||(t=u({},t,{pathname:"/404.html"})),d.default.getResourcesForPathname(t.pathname,function(e){n.setState({location:t,pageResources:e})})}}},n.prototype.componentDidMount=function(){var e=this;h.default.on("onPostLoadPageResources",function(n){d.default.getPage(e.state.location.pathname)&&n.page.path===d.default.getPage(e.state.location.pathname).path&&e.setState({pageResources:n.pageResources})})},n.prototype.shouldComponentUpdate=function(e,n){return!n.pageResources||(!(this.state.pageResources||!n.pageResources)||(this.state.pageResources.component!==n.pageResources.component||(this.state.pageResources.json!==n.pageResources.json||(!(this.state.location.key===n.location.key||!n.pageResources.page||!n.pageResources.page.matchPath&&!n.pageResources.page.path)||(0,v.default)(this,e,n)))))},n.prototype.render=function(){var e=(0,y.apiRunner)("replaceComponentRenderer",{props:u({},this.props,{pageResources:this.state.pageResources}),loader:f.publicLoader}),n=e[0];return this.props.page?this.state.pageResources?n||(0,i.createElement)(this.state.pageResources.component,u({key:this.props.location.pathname},this.props,this.state.pageResources.json)):null:this.props.layout?n||(0,i.createElement)(this.state.pageResources&&this.state.pageResources.layout?this.state.pageResources.layout:j,u({key:this.state.pageResources&&this.state.pageResources.layout?this.state.pageResources.layout:"DefaultLayout"},this.props)):null},n}(c.default.Component);x.propTypes={page:p.default.bool,layout:p.default.bool,location:p.default.object},n.default=x,e.exports=n.default},51:function(e,n,o){"use strict";function t(e){return e&&e.__esModule?e:{default:e}}var r=o(410),s=t(r),a=(0,s.default)();e.exports=a},185:function(e,n,o){"use strict";function t(e){return e&&e.__esModule?e:{default:e}}var r=o(64),s=o(115),a=t(s),u={};e.exports=function(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";return function(o){var t=decodeURIComponent(o),s=(0,a.default)(t,n);if(s.split("#").length>1&&(s=s.split("#").slice(0,-1).join("")),s.split("?").length>1&&(s=s.split("?").slice(0,-1).join("")),u[s])return u[s];var i=void 0;return e.some(function(e){if(e.matchPath){if((0,r.matchPath)(s,{path:e.path})||(0,r.matchPath)(s,{path:e.matchPath}))return i=e,u[s]=e,!0}else{if((0,r.matchPath)(s,{path:e.path,exact:!0}))return i=e,u[s]=e,!0;if((0,r.matchPath)(s,{path:e.path+"index.html"}))return i=e,u[s]=e,!0}return!1}),i}}},186:function(e,n,o){"use strict";function t(e){return e&&e.__esModule?e:{default:e}}var r=o(179),s=t(r),a=o(69),u=(0,a.apiRunner)("replaceHistory"),i=u[0],c=i||(0,s.default)();e.exports=c},298:function(e,n,o){o(1),e.exports=function(e){return o.e(0xa2868bfb69fc,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(375)})})}},297:function(e,n,o){o(1),e.exports=function(e){return o.e(0xe70826b53c04,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(376)})})}},299:function(e,n,o){o(1),e.exports=function(e){return o.e(0x81b8806e4260,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(377)})})}},296:function(e,n,o){o(1),e.exports=function(e){return o.e(60335399758886,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(111)})})}},301:function(e,n,o){o(1),e.exports=function(e){return o.e(0x61a71c1a9776,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(378)})})}},302:function(e,n,o){o(1),e.exports=function(e){return o.e(0x9db57ea482cf,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(379)})})}},304:function(e,n,o){o(1),e.exports=function(e){return o.e(0x93f63f4199a1,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(380)})})}},303:function(e,n,o){o(1),e.exports=function(e){return o.e(0x630fc95b42bd,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(381)})})}},305:function(e,n,o){o(1),e.exports=function(e){return o.e(0xbcd503076831,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(382)})})}},306:function(e,n,o){o(1),e.exports=function(e){return o.e(0xe6186ce8201c,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(383)})})}},308:function(e,n,o){o(1),e.exports=function(e){return o.e(0xd6b6eb3eeb27,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(384)})})}},307:function(e,n,o){o(1),e.exports=function(e){return o.e(0x8da08a51a3cc,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(385)})})}},309:function(e,n,o){o(1),e.exports=function(e){return o.e(29362442043640,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(386)})})}},310:function(e,n,o){o(1),e.exports=function(e){return o.e(52675627763808,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(387)})})}},311:function(e,n,o){o(1),e.exports=function(e){return o.e(0xc4ab4d0d9404,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(388)})})}},312:function(e,n,o){o(1),e.exports=function(e){return o.e(34712125554247,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(389)})})}},313:function(e,n,o){o(1),e.exports=function(e){return o.e(0xd6b09dcb5be1,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(390)})})}},314:function(e,n,o){o(1),e.exports=function(e){return o.e(0xf5bda1fd8e90,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(391)})})}},315:function(e,n,o){o(1),e.exports=function(e){return o.e(0x858adef2dab8,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(392)})})}},316:function(e,n,o){o(1),e.exports=function(e){return o.e(54342248932196,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(393)})})}},317:function(e,n,o){o(1),e.exports=function(e){return o.e(0x953c5a151f4d,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(394)})})}},319:function(e,n,o){o(1),e.exports=function(e){return o.e(9756229565306,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(395)})})}},320:function(e,n,o){o(1),e.exports=function(e){return o.e(0xce11357aef0a,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(396)})})}},321:function(e,n,o){o(1),e.exports=function(e){return o.e(39107087938240,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(397)})})}},322:function(e,n,o){o(1),e.exports=function(e){return o.e(28556145262928,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(398)})})}},323:function(e,n,o){o(1),e.exports=function(e){return o.e(99838320125203,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(399)})})}},324:function(e,n,o){o(1),e.exports=function(e){return o.e(60536836248096,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(400)})})}},318:function(e,n,o){o(1),e.exports=function(e){return o.e(0xb812c239b9c7,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(401)})})}},325:function(e,n,o){o(1),e.exports=function(e){return o.e(0xab38b1c4f686,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(402)})})}},326:function(e,n,o){o(1),e.exports=function(e){return o.e(0x8d316447dc3f,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(403)})})}},327:function(e,n,o){o(1),e.exports=function(e){return o.e(0xf4e0ea0707c,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(404)})})}},328:function(e,n,o){o(1),e.exports=function(e){return o.e(0xebff228e3c4d,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(405)})})}},329:function(e,n,o){o(1),e.exports=function(e){return o.e(52128937219153,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(406)})})}},300:function(e,n,o){o(1),e.exports=function(e){return o.e(0x802d931d3bc0,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(407)})})}},291:function(e,n,o){o(1),e.exports=function(e){return o.e(0x67ef26645b2a,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(187)})})}},114:function(e,n,o){(function(e){"use strict";function t(e){return e&&e.__esModule?e:{default:e}}n.__esModule=!0,n.publicLoader=void 0;var r=o(2),s=(t(r),o(185)),a=t(s),u=o(51),i=t(u),c=o(115),l=t(c),p=void 0,f={},d={},m={},h={},y={},g=[],v=[],j={},x="",w=[],b={},C=function(e){return e&&e.default||e},k=void 0,N=!0,_=[],R={},P={},E=5;k=o(188)({getNextQueuedResources:function(){return w.slice(-1)[0]},createResourceDownload:function(e){O(e,function(){w=w.filter(function(n){return n!==e}),k.onResourcedFinished(e)})}}),i.default.on("onPreLoadPageResources",function(e){k.onPreLoadPageResources(e)}),i.default.on("onPostLoadPageResources",function(e){k.onPostLoadPageResources(e)});var T=function(e,n){return b[e]>b[n]?1:b[e]<b[n]?-1:0},L=function(e,n){return j[e]>j[n]?1:j[e]<j[n]?-1:0},O=function(n){var o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:function(){};if(h[n])e.nextTick(function(){o(null,h[n])});else{var t=void 0;t="component---"===n.slice(0,12)?d.components[n]:"layout---"===n.slice(0,9)?d.layouts[n]:d.json[n],t(function(e,t){h[n]=t,_.push({resource:n,succeeded:!e}),P[n]||(P[n]=e),_=_.slice(-E),o(e,t)})}},S=function(n,o){y[n]?e.nextTick(function(){o(null,y[n])}):P[n]?e.nextTick(function(){o(P[n])}):O(n,function(e,t){if(e)o(e);else{var r=C(t());y[n]=r,o(e,r)}})},A=function(){var e=navigator.onLine;if("boolean"==typeof e)return e;var n=_.find(function(e){return e.succeeded});return!!n},M=function(e,n){console.log(n),R[e]||(R[e]=n),A()&&window.location.pathname.replace(/\/$/g,"")!==e.replace(/\/$/g,"")&&(window.location.pathname=e)},D=1,F={empty:function(){v=[],j={},b={},w=[],g=[],x=""},addPagesArray:function(e){g=e,p=(0,a.default)(e,x)},addDevRequires:function(e){f=e},addProdRequires:function(e){d=e},dequeue:function(){return v.pop()},enqueue:function(e){var n=(0,l.default)(e,x);if(!g.some(function(e){return e.path===n}))return!1;var o=1/D;D+=1,j[n]?j[n]+=1:j[n]=1,F.has(n)||v.unshift(n),v.sort(L);var t=p(n);return t.jsonName&&(b[t.jsonName]?b[t.jsonName]+=1+o:b[t.jsonName]=1+o,w.indexOf(t.jsonName)!==-1||h[t.jsonName]||w.unshift(t.jsonName)),t.componentChunkName&&(b[t.componentChunkName]?b[t.componentChunkName]+=1+o:b[t.componentChunkName]=1+o,w.indexOf(t.componentChunkName)!==-1||h[t.jsonName]||w.unshift(t.componentChunkName)),w.sort(T),k.onNewResourcesAdded(),!0},getResources:function(){return{resourcesArray:w,resourcesCount:b}},getPages:function(){return{pathArray:v,pathCount:j}},getPage:function(e){return p(e)},has:function(e){return v.some(function(n){return n===e})},getResourcesForPathname:function(n){var o=arguments.length>1&&void 0!==arguments[1]?arguments[1]:function(){};N&&navigator&&navigator.serviceWorker&&navigator.serviceWorker.controller&&"activated"===navigator.serviceWorker.controller.state&&(p(n)||navigator.serviceWorker.getRegistrations().then(function(e){if(e.length){for(var n=e,o=Array.isArray(n),t=0,n=o?n:n[Symbol.iterator]();;){var r;if(o){if(t>=n.length)break;r=n[t++]}else{if(t=n.next(),t.done)break;r=t.value}var s=r;s.unregister()}window.location.reload()}})),N=!1;if(R[n])return M(n,'Previously detected load failure for "'+n+'"'),o();var t=p(n);if(!t)return M(n,"A page wasn't found for \""+n+'"'),o();if(n=t.path,m[n])return e.nextTick(function(){o(m[n]),i.default.emit("onPostLoadPageResources",{page:t,pageResources:m[n]})}),m[n];i.default.emit("onPreLoadPageResources",{path:n});var r=void 0,s=void 0,a=void 0,u=function(){if(r&&s&&(!t.layoutComponentChunkName||a)){m[n]={component:r,json:s,layout:a,page:t};var e={component:r,json:s,layout:a,page:t};o(e),i.default.emit("onPostLoadPageResources",{page:t,pageResources:e})}};return S(t.componentChunkName,function(e,n){e&&M(t.path,"Loading the component for "+t.path+" failed"),r=n,u()}),S(t.jsonName,function(e,n){e&&M(t.path,"Loading the JSON for "+t.path+" failed"),s=n,u()}),void(t.layoutComponentChunkName&&S(t.layout,function(e,n){e&&M(t.path,"Loading the Layout for "+t.path+" failed"),a=n,u()}))},peek:function(e){return v.slice(-1)[0]},length:function(){return v.length},indexOf:function(e){return v.length-v.indexOf(e)-1}};n.publicLoader={getResourcesForPathname:F.getResourcesForPathname};n.default=F}).call(n,o(113))},408:function(e,n){e.exports=[{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-静心打磨手中利刃.json",path:"/posts/静心打磨手中利刃"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-node.json",path:"/posts/node"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-docker.json",path:"/posts/docker"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-egg.json",path:"/posts/egg"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-promise.json",path:"/posts/Promise"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-es.json",path:"/posts/ES"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-react.json",path:"/posts/react"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-redux.json",path:"/posts/redux"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-webpack.json",path:"/posts/webpack"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-wepy.json",path:"/posts/wepy"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-小程序.json",path:"/posts/小程序"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-translate.json",path:"/posts/translate"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-overreacted.json",path:"/posts/overreacted"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-calm-to-polish-sword-express.json",path:"/posts/calm-to-polish-sword-express"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-calm-to-polish-sword-ghost-to-passport.json",path:"/posts/calm-to-polish-sword-ghost-to-passport"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-docker-my-fontend-project.json",path:"/posts/docker-my-fontend-project"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-node-cluster-in-egg.json",path:"/posts/node-cluster-in-egg"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-pre-deep-into-egg-core.json",path:"/posts/pre-deep-into-egg-core"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-read-code-es-promise-polyfill.json",path:"/posts/read-code-es-promise-polyfill"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-read-react-redux.json",path:"/posts/read-react-redux"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-settle-react-es-6.json",path:"/posts/settle-react-es6"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-shallow-into-wepy-source-code.json",path:"/posts/shallow-into-wepy-source-code"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-translate-overreacted-how-does-react-tell-a-class-from-a-function.json",path:"/posts/translate-overreacted-how-does-react-tell-a-class-from-a-function"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-translate-overreacted-how-does-setstate-know-what-to-do.json",path:"/posts/translate-overreacted-how-does-setstate-know-what-to-do"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-translate-overreacted-my-wishlist-for-hot-reloading.json",path:"/posts/translate-overreacted-my-wishlist-for-hot-reloading"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-translate-overreacted-optimized-for-change.json",path:"/posts/translate-overreacted-optimized-for-change"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-translate-overreacted-why-do-react-elements-have-typeof-property.json",path:"/posts/translate-overreacted-why-do-react-elements-have-typeof-property"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-translate-overreacted-why-do-we-write-super-props.json",path:"/posts/translate-overreacted-why-do-we-write-super-props"},{componentChunkName:"component---src-templates-post-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts-what-make-rules-of-directory-for-egg-project.json",path:"/posts/what-make-rules-of-directory-for-egg-project"},{componentChunkName:"component---src-pages-404-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"404.json",path:"/404"},{componentChunkName:"component---src-pages-index-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"index.json",path:"/"},{componentChunkName:"component---src-pages-posts-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"posts.json",path:"/posts"},{componentChunkName:"component---src-pages-404-js",layout:"layout---index",layoutComponentChunkName:"component---src-layouts-index-js",jsonName:"404-html.json",path:"/404.html"}]},188:function(e,n){"use strict";e.exports=function(e){var n=e.getNextQueuedResources,o=e.createResourceDownload,t=[],r=[],s=function(){var e=n();e&&(r.push(e),o(e))},a=function(e){switch(e.type){case"RESOURCE_FINISHED":r=r.filter(function(n){return n!==e.payload});break;case"ON_PRE_LOAD_PAGE_RESOURCES":t.push(e.payload.path);break;case"ON_POST_LOAD_PAGE_RESOURCES":t=t.filter(function(n){return n!==e.payload.page.path});break;case"ON_NEW_RESOURCES_ADDED":}setTimeout(function(){0===r.length&&0===t.length&&s()},0)};return{onResourcedFinished:function(e){a({type:"RESOURCE_FINISHED",payload:e})},onPreLoadPageResources:function(e){a({type:"ON_PRE_LOAD_PAGE_RESOURCES",payload:e})},onPostLoadPageResources:function(e){a({type:"ON_POST_LOAD_PAGE_RESOURCES",payload:e})},onNewResourcesAdded:function(){a({type:"ON_NEW_RESOURCES_ADDED"})},getState:function(){return{pagesLoading:t,resourcesDownloading:r}},empty:function(){t=[],r=[]}}}},0:function(e,n,o){"use strict";function t(e){return e&&e.__esModule?e:{default:e}}var r=Object.assign||function(e){for(var n=1;n<arguments.length;n++){var o=arguments[n];for(var t in o)Object.prototype.hasOwnProperty.call(o,t)&&(e[t]=o[t])}return e},s=o(69),a=o(2),u=t(a),i=o(181),c=t(i),l=o(64),p=o(333),f=o(287),d=t(f),m=o(18),h=o(186),y=t(h),g=o(51),v=t(g),j=o(408),x=t(j),w=o(409),b=t(w),C=o(184),k=t(C),N=o(183),_=t(N),R=o(114),P=t(R);o(206),window.___history=y.default,window.___emitter=v.default,P.default.addPagesArray(x.default),P.default.addProdRequires(_.default),window.asyncRequires=_.default,window.___loader=P.default,window.matchPath=l.matchPath;var E=b.default.reduce(function(e,n){return e[n.fromPath]=n,e},{}),T=function(e){var n=E[e];return null!=n&&(y.default.replace(n.toPath),!0)};T(window.location.pathname),(0,s.apiRunnerAsync)("onClientEntry").then(function(){function e(e){window.___history&&i!==!1||(window.___history=e,i=!0,e.listen(function(e,n){T(e.pathname)||setTimeout(function(){(0,s.apiRunner)("onRouteUpdate",{location:e,action:n})},0)}))}function n(e,n){var o=n.location.pathname,t=(0,s.apiRunner)("shouldUpdateScroll",{prevRouterProps:e,pathname:o});if(t.length>0)return t[0];if(e){var r=e.location.pathname;if(r===o)return!1}return!0}(0,s.apiRunner)("registerServiceWorker").length>0&&o(189);var t=function(e,n){function o(e){e.page.path===P.default.getPage(r).path&&(v.default.off("onPostLoadPageResources",o),clearTimeout(i),u(t))}var t=(0,m.createLocation)(e,null,null,y.default.location),r=t.pathname,s=E[r];s&&(r=s.toPath);var a=window.location;if(a.pathname!==t.pathname||a.search!==t.search||a.hash!==t.hash){var u=n?window.___history.replace:window.___history.push,i=setTimeout(function(){v.default.off("onPostLoadPageResources",o),v.default.emit("onDelayedLoadPageResources",{pathname:r}),u(t)},1e3);P.default.getResourcesForPathname(r)?(clearTimeout(i),u(t)):v.default.on("onPostLoadPageResources",o)}};window.___push=function(e){return t(e,!1)},window.___replace=function(e){return t(e,!0)},window.___navigateTo=window.___push,(0,s.apiRunner)("onRouteUpdate",{location:y.default.location,action:y.default.action});var i=!1,f=(0,s.apiRunner)("replaceRouterComponent",{history:y.default})[0],h=function(e){var n=e.children;return u.default.createElement(l.Router,{history:y.default},n)},g=(0,l.withRouter)(k.default);P.default.getResourcesForPathname(window.location.pathname,function(){var o=function(){return(0,a.createElement)(f?f:h,null,(0,a.createElement)(p.ScrollContext,{shouldUpdateScroll:n},(0,a.createElement)(g,{layout:!0,children:function(n){return(0,a.createElement)(l.Route,{render:function(o){e(o.history);var t=n?n:o;return P.default.getPage(t.location.pathname)?(0,a.createElement)(k.default,r({page:!0},t)):(0,a.createElement)(k.default,{page:!0,location:{pathname:"/404.html"}})}})}})))},t=(0,s.apiRunner)("wrapRootComponent",{Root:o},o)[0],i=(0,s.apiRunner)("replaceHydrateFunction",void 0,c.default.render)[0];(0,d.default)(function(){return i(u.default.createElement(t,null),"undefined"!=typeof window?document.getElementById("___gatsby"):void 0,function(){(0,s.apiRunner)("onInitialClientRender")})})})})},409:function(e,n){e.exports=[]},189:function(e,n,o){"use strict";function t(e){return e&&e.__esModule?e:{default:e}}var r=o(51),s=t(r),a="/";"serviceWorker"in navigator&&navigator.serviceWorker.register(a+"sw.js").then(function(e){e.addEventListener("updatefound",function(){var n=e.installing;console.log("installingWorker",n),n.addEventListener("statechange",function(){switch(n.state){case"installed":navigator.serviceWorker.controller?window.location.reload():(console.log("Content is now available offline!"),s.default.emit("sw:installed"));break;case"redundant":console.error("The installing service worker became redundant.")}})})}).catch(function(e){console.error("Error during service worker registration:",e)})},115:function(e,n){"use strict";n.__esModule=!0,n.default=function(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";return e.substr(0,n.length)===n?e.slice(n.length):e},e.exports=n.default},38:function(e,n){function o(e){return e&&e.__esModule?e:{default:e}}e.exports=o},287:function(e,n,o){!function(n,o){e.exports=o()}("domready",function(){var e,n=[],o=document,t=o.documentElement.doScroll,r="DOMContentLoaded",s=(t?/^loaded|^c/:/^loaded|^i|^c/).test(o.readyState);return s||o.addEventListener(r,e=function(){for(o.removeEventListener(r,e),s=1;e=n.shift();)e()}),function(e){s?setTimeout(e,0):n.push(e)}})},1:function(e,n,o){"use strict";function t(){function e(e){var n=t.lastChild;return"SCRIPT"!==n.tagName?void("undefined"!=typeof console&&console.warn&&console.warn("Script is not a script",n)):void(n.onload=n.onerror=function(){n.onload=n.onerror=null,setTimeout(e,0)})}var n,t=document.querySelector("head"),r=o.e,s=o.s;o.e=function(t,a){var u=!1,i=!0,c=function(e){a&&(a(o,e),a=null)};return!s&&n&&n[t]?void c(!0):(r(t,function(){u||(u=!0,i?setTimeout(function(){c()}):c())}),void(u||(i=!1,e(function(){u||(u=!0,s?s[t]=void 0:(n||(n={}),n[t]=!0),c(!0))}))))}}t()},410:function(e,n){function o(e){return e=e||Object.create(null),{on:function(n,o){(e[n]||(e[n]=[])).push(o)},off:function(n,o){e[n]&&e[n].splice(e[n].indexOf(o)>>>0,1)},emit:function(n,o){(e[n]||[]).slice().map(function(e){e(o)}),(e["*"]||[]).slice().map(function(e){e(n,o)})}}}e.exports=o},113:function(e,n){function o(){throw new Error("setTimeout has not been defined")}function t(){throw new Error("clearTimeout has not been defined")}function r(e){if(l===setTimeout)return setTimeout(e,0);if((l===o||!l)&&setTimeout)return l=setTimeout,setTimeout(e,0);try{return l(e,0)}catch(n){try{return l.call(null,e,0)}catch(n){return l.call(this,e,0)}}}function s(e){if(p===clearTimeout)return clearTimeout(e);if((p===t||!p)&&clearTimeout)return p=clearTimeout,clearTimeout(e);try{return p(e)}catch(n){try{return p.call(null,e)}catch(n){return p.call(this,e)}}}function a(){h&&d&&(h=!1,d.length?m=d.concat(m):y=-1,m.length&&u())}function u(){if(!h){var e=r(a);h=!0;for(var n=m.length;n;){for(d=m,m=[];++y<n;)d&&d[y].run();y=-1,n=m.length}d=null,h=!1,s(e)}}function i(e,n){this.fun=e,this.array=n}function c(){}var l,p,f=e.exports={};!function(){try{l="function"==typeof setTimeout?setTimeout:o}catch(e){l=o}try{p="function"==typeof clearTimeout?clearTimeout:t}catch(e){p=t}}();var d,m=[],h=!1,y=-1;f.nextTick=function(e){var n=new Array(arguments.length-1);if(arguments.length>1)for(var o=1;o<arguments.length;o++)n[o-1]=arguments[o];m.push(new i(e,n)),1!==m.length||h||r(u)},i.prototype.run=function(){this.fun.apply(null,this.array)},f.title="browser",f.browser=!0,f.env={},f.argv=[],f.version="",f.versions={},f.on=c,f.addListener=c,f.once=c,f.off=c,f.removeListener=c,f.removeAllListeners=c,f.emit=c,f.prependListener=c,f.prependOnceListener=c,f.listeners=function(e){return[]},f.binding=function(e){throw new Error("process.binding is not supported")},f.cwd=function(){return"/"},f.chdir=function(e){throw new Error("process.chdir is not supported")},f.umask=function(){return 0}},425:function(e,n){(function(e){"use strict";function o(){if(!m){var e=c.expirationTime;h?C():h=!0,b(s,e)}}function t(){var e=c,n=c.next;if(c===n)c=null;else{var t=c.previous;c=t.next=n,n.previous=t}e.next=e.previous=null,t=e.callback,n=e.expirationTime,e=e.priorityLevel;var r=p,s=d;p=e,d=n;try{var a=t()}finally{p=r,d=s}if("function"==typeof a)if(a={
callback:a,priorityLevel:e,expirationTime:n,next:null,previous:null},null===c)c=a.next=a.previous=a;else{t=null,e=c;do{if(e.expirationTime>=n){t=e;break}e=e.next}while(e!==c);null===t?t=c:t===c&&(c=a,o()),n=t.previous,n.next=t.previous=a,a.next=t,a.previous=n}}function r(){if(-1===f&&null!==c&&1===c.priorityLevel){m=!0;try{do t();while(null!==c&&1===c.priorityLevel)}finally{m=!1,null!==c?o():h=!1}}}function s(e){m=!0;var s=l;l=e;try{if(e)for(;null!==c;){var a=n.unstable_now();if(!(c.expirationTime<=a))break;do t();while(null!==c&&c.expirationTime<=a)}else if(null!==c)do t();while(null!==c&&!k())}finally{m=!1,l=s,null!==c?o():h=!1,r()}}function a(e){u=j(function(n){v(i),e(n)}),i=g(function(){x(u),e(n.unstable_now())},100)}Object.defineProperty(n,"__esModule",{value:!0});var u,i,c=null,l=!1,p=3,f=-1,d=-1,m=!1,h=!1,y=Date,g="function"==typeof setTimeout?setTimeout:void 0,v="function"==typeof clearTimeout?clearTimeout:void 0,j="function"==typeof requestAnimationFrame?requestAnimationFrame:void 0,x="function"==typeof cancelAnimationFrame?cancelAnimationFrame:void 0;if("object"==typeof performance&&"function"==typeof performance.now){var w=performance;n.unstable_now=function(){return w.now()}}else n.unstable_now=function(){return y.now()};var b,C,k,N=null;if("undefined"!=typeof window?N=window:"undefined"!=typeof e&&(N=e),N&&N._schedMock){var _=N._schedMock;b=_[0],C=_[1],k=_[2],n.unstable_now=_[3]}else if("undefined"==typeof window||"function"!=typeof MessageChannel){var R=null,P=function(e){if(null!==R)try{R(e)}finally{R=null}};b=function(e){null!==R?setTimeout(b,0,e):(R=e,setTimeout(P,0,!1))},C=function(){R=null},k=function(){return!1}}else{"undefined"!=typeof console&&("function"!=typeof j&&console.error("This browser doesn't support requestAnimationFrame. Make sure that you load a polyfill in older browsers. https://fb.me/react-polyfills"),"function"!=typeof x&&console.error("This browser doesn't support cancelAnimationFrame. Make sure that you load a polyfill in older browsers. https://fb.me/react-polyfills"));var E=null,T=!1,L=-1,O=!1,S=!1,A=0,M=33,D=33;k=function(){return A<=n.unstable_now()};var F=new MessageChannel,U=F.port2;F.port1.onmessage=function(){T=!1;var e=E,o=L;E=null,L=-1;var t=n.unstable_now(),r=!1;if(0>=A-t){if(!(-1!==o&&o<=t))return O||(O=!0,a(W)),E=e,void(L=o);r=!0}if(null!==e){S=!0;try{e(r)}finally{S=!1}}};var W=function(e){if(null!==E){a(W);var n=e-A+D;n<D&&M<D?(8>n&&(n=8),D=n<M?M:n):M=n,A=e+D,T||(T=!0,U.postMessage(void 0))}else O=!1};b=function(e,n){E=e,L=n,S||0>n?U.postMessage(void 0):O||(O=!0,a(W))},C=function(){E=null,T=!1,L=-1}}n.unstable_ImmediatePriority=1,n.unstable_UserBlockingPriority=2,n.unstable_NormalPriority=3,n.unstable_IdlePriority=5,n.unstable_LowPriority=4,n.unstable_runWithPriority=function(e,o){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var t=p,s=f;p=e,f=n.unstable_now();try{return o()}finally{p=t,f=s,r()}},n.unstable_scheduleCallback=function(e,t){var r=-1!==f?f:n.unstable_now();if("object"==typeof t&&null!==t&&"number"==typeof t.timeout)t=r+t.timeout;else switch(p){case 1:t=r+-1;break;case 2:t=r+250;break;case 5:t=r+1073741823;break;case 4:t=r+1e4;break;default:t=r+5e3}if(e={callback:e,priorityLevel:p,expirationTime:t,next:null,previous:null},null===c)c=e.next=e.previous=e,o();else{r=null;var s=c;do{if(s.expirationTime>t){r=s;break}s=s.next}while(s!==c);null===r?r=c:r===c&&(c=e,o()),t=r.previous,t.next=r.previous=e,e.next=r,e.previous=t}return e},n.unstable_cancelCallback=function(e){var n=e.next;if(null!==n){if(n===e)c=null;else{e===c&&(c=n);var o=e.previous;o.next=n,n.previous=o}e.next=e.previous=null}},n.unstable_wrapCallback=function(e){var o=p;return function(){var t=p,s=f;p=o,f=n.unstable_now();try{return e.apply(this,arguments)}finally{p=t,f=s,r()}}},n.unstable_getCurrentPriorityLevel=function(){return p},n.unstable_shouldYield=function(){return!l&&(null!==c&&c.expirationTime<d||k())},n.unstable_continueExecution=function(){null!==c&&o()},n.unstable_pauseExecution=function(){},n.unstable_getFirstCallbackNode=function(){return c}}).call(n,function(){return this}())},426:function(e,n,o){"use strict";e.exports=o(425)},429:function(e,n){"use strict";function o(e,n){for(var o in e)if(!(o in n))return!0;for(var t in n)if(e[t]!==n[t])return!0;return!1}n.__esModule=!0,n.default=function(e,n,t){return o(e.props,n)||o(e.state,t)},e.exports=n.default},292:function(e,n,o){o(1),e.exports=function(e){return o.e(0x9427c64ab85d,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(193)})})}},293:function(e,n,o){o(1),e.exports=function(e){return o.e(35783957827783,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(194)})})}},294:function(e,n,o){o(1),e.exports=function(e){return o.e(0xed74cf750429,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(195)})})}},295:function(e,n,o){o(1),e.exports=function(e){return o.e(0xb1abc741118f,function(n,t){t?(console.log("bundle loading error",t),e(!0)):e(null,function(){return o(196)})})}}});
//# sourceMappingURL=app-a6f18f9f90289c76bfde.js.map