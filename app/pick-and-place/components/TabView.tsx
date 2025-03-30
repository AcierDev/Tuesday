import React, { useState } from "react";

export interface TabOption<T extends string> {
  id: T;
  label: string;
  content: React.ReactNode;
}

interface TabViewProps<T extends string> {
  options: readonly TabOption<T>[];
  defaultTab?: T;
}

export function TabView<T extends string>({
  options,
  defaultTab,
}: TabViewProps<T>) {
  if (options.length === 0) {
    throw new Error("TabView must have at least one option");
  }

  const nonEmptyOptions = options as readonly [TabOption<T>, ...TabOption<T>[]];
  const [activeTab, setActiveTab] = useState<T>(
    defaultTab ?? nonEmptyOptions[0].id
  );

  return (
    <div>
      {/* Tab Selection */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => setActiveTab(option.id)}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === option.id
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <hr className="border-gray-200 dark:border-gray-700" />
      </div>

      {/* Tab Content */}
      {options.find((option) => option.id === activeTab)?.content}
    </div>
  );
}
