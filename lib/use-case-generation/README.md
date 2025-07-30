# Use Case Generation System

This system automatically analyzes chat messages to identify and categorize use cases, helping to understand how users are interacting with the system.

## Overview

The system processes unprocessed messages from the database, groups them by chat, and either:
1. Merges them into existing use cases if they're part of the same conversation
2. Creates new use cases if they represent new topics
3. Categorizes all use cases into broader functional categories

## Architecture

The system follows a modular, service-oriented architecture with clear separation of concerns:

```
lib/use-case-generation/
├── index.ts              # Main entry point and exports
├── interfaces.ts         # Core interfaces and types
├── orchestrator.ts       # Main orchestrator class
├── stages.ts            # Pipeline stage implementations
├── types.ts             # Type definitions
├── utils.ts             # Shared utilities
└── services/            # Service implementations
    ├── categorizer-service.ts
    ├── message-fetcher.ts
    ├── merger-service.ts
    ├── theme-generator.ts
    └── triage-service.ts
```

## Components

### 1. Orchestrator (`orchestrator.ts`)

The `UseCaseGenerationOrchestrator` is the main coordinator that:
- Manages the execution of stages
- Maintains the generation context
- Handles error reporting
- Provides progress updates

### 2. Stages (`stages.ts`)

The system is divided into 5 sequential stages:

1. **Fetch and Group Messages**
   - Fetches unprocessed messages from the database
   - Groups them by chat ID
   - Gets latest use cases for each chat

2. **Triage Messages**
   - Decides whether messages should be:
     - Merged into existing use cases
     - Used to create new use cases

3. **Merge Messages**
   - Merges messages into existing use cases
   - Updates database records

4. **Generate Themes**
   - Creates new use cases from messages
   - Uses AI to analyze conversation themes
   - Saves new use cases to database

5. **Categorize Use Cases**
   - Assigns categories to uncategorized use cases
   - Creates new categories when needed
   - Updates database with category assignments

### 3. Services

#### MessageFetcherService
- Fetches unprocessed messages from database
- Groups messages by chat
- Retrieves latest use cases for chats

#### UseCaseTriageService
- Determines if messages should be merged or generate new use cases
- Uses AI to analyze message context
- Makes merge decisions based on semantic similarity

#### UseCaseMergerService
- Merges messages into existing use cases
- Updates database records
- Handles message-to-use-case relationships

#### ThemeGeneratorService
- Generates new use cases from messages
- Uses AI to identify conversation themes
- Creates structured use case records

#### UseCaseCategorizerService
- Assigns categories to use cases
- Creates new categories when needed
- Uses AI to determine appropriate categories

### 4. Data Types

#### GenerationContext
- Maintains state between stages
- Contains:
  - Input parameters
  - Data containers
  - Counters for summary
  - Stage tracking
  - Progress reporting

#### GenerationProgress
- Tracks progress for UI updates
- Contains:
  - Current stage
  - Total stages
  - Stage name
  - Details
  - Error information

#### GenerationSummary
- Final results of the process
- Contains:
  - Total messages processed
  - New use cases created
  - Messages merged
  - Categories assigned
  - Error information

## Flow

1. **Initialization**
   ```typescript
   const orchestrator = new UseCaseGenerationOrchestrator();
   const summary = await orchestrator.generateTopUseCases();
   ```

2. **Stage Execution**
   - Each stage receives and updates the GenerationContext
   - Stages can report progress through callbacks
   - Errors are caught and reported

3. **Database Operations**
   - All database access goes through the `db` client in `utils.ts`
   - Transactions are used where appropriate
   - Retries are implemented for AI operations

4. **AI Integration**
   - Used for:
     - Theme generation
     - Merge decisions
     - Category assignment
   - Implements retry logic for reliability

## Usage

```typescript
import { generateTopUseCases } from '../lib/use-case-generation';

// Basic usage
const summary = await generateTopUseCases();

// With progress tracking
const summary = await generateTopUseCases('timeSaved', (progress) => {
  if (progress.details) console.log(progress.details);
});
```

## Error Handling

- Each stage implements error handling
- Errors are caught and reported in the GenerationSummary
- AI operations include retry logic
- Database operations use transactions where appropriate

## Configuration

The system can be configured through:
- Environment variables
- Constructor parameters for services
- Method parameters for the main function

## Dependencies

- Database: PostgreSQL with Drizzle ORM
- AI: Custom AI provider implementation
- Utilities: Shared utility functions for retries, logging, etc.

## Testing

Each component can be tested independently:
- Services can be tested with mock dependencies
- Stages can be tested with mock services
- The orchestrator can be tested with mock stages

