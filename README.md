# ybruin-postpackager-loader

## Usage

在页面自己插入 `<!--STYLE_COMP_PLACEHOLDER-->` , `<!--SCRIPT_COMP_PLACEHOLDER-->`和`<!--SCRIPT_ENTRY_PLACEHOLDER-->` 占位符来控制位置。

再ybruin-config.js中配置
```javascript
fis.match('::packager', {
  postpackager: ybruin.plugin('loader', {
    domain: 'http://res.cont.yy.com', //非组件合并链接CDN
    compDomain: 'http://res.cont.yy.com', //组件合并链接CDN
    useModule: 'cmd' //引入入口文件模式:amd,cmd,commonjs,false
  })
});
```

## 两种依赖组件的方式:

1. 页面中引入组件
  ```
  <% include components/foo %>
  ```

2. 在js文件中引入组件
  ```javascript
  require('../components/foo/foo.js');
  ```
