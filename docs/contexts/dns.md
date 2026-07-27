# DNS 模块

## 功能
管理网络的 DNS 名称服务器和 DNS 设置。

## API 接口
- `GET /api/nameservers` - 列出名称服务器
- `GET /api/nameservers/:id` - 获取名称服务器详情
- `POST /api/nameservers` - 创建名称服务器
- `PUT /api/nameservers/:id` - 更新名称服务器
- `DELETE /api/nameservers/:id` - 删除名称服务器

## 关键类型
```typescript
interface Nameserver {
  id: string;
  name: string;
  ip: string;
  port: number;
  groups: Group[];
  // ... 更多字段
}
```

## 文件路径
- `src/modules/dns/` - UI 组件
- `src/interfaces/Nameserver.ts` - 类型定义
- `src/app/(dashboard)/dns/page.tsx` - 页面组件

## 组件
- 名称服务器列表表格
- 名称服务器编辑器
- 分组分配

## 使用方法
```tsx
// 通过自定义钩子或上下文访问
```

## 命令
- 页面：`/dns`

## 注意事项
- 名称服务器分配给分组
- 分组决定哪些对等节点使用哪些名称服务器
- 可以配置默认名称服务器
