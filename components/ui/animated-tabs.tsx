import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info, Save, Undo } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/utils/functions";

interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  children: React.ReactNode;
  variant?: "default" | "card";
  className?: string;
  hasChanges?: boolean;
  onReset?: () => void;
  onSave?: () => void;
  validationErrors?: { [key: string]: string };
}

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  activeTab,
  setActiveTab,
  children,
  variant = "default",
  className,
  hasChanges,
  onReset,
  onSave,
  validationErrors = {},
}) => {
  const [showUnsavedChanges, setShowUnsavedChanges] = React.useState(false);
  const tabContent = React.Children.toArray(children);

  const renderControls = () => {
    if (!onReset && !onSave) return null;

    return (
      <div className="flex gap-2">
        {onReset && (
          <Dialog
            open={showUnsavedChanges}
            onOpenChange={setShowUnsavedChanges}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => hasChanges && setShowUnsavedChanges(true)}
                className="flex items-center gap-2 dark:bg-gray-700"
                disabled={!hasChanges}
              >
                <Undo className="h-4 w-4" />
                Reset
              </Button>
            </DialogTrigger>
            <DialogContent className="dark:bg-gray-800">
              <DialogHeader>
                <DialogTitle>Unsaved Changes</DialogTitle>
                <DialogDescription>
                  Are you sure you want to reset all changes? This action cannot
                  be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setShowUnsavedChanges(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onReset();
                    setShowUnsavedChanges(false);
                  }}
                >
                  Reset Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {onSave && (
          <Button
            variant={hasChanges ? "default" : "outline"}
            size="sm"
            onClick={onSave}
            className={`flex items-center gap-2 ${
              hasChanges
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "dark:bg-gray-700"
            }`}
          >
            <Save className="h-4 w-4" />
            {hasChanges ? "Save Changes" : "Save"}
          </Button>
        )}
      </div>
    );
  };

  const renderAlerts = () => {
    return (
      <>
        {hasChanges && (
          <Alert className="mt-4 border-yellow-500 text-yellow-500 bg-yellow-500/10">
            <Info className="h-4 w-4" />
            <AlertTitle>You have unsaved changes</AlertTitle>
            <AlertDescription>
              Please save your changes or reset to the previous configuration.
            </AlertDescription>
          </Alert>
        )}
        {Object.keys(validationErrors).length > 0 && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Validation Errors</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4">
                {Object.values(validationErrors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </>
    );
  };

  const renderTabBar = () => (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-gray-200 dark:border-gray-700",
        variant === "card" && "px-4"
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all",
              activeTab === tab.id
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );

  if (variant === "card") {
    return (
      <Card className={cn("bg-white dark:bg-gray-800", className)}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                {tabs[tabs.findIndex((t) => t.id === activeTab)]?.label}
              </CardTitle>
              {tabs[tabs.findIndex((t) => t.id === activeTab)]?.description && (
                <CardDescription>
                  {tabs[tabs.findIndex((t) => t.id === activeTab)]?.description}
                </CardDescription>
              )}
            </div>
            {renderControls()}
          </div>
          {renderAlerts()}
          {renderTabBar()}
        </CardHeader>
        <CardContent className="pt-4">
          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                }}
                className="min-h-[200px]"
              >
                {tabContent[tabs.findIndex((t) => t.id === activeTab)]}
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {renderTabBar()}
      <div className="relative mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              duration: 0.2,
              ease: "easeInOut",
            }}
          >
            {tabContent[tabs.findIndex((t) => t.id === activeTab)]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
