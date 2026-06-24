# 全球 / 欧洲 EAN 商品条码 API 评估

本文用于 v0.2.1 商品条码 API 增强的供应商评估。当前阶段只做调研准备和真实
barcode 覆盖率记录，不正式接入第三方 API。

## 背景与当前问题

v0.2 已完成以下商品查询底座：

1. 先查询当前用户的 Supabase `products`。
2. 本地未命中时依次查询 Open Food Facts universal、Open Pet Food Facts 和
   普通 Open Food Facts。
3. 外部查询失败或资料不完整时允许用户手动补充。
4. 用户补充并保存后，相同 barcode 下次可直接复用本地商品资料。

真实验收确认本地复用闭环和同 barcode 多批次独立保存均可用。但用户测试两个
真实猫罐头 barcode 时，一个遇到商品信息服务异常，另一个只找到缺少名称的
商品记录。现有开放商品库可以作为兜底，尚不足以满足第一次扫码高概率识别商品
名称、品牌和图片的目标。

用户短期主要管理猫罐头，且多数是德国 / 欧洲进口猫罐头，条形码多为 `4`
开头。探数 API 对 3 个真实猫罐头样本均返回“此条码无数据”，当前样本命中率
为 0/3，暂不作为优先接入供应商。后续评估重点从“国内商品条码 API”调整为
“全球 / 欧洲 EAN 商品条码 API”，优先覆盖德国进口猫罐头。

## v0.2.1 目标

- 提高德国 / 欧洲进口猫罐头第一次扫码的自动匹配率，兼顾其他宠物食品和日常
  食品。
- 在正式接入前，用用户手头 5–10 个真实猫罐头 barcode 比较候选服务。
- 根据覆盖率、字段质量、价格和接入复杂度选择供应商。

## 非目标

- 不使用淘宝、京东或其他电商网站爬虫作为第一方案。
- 不在评估阶段申请或写入生产 API key。
- 不在 Vite 前端直接调用需要密钥的商业 API。
- 不实现图片上传、拍照或 AI 图片识别。
- 不改变 `products` 与 `inventory_batches` 分离的模型。

## 候选 API

候选服务需要以真实测试结果和届时的官方接口文档为准。

| 候选方向 | 重点验证 |
| --- | --- |
| Go-UPC | 德国 / 欧洲进口猫罐头、商品名、品牌、图片准确性 |
| Barcode Lookup | Go-UPC 未命中的精确商品、图片覆盖 |
| EAN-Search / EAN-Suche | 相近 pack、同品牌 suggested match、名称品牌兜底 |
| Open Food Facts universal | 免费兜底、开放数据覆盖、`product_type=all` |
| Open Pet Food Facts | 宠物食品免费兜底 |
| 探数 API 商品条码查询 | 当前样本 0/3 命中，暂不优先；仅保留后续对比 |
| 天聚数行 TianAPI 商品条码查询 | 字段完整度、图片链接是否稳定、未找到语义 |
| 腾讯云市场商品条码查询 / 专业版 | 名称、品牌、规格、厂家、图片和调用成本 |
| 聚合数据商品条码信息查询 | 商品名、参考价、未找到状态码和测试额度 |
| 阿里云市场相关服务 | 数据覆盖、字段映射、价格和鉴权方式 |
| 华为云连接器及其他服务 | 数据覆盖、稳定性和服务端代理可行性 |

## 当前样本测试结果

用户已测试 7 个真实猫罐头样本，重点比较 EAN-Search / EAN-Suche、Barcode
Lookup 和 Go-UPC。

