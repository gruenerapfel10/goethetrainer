import { SESSION_REGISTRY, SessionTypeEnum } from '../session-registry';
import { readingSessionConfig } from './reading-session.config';
import { writingSessionConfig } from './writing-session.config';

// Register reading session config
SESSION_REGISTRY[SessionTypeEnum.READING] = readingSessionConfig;
SESSION_REGISTRY[SessionTypeEnum.WRITING] = writingSessionConfig;

// Export reading config
export { readingSessionConfig } from './reading-session.config';
export { writingSessionConfig } from './writing-session.config';

// Export registry enum
export { SessionTypeEnum } from '../session-registry';
