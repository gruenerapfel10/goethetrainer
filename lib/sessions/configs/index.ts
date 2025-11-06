import { SESSION_REGISTRY, SessionTypeEnum } from '../session-registry';
import { readingSessionConfig } from './reading-session.config';

// Register all session configs
SESSION_REGISTRY[SessionTypeEnum.READING] = readingSessionConfig;

// Export all configs
export { readingSessionConfig } from './reading-session.config';

// Export registry enum
export { SessionTypeEnum } from '../session-registry';
