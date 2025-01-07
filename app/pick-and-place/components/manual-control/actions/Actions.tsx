import React, { useState } from "react";
import Toggle from "./Toggle";

const Actions = () => {
  const [suction, setSuction] = useState(false);
  const [extension, setExtension] = useState(false);

  return (
    <div className="p-6 rounded-lg bg-white shadow-md dark:bg-gray-700/20">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">Actions</h2>
      <div className="flex gap-8">
        <div className="space-y-4 flex-shrink-0 w-48">
          <div className="flex justify-end">
            <Toggle label="Suction" checked={suction} onChange={setSuction} />
          </div>
          <div className="flex justify-end">
            <Toggle
              label="Extension"
              checked={extension}
              onChange={setExtension}
            />
          </div>
        </div>
        <div className="flex flex-col justify-between flex-shrink-0 space-y-4 -mt-3">
          <button className="w-24 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
            Pick
          </button>
          <button className="w-24 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
            Place
          </button>
        </div>
      </div>
    </div>
  );
};

export default Actions;
