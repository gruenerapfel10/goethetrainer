'use client'

import React, { useState } from 'react';
import { GraduationCap, ChevronDown, Cog, Atom, Calculator, Palette, Heart, Scale, Building, Users, Globe2, Zap, Wrench, TreePine, Cpu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DegreeInfo {
  level: 'undergraduate' | 'graduate' | 'doctorate';
  field: string;
  displayName: string;
}

interface DegreeSwitcherProps {
  value: DegreeInfo;
  onChange: (value: DegreeInfo) => void;
  variant?: 'sidebar' | 'overlay';
}

export default function DegreeSwitcher({ value, onChange, variant = 'overlay' }: DegreeSwitcherProps) {
  const [open, setOpen] = useState(false);

  const degreeFields = [
    {
      field: 'mechanical-engineering',
      label: 'Mechanical Engineering',
      icon: Cog,
    },
    {
      field: 'electrical-engineering',
      label: 'Electrical Engineering',
      icon: Zap,
    },
    {
      field: 'computer-science',
      label: 'Computer Science',
      icon: Cpu,
    },
    {
      field: 'civil-engineering',
      label: 'Civil Engineering',
      icon: Building,
    },
    {
      field: 'biomedical-engineering',
      label: 'Biomedical Engineering',
      icon: Heart,
    },
    {
      field: 'chemical-engineering',
      label: 'Chemical Engineering',
      icon: Atom,
    },
    {
      field: 'mathematics',
      label: 'Mathematics',
      icon: Calculator,
    },
    {
      field: 'physics',
      label: 'Physics',
      icon: Atom,
    },
    {
      field: 'business-administration',
      label: 'Business Administration',
      icon: Building,
    },
    {
      field: 'psychology',
      label: 'Psychology',
      icon: Users,
    },
    {
      field: 'international-relations',
      label: 'International Relations',
      icon: Globe2,
    },
    {
      field: 'law',
      label: 'Law',
      icon: Scale,
    },
    {
      field: 'medicine',
      label: 'Medicine',
      icon: Heart,
    },
    {
      field: 'environmental-science',
      label: 'Environmental Science',
      icon: TreePine,
    },
    {
      field: 'fine-arts',
      label: 'Fine Arts',
      icon: Palette,
    },
    {
      field: 'industrial-engineering',
      label: 'Industrial Engineering',
      icon: Wrench,
    },
  ];

  const levels = [
    { value: 'undergraduate', label: 'Undergraduate' },
    { value: 'graduate', label: 'Graduate (Master\'s)' },
    { value: 'doctorate', label: 'Doctorate (PhD)' },
  ];

  const currentField = degreeFields.find((field) => field.field === value.field);
  const currentLevel = levels.find((level) => level.value === value.level);
  const CurrentIcon = currentField?.icon || GraduationCap;

  function handleChange(newLevel: string, newField: string) {
    const field = degreeFields.find(f => f.field === newField);
    setOpen(false);
    onChange({
      level: newLevel as 'undergraduate' | 'graduate' | 'doctorate',
      field: newField,
      displayName: `${currentLevel?.label} ${field?.label}`,
    });
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
          <CurrentIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{currentLevel?.label}</span>
          <span className="text-sm font-medium">{currentField?.label}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="border-border/30 rounded-xl bg-muted min-w-[280px] max-h-[400px] overflow-y-auto"
      >
        {levels.map((level) => (
          <div key={level.value}>
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              {level.label}
            </DropdownMenuLabel>
            {degreeFields.map((field) => {
              const Icon = field.icon;
              const isSelected = value.level === level.value && value.field === field.field;
              return (
                <DropdownMenuItem
                  key={`${level.value}-${field.field}`}
                  onClick={() => handleChange(level.value, field.field)}
                  className={cn(
                    "cursor-pointer text-sm font-medium px-3 py-2",
                    isSelected
                      ? "bg-blue-500/20 text-blue-600 border border-blue-500/30" 
                      : "hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {field.label}
                </DropdownMenuItem>
              );
            })}
            {level.value !== 'doctorate' && <DropdownMenuSeparator />}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}