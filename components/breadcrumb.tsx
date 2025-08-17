'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  const pathname = usePathname();
  
  // Auto-generate breadcrumbs if not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname);
  
  return (
    <nav className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`} aria-label="Breadcrumb">
      <Link 
        href="/" 
        className="flex items-center hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {item.href && !item.current ? (
            <Link 
              href={item.href} 
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={item.current ? 'text-foreground font-medium' : ''}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    
    // Special cases for dynamic routes and readable labels
    let label = formatSegmentLabel(segment, pathname);
    
    breadcrumbs.push({
      label,
      href: isLast ? undefined : href,
      current: isLast
    });
  }
  
  return breadcrumbs;
}

function formatSegmentLabel(segment: string, fullPath: string): string {
  // Handle special cases
  switch (segment) {
    case 'universities':
      return 'Universities';
    case 'dashboard':
      return 'Dashboard';
    case 'profile':
      return 'Profile';
    case 'applications':
      return 'Applications';
    case 'chat':
      return 'Chat';
    case 'admin':
      return 'Admin';
    case 'login':
      return 'Login';
    case 'register':
      return 'Register';
    case 'offer':
      return 'Offer';
    default:
      // Check if it's a number (university ID)
      if (/^\d+$/.test(segment)) {
        // This is likely a university ID, we'll handle this in the component that uses it
        return `University #${segment}`;
      }
      
      // Check if it's a UUID (chat ID)
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        return 'Conversation';
      }
      
      // Default: capitalize and replace hyphens with spaces
      return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
}

// Hook for custom breadcrumb usage
export function useBreadcrumb() {
  const pathname = usePathname();
  
  const setBreadcrumb = (items: BreadcrumbItem[]) => {
    // This could be extended to use context if needed
    return items;
  };
  
  return { setBreadcrumb, pathname };
}