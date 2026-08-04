# OrionTV 📺

一个基于 React Native TVOS 和 Expo 构建的播放器，旨在提供流畅的视频观看体验。

## ✨ 功能特性

- **框架跨平台支持**: 同时支持构建 Apple TV 和 Android TV。
- **现代化前端**: 使用 Expo、React Native TVOS 和 TypeScript 构建，性能卓越。
- **Expo Router**: 基于文件系统的路由，使导航逻辑清晰简单。
- **TV 优化的 UI**: 专为电视遥控器交互设计的用户界面。

## 🛠️ 技术栈

- **前端**:
  - [React Native TVOS](https://github.com/react-native-tvos/react-native-tvos)
  - [Expo](https://expo.dev/) (~51.0)
  - [Expo Router](https://docs.expo.dev/router/introduction/)
  - [Expo AV](https://docs.expo.dev/versions/latest/sdk/av/)
  - TypeScript

## 📂 项目结构

本项目采用类似 monorepo 的结构：

```
.
├── app/              # Expo Router 路由和页面
├── assets/           # 静态资源 (字体, 图片, TV 图标)
├── components/       # React 组件
├── constants/        # 应用常量 (颜色, 样式)
├── hooks/            # 自定义 Hooks
├── services/         # 服务层 (API, 存储)
├── package.json      # 前端依赖和脚本
└── ...
```

## 🚀 快速开始

### 环境准备

请确保您的开发环境中已安装以下软件：

- [Node.js](https://nodejs.org/) (LTS 版本)
- [Yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Xcode](https://developer.apple.com/xcode/) (用于 Apple TV 开发)
- [Android Studio](https://developer.android.com/studio) (用于 Android TV 开发)

### 项目启动

接下来，在项目根目录运行前端应用：

```sh

# 安装依赖
yarn

# [首次运行或依赖更新后] 生成原生项目文件
# 这会根据 app.json 中的配置修改原生代码以支持 TV
yarn prebuild

# 运行在 Apple TV 模拟器或真机上
yarn ios

# 运行在 Android TV 模拟器或真机上
yarn android
```

## 使用

- 1.2.x 以上版本需配合 [MoonTV](https://github.com/senshinya/MoonTV) 使用。


## 📜 主要脚本

- `yarn start`: 在手机模式下启动 Metro Bundler。
- `yarn start-tv`: 在 TV 模式下启动 Metro Bundler。
- `yarn ios`: 在 Apple TV 上构建并运行应用。
- `yarn android`: 在 Android TV 上构建并运行应用。
- `yarn prebuild`: 为 TV 构建生成原生项目文件。
- `yarn build`: 构建 Android 发布包（输出 APK 到 android/app/build/outputs/apk/release/）。
- `yarn lint`: 检查代码风格


## 🔧 小米电视优化补丁 (Mi TV Patch)

本 Fork（`kent88kwok/OrionTV`）针对在 **小米电视 / Android TV** 上使用时的两个体验问题做了修复：

### 修复内容
1. **每次打开都弹出 MoonTV 用户名 / 密码登录框**
   - 根因：React Native / Expo 的 `fetch` 无法读取响应头 `Set-Cookie`，导致 `authCookies` 永远写不进去，每次冷启动都误判为「未登录」。
   - 修复：`stores/authStore.ts` 在 `authCookies` 缺失时，改用本地已持久化的用户名 / 密码**静默重新登录**（`LoginCredentialsManager.get()` + `api.login()`），登录成功即视为已登录，**不再弹窗**。
2. **首页只显示两行影视封面**
   - 根因：首页豆瓣数据每页条数 `pageSize` 固定为 `20`，在 TV 大屏上只够两行。
   - 修复：`stores/homeStore.ts` 将 `getDoubanData(..., 20, ...)` 改为 `40`，首屏可铺满多行。

### 构建 / 侧载到小米电视
OrionTV 是原生 App，改了源码必须重新构建 Android TV 的 APK 并侧载：

```sh
git clone https://github.com/kent88kwok/OrionTV.git
cd OrionTV
yarn
yarn prebuild          # 生成原生项目文件（注意：上游 README 里的 prebuild-tv 在当前 package.json 中已不存在）
yarn android           # 连上同局域网、已开启开发者模式的小米电视：adb connect <电视IP>:5555 后运行
# 或打 release 包：yarn build 产出 android/app/build/outputs/apk/release/*.apk 后 adb install -r <apk>
```

> 说明：上游 README 的 `prebuild-tv` / `android-tv` / `ios-tv` 命令在当前 `package.json` 中已不存在，请使用上面的真实脚本（`yarn prebuild` / `yarn android` / `yarn ios` / `yarn build`）。


## 📝 License

本项目采用 MIT 许可证。

## ⚠️ 免责声明

OrionTV 仅作为视频搜索工具，不存储、上传或分发任何视频内容。所有视频均来自第三方 API 接口提供的搜索结果。如有侵权内容，请联系相应的内容提供方。

本项目开发者不对使用本项目产生的任何后果负责。使用本项目时，您必须遵守当地的法律法规。

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=zimplexing/OrionTV&type=Date)](https://www.star-history.com/#zimplexing/OrionTV&Date)

## 🙏 致谢

本项目受到以下开源项目的启发：

- [MoonTV](https://github.com/senshinya/MoonTV) - 一个基于 Next.js 的视频聚合应用
- [LibreTV](https://github.com/LibreSpark/LibreTV) - 一个开源的视频流媒体应用

感谢以下项目提供 API Key 的赞助

- [gpt-load](https://github.com/tbphp/gpt-load) - 一个高性能的 OpenAI 格式 API 多密钥轮询代理服务器，支持负载均衡，使用 Go 语言开发
