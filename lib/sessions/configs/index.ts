import { SESSION_REGISTRY, SessionTypeEnum } from '../session-registry';
import { readingSessionConfig } from './reading-session.config';
import { listeningSessionConfig } from './listening-session.config';
import { writingSessionConfig } from './writing-session.config';
import { speakingSessionConfig } from './speaking-session.config';

// Register all session configs
SESSION_REGISTRY[SessionTypeEnum.READING] = readingSessionConfig;
SESSION_REGISTRY[SessionTypeEnum.LISTENING] = listeningSessionConfig;
SESSION_REGISTRY[SessionTypeEnum.WRITING] = writingSessionConfig;
SESSION_REGISTRY[SessionTypeEnum.SPEAKING] = speakingSessionConfig;

// Export all configs
export { readingSessionConfig } from './reading-session.config';
export { listeningSessionConfig } from './listening-session.config';
export { writingSessionConfig } from './writing-session.config';
export { speakingSessionConfig } from './speaking-session.config';

// Export registry enum
export { SessionTypeEnum } from '../session-registry';