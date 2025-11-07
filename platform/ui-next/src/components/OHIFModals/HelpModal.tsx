import * as React from 'react';
import { cn } from '../../lib/utils';

interface HelpModalProps {
  children: React.ReactNode;
  className?: string;
}

export function HelpModal({ children, className }: HelpModalProps) {
  return <div className={cn('space-y-1', className)}>{children}</div>;
}

/** Sub-component: Title */
interface TitleProps {
  children: React.ReactNode;
  className?: string;
}
function Title({ children, className }: TitleProps) {
  return (
    <div className={cn('text-foreground text-2xl font-semibold mb-4', className)}>
      {children}
    </div>
  );
}

/** Sub-component: Body (wraps all content) */
interface BodyProps {
  children: React.ReactNode;
  className?: string;
}
function Body({ children, className }: BodyProps) {
  return (
    <div className={cn('flex flex-col space-y-4', className)}>{children}</div>
  );
}

/** Sub-component: Section */
interface SectionProps {
  children: React.ReactNode;
  className?: string;
}
function Section({ children, className }: SectionProps) {
  return (
    <div className={cn('space-y-2', className)}>{children}</div>
  );
}

/** Attach sub-components to HelpModal as static properties */
HelpModal.Title = Title;
HelpModal.Body = Body;
HelpModal.Section = Section;
