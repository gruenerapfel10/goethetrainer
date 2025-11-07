import { SESSION_REGISTRY, SessionTypeEnum } from '../session-registry';
import { readingSessionConfig } from './reading-session.config';

// Register reading session config
SESSION_REGISTRY[SessionTypeEnum.READING] = readingSessionConfig;

// Export reading config
export { readingSessionConfig } from './reading-session.config';

// Export registry enum
export { SessionTypeEnum } from '../session-registry';