| Barcode | 商品 | EAN-Search / EAN-Suche | Barcode Lookup | Go-UPC | 最佳来源 |
| --- | --- | --- | --- | --- | --- |
| 8005852121011 | 雪诗雅鸡肉鹌鹑蛋 80g | 相近条形码，产品正确；无图 | exact；图片准确 | exact；图片准确 | Barcode Lookup / Go-UPC |
| 9421016596942 | Ziwi 巅峰东海角猫罐头 170g | exact；无图 | exact；有图但不太准确 | exact；图片准确 | Go-UPC |
| 4027245008079 | MAC's Cat 6 x 200g - Veal & Turkey | exact；无图 | exact；图片准确 | exact；图片准确 | Barcode Lookup / Go-UPC |
| 42660688850571 | catz finefood Ragout 6 x 190g - Mixed Pack | 相近条形码，产品正确；无图 | 无 | 无 | EAN-Search |
| 4260165191630 | GRANATAPET Cat Limited 20th Anniversary Edition - Venison and Chicken Hearts with Salmon Oil | 品牌对，具体款不太对；无图 | exact；无图 | 无 | Barcode Lookup |
| 4255634604636 | MjAMjAM Cat - Duett - Hühnchen-Filet küsst Pferd \| 6 x 390 g | exact；无图 | 无 | exact；图片准确 | Go-UPC |
| 4250321825943 | Bettys Landhausküche Betty`s Frischebeutel Huhn & Forelle 6 X 400 G | 品牌对，具体款不太对；无图 | 品牌对，具体款不太对；图片准确 | exact；图片准确 | Go-UPC |

统计结论：

- Go-UPC：精确命中 5/7，准确图片 5/7；在 Barcode 2、6、7 上明显优于其他
  候选，当前最适合作为 v0.2.1 第一候选。
- Barcode Lookup：精确命中 4/7，有图片 4/7，准确图片 3/7；可以补 Go-UPC
  未命中的 Barcode 5，适合作为第二 fallback。
- EAN-Search / EAN-Suche：精确命中 3/7，多个未精确命中的样本能找到相近
  pack 或正确品牌；图片覆盖 0/7，适合做 `suggested_match` / 名称品牌兜底，
  不适合作为图片来源。
- 探数 API：此前 3 个猫罐头样本均返回“此条码无数据”，当前样本 0/3 命中，
  暂不作为优先接入供应商。

## 当前候选优先级

1. Go-UPC：第一候选，用于提高德国进口猫罐头的商品名和图片命中率。
2. Barcode Lookup：第二 fallback，用于补 Go-UPC 未命中的精确商品。
3. EAN-Search / EAN-Suche：第三 fallback，用于 `suggested_match`，不自动当成
   精确命中。
4. Open Food Facts / Open Pet Food Facts：保留免费兜底。
5. 国内商品条码 API：当前样本表现较弱，暂不优先。

v0.2.1 最小可用版本建议先只接 Go-UPC，降低复杂度。Barcode Lookup 和
EAN-Search / EAN-Suche 可作为后续 fallback 增强。

## 评估维度

1. 是否命中 barcode。
2. 是否返回商品名。
3. 是否返回品牌。
4. 是否返回图片。
5. 图片链接是否长期可用。
6. 是否支持进口商品。
7. 是否支持宠物食品。
8. 单次调用价格。
9. 免费测试额度。
10. 接入复杂度。
11. API key 是否可安全保存在服务端。
12. 返回状态是否容易区分 `not_found` 与服务错误。
13. 请求频率、每日限额和超额行为。
14. 服务条款是否允许当前自用场景。

## 真实 barcode 覆盖率测试模板

结果建议统一记录为：

- `found`：有可用商品名。
- `partial_found`：命中商品，但名称缺失；记录其他可用字段。
- `not_found`：服务正常响应但没有商品。
- `error`：网络、HTTP、解析或供应商业务错误；在备注中写明类型。

| Barcode | 商品类型 | 过期了是否可识别 | Open Food Facts | Open Pet Food Facts | Go-UPC | Barcode Lookup | EAN-Search | 探数 API | 最佳结果 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 待填 | 猫罐头 | 是/否 | found / partial_found / not_found | found / partial_found / not_found | 待测 | 待测 | 待测 | 待测 | 待定 | 待填 |
| 待填 | 猫罐头 | 是/否 | 待测 | 待测 | 待测 | 待测 | 待测 | 待测 | 待定 | 待填 |
| 待填 | 猫罐头 | 是/否 | 待测 | 待测 | 待测 | 待测 | 待测 | 待测 | 待定 | 待填 |
| 待填 | 猫罐头 | 是/否 | 待测 | 待测 | 待测 | 待测 | 待测 | 待测 | 待定 | 待填 |
| 待填 | 猫罐头 | 是/否 | 待测 | 待测 | 待测 | 待测 | 待测 | 待测 | 待定 | 待填 |

除命中状态外，每次测试还应记录：

| Barcode | 服务 | 商品名 | 品牌 | 图片 | 图片稳定性 | 规格/厂家 | 响应时间 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 待填 | 待填 | 有/无 | 有/无 | 有/无 | 待观察 | 有/无 | 待测 | 待填 |

## 推荐接入架构

```text
前端扫码 / 手输 barcode
↓
查询当前用户 Supabase products
↓
本地未命中
↓
调用 Supabase Edge Function: lookup-barcode-product
↓
Edge Function 读取服务端环境变量中的 API key
↓
请求选定的商品条码 API
↓
映射为统一 product lookup 格式
↓
商业 API 未命中时继续现有开放商品库 fallback
↓
前端预填或允许手动填写
```

未来查询顺序：

1. Supabase 本地 `products`
2. Go-UPC
3. Barcode Lookup
4. EAN-Search / EAN-Suche
5. Open Food Facts universal
6. Open Pet Food Facts
7. 普通 Open Food Facts
8. 手动填写

## API key 安全要求

- API key 不得写入前端源码。
- API key 不得使用 `VITE_` 前缀环境变量。
- API key 不得提交到 Git。
- API key 应配置为 Supabase Edge Function 的服务端 secret。
- Edge Function 只返回统一后的必要商品字段，不向浏览器透传供应商密钥或敏感
  响应信息。
- 日志不得记录完整密钥；错误信息不得把供应商鉴权信息返回前端。

## 统一返回格式草案

```js
{
  ok: true,
  status: 'found',
  product: {
    barcode,
    name,
    brand,
    imageUrl,
    category,
    source
  }
}
```

可继续复用以下状态：

- `exact_found`
- `found`
- `partial_found`
- `suggested_match`
- `not_found`
- `network_error`
- `http_error`
- `parse_error`

供应商特有状态应先在 Edge Function 中转换为统一状态，前端不直接依赖供应商
响应结构。

状态语义建议：

- `exact_found`：当前 barcode 精确命中，可自动预填。正式实现时可选择映射为
  现有 `found`，或新增状态以便前端展示更清晰。
- `partial_found`：当前 barcode 命中但字段不完整，可手动补。
- `suggested_match`：当前 barcode 未精确命中，但找到相近 pack / 同品牌疑似
  商品，需要用户确认。
- `not_found`：完全未找到。

`suggested_match` 不能自动保存为当前 barcode 的 `product`，必须用户确认后才能
使用，避免把相近 pack 或同品牌其他款错误绑定到当前条形码。

## 选型结论

状态：待定。

阶段性结论：Go-UPC 是当前 v0.2.1 第一候选，建议最小可用版本先只接 Go-UPC。
Barcode Lookup 适合作为第二 fallback，EAN-Search / EAN-Suche 适合作为
`suggested_match` 兜底。国内商品条码 API 在当前德国 / 欧洲进口猫罐头样本中
表现较弱，暂不优先。

正式接入前仍需根据以下优先级继续复核：

1. 商品名命中率。
2. 品牌和图片完整度。
3. 进口宠物食品覆盖率。
4. 图片稳定性。
5. 成本、限额和服务稳定性。
6. Edge Function 接入与字段映射复杂度。
