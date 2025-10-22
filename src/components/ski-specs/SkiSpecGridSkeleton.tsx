import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const SkiSpecGridSkeleton: React.FC = () => {
  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading ski specifications"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} aria-hidden="true">
          <CardHeader>
            <div className="h-6 w-3/4 bg-muted animate-pulse rounded-md" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded-md" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-5 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
            <div className="space-y-2 border-t border-border pt-4">
              <div className="h-4 w-1/3 bg-muted animate-pulse rounded-md" />
              <div className="flex gap-2">
                <div className="h-6 w-32 bg-muted animate-pulse rounded-md" />
                <div className="h-6 w-32 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Loading ski specifications...</span>
    </div>
  );
};
