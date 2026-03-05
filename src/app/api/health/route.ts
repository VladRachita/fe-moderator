export const GET = () =>
    Response.json({ status: 'ok', timestamp: new Date().toISOString() });

export const runtime = 'nodejs';
