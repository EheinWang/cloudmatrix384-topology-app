# CloudMatrix384 互联实验室

交互式展示 CloudMatrix384 的七平面互联拓扑，并估算不同通信场景的带宽上界。

**在线访问：https://EheinWang.github.io/cloudmatrix384-topology-app/**

## 本地打开

直接用浏览器打开 `dist/index.html`。请保留 `dist` 中全部 HTML、CSS 和 JavaScript 文件。
所有计算在浏览器本地完成，不连接集群，也不自动发起负载。

理论结果是指定假设下的上界，不是实际测速；数据依据和模型限制见页面内的“文档与实测”和“如何理解结果”。

## 发布更新

网页文件位于 `dist/`。向 `main` 分支推送更新后，GitHub Actions 会自动发布到 GitHub Pages。
仓库的 Settings → Pages → Source 应选择 **GitHub Actions**。

## 模型测试

安装 Node.js 后运行：

```sh
npm test
```
