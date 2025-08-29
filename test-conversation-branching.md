# Conversation Branching Feature Test

## Overview
The conversation branching feature allows users to create branches from any point in a conversation, enabling exploration of different conversation paths.

## Features Implemented

1. **ConversationBranch Component** (`/components/conversation-branch.tsx`)
   - Branch selector dropdown showing all branches
   - Create new branch button
   - Branch switching functionality
   - Branch deletion (except main branch)
   - Automatic localStorage persistence

2. **Message-Level Branching**
   - Added branch button to MessageActions component
   - Branch from any message in the conversation
   - Creates a new branch with messages up to that point

3. **Branch Persistence**
   - Messages saved to localStorage per chat/branch
   - Branch metadata saved with creation/update times
   - Branch navigation preserves message history

## How to Test

1. **Create a Branch from Current Point**
   - Click the branch icon next to the branch selector
   - A new branch will be created with all current messages
   - You'll be redirected to the new branch

2. **Create a Branch from Specific Message**
   - Hover over any message in the conversation
   - Click the branch icon in the message actions
   - A new branch will be created up to that message
   - You'll be redirected to the new branch

3. **Switch Between Branches**
   - Click the branch selector dropdown
   - Select a different branch
   - The conversation will load with that branch's messages

4. **Delete a Branch**
   - Open the branch selector
   - Hover over a branch (not the main branch)
   - Click the trash icon to delete it

## Technical Implementation

- Branch data stored in localStorage with keys:
  - `branches-{chatId}`: List of all branches for a chat
  - `messages-{branchId}`: Messages for each branch
- Branches have unique IDs generated with UUID
- Parent-child relationship tracked for branch hierarchy
- Message count and timestamps tracked per branch