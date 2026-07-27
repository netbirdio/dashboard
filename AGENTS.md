# 仓库指南

## 项目概述

NetBird Dashboard 是 NetBird 管理服务的 Web 界面。这是一个 Next.js 应用程序，为 NetBird 网络提供网络管理、对等节点监控、访问控制和配置功能。

**在线版本：** https://app.netbird.io/
**源代码：** https://github.com/netbirdio/dashboard

## 架构与数据流

### 技术栈
- **框架：** Next.js 13+ 使用 App Router
- **语言：** TypeScript
- **样式：** Tailwind CSS + shadcn/ui 组件
- **状态管理：** React Context + SWR 用于服务器状态
- **认证：** OIDC 通过 @axa-fr/react-oidc
- **国际化：** next-intl
- **测试：** Cypress (E2E)
- **部署：** Docker + Nginx

### 高级结构

```
src/
├── app/                    # Next.js App Router 页面
│   ├── (dashboard)/        # 主仪表板路由（分组布局）
│   ├── (remote-access)/    # 远程访问路由
│   ├── install/            # 安装向导
│   ├── invite/             # 用户邀请流程
│   └── setup/              # 初始设置流程
├── assets/                 # 静态资源（图标、图片、字体）
├── auth/                   # OIDC 认证组件
├── components/             # 共享 UI 组件（基于 shadcn/ui）
├── contexts/               # React Context 提供者
├── hooks/                  # 自定义 React 钩子
├── i18n/                   # 国际化配置和消息
├── interfaces/             # TypeScript 类型定义
├── layouts/                # 布局组件
├── modules/                # 功能模块（领域特定）
└── utils/                  # 工具函数
```

### 数据流

1. **认证：** OIDC 提供者处理认证 → 令牌存储在内存中
2. **API 调用：** `useFetchApi` 钩子 → SWR → OIDC 请求 → 管理 API
3. **状态：** 服务器状态通过 SWR 缓存，UI 状态通过 React Context
4. **渲染：** 默认使用服务器组件，需要时使用客户端组件

## 关键目录

### `src/app/` - 页面和路由
- 使用 Next.js App Router 和路由分组
- `(dashboard)/` 包含主要应用页面和共享布局
- 每个路由有 `page.tsx` 和可选的 `layout.tsx`
- 通过 `error/page.tsx` 实现错误边界

### `src/modules/` - 功能模块
按功能组织的领域特定组件：
- `peers/` - 对等节点管理组件
- `networks/` - 网络配置
- `access-control/` - ACL 策略
- `dns/` - DNS 管理
- `routes/` - 网络路由
- `users/` - 用户管理
- `groups/` - 分组管理
- `setup-keys/` - 设置密钥管理
- `activity/` - 活动日志
- `settings/` - 账户设置

### `src/components/` - 共享 UI 组件
基于 shadcn/ui 构建，具有自定义变体：
- `Input.tsx` - 带验证的表单输入
- `Select.tsx` - 下拉选择
- `Dialog.tsx` - 模态对话框
- `Table.tsx` - 数据表格
- `Button.tsx` - 操作按钮
- `Badge.tsx` - 状态徽章
- `Tooltip.tsx` - 信息提示

### `src/contexts/` - 状态提供者
全局状态的 React Context 提供者：
- `ApplicationProvider.tsx` - 应用级配置
- `PeersProvider.tsx` - 对等节点数据
- `GroupsProvider.tsx` - 分组数据
- `RoutesProvider.tsx` - 路由数据
- `PoliciesProvider.tsx` - ACL 策略
- `PermissionsProvider.tsx` - 用户权限
- `GlobalThemeProvider.tsx` - 主题管理
- `LocaleProvider.tsx` - 语言/区域设置

### `src/hooks/` - 自定义钩子
可复用的 React 钩子：
- `useLocalStorage.tsx` - 持久化本地存储
- `useDebounce.tsx` - 防抖值
- `useSearch.ts` - 搜索功能
- `useCopyToClipboard.ts` - 剪贴板操作
- `useElementSize.ts` - DOM 元素尺寸
- `useIntersectionObserver.ts` - 可见性检测

### `src/interfaces/` - 类型定义
领域模型的 TypeScript 接口：
- `Peer.ts` - 网络对等节点
- `Group.ts` - 对等节点分组
- `Route.ts` - 网络路由
- `Nameserver.ts` - DNS 名称服务器
- `Account.ts` - 用户账户
- `SetupKey.ts` - 设置密钥
- `AccessToken.ts` - API 访问令牌

### `src/utils/` - 工具函数
辅助函数：
- `api.tsx` - 集成 SWR 的 API 客户端
- `helpers.ts` - 通用工具（cn, randomString 等）
- `config.ts` - 配置加载器
- `ip.ts` - IP 地址工具
- `wireguard.ts` - WireGuard 辅助函数
- `version.ts` - 版本比较

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（端口 3000）
npm run dev

# 使用 Turbopack 启动（更快）
npm run turbo

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 运行代码检查
npm run lint

# 打开 Cypress 测试运行器
npm run cypress:open

# 复制 OIDC 服务工作者（认证必需）
npm run copy
npm run copytrusted
```

## 代码规范和常见模式

### 组件模式
```tsx
// 使用 shadcn/ui 和 class-variance-authority 实现变体
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@utils/helpers";

const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "default-classes",
      destructive: "destructive-classes",
    },
  },
});

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
```

### Context 提供者模式
```tsx
import React, { useMemo } from "react";
import useFetchApi from "@utils/api";

