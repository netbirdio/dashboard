# 访问控制模块

## 功能
管理访问控制策略（ACL）- 定义哪些对等节点可以通信。

## API 接口
- `GET /api/policies` - 列出策略
- `GET /api/policies/:id` - 获取策略详情
- `POST /api/policies` - 创建策略
- `PUT /api/policies/:id` - 更新策略
- `DELETE /api/policies/:id` - 删除策略

## 关键类型
```typescript
interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: PolicyRule[];
  // ... 更多字段
}

interface PolicyRule {
  name: string;
  sources: Group[];
  destinations: Group[];
  // ... 更多字段
}
```

## 文件路径
- `src/modules/access-control/` - UI 组件
- `src/contexts/PoliciesProvider.tsx` - 数据提供者
- `src/app/(dashboard)/access-control/page.tsx` - 页面组件

## 组件
- 策略列表表格
- 策略编辑器
- 规则配置

## 使用方法
```tsx
import { usePolicies } from "@/contexts/PoliciesProvider";

function MyComponent() {
  const { policies, isLoading } = usePolicies();
  // ...
}
```

## 命令
- 页面：`/access-control`

## 注意事项
- 策略按顺序评估
- 禁用的策略会被跳过
- 规则引用分组，而不是单个对等节点
- 可以向策略添加姿态检查
