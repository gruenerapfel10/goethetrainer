'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import type { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { memo } from 'react';
import { useTranslations } from 'next-intl';

interface SuggestedActionsProps {
  chatId: string;
  selectedModelId: string;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
}

function PureSuggestedActions({
  chatId,
  append,
  selectedModelId,
}: SuggestedActionsProps) {
  let suggestedActions: any[] = [];
  let translationNamespace = '';

  // Determine which translation namespace to use based on the model
  if (selectedModelId === 'sharepoint-agent' || selectedModelId === 'sharepoint-agent-v2') {
    translationNamespace = 'suggestedActions.sharepoint';
  } else if (selectedModelId === 'web-agent') {
    translationNamespace = 'suggestedActions.crawler';
  } else if (selectedModelId === 'general-bedrock-agent') {
    translationNamespace = 'suggestedActions.general';
  } else if (selectedModelId === 'chat-model-reasoning') {
    translationNamespace = 'suggestedActions.reasoning';
  } else if (selectedModelId === 'csv-agent' || selectedModelId === 'csv-agent-v2') {
    translationNamespace = 'suggestedActions.csv';
  } else if (selectedModelId === 'text2sql-agent') {
    translationNamespace = 'suggestedActions.sql';
  } else {
    // Default to general for any other model (general assistant, image-agent, etc)
    translationNamespace = 'suggestedActions.general';
  }

  // Get the translations for the selected model
  const t = useTranslations(translationNamespace);

  // Define translations keys based on model
  if (selectedModelId === 'sharepoint-agent' || selectedModelId === 'sharepoint-agent-v2') {
    suggestedActions = [
      {
        titleKey: 'winningProposals.title',
        labelKey: 'winningProposals.label',
        actionKey: 'winningProposals.action',
      },
      {
        titleKey: 'pricing.title',
        labelKey: 'pricing.label',
        actionKey: 'pricing.action',
      },
      {
        titleKey: 'successFactors.title',
        labelKey: 'successFactors.label',
        actionKey: 'successFactors.action',
      },
      {
        titleKey: 'remoteWork.title',
        labelKey: 'remoteWork.label',
        actionKey: 'remoteWork.action',
      },
    ];
  } else if (selectedModelId === 'web-agent') {
    suggestedActions = [
      {
        titleKey: 'trends.title',
        labelKey: 'trends.label',
        actionKey: 'trends.action',
      },
      {
        titleKey: 'caseStudies.title',
        labelKey: 'caseStudies.label',
        actionKey: 'caseStudies.action',
      },
      {
        titleKey: 'differentiation.title',
        labelKey: 'differentiation.label',
        actionKey: 'differentiation.action',
      },
      {
        titleKey: 'regulations.title',
        labelKey: 'regulations.label',
        actionKey: 'regulations.action',
      },
    ];
  } else if (selectedModelId === 'general-bedrock-agent') {
    suggestedActions = [
      {
        titleKey: 'proposal.title',
        labelKey: 'proposal.label',
        actionKey: 'proposal.action',
      },
      {
        titleKey: 'timeline.title',
        labelKey: 'timeline.label',
        actionKey: 'timeline.action',
      },
      {
        titleKey: 'campaign.title',
        labelKey: 'campaign.label',
        actionKey: 'campaign.action',
      },
      {
        titleKey: 'response.title',
        labelKey: 'response.label',
        actionKey: 'response.action',
      },
    ];
  } else if (selectedModelId === 'chat-model-reasoning') {
    suggestedActions = [
      {
        titleKey: 'trends.title',
        labelKey: 'trends.label',
        actionKey: 'trends.action',
      },
      {
        titleKey: 'caseStudies.title',
        labelKey: 'caseStudies.label',
        actionKey: 'caseStudies.action',
      },
      {
        titleKey: 'differentiation.title',
        labelKey: 'differentiation.label',
        actionKey: 'differentiation.action',
      },
      {
        titleKey: 'regulations.title',
        labelKey: 'regulations.label',
        actionKey: 'regulations.action',
      },
    ];
    // suggestedActions = [
    //   {
    //     titleKey: 'risks.title',
    //     labelKey: 'risks.label',
    //     actionKey: 'risks.action',
    //   },
    //   {
    //     titleKey: 'competitive.title',
    //     labelKey: 'competitive.label',
    //     actionKey: 'competitive.action',
    //   },
    //   {
    //     titleKey: 'decision.title',
    //     labelKey: 'decision.label',
    //     actionKey: 'decision.action',
    //   },
    //   {
    //     titleKey: 'ai.title',
    //     labelKey: 'ai.label',
    //     actionKey: 'ai.action',
    //   },
    // ];
  } else if (selectedModelId === 'csv-agent' || selectedModelId === 'csv-agent-v2') {
    suggestedActions = [
      {
        titleKey: 'analysis.title',
        labelKey: 'analysis.label',
        actionKey: 'analysis.action',
      },
      {
        titleKey: 'summary.title',
        labelKey: 'summary.label',
        actionKey: 'summary.action',
      },
      {
        titleKey: 'trends.title',
        labelKey: 'trends.label',
        actionKey: 'trends.action',
      },
      {
        titleKey: 'visualization.title',
        labelKey: 'visualization.label',
        actionKey: 'visualization.action',
      },
    ];
  } else if (selectedModelId === 'text2sql-agent') {
    suggestedActions = [
      {
        titleKey: 'showTables.title',
        labelKey: 'showTables.label',
        actionKey: 'showTables.action',
      },
      {
        titleKey: 'topRecords.title',
        labelKey: 'topRecords.label',
        actionKey: 'topRecords.action',
      },
      {
        titleKey: 'aggregate.title',
        labelKey: 'aggregate.label',
        actionKey: 'aggregate.action',
      },
      {
        titleKey: 'relationships.title',
        labelKey: 'relationships.label',
        actionKey: 'relationships.action',
      },
    ];
  } else {
    // Default to general actions
    suggestedActions = [
      {
        titleKey: 'proposal.title',
        labelKey: 'proposal.label',
        actionKey: 'proposal.action',
      },
      {
        titleKey: 'timeline.title',
        labelKey: 'timeline.label',
        actionKey: 'timeline.action',
      },
      {
        titleKey: 'campaign.title',
        labelKey: 'campaign.label',
        actionKey: 'campaign.action',
      },
      {
        titleKey: 'response.title',
        labelKey: 'response.label',
        actionKey: 'response.action',
      },
    ];
  }

  return (
    <div className="grid sm:grid-cols-2 gap-2 w-full">
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * index }}
          key={`suggested-action-${suggestedAction.titleKey}-${index}`}
          className={index > 1 ? 'hidden sm:block' : 'block'}
        >
          <Button
            variant="ghost"
            onClick={async () => {
              // Navigation disabled - stay in current chat panel
              // window.history.replaceState({}, '', `/chat/${chatId}`);

              append({
                role: 'user',
                content: t(suggestedAction.actionKey),
              });
            }}
            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start flex-wrap text-wrap"
          >
            <span className="font-medium">{t(suggestedAction.titleKey)}</span>
            <span className="text-muted-foreground">
              {t(suggestedAction.labelKey)}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);