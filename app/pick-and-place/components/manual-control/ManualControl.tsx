import React from "react";
import Actions from "./actions";
import Movement from "./movement";

const ManualControl = () => {
  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="space-y-6">
        <Actions />
        <Movement />
      </div>
    </div>
  );
};

export default ManualControl;
