'use client';

import React, { type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircleFillIcon, WarningIcon } from './icons';

const iconsByType: Record<'success' | 'error', ReactNode> = {
  success: <CheckCircleFillIcon />,
  error: <WarningIcon />,
};

export function toast(props: Omit<ToastProps, 'id'>) {
  return sonnerToast.custom((id) => (
    <Toast id={id} type={props.type} description={props.description} />
  ));
}

function Toast(props: ToastProps) {
  const { id, type, description } = props;

  return (
    <div className="flex w-full toast-mobile:w-[356px] justify-center">
      <div
        data-testid="toast"
        key={id}
        className="bg-card p-3 rounded-lg w-full toast-mobile:w-fit flex flex-row gap-2 items-center border border-border"
      >
        <div
          data-type={type}
          className="data-[type=error]:text-destructive data-[type=success]:text-success"
        >
          {iconsByType[type]}
        </div>
        <div className="text-foreground text-sm">{description}</div>
      </div>
    </div>
  );
}

interface ToastProps {
  id: string | number;
  type: 'success' | 'error';
  description: string;
}
