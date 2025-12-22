import { Hono } from 'hono';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthVariables } from '../middleware/auth.js';

const settings = new Hono<{ Variables: AuthVariables }>();

// Public endpoint for getting public settings (no auth required)
settings.get('/public', async (c) => {
  try {
    const settingsList = await prisma.setting.findMany({
      where: {
        key: {
          in: ['site_title', 'cdn_domain'],
        },
      },
    });

    const config: Record<string, string> = {
      site_title: 'MO GALLERY',
      cdn_domain: '',
    };

    settingsList.forEach((s) => {
      config[s.key] = s.value;
    });

    return c.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// All other settings endpoints are protected
settings.use('/*', authMiddleware);

settings.get('/', async (c) => {
  try {
    const settingsList = await prisma.setting.findMany();

    const config: Record<string, string> = {
      site_title: '',
      storage_provider: 'local',
      cdn_domain: '',
      r2_access_key_id: '',
      r2_secret_access_key: '',
      r2_bucket: '',
      r2_endpoint: '',
      github_token: '',
      github_repo: '',
      github_path: '',
    };

    settingsList.forEach((s) => {
      config[s.key] = s.value;
    });

    return c.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

settings.patch('/', async (c) => {
  try {
    const data = await c.req.json();

    const promises = Object.keys(data).map((key) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(data[key]) },
        create: { key, value: String(data[key]) },
      }),
    );

    await Promise.all(promises);

    // Return updated settings
    const settingsList = await prisma.setting.findMany();
    const config: Record<string, string> = {};

    settingsList.forEach((s) => {
      config[s.key] = s.value;
    });

    return c.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default settings;
