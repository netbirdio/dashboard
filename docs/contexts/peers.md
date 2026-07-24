# 对等节点模块

## 功能
管理网络对等节点 - 查看、配置和监控已连接的设备。

## API 接口
- `GET /api/peers` - 列出所有对等节点
- `GET /api/peers/:id` - 获取对等节点详情
- `PUT /api/peers/:id` - 更新对等节点
- `DELETE /api/peers/:id` - 删除对等节点

## 关键类型
```typescript
interface Peer {
  id: string;
  name: string;
  ip: string;
  connected: boolean;
  last_seen: string;
  os: OperatingSystem;
  version: string;
  groups: Group[];
  // ... 更多字段
}
```

## 文件路径
- `src/modules/peers/` - UI 组件
- `src/contexts/PeersProvider.tsx` - 数据提供者
- `src/interfaces/Peer.ts` - 类型定义
- `src/app/(dashboard)/peers/page.tsx` - 页面组件
- `src/app/(dashboard)/peer/[id]/page.tsx` - 详情页面

## 组件
- `PeersTable.tsx` - 主要对等节点列表表格
- `PeerNameCell.tsx` - 对等节点名称显示
- `PeerAddressCell.tsx` - IP 地址显示
- `PeerStatusCell.tsx` - 连接状态
- `PeerOSCell.tsx` - 操作系统图标
- `PeerGroupCell.tsx` - 分组成员资格
- `PeerActionCell.tsx` - 操作按钮
- `PeerMultiSelect.tsx` - 多对等节点选择器

## 使用方法
```tsx
import { usePeers } from "@/contexts/PeersProvider";

function MyComponent() {
  const { peers, isLoading } = usePeers();
  // ...
}
```

## 命令
- 页面：`/peers`
- 详情：`/peer/:id`

## 注意事项
- 对等节点列表可能很大 - 使用虚拟滚动
- 状态更新通过轮询实现（SWR refreshInterval）
- 操作系统图标位于 `src/assets/os-icons/`
