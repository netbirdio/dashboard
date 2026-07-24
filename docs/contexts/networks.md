# 网络模块

## 功能
配置和管理网络设置、路由和网络级策略。

## API 接口
- `GET /api/networks` - 列出网络
- `GET /api/networks/:id` - 获取网络详情
- `POST /api/networks` - 创建网络
- `PUT /api/networks/:id` - 更新网络
- `DELETE /api/networks/:id` - 删除网络

## 关键类型
```typescript
interface Network {
  id: string;
  name: string;
  description: string;
  // ... 更多字段
}
```

## 文件路径
- `src/modules/networks/` - UI 组件
- `src/contexts/RoutesProvider.tsx` - 路由数据
- `src/contexts/GroupRouteProvider.tsx` - 分组路由
- `src/interfaces/Network.ts` - 类型定义
- `src/interfaces/Route.ts` - 路由类型
- `src/app/(dashboard)/networks/page.tsx` - 网络页面
- `src/app/(dashboard)/network-routes/page.tsx` - 路由页面

## 组件
- 网络列表组件在 `src/modules/networks/` 中
- 路由管理在 `src/modules/routes/` 中

## 使用方法
```tsx
import { useRoutes } from "@/contexts/RoutesProvider";

function MyComponent() {
  const { routes, isLoading } = useRoutes();
  // ...
}
```

## 命令
- 网络：`/networks`
- 路由：`/network-routes`

## 注意事项
- 网络按账户范围划分
- 路由定义对等节点之间的流量流向
- 分组路由允许将路由分配给对等节点分组
