export type UploadStep = {
  id: "upload" | "extraction" | "tracking" | "database";
  label: string;
  status: "waiting" | "processing" | "complete" | "error";
  message?: string;
};

export type TrackingInfo = {
  trackingNumber: string;
  carrier: "FedEx" | "UPS" | "USPS" | "DHL";
  sender: string | null;
  receiver: string | null;
};

export type FileProgress = {
  file: File;
  currentStep: UploadStep["id"];
  progress: number;
  steps: UploadStep[];
  trackingInfo?: TrackingInfo;
};
