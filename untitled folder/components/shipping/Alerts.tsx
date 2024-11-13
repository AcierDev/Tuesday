// Alerts.tsx
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AlertsProps {
  variant?: 'info' | 'error';
  message?: string;
}

const Alerts: React.FC<AlertsProps> = ({ variant = 'info', message }) => {
  if (variant === 'error' && message) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    )
  }

  // Default info alert
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Required Fields</AlertTitle>
      <AlertDescription>
        Fields marked with * are required. For the Country and State fields, please use the two-letter codes (e.g., US for United States, CA for California).
      </AlertDescription>
    </Alert>
  )
}

export default Alerts
