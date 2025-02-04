import React from "react";
import Image from "next/image";

const SurprisePage = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <p className="text-xl mb-8 text-center font-semibold text-gray-300 max-w-xl">
        Congratulations!
        <br />
        You discovered this secret page by clicking the menu items on the left
        side in this secret order:
        <br />
        Orders → Shipping → Orders → Shipping.
      </p>
      {/* <Image
        src="/images/surprise.gif"
        alt="Surprise gif"
        width={500}
        height={500}
        priority
      /> */}
    </div>
  );
};

export default SurprisePage;
