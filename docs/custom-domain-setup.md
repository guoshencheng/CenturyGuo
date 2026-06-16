# GitHub Pages 自定义域名设置教程

以 `blog.shemu.top` 为例，讲解如何把 GitHub Pages 项目绑定到子域名。

---

## 一、前置条件

- 一个 GitHub 仓库（本例：`guoshencheng/CenturyGuo`）
- 已开启 GitHub Pages 并选择 **GitHub Actions** 作为部署源
- 一个已注册的域名（本例：`shemu.top`）
- 能登录域名注册商/ DNS 服务商的管理后台

---

## 二、GitHub 仓库侧设置

### 1. 添加 CNAME 文件

在仓库根目录创建 `public/CNAME`（注意没有后缀）：

```text
blog.shemu.top
```

**为什么放在 `public/` 里？**  
Astro 构建时会把 `public/` 下的文件原样复制到 `dist/`。GitHub Pages 看到 `CNAME` 文件后，就知道这个站点要绑定哪个自定义域名。

### 2. 更新 Astro 配置

把 `astro.config.ts` 里的 `site` 改成你的自定义域名：

```typescript
export default defineConfig({
  site: "https://blog.shemu.top",
  // ...其他配置
});
```

这样生成的 `sitemap.xml` 和 RSS 里的链接都会是正确的域名。

### 3. 开启 GitHub Pages 并指定自定义域名

1. 打开仓库设置：`https://github.com/guoshencheng/CenturyGuo/settings/pages`
2. **Build and deployment** → **Source** 选择 **GitHub Actions**
3. **Custom domain** 填入 `blog.shemu.top`
4. 点击 **Save**
5. 勾选 **Enforce HTTPS**（建议等 DNS 生效后再勾选）

保存后 GitHub 会自动校验 DNS，并尝试申请 HTTPS 证书。

---

## 三、DNS 服务商侧设置

登录你的域名注册商或 DNS 服务商（如阿里云、腾讯云、Cloudflare、GoDaddy 等），为 `blog.shemu.top` 添加一条 CNAME 记录：

| 主机记录 | 记录类型 | 记录值 |
|---------|---------|--------|
| blog | CNAME | `guoshencheng.github.io` |

**说明：**
- 主机记录填 `blog`，表示 `blog.shemu.top`
- 记录值必须是 `你的用户名.github.io`，不是 `github.com`
- 不需要填端口号、路径或 `https://`

### 如果你要用根域名（apex）

如果想用 `shemu.top`（不带 `blog`），不能直接用 CNAME，需要添加 A 记录指向 GitHub Pages 的 IP：

```text
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

再加 AAAA 记录（可选，但推荐）：

```text
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

同时 GitHub 设置里的 Custom domain 要填 `shemu.top`，`public/CNAME` 也要写成 `shemu.top`。

---

## 四、验证 DNS 是否生效

在本地终端执行：

```bash
nslookup blog.shemu.top
```

或者：

```bash
dig blog.shemu.top
```

如果返回的是 GitHub 的 IP 或 CNAME 指向 `guoshencheng.github.io`，说明 DNS 已生效。

DNS 生效时间从几分钟到 48 小时不等，取决于注册商 TTL 设置。

---

## 五、HTTPS 证书

GitHub Pages 会自动为自定义域名申请 Let's Encrypt 证书。只要：

1. DNS 已正确解析
2. Custom domain 已保存
3. 没有勾选 **Enforce HTTPS** 干扰申请过程

通常 24 小时内证书会自动签发。签发后勾选 **Enforce HTTPS** 强制跳转 HTTPS。

---

## 六、常见坑

### 1. 访问 `guoshencheng.github.io` 出现 404

自定义域名开启后，GitHub Pages 会把默认的 `用户名.github.io/仓库名` 跳转到自定义域名。如果 DNS 还没生效，直接访问 GitHub Pages 原始地址可能看到 404 或资源加载失败。**应该以自定义域名访问为准。**

### 2. CSS/JS 404

如果部署到子路径（如 `guoshencheng.github.io/CenturyGuo/`），而 Astro 里的资源路径是根路径 `/_astro/...`，就会 404。解决方式：

- 方案 A：使用自定义域名（推荐），根路径就是站点根目录
- 方案 B：在 `astro.config.ts` 里加 `base: '/CenturyGuo'`

### 3. CNAME 文件被覆盖

如果每次构建后 CNAME 消失，检查是否把 CNAME 放在 `public/` 目录下，而不是仓库根目录。Astro 只会把 `public/` 复制到 `dist/`。

### 4. DNS 校验一直失败

- 检查 CNAME 记录值是否多写了 `https://` 或斜杠
- 检查是否同时存在 A 记录和 CNAME 记录冲突
- 用 [whatsmydns.net](https://whatsmydns.net/) 查看全球 DNS 传播状态

### 5. HTTPS 证书申请失败

- 确保 CNAME 已生效
- 不要勾选 **Enforce HTTPS**  until 证书出现
- 如果超过 24 小时仍没有证书，尝试删除 Custom domain 再重新添加

---

## 七、总结流程

1. DNS 加 CNAME：`blog` → `guoshencheng.github.io`
2. 仓库加 `public/CNAME`，内容 `blog.shemu.top`
3. `astro.config.ts` 里 `site` 改成 `https://blog.shemu.top`
4. GitHub Settings → Pages → Custom domain 填 `blog.shemu.top`
5. 等 DNS 生效，访问 `https://blog.shemu.top`
6. 证书签发后勾选 Enforce HTTPS

---

## 八、针对本项目的检查清单

- [ ] `public/CNAME` 内容为 `blog.shemu.top`
- [ ] `astro.config.ts` 中 `site: "https://blog.shemu.top"`
- [ ] GitHub Pages 设置里 Custom domain 为 `blog.shemu.top`
- [ ] DNS 有 `blog.shemu.top` → `guoshencheng.github.io` 的 CNAME
- [ ] 访问 `https://blog.shemu.top` 正常
- [ ] HTTPS 证书已签发并勾选 Enforce HTTPS
