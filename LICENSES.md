# 资产授权说明 / LICENSES

本项目使用的外部美术资产全部为 CC0（公有领域贡献），可商用、可修改、无需署名。

## 下载资产

| 资产 | 来源 | 授权 | 用途 |
|---|---|---|---|
| `public/assets/hdri/venice_sunset_1k.hdr` | [Poly Haven](https://polyhaven.com/a/venice_sunset) | CC0 | 黄昏 IBL 环境光（可选增强） |
| `public/assets/hdri/dikhololo_night_1k.hdr` | [Poly Haven](https://polyhaven.com/a/dikhololo_night) | CC0 | 夜晚 IBL 环境光（可选增强） |
| `public/assets/textures/Bricks074/` | [ambientCG](https://ambientcg.com/view?id=Bricks074) | CC0 | 砖墙 PBR（Color/Normal/Roughness） |
| `public/assets/textures/Concrete034/` | [ambientCG](https://ambientcg.com/view?id=Concrete034) | CC0 | 混凝土 PBR |
| `public/assets/textures/Metal026/` | [ambientCG](https://ambientcg.com/view?id=Metal026) | CC0 | 金属 PBR |
| `public/assets/textures/WoodFloor042/` | [ambientCG](https://ambientcg.com/view?id=WoodFloor042) | CC0 | 木地板 PBR |
| `public/assets/models/furniture-kit/` | [Kenney Furniture Kit](https://kenney.nl/assets/furniture-kit) | CC0 | 室内家具 GLB |
| `public/assets/models/nature-kit/` | [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) | CC0 | 树木/花草/蘑菇/雕像 GLB |

## 程序化兜底

所有外部资产均有程序化生成兜底：任意资产加载失败时自动切换到 Canvas 2D 程序化贴图与参数化几何，
不依赖网络也可完整运行。天空 / 立面 / 招牌 / 粒子 / 家具等主视觉全部为程序化生成（MIT，本项目代码）。

## 代码

本项目代码采用 MIT License。
