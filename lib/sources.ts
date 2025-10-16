export interface SourceData {
  id?: string;
  title: string;
  url: string;
  description?: string;
  domain: string;
  favicon?: string;
}

export const extractSourcesFromMessage = (message: any): SourceData[] => {
  const sources: SourceData[] = [];
  const seenUrls = new Set<string>();
  
  if (!message?.parts) return sources;
  
  message.parts.forEach((part: any) => {
    if (part.type !== 'tool-invocation' || !part.toolInvocation) return;
    
    const { toolName, result } = part.toolInvocation;
    
    if (toolName === 'web_search' && result?.data) {
      result.data.forEach((item: any, index: number) => {
        if (!item.url || !item.title || seenUrls.has(item.url)) return;
        
        seenUrls.add(item.url);
        
        try {
          const url = new URL(item.url);
          const domain = url.hostname.replace(/^www\./i, '');
          
          sources.push({
            id: `web_search-${index}`,
            title: item.title,
            url: item.url,
            domain,
            description: item.description,
            favicon: `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
          });
        } catch (error) {
          // Skip invalid URLs
        }
      });
    }
    
    if (toolName === 'extract' && result?.data) {
      const extractData = Array.isArray(result.data) ? result.data : [result.data];
      
      extractData.forEach((item: any, index: number) => {
        if (!item.url || seenUrls.has(item.url)) return;
        
        seenUrls.add(item.url);
        
        try {
          const url = new URL(item.url);
          const domain = url.hostname.replace(/^www\./i, '');
          
          sources.push({
            id: `extract-${index}`,
            title: item.data?.title || domain.split('.')[0],
            url: item.url,
            domain,
            description: item.data?.description,
            favicon: `https://www.google.com/s2/favicons?sz=32&domain=${domain}`
          });
        } catch (error) {
          // Skip invalid URLs  
        }
      });
    }
  });
  
  return sources;
};
