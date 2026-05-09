# 我们的旅行足迹

一个 3D 地球旅行记录网页，记录我和老公去过的城市和照片。

基于 [ToWhere Online](https://github.com/Shirelle8280/ToWhereOnline) 的 Globe 模块精简而来。

## 功能

- 3D 互动地球，城市标记带呼吸光效
- 点击城市查看照片墙和故事
- 管理面板添加城市、上传照片
- 卫星图/街道图切换
- 城市列表快速定位

## 搭建步骤

### 1. 创建 Supabase 项目

1. 去 [supabase.com](https://supabase.com) 注册并创建一个项目
2. 进入 SQL Editor，执行 `supabase-schema.sql` 中的全部 SQL
3. 进入 Storage，创建一个名为 `city-images` 的 bucket，设为 Public
4. 在 bucket 设置中，添加策略允许匿名上传和读取

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的 Supabase 信息：

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 安装依赖 & 启动

```bash
npm install
npm run dev
```

打开浏览器访问 http://localhost:5173

### 4. 添加城市和照片

- 页面底部中间有一个⚙齿轮按钮，点击打开管理面板
- 先添加城市（支持常用城市快捷选择，也可手动输入坐标）
- 再给城市上传照片

## 技术栈

- React 18 + Vite 5
- Cesium（3D 地球引擎）
- Supabase（数据库 + 图片存储）
- Framer Motion（动画）

## 自定义

- 修改 `src/components/CesiumGlobe.jsx` 中的「我们走过的世界」标题
- 修改 `index.html` 中的页面标题
- 城市标点颜色在添加城市时选择，默认粉色 #FF6B9D
