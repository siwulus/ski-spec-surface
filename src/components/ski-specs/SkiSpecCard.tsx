import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SkiSpecDTO } from "@/types/api.types";
import { Radius, Weight } from "lucide-react";
import * as React from "react";
import { SpecValue } from "./SpecValue";

interface SkiSpecCardProps {
  spec: SkiSpecDTO;
}

export const SkiSpecCard: React.FC<SkiSpecCardProps> = ({ spec }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{spec.name}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Dimensions Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Dimensions</h3>
          {/* Visual Ski Diagram */}
          <div className="space-y-2">
            {/* Width values above ski */}
            <div className="flex justify-between items-center text-sm font-medium px-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <SpecValue value={spec.tail} unit="mm" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tail width</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <SpecValue value={spec.waist} unit="mm" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Mid width</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <SpecValue value={spec.tip} unit="mm" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tip width</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Ski SVG */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <img src="/ski-spec.svg" alt="Ski dimensions diagram" className="w-full h-auto" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    <SpecValue label="Surface" value={spec.surface_area} unit="cm²" />
                    <SpecValue label="Rel. Weight" value={spec.relative_weight} unit="g/cm²" />
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Length below ski */}
            <div className="flex justify-center text-sm font-medium">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <SpecValue value={spec.length} unit="cm" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ski length</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Bottom row with Radius and Weight */}
            <div className="flex justify-between items-center text-sm pt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <Radius className="h-4 w-4 text-muted-foreground" />
                      <SpecValue value={spec.radius} unit="m" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Turning radius</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <Weight className="h-4 w-4 text-muted-foreground" />
                      <SpecValue value={spec.weight} unit="g" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Weight per ski</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Calculated Metrics Section */}

        <div className="flex flex-nowrap gap-2 justify-between">
          <SpecValue label="Surface" value={spec.surface_area} unit="cm²" />
          <SpecValue label="Rel. Weight" value={spec.relative_weight} unit="g/cm²" />
        </div>
      </CardContent>

      <CardFooter className="border-t">
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-muted-foreground">
            {spec.notes_count} {spec.notes_count === 1 ? "note" : "notes"}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};
