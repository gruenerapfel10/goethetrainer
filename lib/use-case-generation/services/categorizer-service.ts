import type { IUseCaseCategorizer } from '../interfaces';
import { db, withRetry } from '../utils';
import { myProvider } from '../../ai/models';
import { useCase, useCaseCategory } from '../../db/schema';
import { eq, isNull } from 'drizzle-orm';
import { z } from 'zod/v3';
import { generateObject } from 'ai';

// Use environment variable for debug override
const DEBUG_CATEGORY_CONCURRENCY = process.env.DEBUG_CATEGORY_CONCURRENCY
  ? Number.parseInt(process.env.DEBUG_CATEGORY_CONCURRENCY, 10)
  : undefined;

// Controls how many use cases are sent to the AI in a single request during categorization.
// Adjust for debugging or performance tuning based on AI context limits and API latency.
const BATCH_SIZE = 20;

// Define specific result types for clarity
type AssignExistingResultType = {
  useCaseId: string;
  assignedCategoryId: string | null;
};

type GenerateNewResultType = {
  useCaseId: string;
  useCaseTitle: string;
  useExistingCategory: false;
  categoryTitle: string;
  categoryDescription: string;
};

// Define a more detailed progress callback type for internal use
type DetailedProgressCallback = (
  progressPercentage: number,
  details: string,
  subStage?: { current: number; total: number; name: string },
) => void;

