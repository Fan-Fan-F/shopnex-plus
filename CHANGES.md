# ShopNex Plus 改进计划与变更记录 (CHANGES)

本项目基于原项目 [shopnex-ai/shopnex](https://github.com/shopnex-ai/shopnex) 进行二次开发（A 路线），严格遵循 MIT 许可证，保留原作者版权信息与提交历史。

针对原项目迭代年轻、在跨境电商多币种定价、非 2 位小数货币显示精度、主题生态结构包校验与跨境结账地址校验等方面的痛点与已知短板，规划并实施以下 4 项实质性改进：

---

## 改进项清单

### 1. 新功能：跨境多币种定价转换与心理定价（Charm Pricing）规则引擎
- **背景与痛点**：
  ShopNex 虽面向跨境独立站场景，但原 `modules/pricing` 仅支持店铺单一基础币种下的整数分值计算，完全缺少多币种汇率换算、货币小数位精度动态对齐、汇率风险溢价（FX Margin Buffer）以及跨境电商常用的心理定价/尾数取整（如 .99 / .95 / .00 规则）能力。
- **涉及文件**：
  - `modules/pricing/src/currencies.ts`（新建）
  - `modules/pricing/src/index.ts`（导出多币种定价模块与类型）
  - `modules/pricing/tests/currencies.test.ts`（新建单元测试）
- **具体做法**：
  1. 实现 `getCurrencyDecimals`，精准映射国际标准货币的小数位数（如 JPY/KRW/VND 为 0 位，BHD/KWD/OMR 为 3 位，USD/EUR/GBP/CNY 为 2 位）。
  2. 实现 `convertMoney`，支持基于汇率表及可选浮动加价（FX Margin Buffer，如 2% 汇率波动保底）将金额在基础币种与目标展示币种间精确转换。
  3. 实现 `roundToCharm` 心理定价算法，支持标准取整（`none`）、.99 尾数定价、.95 尾数定价、.00 整数定价，并智能适配 0 位小数货币（如日元百位/十位心理尾数）。
  4. 实现 `convertPricingInput`，将整笔订单的商品明细行、运费、固定折扣等一站式换算为目标货币下的定价计算输入。
  5. 补充全面单元测试，覆盖基础换算、溢价比例、各种舍入策略与极端边界。

### 2. 修 Bug：修复 Admin-UI 与货币格式化工具对非 2 位小数货币的除数与输入解析缺陷
- **背景与痛点**：
  在 `apps/admin-ui/src/lib/money.ts` 中，`formatMoney`、`toCents` 和 `formatCentsInput` 均无条件硬编码了 `/ 100` 与 `toFixed(2)`。当商户使用 0 位小数货币（如 JPY 日元、KRW 韩元）时，1000 日元在后台会被错误地除以 100 显示为 `¥10.00`；对于 3 位小数货币（如 BHD 巴林第纳尔、KWD 科威特第纳尔）也会产生缩水与精度失真。此外，输入解析没有按照货币自身精度限制小数位。
- **涉及文件**：
  - `apps/admin-ui/src/lib/money.ts`（修改）
  - `apps/admin-ui/tests/money.test.ts`（更新并扩充测试用例）
- **具体做法**：
  1. 在 `apps/admin-ui/src/lib/money.ts` 引入动态货币小数位解析，`formatMoney` 根据 `Intl.NumberFormat` 或货币代码动态决定除数（$10^0$、$10^2$、$10^3$），保证 JPY 1000 显示为 ¥1,000，BHD 1000 显示为 1.000 BD。
  2. 重构 `toCents` 与 `formatCentsInput`，支持传入可选货币代码 `currency`，依据对应精度进行小数位数校验、解析与文本回显，向后兼容默认 2 位小数。
  3. 扩充 `apps/admin-ui/tests/money.test.ts` 单测用例，覆盖 0 位、2 位与 3 位小数货币的格式化和输入反解。

### 3. 新功能：主题生态完整性校验与 Theme Package 架构安全检查器
- **背景与痛点**：
  原 `modules/theme` 仅提供了单个文件的 Liquid 模板语法校验（`checkLiquid`），缺少对主题包（Theme Package）整体目录结构、必需模板（如 `layout/theme.liquid`、`templates/index.liquid` 等）、路径遍历注入防御（防 `../` 越界注入与非白名单路径）、以及 `settings_schema.json` 规范结构的检查。商户安装未经验证的主题包极易引发前台白屏或潜在安全问题。
- **涉及文件**：
  - `modules/theme/src/validator.ts`（新建）
  - `modules/theme/src/index.ts`（导出校验模块与类型）
  - `modules/theme/package.json`（补全 test 命令配置）
  - `modules/theme/tests/validator.test.ts`（新建单元测试）
- **具体做法**：
  1. 定义主题标准目录架构（`layout/`, `templates/`, `sections/`, `snippets/`, `assets/`, `config/`, `locales/`）。
  2. 实现安全路径过滤，严格防御目录遍历攻击（如 `../`、绝对路径 `/`、非法控制字符）。
  3. 检查主题必需核心文件与推荐文件，支持缺失警告与阻断性错误区分。
  4. 实现 `config/settings_schema.json` JSON 结构合规性验证。
  5. 集成 Liquid 语法检查器，对包内所有 `.liquid` 文件进行批量静态语法扫描并汇聚结构化诊断结果 `validateThemePackage`。

### 4. 优化现有功能：跨境结账地址 ISO 3166-1 规范化与字段校验强化
- **背景与痛点**：
  原 `modules/cart/src/checkout.ts` 中的 `toMailingAddress` 仅执行了简单的 `.trim()`，国家代码未验证是否属于合法的 ISO 3166-1 alpha-2 格式（两个字母），邮编与电话未作标准化清理。当非法国家码或脏数据进入数据库并透传给下游物流 Carrier Services（如 Shippo、CJ Dropshipping）或支付渠道时，容易引起下游接口抛出未捕获异常。
- **涉及文件**：
  - `modules/cart/src/address.ts`（新建）
  - `modules/cart/src/checkout.ts`（修改：集成规范化与前置校验）
  - `modules/cart/src/index.ts`（导出地址校验方法与工具）
  - `modules/cart/src/errors.ts`（修改：新增 `INVALID_SHIPPING_ADDRESS` 错误码）
  - `modules/cart/tests/address.test.ts`（新建单元测试）
- **具体做法**：
  1. 新增国家代码验证与标准化工具 `isValidCountryCode`、`normalizeCountryCode`（严格基于 ISO 3166-1 规则，拦截长度不符或非字母字符）。
  2. 实现结构化地址验证器 `validateMailingAddress`，对必需字段（姓名、address1、城市、国家码）进行非空与长度安全校验，清洗电话与邮编空白。
  3. 在 `checkout.ts` 的 `toMailingAddress` 中引入国家码规范化，若国家代码不合规及时抛出结构化 `CartError('INVALID_SHIPPING_ADDRESS', ...)`，防止脏数据渗透。
  4. 补充针对地址格式校验、清洗和异常拦截的单元测试。

---

## 自测记录

### 1. 依赖安装与构建环境自测
- **自测命令**：`pnpm install`
- **执行环境**：Linux 6.6.137+ / Node.js v24.22.1 / pnpm 10.7.1
- **自测结果**：通过（1092 个依赖包下载安装成功，用时 4m 20.5s，fumadocs-mdx 生成成功，退出码 0）。

### 2. 改进模块专项单元测试
- **多币种定价模块测试**：
  - **自测命令**：`pnpm --filter @shopnex/pricing test`
  - **自测结果**：通过。53 个测试用例全数通过（53 pass, 0 fail），覆盖基础计算、折扣规则、税率分摊、小数位判定（JPY 0 位、BHD 3 位、USD 2 位）、心理定价取整（.99 / .95 / .00）以及汇率与溢价换算。
- **Admin-UI 货币格式化与解析测试**：
  - **自测命令**：`pnpm --filter @shopnex/admin-ui test`
  - **自测结果**：通过。21 个测试用例全数通过（21 pass, 0 fail），包含 JPY 无小数位正确展示与输入反解、BHD 3 位小数精准解析与回显、USD 默认 2 位小数兼容、权限隔离与 OAuth 错误映射。
- **主题包架构与安全性校验模块测试**：
  - **自测命令**：`pnpm --filter @shopnex/theme test`
  - **自测结果**：通过。12 个测试用例全数通过（12 pass, 0 fail），覆盖目录安全白名单、路径穿越攻击拦截、必需模板缺失诊断、Liquid 语法错误捕捉及 JSON 配置校验。
- **跨境结账与地址校验测试**：
  - **自测命令**：`pnpm --filter @shopnex/cart test`
  - **自测结果**：通过。19 个测试用例全数通过（19 pass, 0 fail），涵盖 ISO 3166-1 alpha-2 规范化校验、异常地址拦截、弃购邮件队列、嵌入式 PGlite 数据库结账事务及订单生命周期处理。

### 3. 类型安全检查 (TypeScript Typecheck)
- **自测命令**：
  - `pnpm --filter @shopnex/pricing typecheck` -> 退出码 0
  - `pnpm --filter @shopnex/theme typecheck` -> 退出码 0
  - `pnpm --filter @shopnex/cart typecheck` -> 退出码 0
  - `pnpm --filter @shopnex/admin-ui typecheck` -> 退出码 0

### 4. 生产构建打包自测
- **自测命令**：`pnpm build`（即 `pnpm --filter @shopnex/admin-ui build`）
- **自测结果**：通过（Vite 成功打包 client 与 server chunks，耗时 4.05s，产物生成至 `apps/admin-ui/dist/`，退出码 0）。

### 5. 全仓库核心单元测试回归
- **自测命令**：`pnpm test`（即 `pnpm -r --if-present --filter '!@shopnex/e2e' test`）
- **自测结果**：通过。覆盖全部 34 个子包/模块的自动化单元测试与 PGlite 嵌入式数据库测试，全部通过，无任何失败（退出码 0）。
  *注：`@shopnex/e2e` 为全链路浏览器自动化测试，需要外部独立 Postgres 实例与无头浏览器运行环境，根据项目既定工作流在单机隔离流水线中由单元与嵌入式数据库测试集验证核心逻辑。*
