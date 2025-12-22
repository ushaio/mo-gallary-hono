# EXIF 信息功能说明

## 功能概述

系统现在会自动读取上传图片的 EXIF 元数据，并保存到数据库中。用户可以在管理后台和公开相册页面查看每张照片的详细拍摄参数。

## 支持的 EXIF 信息

### 相机信息
- **相机品牌** (cameraMake): 如 Canon, Nikon, Sony
- **相机型号** (cameraModel): 如 Canon EOS R5, Nikon Z9
- **镜头型号** (lens): 如 EF 24-70mm f/2.8L II USM

### 拍摄参数
- **焦距** (focalLength): 如 50mm, 85mm
- **光圈** (aperture): 如 f/2.8, f/5.6
- **快门速度** (shutterSpeed): 如 1/250s, 1/1000s
- **ISO** (iso): 如 100, 400, 3200
- **拍摄时间** (takenAt): 照片实际拍摄时间

### 位置信息
- **GPS 经纬度** (latitude, longitude): 拍摄地点坐标
  - 支持点击"在地图中查看"直接打开 Google Maps

### 其他信息
- **图片方向** (orientation): EXIF 方向值
- **编辑软件** (software): 如 Adobe Photoshop, Lightroom
- **完整 EXIF JSON** (exifRaw): 保存完整的 EXIF 数据，供高级功能使用

## 数据库结构

```prisma
model Photo {
  // ... 原有字段 ...

  // EXIF Information
  cameraMake      String?    // 相机品牌
  cameraModel     String?    // 相机型号
  lens            String?    // 镜头型号
  focalLength     String?    // 焦距
  aperture        String?    // 光圈
  shutterSpeed    String?    // 快门速度
  iso             Int?       // ISO 值
  takenAt         DateTime?  // 拍摄时间
  latitude        Float?     // GPS 纬度
  longitude       Float?     // GPS 经度
  orientation     Int?       // 图片方向
  software        String?    // 编辑软件
  exifRaw         String?    // 完整的 EXIF JSON 数据
}
```

## 使用方法

### 1. 上传带 EXIF 的照片

正常上传照片即可，系统会自动：
1. 提取 EXIF 信息
2. 保存到数据库
3. 生成缩略图

```bash
# 示例：使用手机或相机拍摄的原图上传
# 系统会自动读取：
# - 相机型号
# - 拍摄参数
# - GPS 位置
# - 拍摄时间
```

### 2. 查看 EXIF 信息

#### 管理后台
在管理后台 → 照片管理：
1. 将鼠标悬停在照片上
2. 点击 "详情" 按钮
3. 查看完整的照片信息和 EXIF 参数

#### 公开相册页面
在前端相册页面 (gallery)：
1. 点击任意照片打开大图详情
2. 在右侧边栏自动显示照片基本信息和 EXIF 参数
3. 如果照片包含 GPS 信息，可点击"在地图中查看"按钮

### 3. 前端显示

EXIF 信息显示包含：
- **基本信息**: 标题、分类、尺寸、上传时间
- **拍摄参数 (EXIF)**: 相机、镜头、光圈、快门、ISO、焦距、拍摄时间
- **位置信息**: GPS 坐标（如果有），可点击在地图中查看
- **其他信息**: 图片方向、编辑软件（如果有）

## 技术实现

### 后端 (Hono.js)

```typescript
// src/lib/exif.ts
import ExifReader from 'exifreader';

// 提取 EXIF 数据
export async function extractExifData(buffer: Buffer): Promise<ExifData>

// 格式化 EXIF 用于显示
export function formatExifForDisplay(exif: ExifData): Record<string, string>
```

### 上传流程

```typescript
// src/routes/photos.ts
photos.post('/admin/photos', async (c) => {
  // 1. 保存文件
  await writeFile(filepath, buffer);

  // 2. 提取 EXIF
  const exifData = await extractExifData(buffer);

  // 3. 生成缩略图
  await sharp(filepath).resize(...).toFile(thumbnailPath);

  // 4. 保存到数据库（包含 EXIF）
  await prisma.photo.create({
    data: {
      // ... 基本信息
      // EXIF 信息
      cameraMake: exifData.cameraMake,
      cameraModel: exifData.cameraModel,
      // ...
    }
  });
});
```

### 前端 (Next.js)

#### 管理后台 - ExifModal 组件
```tsx
// components/ExifModal.tsx
// 独立的模态框组件显示 EXIF 信息（用于管理后台）
<ExifModal photo={selectedPhoto} isOpen={isOpen} onClose={onClose} />
```

