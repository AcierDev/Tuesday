import React from "react";
import Image from "next/image";

const SurprisePage = () => {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <Image
        src="/images/surprise.gif"
        alt="Surprise gif"
        width={500}
        height={500}
        priority
      />
    </div>
  );
};

export default SurprisePage;
