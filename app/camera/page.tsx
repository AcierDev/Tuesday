"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CameraApp() {
  const [image, setImage] = useState<string | null>(null);

  const takePicture = async () => {
    try {
      const response = await fetch("http://192.168.1.164:1821");
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setImage(imageUrl);
    } catch (error) {
      console.error("Error fetching image:", error);
      alert("Failed to fetch image. Please try again.");
    }
  };

  const downloadImage = () => {
    if (image) {
      const link = document.createElement("a");
      link.href = image;
      link.download = "captured_image.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center dark:text-white">
            Camera App
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Button
            onClick={takePicture}
            className="w-full max-w-xs"
            aria-label="Take Picture"
          >
            Take Picture
          </Button>
          {image && (
            <div className="mt-4 w-full">
              <img
                src={image}
                alt="Captured"
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          {image && (
            <Button
              onClick={downloadImage}
              className="w-full max-w-xs"
              aria-label="Download Image"
            >
              Download Image
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