const DataContext = React.createContext({} as DataType);

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useFetchApi<Data[]>("/endpoint");

  const value = useMemo(() => ({ data, isLoading }), [data, isLoading]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => React.useContext(DataContext);
```

### API 钩子模式
```tsx
import useFetchApi from "@utils/api";

// GET 请求使用 SWR
const { data, isLoading, error } = useFetchApi<Data[]>("/endpoint");

// POST/PUT/DELETE 请求
const { mutate } = useFetchApi("/endpoint", { method: "POST" });
```

### 样式模式
```tsx
import { cn } from "@utils/helpers";

// 合并 Tailwind 类
<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className
)} />
```

### 导入顺序
由 `simple-import-sort` ESLint 插件强制执行：
1. 副作用导入 (`import "polyfill"`)
2. 外部包 (`import React from "react"`)
3. 内部别名 (`import { Button } from "@/components"`)
4. 相对导入 (`import { useData } from "./context"`)

### 文件命名
- **组件：** PascalCase (`PeerTable.tsx`, `GroupSelector.tsx`)
- **钩子：** camelCase 带 `use` 前缀 (`useLocalStorage.tsx`)
- **工具函数：** camelCase (`helpers.ts`, `api.tsx`)
- **接口：** PascalCase (`Peer.ts`, `Group.ts`)
- **页面：** `page.tsx`（Next.js App Router 要求）
- **布局：** `layout.tsx`（Next.js App Router 要求）

## 重要文件

### 入口点
- `src/app/layout.tsx` - 根布局（提供者、字体、元数据）
- `src/app/(dashboard)/layout.tsx` - 仪表板布局（导航、认证）
- `src/app/page.tsx` - 首页重定向

### 配置文件
- `next.config.js` - Next.js 配置
- `tailwind.config.ts` - Tailwind CSS 配置
- `components.json` - shadcn/ui 配置
- `config.json` - 应用配置（API 端点、认证）
- `.eslintrc.json` - ESLint 规则
- `tsconfig.json` - TypeScript 配置

### 关键工具
- `src/utils/api.tsx` - API 客户端（SWR + OIDC）
- `src/utils/config.ts` - 配置加载器
- `src/utils/helpers.ts` - 共享工具
- `src/auth/OIDCProvider.tsx` - 认证提供者

## 运行时/工具偏好

### 必需环境
- Node.js 18+（推荐 LTS）
- npm（包管理器）

### 本地开发设置
1. 克隆仓库
2. 创建 `.local-config.json` 覆盖 `config.json` 中的值
3. 运行 `npm install`
4. 运行 `npm run copy`（复制 OIDC 服务工作者）
5. 运行 `npm run dev`

### Docker 部署
```bash
docker run -d --name netbird-dashboard \
  -p 80:80 \
  -e AUTH0_DOMAIN=<domain> \
  -e AUTH0_CLIENT_ID=<client-id> \
  -e AUTH0_AUDIENCE=<audience> \
  -e NETBIRD_MGMT_API_ENDPOINT=<api-url> \
  netbirdio/dashboard:main
```

### 配置
- `config.json` - 默认配置
- `.local-config.json` - 本地覆盖（已忽略）
- Docker 部署的环境变量

## 测试与质量保证

### E2E 测试（Cypress）
```bash
# 打开 Cypress UI
npm run cypress:open

# 无头运行测试
npx cypress run
```

**测试位置：** `cypress/e2e/`
**支持文件：** `cypress/support/`
**测试数据：** `cypress/fixtures/`

### 代码检查
```bash
npm run lint
```

ESLint 配置：
- `next/core-web-vitals` - Next.js 最佳实践
- `prettier` - 代码格式化
- `simple-import-sort` - 导入排序

### 类型检查
TypeScript 严格模式已启用。运行 `npx tsc --noEmit` 检查类型。

## 模块上下文

参见 `docs/contexts/` 获取特定模块的详细文档：
- `peers.md` - 对等节点管理模块
- `networks.md` - 网络配置模块
- `access-control.md` - ACL 策略模块
- `dns.md` - DNS 管理模块
- `api-client.md` - API 客户端模式
- `authentication.md` - OIDC 认证流程

## 常见问题与注意事项

### OIDC 服务工作者
安装后必须运行 `npm run copy` 将 OIDC 服务工作者复制到 `public/`。

### 本地配置
创建 `.local-config.json` 覆盖 `config.json` 中的本地开发值。

### 静态导出
应用在 Next.js 配置中使用 `output: "export"` - 运行时无服务器端渲染。

### 暗黑模式
主题通过 `GlobalThemeProvider` 管理。使用 Tailwind 暗黑模式类。

### API 端点
所有 API 调用通过 `src/utils/api.tsx`，它处理：
- OIDC 令牌注入
- 令牌刷新
- 错误处理
- SWR 缓存

## 快速参考

### 添加新页面
1. 创建 `src/app/(dashboard)/new-page/page.tsx`
2. 在 `src/layouts/Navigation.tsx` 中添加导航
3. 如需要，在 `src/contexts/` 中创建上下文提供者
4. 在 `src/interfaces/` 中添加类型

### 添加新组件
1. 在 `src/components/`（共享）或 `src/modules/<feature>/`（功能特定）中创建
2. 遵循 shadcn/ui 模式并实现变体
3. 从组件文件导出

### 添加新 API 端点
1. 在组件或上下文中使用 `useFetchApi` 钩子
2. 在 `src/interfaces/` 中添加 TypeScript 接口
3. 如果数据在组件间共享，创建上下文提供者

### 添加新模块
1. 在 `src/modules/<feature>/` 中创建目录
2. 为该功能添加组件
3. 在 `src/contexts/` 中创建上下文提供者
4. 在 `src/app/(dashboard)/<feature>/` 中添加页面
5. 更新导航

---

*本文档由 AI 自动生成。随着代码库的发展而更新。*
