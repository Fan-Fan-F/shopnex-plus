# ShopNex Plus

> 自托管的开源 Shopify 替代方案增强版，面向跨境电商提供多币种定价、货币精度自适应、主题包架构安全校验与地址标准化结账。
> An enhanced self-hosted open-source Shopify alternative featuring multi-currency pricing, dynamic currency precision, theme package validation, and standardized cross-border checkout.

---

## 中文说明

### 项目介绍
ShopNex Plus 是基于开源电商系统 [shopnex](https://github.com/shopnex-ai/shopnex) 的二次开发增强版本。原项目提供了简洁纯粹的自托管电商中后台、Liquid 主题渲染和现代化应用架构。本项目在此基础上，重点针对跨境独立站出海场景下的多币种结算、非 2 位小数货币显示精度、第三方主题包安装安全性及国际地址校验等核心链路进行了实质性增强与缺陷修复。

### 核心功能与改进点（对应 CHANGES.md）

1. **跨境多币种定价与心理定价（Charm Pricing）规则引擎**：
   - 扩展了 `@shopnex/pricing`，构建了纯 TypeScript 实现的跨币种定价与换算模块 (`currencies.ts`)。
   - 动态识别全球标准货币小数位（支持日元/韩元等 0 位小数货币、巴林/科威特第纳尔等 3 位小数货币及标准 2 位小数货币）。
   - 支持基于基础货币的汇率表转换与 FX 风险浮动加价（FX Margin Buffer）。
   - 提供电商常用的心理定价取整（.99 / .95 / .00 尾数策略及无小数位货币百位心理取整）与整单定价输入快速换算器。
2. **修复 Admin-UI 与货币格式化工具对非 2 位小数货币的除数与解析缺陷**：
   - 彻底修复原版 `apps/admin-ui/src/lib/money.ts` 中无视币种无条件除以 100 与硬编码 2 位小数的缺陷。
   - 支持根据货币代码（如 JPY、KRW、BHD）自适应缩放展示与动态正则输入校验，彻底杜绝日元等 0 位小数货币在管理后台与结账页金额缩小 100 倍的严重 Bug。
3. **主题生态完整性校验与 Theme Package 架构安全检查器**：
   - 在 `@shopnex/theme` 中新增主题包整体架构校验器 (`validator.ts`)。
   - 严格防御路径穿越攻击（拦截 `../`、绝对路径与非法字符），实施安全目录白名单控制。
   - 检查核心必需模板（`layout/theme.liquid`、`templates/index.liquid` 等）与推荐模板完整性。
   - 校验 `config/settings_schema.json` 与 `settings_data.json` 配置合规性，并结合 Liquid 解析器批量扫描模板语法错误。
4. **优化跨境结账地址 ISO 3166-1 规范化与字段校验强化**：
   - 在 `@shopnex/cart` 中引入标准 ISO 3166-1 alpha-2 国家代码校验与地址结构化验证工具 (`address.ts`)。
   - 在生成订单和调用物流承运商（Carrier Services）前拦截非法国家代码与脏数据，规范化清理国际电话号码与邮政编码，显著增强结账事务鲁棒性。

### 快速开始

#### 环境要求
- Node.js 22.22+
- pnpm 10.7+
- 可选：PostgreSQL（开发环境内置 PGlite 嵌入式数据库，无需预装数据库即可直接跑通）

#### 安装与启动
```sh
# 1. 克隆并进入项目目录
git clone https://github.com/Fan-Fan-F/shopnex-plus.git
cd shopnex-plus

# 2. 安装项目依赖
pnpm install

# 3. 复制环境变量配置文件（可选，默认支持嵌入式数据库）
cp .env.example .env

# 4. 运行全套单元测试验证功能
pnpm test

# 5. 启动开发服务器（管理端 http://localhost:3000，主题端 http://localhost:4321）
pnpm dev

# 6. 生产打包构建
pnpm build
```

### 来源与致谢
本项目基于 [shopnex](https://github.com/shopnex-ai/shopnex) 二次开发，原项目由 shopnex-ai 以 MIT 许可证开源。

### 许可证
沿用原项目 MIT 许可证，全文详见根目录 [LICENSE](LICENSE)。

---

## English Version

### About The Project
ShopNex Plus is an enhanced fork of [shopnex](https://github.com/shopnex-ai/shopnex), a modern self-hosted open-source Shopify alternative. Built with TypeScript and a modular monorepo architecture, ShopNex Plus addresses critical cross-border e-commerce needs including multi-currency pricing calculations, non-2-decimal currency display bug fixes, theme package security validation, and ISO address standardization.

### Key Enhancements & Features (aligned with CHANGES.md)

1. **Cross-Border Multi-Currency Pricing & Charm Pricing Engine**:
   - Expanded `@shopnex/pricing` with pure math multi-currency conversion module (`currencies.ts`).
   - Dynamic currency fraction precision mapping (0 decimals for JPY/KRW, 3 decimals for BHD/KWD, 2 decimals for USD/EUR).
   - Exchange rate conversion with customizable FX margin volatility buffer.
   - Psychological charm pricing strategies (`.99`, `.95`, `.00`) and complete cart pricing input conversions.
2. **Fixed Non-2-Decimal Currency Formatting Bug in Admin UI**:
   - Resolved the issue in `apps/admin-ui/src/lib/money.ts` where amounts were unconditionally divided by 100.
   - Dynamic divisor and precision parsing prevent zero-decimal currencies (such as JPY) from displaying at 1/100th of their actual value in admin dashboard, invoices, and checkout screens.
3. **Theme Package Architecture & Security Validator**:
   - Introduced comprehensive theme package validation in `@shopnex/theme` (`validator.ts`).
   - Path traversal prevention against directory escape (`../`) and unauthorized root folders.
   - Validation for mandatory templates (`layout/theme.liquid`, `templates/index.liquid`), configuration schema (`config/settings_schema.json`), and integrated Liquid syntax diagnostics.
4. **Checkout Address ISO 3166-1 Standardization & Validation**:
   - Added address validation and ISO 3166-1 alpha-2 country code normalization in `@shopnex/cart` (`address.ts`).
   - Validates address inputs before order creation and carrier service quotation, preventing unhandled exceptions from downstream third-party shipping apps.

### Getting Started

#### Prerequisites
- Node.js 22.22+
- pnpm 10.7+
- Optional: PostgreSQL (embedded PGlite database is supported out of the box)

#### Installation & Development
```sh
# 1. Clone repository
git clone https://github.com/Fan-Fan-F/shopnex-plus.git
cd shopnex-plus

# 2. Install dependencies
pnpm install

# 3. Setup environment variables (optional for trial)
cp .env.example .env

# 4. Run test suites
pnpm test

# 5. Start dev server (Admin on :3000, Storefront on :4321)
pnpm dev

# 6. Production build
pnpm build
```

### Source & Acknowledgements
This project is a secondary development based on [shopnex](https://github.com/shopnex-ai/shopnex), originally developed by [shopnex-ai](https://github.com/shopnex-ai) and open-sourced under the MIT License.

### License
Licensed under the MIT License. See [LICENSE](LICENSE) for the full text.
