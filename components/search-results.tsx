'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { cn, extractHostname } from '@/lib/utils';
import { Globe, X, ExternalLink, TrendingUp, Target, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SearchResult {
  title: string;
  url: string;
  description?: string;
  source?: string;
  icon?: string;
}

interface SearchResultsProps {
  results?: SearchResult[];
  title?: string;
}

type AnalysisType = 'brand_analysis' | 'competitive_analysis' | 'strategy_analysis' | 'trend_analysis' | 'performance_analysis' | 'general_analysis';

// Enhanced analysis functions for AI guidance
const analyzeSearchContent = (results: SearchResult[]) => {
  const allText = results.map(r => `${r.title} ${r.description || ''}`).join(' ').toLowerCase();
  
  // Detect analysis type
  const analysisType = detectAnalysisType(allText);
  
  // Extract key themes
  const themes = extractKeyThemes(allText);
  
  // Calculate content richness
  const richness = calculateContentRichness(results);
  
  // Generate analysis readiness score
  const readinessScore = calculateReadinessScore(results, themes);
  
  // Generate AI guidance
  const guidance = generateAIGuidance(analysisType, themes, richness, readinessScore);
  
  return {
    analysis_type: analysisType,
    key_themes: themes,
    content_richness: richness,
    readiness_score: readinessScore,
    ai_guidance: guidance,
    should_proceed_to_analysis: readinessScore >= 70
  };
};

const detectAnalysisType = (text: string): AnalysisType => {
  const patterns: Record<AnalysisType, string[]> = {
    brand_analysis: ['brand', 'identity', 'marketing', 'positioning', 'branding'],
    competitive_analysis: ['competitor', 'competitive', 'market', 'industry', 'competition'],
    strategy_analysis: ['strategy', 'strategic', 'plan', 'approach', 'framework'],
    trend_analysis: ['trend', 'trends', 'future', 'emerging', 'forecast'],
    performance_analysis: ['performance', 'results', 'metrics', 'analytics', 'data'],
    general_analysis: []
  };
  
  let maxScore = 0;
  let detectedType: AnalysisType = 'general_analysis';
  
  (Object.entries(patterns) as [AnalysisType, string[]][]).forEach(([type, keywords]) => {
    const score = keywords.reduce((acc, keyword) => {
      const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
      return acc + matches;
    }, 0);
    
    if (score > maxScore) {
      maxScore = score;
      detectedType = type;
    }
  });
  
  return detectedType;
};

const extractKeyThemes = (text: string): string[] => {
  const themePatterns = {
    video_marketing: ['video', 'videos', 'youtube', 'tiktok', 'reels', 'content'],
    social_media: ['social', 'instagram', 'facebook', 'twitter', 'linkedin'],
    brand_identity: ['brand', 'identity', 'logo', 'visual', 'design'],
    customer_engagement: ['engagement', 'community', 'customer', 'audience'],
    digital_strategy: ['digital', 'online', 'website', 'seo', 'advertising'],
    market_positioning: ['positioning', 'market', 'target', 'niche', 'segment']
  };
  
  return Object.entries(themePatterns)
    .filter(([, keywords]) => 
      keywords.some(keyword => text.includes(keyword))
    )
    .map(([theme]) => theme);
};

const calculateContentRichness = (results: SearchResult[]): 'high' | 'medium' | 'low' => {
  const totalDescriptionLength = results.reduce((acc, r) => acc + (r.description?.length || 0), 0);
  const avgDescriptionLength = totalDescriptionLength / results.length;
  
  if (avgDescriptionLength > 150 && results.length >= 5) return 'high';
  if (avgDescriptionLength > 100 && results.length >= 3) return 'medium';
  return 'low';
};

const calculateReadinessScore = (results: SearchResult[], themes: string[]): number => {
  let score = 0;
  
  // Base score from number of results
  score += Math.min(results.length * 10, 50);
  
  // Bonus for content quality
  const avgDescLength = results.reduce((acc, r) => acc + (r.description?.length || 0), 0) / results.length;
  score += Math.min(avgDescLength / 5, 20);
  
  // Bonus for theme diversity
  score += Math.min(themes.length * 5, 20);
  
  // Bonus for authoritative sources
  const authoritySources = results.filter(r => 
    r.source?.includes('.edu') || 
    r.source?.includes('harvard') ||
    r.source?.includes('mckinsey') ||
    r.source?.includes('forbes')
  ).length;
  score += authoritySources * 5;
  
  return Math.min(score, 100);
};

const generateAIGuidance = (
  analysisType: AnalysisType, 
  themes: string[], 
  richness: string, 
  readinessScore: number
): string => {
  const structureMap: Record<AnalysisType, string> = {
    brand_analysis: "BRAND ANALYSIS STRUCTURE: Current Brand State → Market Position → Brand Strengths/Weaknesses → Differentiation Opportunities → Strategic Recommendations",
    competitive_analysis: "COMPETITIVE ANALYSIS STRUCTURE: Market Landscape → Competitor Profiles → Competitive Gaps → Market Opportunities → Strategic Response Plan",
    strategy_analysis: "STRATEGY ANALYSIS STRUCTURE: Current Strategy Assessment → Market Context → Strategic Options → Implementation Framework → Success Metrics",
    trend_analysis: "TREND ANALYSIS STRUCTURE: Current Trends → Emerging Patterns → Impact Assessment → Future Implications → Strategic Response",
    performance_analysis: "PERFORMANCE ANALYSIS STRUCTURE: Current Performance → Benchmark Comparison → Performance Gaps → Improvement Opportunities → Action Plan",
    general_analysis: "GENERAL ANALYSIS STRUCTURE: Key Findings → Analysis → Strategic Insights → Recommendations"
  };
  
  let guidance = structureMap[analysisType];
  
  if (themes.includes('video_marketing')) {
    guidance += " | FOCUS: Video marketing strategy, content types, platform optimization";
  }
  
  guidance += ` | READINESS: ${readinessScore}% | RICHNESS: ${richness}`;
  
  return guidance;
};

export function SearchResults({
  results = [],
  title = 'Search Results...',
}: SearchResultsProps) {
  const [showAllSources, setShowAllSources] = useState(false);
  const [hoveredResult, setHoveredResult] = useState<number | null>(null);

  const t = useTranslations('errors');

  const searchResults = [...results];
  const displayedResults = searchResults?.slice(0, 3) || [];
  const hiddenResults = searchResults?.length > 3 ? searchResults.slice(3) : [];

  // Enhanced analysis for AI guidance
  const analysisData = useMemo(() => {
    if (!searchResults.length) return null;
    return analyzeSearchContent(searchResults);
  }, [searchResults]);

  if (!searchResults || searchResults.length === 0) return null;

  const getHostname = (url: string) => {
    try {
      return extractHostname(url);
    } catch {
      return t('unknown');
    }
  };

  const getAnalysisIcon = (type: AnalysisType) => {
    const iconMap: Record<AnalysisType, typeof Target> = {
      brand_analysis: Target,
      competitive_analysis: BarChart3,
      strategy_analysis: TrendingUp,
      trend_analysis: TrendingUp,
      performance_analysis: BarChart3,
      general_analysis: Target
    };
    return iconMap[type];
  };

  return (
    <div className="w-full">
      {/* Hidden AI guidance data */}
      {analysisData && (
        <div 
          className="hidden"
          data-analysis-type={analysisData.analysis_type}
          data-key-themes={analysisData.key_themes.join(', ')}
          data-content-richness={analysisData.content_richness}
          data-readiness-score={analysisData.readiness_score}
          data-ai-guidance={analysisData.ai_guidance}
          data-should-proceed={analysisData.should_proceed_to_analysis}
        />
      )}

      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium">{title}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {displayedResults.map((result, i) => (
          <div
            key={i}
            className="relative"
            onMouseEnter={() => setHoveredResult(i)}
            onMouseLeave={() => setHoveredResult(null)}
          >
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex flex-col h-full p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors',
                'group cursor-pointer',
              )}
            >
              <div className="flex-1">
                <span className="text-sm font-medium line-clamp-1">
                  {result.title}
                </span>
                {result.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {result.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-center size-4 shrink-0 rounded-sm bg-background ring-1 ring-border text-xs font-medium">
                  {result.icon ? (
                    <div className="relative size-3">
                      <Image
                        src={result.icon}
                        alt={result.source || ''}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : result.url ? (
                    <div className="relative size-3">
                      <Image
                        src={`https://www.google.com/s2/favicons?sz=128&domain=${result.url}`}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <Globe size={10} />
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate">
                  {result.source ||
                    (result.url ? getHostname(result.url) : t('unknown'))}
                </span>
              </div>
            </a>

            {hoveredResult === i && result.description && (
              <div className="absolute z-50 w-64 p-3 bg-background shadow-lg rounded-lg border border-border top-full left-0 mt-1">
                <h4 className="font-medium mb-1">{result.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {result.description}
                </p>
                <div className="flex justify-end mt-2">
                  <ExternalLink size={14} className="text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        ))}

        {hiddenResults.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowAllSources(!showAllSources)}
              className="flex items-center justify-center h-full p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors flex-col gap-5"
            >
              <div className="flex -space-x-2 mr-2">
                {hiddenResults.slice(0, 3).map((result, i) => (
                  <div
                    key={i}
                    className="relative size-5 rounded-full bg-background border border-border overflow-hidden"
                  >
                    {result.icon ? (
                      <Image
                        src={result.icon}
                        alt={result.source || ''}
                        fill
                        className="object-contain"
                      />
                    ) : result.url ? (
                      <Image
                        src={`https://www.google.com/s2/favicons?sz=128&domain=${result.url}`}
                        alt=""
                        fill
                        className="object-contain"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full">
                        <Globe size={10} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-xs font-medium">
                +{hiddenResults.length} sources
              </span>
            </button>

            {showAllSources && (
              <div className="absolute z-50 w-72 p-4 bg-background shadow-lg rounded-lg border border-border top-full right-0 mt-1">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">All Sources</h4>
                  <button
                    onClick={() => setShowAllSources(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {hiddenResults.map((result, i) => (
                    <a
                      key={i}
                      href={result.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col p-3 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
                    >
                      <div className="flex-1 mb-2">
                        <span className="text-sm font-medium line-clamp-1">
                          {result.title || t('untitled')}
                        </span>
                        {result.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {result.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                        <div className="flex items-center justify-center size-4 shrink-0 rounded-sm bg-background ring-1 ring-border text-xs font-medium">
                          {result.url ? (
                            <div className="relative size-3">
                              <Image
                                src={`https://www.google.com/s2/favicons?sz=128&domain=${result.url}`}
                                alt=""
                                fill
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <Globe size={10} />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">
                          {result.source ||
                            (result.url
                              ? getHostname(result.url)
                              : t('unknown.source'))}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simplified hidden AI guidance only - no visible UI */}
      {analysisData && (
        <div 
          className="hidden"
          data-analysis-type={analysisData.analysis_type}
          data-key-themes={analysisData.key_themes.join(', ')}
          data-content-richness={analysisData.content_richness}
          data-readiness-score={analysisData.readiness_score}
          data-ai-guidance={analysisData.ai_guidance}
          data-should-proceed={analysisData.should_proceed_to_analysis}
          data-search-complete="true"
          data-ready-for-final-analysis="true"
        />
      )}
    </div>
  );
}

export default SearchResults;