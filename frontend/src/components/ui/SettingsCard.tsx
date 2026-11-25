import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface SettingsCardProps {
  id?: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  statusSlot?: React.ReactNode;
  children: React.ReactNode;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
  id,
  icon,
  title,
  description,
  statusSlot,
  children,
}) => {
  return (
    <Card
      id={id}
      icon={icon}
      title={title}
      description={description}
      headerRight={statusSlot}
    >
      <div className="space-y-4">{children}</div>
    </Card>
  );
};
