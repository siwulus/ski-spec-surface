import type { FC } from "react";

interface SpecValueProps {
  label?: string;
  value: number;
  unit: string;
}

export const SpecValue: FC<SpecValueProps> = ({ label, value, unit }) => (
  <div className="flex justify-between text-sm">
    {label && <span className="text-muted-foreground">{label}:</span>}
    <span className="font-medium">
      {value} <span className="text-muted-foreground">{unit}</span>
    </span>
  </div>
);
