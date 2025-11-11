'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
  session: 'Session',
  chat: 'Chat',
};

function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function AppBreadcrumb() {
  const pathname = usePathname();

  // Don't show breadcrumbs on the home page
  if (pathname === '/dashboard' || pathname === '/') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  type BreadcrumbEntry = {
    href: string;
    label: string;
    isLast: boolean;
    isUUID: boolean;
  };
  const breadcrumbs: BreadcrumbEntry[] = [];

  // Build breadcrumb items
  segments.forEach((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const isLast = index === segments.length - 1;

    // Check if it's a UUID (for session/chat IDs)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment);

    let label = isUUID ? '...' : routeNames[segment] || capitalizeFirst(segment);

    // Special handling for session IDs
    if (isUUID && segments[index - 1] === 'session') {
      label = `Session ${segment.slice(0, 8)}`;
    }

    // Special handling for chat IDs
    if (isUUID && segments[index - 1] === 'chat') {
      label = `Chat ${segment.slice(0, 8)}`;
    }

    breadcrumbs.push({ href, label, isLast, isUUID });
  });

  // Only show ellipsis if there are too many items
  const maxItems = 4;
  if (breadcrumbs.length > maxItems) {
    const firstItems = breadcrumbs.slice(0, 2);
    const lastItems = breadcrumbs.slice(-2);

    return (
      <Breadcrumb>
        <BreadcrumbList>
          {firstItems.map(item => (
            <React.Fragment key={item.href}>
              <BreadcrumbItem>
                {item.isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!item.isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbEllipsis />
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {lastItems.map(item => (
            <React.Fragment key={item.href}>
              <BreadcrumbItem>
                {item.isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!item.isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map(item => (
          <React.Fragment key={item.href}>
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
