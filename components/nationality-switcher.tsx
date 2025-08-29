'use client'

import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NationalitySwitcherProps {
  value: string;
  onChange: (value: string) => void;
  variant?: 'sidebar' | 'overlay';
}

export default function NationalitySwitcher({ value, onChange, variant = 'overlay' }: NationalitySwitcherProps) {
  const [open, setOpen] = useState(false);

  const items = [
    {
      value: 'us',
      label: 'United States',
      emoji: '🇺🇸',
    },
    {
      value: 'in',
      label: 'India',
      emoji: '🇮🇳',
    },
    {
      value: 'gb',
      label: 'United Kingdom',
      emoji: '🇬🇧',
    },
    {
      value: 'ru',
      label: 'Russia',
      emoji: '🇷🇺',
    },
  ];

  const currentItem = items.find((item) => item.value === value);

  function handleChange(newValue: string) {
    setOpen(false);
    onChange(newValue);
  }

  const buttonClass = variant === 'sidebar' 
    ? "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 px-3 gap-2"
    : "bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 h-8 px-3 gap-2";

  const openClass = variant === 'sidebar'
    ? "data-[state=open]:bg-sidebar-accent"
    : "data-[state=open]:bg-white/30";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            buttonClass,
            openClass
          )}
        >
          <Globe className="h-4 w-4" />
          <span className="text-lg">{currentItem?.emoji}</span>
          <span className="text-sm font-medium">{currentItem?.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border/30 rounded-xl bg-muted min-w-[160px]"
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => handleChange(item.value)}
            className={cn(
              "cursor-pointer text-sm font-medium",
              value === item.value 
                ? "bg-blue-500/20 text-blue-600 border border-blue-500/30" 
                : "hover:bg-accent"
            )}
          >
            <span className="text-lg mr-2">{item.emoji}</span>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}