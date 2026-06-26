# Backlog

本文件记录近期执行优先级、下一步候选任务和暂不实施事项。长期版本方向放在
`docs/ROADMAP.md`；条码 API 的详细评估放在
`docs/BARCODE_API_EVALUATION.md`；数据模型约束放在 `docs/DATA_MODEL.md`。

以下功能有价值，但暂不纳入当前版本路线的近期交付范围：

- 家庭共享
- 原生 iOS / Android App
- AI 图片识别
- 电商比价
- 营养分析
- 复杂购物清单
- 多人权限管理
- 匿名账号绑定邮箱、账号恢复与跨设备同步入口
- v0.2.1 手机浏览器相机兼容性修补（仅在真实扫码验收发现问题时启动）

## 后续优先事项

### v0.2.2：商品信息编辑与分类校正

Go-UPC Edge Function 线上验收已确认 barcode `4255634604636` 可以成功预填
商品名、品牌和图片；保存后再次输入同 barcode 能本地复用，同 barcode 不同
到期日也能创建独立库存批次。验收同时暴露两个后续体验问题，建议作为 v0.2.2
候选处理。

目标：

- 允许用户修正已保存的 `products` 商品主数据。
- 避免把第三方 API 返回的泛化分类自动保存为不准确的本地分类。
- 保持商品编辑只影响 `products`，不改变 `inventory_batches` 的独立批次模型。

候选范围：

- 商品信息编辑：允许编辑商品名、品牌、分类和图片链接。
- 同 barcode 的库存批次继续引用同一个 `product`；修改 `products` 后，所有同
  barcode 库存批次展示同步更新。
- 分类校正：Go-UPC / 外部 API 的 category 只作为参考；像 `Snack Foods` 这类
  对宠物食品过于泛化或不准确的分类，不应直接自动保存为用户本地分类。
- 分类确认：可考虑保存前让用户确认 API 分类，或仅在分类置信度足够高、符合
  本地分类语义时自动填入。

非目标：

- 不合并同 barcode 的库存批次。
- 不改变 `products` 与 `inventory_batches` 分离的数据模型。
- 不在本事项中接 Barcode Lookup、EAN-Search 或 `suggested_match`。

### v0.2.1：商品条码 API 增强：优先覆盖德国进口猫罐头

Open Food Facts / Open Pet Food Facts 对中文商品、进口猫罐头和宠物食品覆盖率
不足。v0.2 已建立扫码、本地商品复用和外部查询底座，但第一次扫码的自动匹配率
仍需提升。

用户短期主要管理德国 / 欧洲进口猫罐头，条形码多为 `4` 开头。探数 API
此前 3 个真实猫罐头样本 0/3 命中，暂不作为优先接入供应商；Go-UPC、Barcode
Lookup 和 EAN-Search / EAN-Suche 对当前 7 个样本更有效。

目标：

- 提高德国 / 欧洲进口猫罐头第一次扫码自动匹配商品名、品牌和图片的成功率。
- 接入前先使用用户手头 5–10 个真实猫罐头 barcode 测试候选服务覆盖率。

长期建议查询顺序：

1. Supabase 本地 `products`
2. Go-UPC
3. Barcode Lookup
4. EAN-Search / EAN-Suche
5. Open Food Facts universal
6. Open Pet Food Facts
7. 普通 Open Food Facts
8. 手动填写

当前 v0.2.1 最小接入方向：

- Go-UPC：已作为第一接入供应商，用于提高德国进口猫罐头的商品名和图片命中率。
- Open Food Facts / Open Pet Food Facts：保留免费兜底。

后续候选方向：

- Barcode Lookup：第二 fallback，用于补 Go-UPC 未命中的精确商品，暂不接入。
- EAN-Search / EAN-Suche：第三 fallback，用于 `suggested_match`，不自动当成
  精确命中，暂不接入。
- 国内商品条码 API：当前样本表现较弱，暂不优先。

商业商品条码 API 通常需要 API key。密钥不得放入 Vite 前端代码，后续应通过
Supabase Edge Function 代理调用第三方条码 API。

v0.2.1 最小可用版本先只接 Go-UPC，降低复杂度。Barcode Lookup 和
EAN-Search / EAN-Suche 可作为后续 fallback 增强。

实施拆分：

- `v0.2.1-a`：使用
  `docs/BARCODE_API_EVALUATION.md` 完成候选全球 / 欧洲 EAN 商品条码 API 覆盖率评估。
- `v0.2.1-b`：确定供应商、成本边界、错误语义和统一字段映射。
- `v0.2.1-c`：实现 Supabase Edge Function `lookup-barcode-product`，由服务端
  secret `GO_UPC_API_KEY` 提供 API key。
- `v0.2.1-d`：前端在本地 `products` 未命中后接入 Edge Function，并保留现有
  开放商品库 fallback。
- `v0.2.1-e`：使用真实猫罐头 barcode 做命中率、字段完整性和多批次回归测试。

当前进入 `v0.2.1-c` / `v0.2.1-d`：供应商已确定为 Go-UPC，正式接入通过
Supabase Edge Function 完成；Barcode Lookup、EAN-Search / EAN-Suche 和
`suggested_match` 仍留待后续。

### 商品图片上传 / 拍照

手动填写图片 URL 不符合主要使用习惯。后续版本可实现：

```text
用户拍照或选择图片
↓
前端压缩图片
↓
上传到 Supabase Storage
↓
保存图片 URL 到 products.image_url
↓
下次同 barcode 本地命中时复用图片
```

该能力需要设计 Storage bucket、上传权限、图片压缩和 Storage RLS，不属于
v0.2 范围。

## 说明

扫码不属于长期 backlog。摄像头扫描条形码、手动输入条形码和商品信息自动
填充已在 v0.2 实现；真实设备特有的兼容性问题再进入 v0.2.1。
