# 🍷 酿酒厂大亨 (Brewery Game Tycoon)

多人回合制酿酒厂经营策略游戏。4-6名玩家各自经营酿酒厂，通过原料采购、酿造工艺、陈酿和销售积累声望，定期举办品酒大赛决出优胜者。

## 🎮 游戏特色

- **三大酿造路线**：葡萄酒 / 精酿啤酒 / 威士忌，每种路线拥有完全不同的生产流程
- **深度工艺系统**：8维风味属性，非线性工艺参数影响，最佳出桶时机选择
- **橡木桶系统**：4种橡木桶（法国/美国/雪莉/波本），桶效果随使用次数递减
- **原料市场拍卖**：动态价格机制，热门品种被抢购涨价，冷门品种降价
- **品酒评分机制**：3名NPC评委各有偏好（平衡型/强烈型/复杂型），每5回合大赛
- **三档销售市场**：大众市场 / 精品市场 / 高端收藏市场，口味偏好波动
- **随机事件系统**：氧化事故、丰收年、名厨驾临、市场兴衰

## 🛠 技术栈

### 后端
- **Node.js 20** + **TypeScript**
- **Express** - HTTP服务器
- **ws** - WebSocket实时通信
- **UUID** - 唯一ID生成

### 前端
- **Vue 3** + **TypeScript** + **Composition API**
- **Pinia** - 状态管理
- **Vue Router** - 路由
- **Vite** - 构建工具
- **ECharts + vue-echarts** - 数据可视化（雷达图、曲线图）

### 部署
- **Docker Compose** - 容器编排
- **nginx:alpine** - 前端静态托管 + API反向代理
- **node:20-alpine** - 后端运行时

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 克隆项目并进入目录
cd brewery-game

# 一键构建并启动
docker-compose up -d --build

# 访问游戏
# 前端: http://localhost:8080
# 后端: http://localhost:3000 (API + WebSocket)
```

### 方式二：本地开发

```bash
# 1. 安装后端依赖
cd server
npm install
npm run dev   # http://localhost:3000

# 2. 另开终端安装前端依赖
cd client
npm install
npm run dev   # http://localhost:5173 (自动代理后端)
```

## 📁 项目结构

```
brewery-game/
├── server/                    # 后端服务
│   ├── src/
│   │   ├── index.ts           # HTTP + WebSocket 服务入口
│   │   ├── types.ts           # 完整类型定义
│   │   ├── data.ts            # 游戏静态数据配置
│   │   ├── gameEngine.ts      # 核心游戏引擎
│   │   └── roomManager.ts     # 房间和回合管理
│   ├── Dockerfile
│   └── package.json
│
├── client/                    # 前端应用
│   ├── src/
│   │   ├── views/             # 页面级组件
│   │   │   ├── LobbyView.vue  # 游戏大厅
│   │   │   ├── RoomView.vue   # 房间等待
│   │   │   └── GameView.vue   # 游戏主界面
│   │   ├── components/        # 功能组件
│   │   │   ├── FlavorRadar.vue      # 八角风味雷达图
│   │   │   ├── FlavorLineChart.vue  # 风味演变曲线
│   │   │   ├── MarketAuctionPanel.vue
│   │   │   ├── SalesPanel.vue
│   │   │   ├── CompetitionPanel.vue
│   │   │   ├── EquipmentShop.vue
│   │   │   └── *Modal.vue            # 各类弹窗
│   │   ├── stores/game.ts     # Pinia游戏状态
│   │   ├── router/            # 路由配置
│   │   ├── types/             # 前端类型
│   │   └── styles/main.css    # 全局样式
│   ├── nginx.conf             # Nginx反代配置
│   ├── Dockerfile
│   └── package.json
│
└── docker-compose.yml         # 容器编排配置
```

## 🎯 游戏玩法

### 回合流程（每回合30秒阶段倒计时）
1. **原料市场拍卖** - 提交出价，价高者得，供需影响下回合价格
2. **酿造操作** - 启动新批次、推进工序、装瓶入库、买桶/设备
3. **陈酿推进** - 桶中酒风味自动演变
4. **销售阶段** - 选择市场档位上架，结算收入
5. **随机事件** - 触发特殊事件
6. **品酒大赛** - 每5回合，前三名获声望+金币奖励

### 酿造路线时间线
| 路线 | 工序数 | 最短时间 | 核心控制点 |
|------|--------|----------|------------|
| 🍷 葡萄酒 | 6 | 约6回合 | 发酵温度15-18°C最优 |
| 🍺 精酿啤酒 | 6 | 约6回合 | 糖化温度+酒花投放时机 |
| 🥃 威士忌 | 5 | ≥13回合 | 强制8回合桶陈才能出售 |

### 胜负条件
- **30回合决胜**：综合分 = 声望×0.5 + 总资产×0.3 + 夺冠次数×0.2
- **酿酒大师成就**：声望超过其他所有人总和 → 提前胜利
- **破产淘汰**：连续5回合资不抵债 → 退出游戏

## 📡 网络协议

### WebSocket消息类型

**客户端 → 服务端**
```typescript
CREATE_ROOM / JOIN_ROOM / LEAVE_ROOM / START_GAME
CHAT / SUBMIT_BID / BREWING_ACTION
LIST_FOR_SALE / ENTER_COMPETITION / REQUEST_STATE
```

**服务端 → 客户端（广播）**
```typescript
ROOM_* / PLAYER_* / GAME_* / PHASE_CHANGED / STATE_UPDATED
CHAT_MESSAGE / AUCTION_RESULT / SALES_RESULT / COMPETITION_RESULT
```

所有玩家操作通过WebSocket提交到服务端统一结算，结果广播给所有客户端。

## 🎨 UI布局

```
┌─────────────────────────────────────────────────────────────┐
│  🍷 房间名   第X/30回合   [阶段倒计时]   💰金币 ⭐声望 🏆冠军 │
├──────────┬───────────────────────────────────┬──────────────┤
│ 🏭 我的产线│ 🛒 原料 | 🍺 酿造 | 💸 销售 | 🏆 赛 | ⚙️ 升级  │ 🏆 排行榜
│ 批次列表  │                                              │
│ - 批次1   │           [当前选项卡内容]                    │ 💬 房间聊天
│ - 批次2   │                                              │
│           │                                              │ 📈 市场行情
│ 🛢 桶库    │                                              │
│ - 法桶x2  │                                              │
│ - 美桶x1  │                                              │
│           │                                              │
│ 🍾 成品库 │──────────────────────────────────────────────│
│ - 酒A 88分│ 📜 事件日志                                   │
│ - 酒B 72分│ - R3 名厨驾临！高端需求激增                   │
└──────────┴───────────────────────────────────────────────┴──────────────┘
```

## 📝 License

MIT License
