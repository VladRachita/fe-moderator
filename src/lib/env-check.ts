const required = ['AUTH_CLIENT_ID', 'AUTH_COOKIE_SECRET'];

export const validateEnv = () => {
    // Skip validation during build-time static generation (env vars not available)
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        return;
    }
    const missing = required.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};