#### 公开相册页面 - 集成显示
```tsx
// app/gallery/page.tsx
// 点击照片打开详情模态框时，EXIF 信息自动显示在侧边栏
<div className="w-full lg:w-[30%] h-full border-l p-8 overflow-y-auto">
  {/* 基本信息 */}
  <div className="space-y-4">
    <h3>基本信息</h3>
    {/* 分辨率、文件大小、上传时间 */}
  </div>

  {/* EXIF 信息（如果存在）*/}
  {hasExifData && (
    <div className="space-y-4 pt-6 border-t">
      <h3>拍摄参数 (EXIF)</h3>
      {/* 相机、镜头、光圈、快门、ISO、焦距等 */}
      {/* GPS 地图链接 */}
    </div>
  )}
</div>
```

## 注意事项

### EXIF 隐私问题

⚠️ **重要**: EXIF 数据可能包含敏感信息：
- GPS 位置可能暴露拍摄地点（如家庭地址）
- 拍摄时间可能泄露行踪

**建议**:
1. 上传前使用图片编辑软件移除 EXIF（如有隐私担忧）
2. 或在系统中添加"移除 GPS"选项
3. 公开展示时可以选择性隐藏某些字段

### 没有 EXIF 的情况

以下情况图片可能没有 EXIF：
- 截图
- 经过社交媒体处理的图片（微信、微博会移除 EXIF）
- 使用图片编辑软件保存时选择"移除元数据"
- PNG 图片（通常不包含 EXIF）

系统会妥善处理这些情况，显示"此照片没有 EXIF 信息"。

## 迁移说明

### 已有数据

如果数据库中已有照片，它们的 EXIF 字段将为 `null`。可以选择：
1. 保持现状（不影响使用）
2. 重新读取现有图片文件的 EXIF（需要开发迁移脚本）

### 迁移脚本示例

```typescript
// 可选：为现有照片补充 EXIF
import { prisma } from './src/lib/prisma.js';
import { extractExifData } from './src/lib/exif.js';
import { readFile } from 'fs/promises';

async function migrateExif() {
  const photos = await prisma.photo.findMany({
    where: { cameraMake: null } // 只处理没有 EXIF 的照片
  });

  for (const photo of photos) {
    try {
      const filepath = `./public${photo.url}`;
      const buffer = await readFile(filepath);
      const exifData = await extractExifData(buffer);

      await prisma.photo.update({
        where: { id: photo.id },
        data: exifData
      });

      console.log(`✓ Updated EXIF for: ${photo.title}`);
    } catch (error) {
      console.log(`✗ Failed for: ${photo.title}`, error.message);
    }
  }
}

migrateExif();
```

## 扩展功能建议

### 1. ✅ 前台展示 EXIF（已实现）

画廊查看大图时自动显示拍摄参数：
```tsx
// app/gallery/page.tsx
// 已在相册页面的照片详情模态框中实现
// 点击照片打开详情时，右侧边栏会显示完整的 EXIF 信息
```

### 2. 按 EXIF 搜索/筛选

```typescript
// 搜索某个相机拍摄的照片
const photos = await prisma.photo.findMany({
  where: { cameraModel: { contains: 'Canon' } }
});

// 搜索特定 ISO 范围
const photos = await prisma.photo.findMany({
  where: { iso: { gte: 1600 } }
});
```

### 3. EXIF 统计

显示常用器材：
```typescript
// 最常用的相机
const camerasStats = await prisma.photo.groupBy({
  by: ['cameraModel'],
  _count: true,
  orderBy: { _count: { cameraModel: 'desc' } }
});
```

### 4. 地图视图

基于 GPS 信息创建照片地图：
```tsx
<PhotoMap photos={photosWithGPS} />
```

## 测试建议

1. **测试各种来源的照片**:
   - 手机拍摄（iPhone, Android）
   - 相机拍摄（Canon, Nikon, Sony）
   - 截图（应该没有 EXIF）
   - 编辑后的照片

2. **验证 GPS 功能**:
   - 使用手机拍摄的照片（通常包含 GPS）
   - 点击"在地图中查看"确认位置正确

3. **检查隐私**:
   - 确认不希望公开的 EXIF 信息被适当隐藏
   - 考虑添加"移除 GPS"功能

## 故障排除

### EXIF 读取失败

如果上传照片后没有 EXIF 信息：
1. 检查后端日志中的警告信息
2. 确认图片格式（JPEG 通常有 EXIF，PNG 一般没有）
3. 使用其他工具验证图片是否真的包含 EXIF

### GPS 坐标不显示

常见原因：
- 照片没有 GPS 数据（相机通常不记录 GPS）
- 手机拍照时关闭了位置服务
- 照片经过处理已移除 GPS

## 性能考虑

- EXIF 提取在上传时同步进行，仅增加约 50-200ms
- EXIF 数据存储为单独字段，查询性能不受影响
- `exifRaw` JSON 字段用于存储完整数据，未来可扩展