export class UseCaseCategorizerService implements IUseCaseCategorizer {
  async categorizeUseCases(
    progressCallback?: DetailedProgressCallback,
  ): Promise<{
    assignedToExisting: number;
    assignedToNew: number;
    newCategories: number;
    error?: string;
  }> {

    let assignedToExistingCount = 0;
    let assignedToNewCount = 0;
    let newCategoriesCreatedCount = 0;
    // Determine concurrency limit, using debug override if available
    const baseConcurrencyLimit = 10; // Default concurrency
    const CONCURRENCY_LIMIT =
      DEBUG_CATEGORY_CONCURRENCY !== undefined &&
        !Number.isNaN(DEBUG_CATEGORY_CONCURRENCY)
        ? DEBUG_CATEGORY_CONCURRENCY
        : baseConcurrencyLimit;

    if (
      DEBUG_CATEGORY_CONCURRENCY !== undefined &&
      !Number.isNaN(DEBUG_CATEGORY_CONCURRENCY)
    ) {
      console.warn(
        `<<<< DEBUG: Using concurrency limit ${CONCURRENCY_LIMIT} (from DEBUG_CATEGORY_CONCURRENCY) >>>>`,
      );
    } else {
      console.log(`  Using concurrency limit: ${CONCURRENCY_LIMIT}`);
    }

    try {
      // === Phase 0: Setup ===
      const allExistingCategories = await db
        .select({
          id: useCaseCategory.id,
          title: useCaseCategory.title,
          description: useCaseCategory.description,
        })
        .from(useCaseCategory);

      const allUncategorizedUseCases = await db
        .select({
          id: useCase.id,
          title: useCase.title,
          description: useCase.description,
          type: useCase.type,
        })
        .from(useCase)
        .where(isNull(useCase.categoryId));
      const totalUseCasesToProcess = allUncategorizedUseCases.length;

      if (totalUseCasesToProcess === 0) {
        return { assignedToExisting: 0, assignedToNew: 0, newCategories: 0 };
      }

      const initialBatches = [];
      for (let i = 0; i < allUncategorizedUseCases.length; i += BATCH_SIZE) {
        initialBatches.push(allUncategorizedUseCases.slice(i, i + BATCH_SIZE));
      }

      // === Phase 1: Assign to Existing Categories ===
      const pass1BatchQueue = [...initialBatches];
      let pass1CurrentBatchNumber = 0;
      // Store results: { useCaseId: string, assignedCategoryId: string | null }[]
      const pass1Results: Array<{
        useCaseId: string;
        assignedCategoryId: string | null;
      }> = [];
      let pass1ProcessedCount = 0; // Track processed batches

      // Update worker to accept total batches and use callback
      const processPass1BatchWorker = async (
        workerId: number,
        totalBatches: number,
        callback?: DetailedProgressCallback,
      ) => {
        while (pass1BatchQueue.length > 0) {
          const batchNumber = ++pass1CurrentBatchNumber;
          const batch = pass1BatchQueue.shift();
          if (!batch) continue;

          console.log(
            `  Worker ${workerId} (Pass 1) starting Batch ${batchNumber}/${totalBatches} (${batch.length} use cases)...`,
          );
          try {
            const batchResults = await this.categorizeBatchWithAI(
              batch,
              allExistingCategories,
              'assign_existing',
            );
            // Explicitly cast and add results
            pass1Results.push(...(batchResults as AssignExistingResultType[]));
            pass1ProcessedCount++; // Increment processed count
            // Report progress after processing a batch
            if (callback) {
              const percentage = Math.round(
                (pass1ProcessedCount / totalBatches) * 100,
              );
              callback(
                percentage,
                `Processed batch ${pass1ProcessedCount}/${totalBatches}`,
                {
                  current: pass1ProcessedCount,
                  total: totalBatches,
                  name: 'Assigning Existing',
                },
              );
            }
          } catch (error) {
            console.error(
              `  Worker ${workerId} (Pass 1) failed on Batch ${batchNumber}:`,
              error,
            );
            // Optionally report failure/increment error count
          }
        }
      };

      // Report initial progress for Pass 1
      if (progressCallback) {
        progressCallback(
          0,
          'Starting Pass 1: Assigning to existing categories',
          {
            current: 0,
            total: initialBatches.length,
            name: 'Assigning Existing',
          },
        );
      }
      const pass1WorkerPromises = Array(CONCURRENCY_LIMIT)
        .fill(null)
        .map(
          (_, index) =>
            processPass1BatchWorker(
              index + 1,
              initialBatches.length,
              progressCallback,
            ), // Pass total batches and callback
        );
      await Promise.all(pass1WorkerPromises);

      // Process Pass 1 results: Separate matched and remaining use cases
      const updatesForExisting: { useCaseId: string; categoryId: string }[] =
        [];
      const remainingUseCaseIds = new Set<string>(); // Use case IDs that need new categories
      // Create a map of AI suggestions for easy lookup
      const pass1ResultsMap = new Map<string | undefined, string | null>();
      if (pass1Results && Array.isArray(pass1Results)) {
        pass1Results.forEach((r) => {
          if (r && typeof r.useCaseId === 'string') {
            // Ensure r and r.useCaseId are valid
            pass1ResultsMap.set(
              r.useCaseId,
              r.assignedCategoryId !== undefined ? r.assignedCategoryId : null,
            );
          }
        });
      }

      // Get a set of actual existing category IDs for validation
      const existingCategoryIds = new Set(
        allExistingCategories.map((cat) => cat.id),
      ); // Crucial for validation

      allUncategorizedUseCases.forEach((uc) => {
        const aiSuggestedCategoryId = pass1ResultsMap.get(uc.id);

        // Check if the AI suggested a category AND that category ID actually exists in our database
        if (
          aiSuggestedCategoryId &&
          existingCategoryIds.has(aiSuggestedCategoryId)
        ) {
          updatesForExisting.push({
            useCaseId: uc.id,
            categoryId: aiSuggestedCategoryId,
          });
        } else {
          // If AI returned null, a category name (which won't be in existingCategoryIds),
          // or an ID not in our database, it needs a new category.
          remainingUseCaseIds.add(uc.id);
        }
      });



      // Update DB for matched use cases (serially for simplicity, can be parallelized/batched further)
      // This loop will now only run if actual, valid existing categories were matched.
      if (updatesForExisting.length > 0) {

        for (const update of updatesForExisting) {
          try {
            await db
              .update(useCase)
              .set({ categoryId: update.categoryId, updatedAt: new Date() }) // update.categoryId is now a confirmed valid UUID
              .where(eq(useCase.id, update.useCaseId));
            assignedToExistingCount++;
          } catch (error) {
            // This error should ideally not happen now for the UUID issue if the logic above is correct
            console.error(
              `  Error updating use case ${update.useCaseId} with existing category ${update.categoryId}:`,
              error,
            );
          }
        }
      } else {
        console.log(
          `  No use cases were matched to existing categories in Pass 1.`,
        );
      }

      // === Phase 2: Generate New Category Suggestions for Remaining ===
      const remainingUseCases = allUncategorizedUseCases.filter((uc) =>
        remainingUseCaseIds.has(uc.id),
      );

      if (remainingUseCases.length === 0) {
        console.log(
          '\n--- Phase 2 & 3 Skipped: No remaining use cases require new categories. ---',
        );
      } else {
        console.log(
          `\n--- Phase 2: Generating & Assigning New Categories for ${remainingUseCases.length} Remaining Use Cases (Parallel) ---`,
        );

        // Re-batch the remaining use cases
        const pass2Batches = [];
        for (let i = 0; i < remainingUseCases.length; i += BATCH_SIZE) {
          pass2Batches.push(remainingUseCases.slice(i, i + BATCH_SIZE));
        }

        const pass2BatchQueue = [...pass2Batches];
        let pass2CurrentBatchNumber = 0;
        // Store results: { useCaseId: string, categoryTitle: string, categoryDescription: string }[]
        const pass2Results: Array<{
          useCaseId: string;
          useCaseTitle: string;
          categoryTitle: string;
          categoryDescription: string;
        }> = [];
        let pass2ProcessedCount = 0; // Track processed batches

        // Update worker to accept total batches and use callback
        const processPass2BatchWorker = async (
          workerId: number,
          totalBatches: number,
          callback?: DetailedProgressCallback,
        ) => {
          while (pass2BatchQueue.length > 0) {
            const batchNumber = ++pass2CurrentBatchNumber;
            const batch = pass2BatchQueue.shift();
            if (!batch) continue;

            try {
              // Pass empty array for existing categories as they are not needed for this mode
              const batchResults = await this.categorizeBatchWithAI(
                batch,
                [],
                'generate_and_assign_new',
              );

              // Filter results to match the expected structure for this phase (just in case AI doesn't adhere strictly)
              // Ensure type safety during mapping
              const validResults = (batchResults as GenerateNewResultType[])
                .filter(
                  (r) =>
                    !r.useExistingCategory &&
                    r.categoryTitle &&
                    r.categoryDescription !== undefined,
                )
                .map((r) => ({
                  useCaseId: r.useCaseId,
                  useCaseTitle: r.useCaseTitle, // Should exist based on GenerateNewResultType
                  categoryTitle: r.categoryTitle,
                  categoryDescription: r.categoryDescription,
                }));
              pass2Results.push(...validResults);
              pass2ProcessedCount++; // Increment processed count
              // Report progress after processing a batch
              if (callback) {
                const percentage = Math.round(
                  (pass2ProcessedCount / totalBatches) * 100,
                );
                callback(
                  percentage,
                  `Processed batch ${pass2ProcessedCount}/${totalBatches}`,
                  {
                    current: pass2ProcessedCount,
                    total: totalBatches,
                    name: 'Generating New',
                  },
                );
              }
            } catch (error) {
              console.error(
                `  Worker ${workerId} (Pass 2) failed on Batch ${batchNumber}:`,
                error,
              );
              // Optionally report failure/increment error count
            }
          }
        };

        // Report initial progress for Pass 2
        if (progressCallback) {
          progressCallback(0, 'Starting Pass 2: Generating new categories', {
            current: 0,
            total: pass2Batches.length,
            name: 'Generating New',
          });
        }
        const pass2WorkerPromises = Array(CONCURRENCY_LIMIT)
          .fill(null)
          .map(
            (_, index) =>
              processPass2BatchWorker(
                index + 1,
                pass2Batches.length,
                progressCallback,
              ), // Pass total batches and callback
          );
        await Promise.all(pass2WorkerPromises);

        // Process Pass 2 results: Identify unique new categories
        const proposedNewCategories = new Map<
          string,
          { title: string; description: string }
        >();
        pass2Results.forEach((result) => {
          if (!proposedNewCategories.has(result.categoryTitle)) {
            proposedNewCategories.set(result.categoryTitle, {
              title: result.categoryTitle,
              description: result.categoryDescription,
            });
          }
        });


        // Create unique new categories in DB (serially)

        const createdCategoryMap = new Map<string, string>(); // Map title -> new ID
        for (const [title, { description }] of proposedNewCategories) {
          // Check if category already exists (e.g., created in a previous run but failed update)
          const [existingCat] = await db
            .select({ id: useCaseCategory.id })
            .from(useCaseCategory)
            .where(eq(useCaseCategory.title, title))
            .limit(1);
          if (existingCat) {
            console.warn(
              `    Category "${title}" already exists (ID: ${existingCat.id}). Using existing ID.`,
            );
            createdCategoryMap.set(title, existingCat.id);
            continue; // Skip creation
          }

          try {
            const [newCategory] = await db
              .insert(useCaseCategory)
              .values({
                title,
                description,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              .returning({ id: useCaseCategory.id });

            if (newCategory?.id) {
              createdCategoryMap.set(title, newCategory.id);
              newCategoriesCreatedCount++;

            } else {
              console.warn(
                `    -> Failed to create or retrieve ID for category "${title}".`,
              );
            }
          } catch (error) {
            console.error(`    -> Error creating category "${title}":`, error);
          }
        }


        // Update remaining use cases with their assigned new category ID (serially)

        // BATCH UPDATE APPROACH
        const updatePromises: Promise<any>[] = [];
        let successfullyPreparedUpdates = 0;
        const updateStartTime = Date.now();

        for (const result of pass2Results) {
          const newCategoryId = createdCategoryMap.get(result.categoryTitle);
          if (newCategoryId) {
            // Prepare update promise, don't await here
            updatePromises.push(
              db
                .update(useCase)
                .set({ categoryId: newCategoryId, updatedAt: new Date() })
                .where(eq(useCase.id, result.useCaseId)),
            );
            successfullyPreparedUpdates++;
          } else {
            console.warn(
              `  Skipping update for UC ${result.useCaseId}: Could not find created category ID for title "${result.categoryTitle}".`,
            );
          }
        }

        if (updatePromises.length > 0) {

          try {
            await Promise.all(updatePromises);
            assignedToNewCount = successfullyPreparedUpdates; // Count successful preparations
            const updateEndTime = Date.now();

          } catch (error) {
            console.error(
              `  ❌ Error during batch update of use cases:`,
              error,
            );
            // Handle partial failures? For now, we log and continue, count might be inaccurate
            console.warn(
              `  ⚠️ Batch update failed. The count of updated use cases (${assignedToNewCount}) might be inaccurate.`,
            );
          }
           } else {
          console.log('  No use cases required updating.');
        }
      }

      // Final Summary
      return {
        assignedToExisting: assignedToExistingCount,
        assignedToNew: assignedToNewCount,
        newCategories: newCategoriesCreatedCount,
      };
    } catch (error) {
      console.error(
        '❌ CRITICAL ERROR in categorizeUseCases (Multi-Pass):',
        error,
      );
      return {
        assignedToExisting: assignedToExistingCount,
        assignedToNew: assignedToNewCount,
        newCategories: newCategoriesCreatedCount,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async categorizeBatchWithAI(
    useCaseBatch: Array<{
      id: string;
      title: string;
      description: string | null;
      type: string | null;
    }>,
    existingCategories: Array<{
      id: string;
      title: string;
      description: string | null;
    }>,
    mode: 'assign_existing' | 'generate_and_assign_new',
  ): Promise<(AssignExistingResultType | GenerateNewResultType)[]> {
    let prompt: string;
    let schema: z.ZodSchema<any>;

    if (mode === 'assign_existing') {
      // Schema for assigning to an EXISTING category or null
      const AssignExistingOrNullSchema = z.object({
        results: z.array(
          z.object({
            useCaseId: z.string(),
            assignedCategoryId: z
              .string()
              .nullable()
              .describe(
                'The ID of the best matching existing category, or null if none fit well.',
              ),
          }),
        ),
      });
      schema = AssignExistingOrNullSchema;

      prompt = `
I need you to categorize use cases from a business system by assigning them to the *most suitable EXISTING category* from the list provided.

For each use case in "USE CASES TO CATEGORIZE", find the *single best match* in the "EXISTING CATEGORIES" list based on its title, description, and type.

INSTRUCTIONS:
- Analyze the underlying purpose and function.
- If a use case clearly fits an existing category, provide that category's ID.
- **If NO existing category is a reasonably good fit, you MUST return null for 'assignedCategoryId'.** Do NOT try to force a bad match.
- Focus on finding the best semantic fit.

EXISTING CATEGORIES:
${existingCategories
          .map(
            (cat) =>
              `ID: ${cat.id}
Title: ${cat.title}
Description: ${cat.description || 'No description provided'}`,
          )
          .join('\n\n')}

USE CASES TO CATEGORIZE:
${useCaseBatch
          .map(
            (uc) =>
              `ID: ${uc.id}
Title: ${uc.title}
Type: ${uc.type || 'No type'}
Description: ${uc.description || 'No description provided'}`,
          )
          .join('\n\n')}

RESPONSE FORMAT:
You MUST respond with a JSON object containing a "results" array. Each item MUST have this EXACT structure:
{
  "useCaseId": "The ID of the use case being categorized",
  "assignedCategoryId": "The ID of the best matching existing category OR null if no good match exists"
}

EXAMPLE RESPONSE:
{
  "results": [
    {
      "useCaseId": "abc123",
      "assignedCategoryId": "existing-cat-id-docs"
    },
    {
      "useCaseId": "def456",
      "assignedCategoryId": null // No suitable existing category found
    },
    {
       "useCaseId": "ghi789",
       "assignedCategoryId": "existing-cat-id-hr"
    }
  ]
}

IMPORTANT RULES:
- Every use case ID from the input MUST appear exactly once in the output "results" array.
- The 'assignedCategoryId' MUST be either a valid ID from the 'EXISTING CATEGORIES' list or null.
`;
    } else {
      // mode === 'generate_and_assign_new'
      // Schema for creating a NEW category
      const CreateNewSchemaInternal = z.object({
        useCaseId: z.string(),
        useCaseTitle: z.string(),
        useExistingCategory: z.literal(false),
        categoryId: z.undefined().optional(),
        categoryTitle: z.string(),
        categoryDescription: z.string(),
      });

      const GenerateNewResponseSchema = z.object({
        results: z.array(CreateNewSchemaInternal),
      });
      schema = GenerateNewResponseSchema;

      prompt = `
Your primary goal is to analyze the provided use cases and assign them to **actionable, business-oriented categories**. These categories should provide clear insights to a business leader about *how* the AI is being used to deliver value, support specific business functions, or address particular operational needs.

For each use case:
1.  Understand its core purpose and the business context.
2.  Generate a concise \`categoryTitle\` that reflects a specific business activity, value proposition, or operational area.
3.  Write a \`categoryDescription\` that elaborates on the business value or function of this category.
4.  Aim for a balance: categories should be specific enough to be insightful but broad enough to group similar use cases.

**GUIDING PRINCIPLES FOR ACTIONABLE CATEGORIES:**
*   **Business Function Focus:** Emphasize the department or business process (e.g., "Sales Automation", "HR Operations", "Financial Analysis", "Customer Support Enhancement").
*   **Value/Outcome Driven:** Highlight the benefit (e.g., "Process Optimization", "Content Generation Efficiency", "Data-driven Decision Support", "Risk Mitigation").
*   **Task Specificity:** Be more specific than "General Queries" or "Information." Think about the *type* of task (e.g., "Automated Reporting", "Technical Troubleshooting", "Drafting Communications").
*   **User Role Context:** Consider who might be using this and for what purpose (e.g., "Developer Productivity Tools", "Marketing Campaign Support").

**EXAMPLES OF ACTIONABLE CATEGORY TITLES (and their descriptions):**

*   **Title:** "Sales - Lead Qualification & Enrichment"
    **Description:** "AI tools used by the sales team to automatically qualify incoming leads and enrich lead data for better targeting."
*   **Title:** "Marketing - Content Creation & Optimization"
    **Description:** "Generating and refining marketing copy, blog posts, social media updates, and other content to improve engagement and reach."
*   **Title:** "HR - Recruitment Process Automation"
    **Description:** "Streamlining recruitment tasks such as resume screening, interview scheduling, and candidate communication."
*   **Title:** "Finance - Financial Anomaly Detection"
    **Description:** "Identifying unusual patterns or outliers in financial data to support auditing, fraud prevention, or compliance."
*   **Title:** "IT Operations - Automated System Monitoring"
    **Description:** "Using AI to monitor IT systems, predict potential issues, and automate responses to common alerts."
*   **Title:** "Customer Support - Ticket Prioritization & Routing"
    **Description:** "Automatically categorizing and prioritizing customer support tickets and routing them to the appropriate agents."
*   **Title:** "R&D - Research & Data Synthesis"
    **Description:** "Assisting research and development teams by synthesizing information from large datasets, academic papers, or technical documents."
*   **Title:** "Legal - Document Review & Summarization"
    **Description:** "Accelerating legal workflows by automatically reviewing documents for specific clauses, summarizing key information, or checking for compliance."
*   **Title:** "Operational Efficiency - Workflow Automation"
    **Description:** "General category for use cases that automate repetitive manual tasks across various departments to improve efficiency."

**AVOID CATEGORIES LIKE:**
*   "General Information" (Too vague)
*   "HR" (Too broad; specify the HR function like "HR - Benefits Q&A")
*   "Questions" (Doesn't describe the business context)
*   "Miscellaneous"

USE CASES TO CATEGORIZE:
${useCaseBatch
          .map(
            (uc) =>
              `ID: ${uc.id}
Title: ${uc.title}
Type: ${uc.type || 'No type'}
Description: ${uc.description || 'No description provided'}`,
          )
          .join('\\n\\n')}

RESPONSE FORMAT:
You MUST respond with a JSON object containing a "results" array. Each item MUST follow this EXACT structure:
{
  "useCaseId": "The ID of the use case being categorized",
  "useCaseTitle": "The title of the use case",
  "useExistingCategory": false, // Must be false
  "categoryTitle": "An ACTIONABLE, business-oriented category title (see examples)",
  "categoryDescription": "A brief description of the business value or function of this category"
}

EXAMPLE RESPONSE (Illustrative):
{
  "results": [
    {
      "useCaseId": "uc123",
      "useCaseTitle": "Generate Q3 sales forecast report",
      "useExistingCategory": false,
      "categoryTitle": "Sales - Performance Forecasting",
      "categoryDescription": "Generating sales forecasts and performance reports to support strategic planning and decision-making."
    },
    {
      "useCaseId": "uc456",
      "useCaseTitle": "Draft an email to a new client about project kickoff",
      "useExistingCategory": false,
      "categoryTitle": "Communication - Client Engagement",
      "categoryDescription": "Drafting and refining communications for client interaction and relationship management."
    }
    // ... one entry for each use case in the input batch
  ]
}

IMPORTANT RULES:
- Every use case ID from the input MUST appear exactly once in the output "results" array.
- You MUST provide a 'categoryTitle' and 'categoryDescription' for each use case that is actionable and business-oriented.
- 'useExistingCategory' MUST be false.
- If multiple use cases fit the *same newly generated actionable category*, use the exact same 'categoryTitle' and 'categoryDescription' for them to ensure consistency.
`;
    }

    try {
      // Apply retry mechanism to the AI call
      const result = await withRetry(() =>
        generateObject({
          model: myProvider.languageModel('haiku'),
          schema: schema,
          prompt,
          temperature: 0,
        }),
      );

      if (!result.object || !result.object.results) {
        console.error(
          `AI returned invalid response structure for mode ${mode}.`,
        );
        throw new Error(
          `AI returned invalid response structure for mode ${mode}`,
        );
      }

      const categorizedResults = result.object.results;

      // Basic validation (can be enhanced)
      const missingUseCases = useCaseBatch.filter(
        (uc) => !categorizedResults.some((r: any) => r.useCaseId === uc.id),
      );
      if (missingUseCases.length > 0) {
        console.warn(
          `  ⚠️ Warning (mode: ${mode}): AI did not return results for ${missingUseCases.length} use cases from the batch`,
        );
        console.warn(
          `  Missing use cases: ${missingUseCases
            .map((uc) => `${uc.id}:${uc.title}`)
            .join(', ')}`,
        );
        // Decide if this should throw an error or if we proceed with partial results
      }

      // Return the results, casting to the union type
      return categorizedResults as (
        | AssignExistingResultType
        | GenerateNewResultType
      )[];
    } catch (error) {
      console.error(
        `Failed to categorize batch with AI (mode: ${mode}) after retries:`,
        error,
      );
      throw error; // Propagate to main function for handling
    }
  }
}
