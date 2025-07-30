import { cleanupStaleOperations } from "@/lib/db/queries";

export default async function StartupCleanup() {
  const startTime = Date.now();

  try {
    console.log('🚀 [StartupCleanup] Starting stale operations cleanup...');

    await cleanupStaleOperations();

    const duration = Date.now() - startTime;
    console.log(`✅ [StartupCleanup] Cleanup completed successfully in ${duration}ms`);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [StartupCleanup] Cleanup failed after ${duration}ms:`, error);

    // Log additional context for debugging
    console.error('[StartupCleanup] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Don't throw the error to prevent breaking the app startup
    // Just log it and continue
  }

  return null; // This component renders nothing
}