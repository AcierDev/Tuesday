// components/settings/DueBadgeSettings.tsx

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";

interface DueBadgeSettingsProps {
  dueBadgeDays: number;
  updateSettings: (updates: Partial<any>) => void;
}

export const DueBadgeSettings = ({
  dueBadgeDays,
  updateSettings,
}: DueBadgeSettingsProps) => {
  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" />
          Due Badge Settings
        </CardTitle>
        <CardDescription>
          Set how many days in advance to show the "Due" badge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="due-badge-days">Days before due date</Label>
            <div className="flex items-center space-x-4">
              <Slider
                className="w-[60%]"
                id="due-badge-days"
                max={14}
                min={1}
                step={1}
                value={[dueBadgeDays]}
                onValueChange={(value) =>
                  updateSettings({ dueBadgeDays: value[0] })}
              />
              <Input
                className="w-20 dark:bg-gray-800"
                type="number"
                value={dueBadgeDays}
                onChange={(e) =>
                  updateSettings({ dueBadgeDays: Number(e.target.value) })}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The "Due" badge will appear {dueBadgeDays} days before the due date.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