## Future Improvements

- Add more sophisticated AI models
- Implement parallel processing for large datasets
- Add more detailed progress reporting
- Implement caching for performance
- Add more configuration options 

## Detailed Flow Description

### 1. Frontend Initiation
1. User clicks "Generate" button in the dashboard
2. Frontend component (`top-use-cases.tsx`) calls the `generateTopUseCases` function
3. Progress tracking is initialized with a callback to update the UI

### 2. Backend Processing Pipeline

#### Stage 1: Fetch and Group Messages
1. `MessageFetcherService` queries the database for unprocessed messages
2. Messages are grouped by their `chatId`
3. For each chat, the latest use case is retrieved
4. Progress is reported back to the frontend (e.g., "Fetching messages...")

#### Stage 2: Triage Messages
1. `UseCaseTriageService` analyzes each message group
2. For each group:
   - AI analyzes the message content and context
   - Decision is made whether to:
     - Merge with existing use case
     - Create new use case
3. Progress updates show triage decisions

#### Stage 3: Merge Messages
1. `UseCaseMergerService` processes messages marked for merging
2. For each merge operation:
   - Messages are linked to existing use cases
   - Use case metadata is updated
   - Messages are marked as processed
3. Progress shows number of messages merged

#### Stage 4: Generate Themes
1. `ThemeGeneratorService` processes messages marked for new use cases
2. For each new use case:
   - AI analyzes conversation to identify theme
   - Creates structured use case record with:
     - Title (e.g., "Research on Linas Kleiza's role and compensation")
     - Description
     - Type
     - Metadata
   - Links messages to the new use case
   - Marks messages as processed
3. Progress shows new use cases being created

#### Stage 5: Categorize Use Cases
1. `UseCaseCategorizerService` processes uncategorized use cases
2. For each use case:
   - AI determines appropriate category
   - Either:
     - Assigns to existing category
     - Creates new category if needed
3. Progress shows categorization results

### 3. Database Operations
Throughout the process:
1. All operations use the `db` client from `utils.ts`
2. Transactions ensure data consistency
3. Messages are marked as processed after successful handling
4. Use cases are created with proper relationships
5. Categories are created or updated as needed

### 4. Progress Reporting
1. Each stage reports progress through the callback
2. Frontend updates UI with:
   - Current stage
   - Progress details
   - Any errors
3. Progress includes:
   - Stage number and name
   - Detailed status messages
   - Counts of processed items

### 5. Completion
1. Final summary is generated with:
   - Total messages processed
   - New use cases created
   - Messages merged
   - Categories assigned
2. Summary is returned to frontend
3. Frontend updates UI with results
4. Any errors are reported and handled

### Example Flow
```
1. User clicks "Generate"
2. Frontend shows "Starting generation..."
3. Backend:
   - "Fetching messages..." (Stage 1)
   - "Analyzing 50 messages..." (Stage 2)
   - "Merging 20 messages..." (Stage 3)
   - "Creating new use cases..." (Stage 4)
     - "Created: Research on Linas Kleiza's role"
     - "Created: Sergej Maslobejev's Last Fight"
     - "Created: Inquiry about cepelinai"
   - "Categorizing use cases..." (Stage 5)
4. Frontend shows completion with summary
```

### Error Handling Flow
1. If any stage fails:
   - Error is caught and logged
   - Progress callback receives error details
   - Frontend shows error message
   - Process can be retried from failed stage
2. Database errors trigger rollback
3. AI errors trigger retry with exponential backoff
4. All errors are included in final summary 

## Debugging and Testing

To facilitate testing and debugging, especially with large datasets, you can control certain parameters using environment variables:

*   **`DEBUG_MAX_MESSAGES`**: Limits the *initial* number of unprocessed messages fetched from the database in Stage 1. This is useful for quickly testing the entire pipeline with a small sample.
    *   Example: `DEBUG_MAX_MESSAGES=50 node your_script.js`

*   **`DEBUG_THEME_CONCURRENCY`**: Overrides the default parallel worker count specifically for the theme generation stage (Stage 4).
    *   Example: `DEBUG_THEME_CONCURRENCY=2 node your_script.js`

*   **`DEBUG_CATEGORY_CONCURRENCY`**: Overrides the default parallel worker count specifically for the categorization stage (Stage 5).
    *   Example: `DEBUG_CATEGORY_CONCURRENCY=3 node your_script.js`

Additionally, some internal parameters like AI batch sizes (e.g., `BATCH_SIZE` in `categorizer-service.ts`) are defined as constants within the service files and can be adjusted directly in the code for fine-tuning. 