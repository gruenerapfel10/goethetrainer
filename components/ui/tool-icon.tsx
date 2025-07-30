import { Search, Database, FileText, AlertCircle, Sparkles, Brain, File, Lightbulb, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolIconProps {
  toolName: string;
  className?: string;
}

/**
 * ToolIcon component that maps tool names to their respective icons
 * This provides a centralized way to manage tool icons across the application
 */
export function ToolIcon({ toolName, className }: ToolIconProps) {
  // Icon size classes to be applied consistently
  const iconClasses = cn("h-4 w-4", className);
  
  // Map tool names to their respective icons
  switch (toolName) {
    case 'sharepoint_reason':
      return <Brain className={iconClasses} />;
    case 'sharepoint_retrieve':
      return <Search className={iconClasses} />;
    case 'sharepoint_retrieve_reranker':
      return <FileText className={iconClasses} />;
    case 'sharepoint_list':
      return <Database className={iconClasses} />;
    case 'sharepoint_main_agent':
      return <Sparkles className={iconClasses} />;
    case 'csv_query':
      return <Database className={iconClasses} />;
    case 'document':
      return <File className={iconClasses} />;
    // New standardized icon names
    case 'database':
      return <Database className={iconClasses} />;
    case 'lightbulb':
      return <Lightbulb className={iconClasses} />;
    case 'circle':
      return <Circle className={iconClasses} />;
    // Add more tool mappings here as needed
    default:
      // Default icon for unknown tools
      return <Sparkles className={iconClasses} />;
  }
} 