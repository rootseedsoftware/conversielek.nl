import { AlertCircle, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import type { AuditIssue } from '@/lib/claude';

export type SeverityConfig = {
  bg: string;
  border: string;
  text: string;
  badge: string;
  icon: LucideIcon;
  label: string;
  order: number;
};

export const severityConfig: Record<AuditIssue['severity'], SeverityConfig> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    badge: 'bg-red-600',
    icon: AlertCircle,
    label: 'Kritiek',
    order: 0,
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-500',
    icon: AlertTriangle,
    label: 'Hoog',
    order: 1,
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-900',
    badge: 'bg-yellow-500',
    icon: Info,
    label: 'Middel',
    order: 2,
  },
  low: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-500',
    icon: Info,
    label: 'Laag',
    order: 3,
  },
};

export const severityLabels: Record<AuditIssue['severity'], string> = {
  critical: 'Kritiek',
  high: 'Hoog',
  medium: 'Middel',
  low: 'Laag',
};
