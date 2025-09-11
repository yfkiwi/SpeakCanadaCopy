# 数据库设置说明

## 订阅功能需要的数据表

### 1. 更新 user_profiles 表
在 Supabase SQL 编辑器中运行：

```sql
-- 添加订阅相关字段到 user_profiles 表
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS plan_expires_at timestamp with time zone;
```

### 2. 创建 daily_usage_limits 表
在 Supabase SQL 编辑器中运行：

```sql
-- 创建每日使用限制表
CREATE TABLE daily_usage_limits (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  roleplay_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_daily_usage_limits_user_date ON daily_usage_limits(user_id, usage_date);
```

## 测试步骤

1. 完成上述数据库设置
2. 访问 `/test-limits` 页面测试功能
3. 在 role-play 页面查看使用限制显示
4. 完成几次对话测试限制功能

## 计划限制

- **免费用户**: 每天 5 次录音
- **基础计划**: $6.99/月，每天 80 次录音  
- **Plus计划**: $12.99/月，每天 200 次录音

## 使用时机

一次机会被使用的时机：
- **用户开始录音时**（按下录音按钮）
- 不是完成对话时，而是开始对话时
- 这样可以防止用户绕过限制（不点击结束就离开）
- 确保每次尝试使用role-play功能都会消耗一次机会

## 技术说明

- 使用现有的 `roleplay_count` 列来跟踪录音次数
- 不需要添加新的数据库列
- 原理相同：每次录音增加计数，检查是否超过每日限制
