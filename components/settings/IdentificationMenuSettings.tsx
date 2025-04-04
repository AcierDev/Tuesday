import React from 'react'
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface IdentificationMenuSettingsProps {
  idleTimeout: number // Now in milliseconds
  isIdleTimeoutEnabled: boolean
  showIdentificationMenuForAdmins: boolean
  updateSettings: (settings: Partial<{
    idleTimeout: number // Now in milliseconds
    isIdleTimeoutEnabled: boolean
    showIdentificationMenuForAdmins: boolean
  }>) => void
}

export function IdentificationMenuSettings({
  idleTimeout,
  isIdleTimeoutEnabled,
  showIdentificationMenuForAdmins,
  updateSettings
}: IdentificationMenuSettingsProps) {
  // Convert milliseconds to seconds for display
  const idleTimeoutInSeconds = Math.round(idleTimeout / 1000)

  return (
    <div className="space-y-6">
      <Card className={`transition-colors duration-200 ${isIdleTimeoutEnabled ? 'bg-primary/5' : ''} dark:bg-gray-900`}>
        <CardHeader>
          <CardTitle className={`${isIdleTimeoutEnabled ? 'text-primary' : ''}`}>Idle Timeout</CardTitle>
          <CardDescription>Configure the idle timeout settings for the identification menu</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="idle-timeout-toggle" className={`text-sm font-medium ${isIdleTimeoutEnabled ? 'text-primary' : ''}`}>
              Enable Idle Timeout
            </Label>
            <Switch
              id="idle-timeout-toggle"
              checked={isIdleTimeoutEnabled}
              onCheckedChange={(checked) => updateSettings({ isIdleTimeoutEnabled: checked })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="idle-timeout-slider" className={`text-sm font-medium ${isIdleTimeoutEnabled ? 'text-primary' : ''}`}>
                Idle Timeout Duration
              </Label>
              <span className={`text-sm ${isIdleTimeoutEnabled ? 'text-primary' : 'text-muted-foreground'}`}>{idleTimeoutInSeconds} seconds</span>
            </div>
            <Slider
              id="idle-timeout-slider"
              min={10}
              max={300}
              step={10}
              value={[idleTimeoutInSeconds]}
              onValueChange={(value) => updateSettings({ idleTimeout: value[0] * 1000 })}
              disabled={!isIdleTimeoutEnabled}
              className={`w-full ${!isIdleTimeoutEnabled ? 'opacity-50' : ''}`}
            />
          </div>
        </CardContent>
      </Card>
      <Card className={`transition-colors duration-200 ${showIdentificationMenuForAdmins ? 'bg-primary/5' : ''} dark:bg-gray-900`}>
        <CardHeader>
          <CardTitle className={`${showIdentificationMenuForAdmins ? 'text-primary' : ''}`}>Admin Settings</CardTitle>
          <CardDescription>Configure identification menu behavior for admin users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="admin-menu-toggle" className={`text-sm font-medium ${showIdentificationMenuForAdmins ? 'text-primary' : ''}`}>
              Show Identification Menu for Admins
            </Label>
            <Switch
              id="admin-menu-toggle"
              checked={showIdentificationMenuForAdmins}
              onCheckedChange={(checked) => updateSettings({ showIdentificationMenuForAdmins: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}