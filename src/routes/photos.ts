import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthVariables } from '../middleware/auth.js';
import { extractExifData } from '../lib/exif.js';
import sharp from 'sharp';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const photos = new Hono<{ Variables: AuthVariables }>();

// Public endpoints
photos.get('/photos', async (c) => {
  try {
    const category = c.req.query('category');
    const limitStr = c.req.query('limit');
    const limit = limitStr ? parseInt(limitStr) : undefined;

    const where =
      category && category !== '全部'
        ? { categories: { some: { name: category } } }
        : {};

    const photosList = await prisma.photo.findMany({
      where,
      include: { categories: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const data = photosList.map((p) => ({
      ...p,
      category: p.categories.map((c) => c.name).join(','),
    }));

    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get photos error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

photos.get('/photos/featured', async (c) => {
  try {
    const photosList = await prisma.photo.findMany({
      where: { isFeatured: true },
      include: { categories: true },
      take: 6,
      orderBy: { createdAt: 'desc' },
    });

    const data = photosList.map((p) => ({
      ...p,
      category: p.categories.map((c) => c.name).join(','),
    }));

    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get featured photos error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

photos.get('/categories', async (c) => {
  try {
    const categories = await prisma.category.findMany({
      select: { name: true },
    });

    const data = categories.map((c) => c.name);

    return c.json({
      success: true,
      data: ['全部', ...data],
    });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Protected endpoints
photos.use('/admin/*', authMiddleware);

photos.post('/admin/photos', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const storageProvider = formData.get('storage_provider') as string;
    const storagePath = formData.get('storage_path') as string;

    if (!file || !title) {
      return c.json({ error: 'File and title are required' }, 400);
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate random filename
    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    const ext = path.extname(file.name);
    const filename = `${randomName}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    // Get metadata
    const metadata = await sharp(filepath).metadata();

    // Extract EXIF data
    const exifData = await extractExifData(buffer);

    // Generate thumbnail
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailPath = path.join(uploadsDir, thumbnailFilename);

    await sharp(filepath)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    // Get default storage provider from settings if not provided
    let finalProvider = storageProvider || 'local';
    if (!storageProvider) {
      const settings = await prisma.setting.findUnique({
        where: { key: 'storage_provider' },
      });
      finalProvider = settings?.value || 'local';
    }

    // Split categories by comma and trim
    const categoriesArray = category
      ? category
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.length > 0)
      : [];

    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        title,
        url: `/uploads/${filename}`,
        thumbnailUrl: `/uploads/${thumbnailFilename}`,
        storageProvider: finalProvider,
        storageKey: storagePath ? `${storagePath}/${filename}` : filename,
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: buffer.length,
        isFeatured: false,
        // EXIF data
        cameraMake: exifData.cameraMake,
        cameraModel: exifData.cameraModel,
        lens: exifData.lens,
        focalLength: exifData.focalLength,
        aperture: exifData.aperture,
        shutterSpeed: exifData.shutterSpeed,
        iso: exifData.iso,
        takenAt: exifData.takenAt,
        latitude: exifData.latitude,
        longitude: exifData.longitude,
        orientation: exifData.orientation,
        software: exifData.software,
        exifRaw: exifData.exifRaw,
        categories: {
          connectOrCreate: categoriesArray.map((name: string) => ({
            where: { name },
            create: { name },
          })),
        },
      },
      include: { categories: true },
    });

    return c.json({
      success: true,
      data: {
        ...photo,
        category: photo.categories.map((c) => c.name).join(','),
      },
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

photos.delete('/admin/photos/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const photo = await prisma.photo.findUnique({
      where: { id },
    });

    if (photo) {
      // Delete files from disk if provider is local
      if (photo.storageProvider === 'local') {
        const filePath = path.join(process.cwd(), 'public', photo.url);
        if (existsSync(filePath)) {
          await unlink(filePath);
        }

        if (photo.thumbnailUrl) {
          const thumbnailPath = path.join(
            process.cwd(),
            'public',
            photo.thumbnailUrl,
          );
          if (existsSync(thumbnailPath)) {
            await unlink(thumbnailPath);
          }
        }
      } else {
        console.log(
          `Photo ${id} is stored on ${photo.storageProvider}, skipping local file deletion`,
        );
      }

      await prisma.photo.delete({
        where: { id },
      });
    }

    return c.json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    console.error('Delete photo error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

photos.patch('/admin/photos/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    
    const photo = await prisma.photo.update({
      where: { id },
      data: {
        title: body.title,
        isFeatured: body.isFeatured,
      },
      include: { categories: true }
    });

    return c.json({
      success: true,
      data: {
        ...photo,
        category: photo.categories.map((c) => c.name).join(','),
      },
    });
  } catch (error) {
    console.error('Update photo error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default photos;
