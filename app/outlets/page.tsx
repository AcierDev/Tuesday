'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Power, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

const API_BASE_URL = 'http://75.222.68.173:3004'

const controlOutlet = async (ip: string, action: 'on' | 'off') => {
  try {
    const response = await fetch(`${API_BASE_URL}/outlet/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ip }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Controlling outlet at ${ip}: Turn ${action}`, data);
    return true;
  } catch (error) {
    console.error('Error controlling outlet:', error);
    return false;
  }
}

export default function OutletControl() {
  const [status, setStatus] = useState(Array(4).fill('unknown'))
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState<number[]>([])
  const mountedRef = useRef(false)

  const devices = [
    { name: "Air Compressor 1", ip: '192.168.1.182' },
    { name: "Air Compressor 2", ip: '192.168.1.183' },
    { name: "Paint Lights", ip: '192.168.1.184' },
    { name: "Stage 1 Lights", ip: '192.168.1.185' }
  ]

  const handleControl = async (index: number, action: 'on' | 'off') => {
    setError(null)
    setRefreshing(prev => [...prev, index])
    try {
      const success = await controlOutlet(devices[index].ip, action)
      if (success) {
        setStatus(prev => {
          const newStatus = [...prev]
          newStatus[index] = action
          return newStatus
        })
      } else {
        throw new Error('Failed to control device')
      }
    } catch (err) {
      setError(`Failed to ${action} ${devices[index].name}`)
      console.error(err)
    } finally {
      setRefreshing(prev => prev.filter(i => i !== index))
    }
  }

  const getOutletStatus = useCallback(async (index: number) => {
    if (!mountedRef.current) return;
    setRefreshing(prev => [...prev, index])
    try {
      const response = await fetch(`${API_BASE_URL}/outlet/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: devices[index].ip }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === undefined) {
        throw new Error('Received undefined status from server');
      }

      if (mountedRef.current) {
        setStatus(prev => {
          const newStatus = [...prev]
          newStatus[index] = data.status
          return newStatus
        })
      }
    } catch (err) {
      console.error(`Failed to get status for ${devices[index].name}:`, err)
      if (mountedRef.current) {
        setError(`Failed to get status for ${devices[index].name}`)
      }
    } finally {
      if (mountedRef.current) {
        setRefreshing(prev => prev.filter(i => i !== index))
      }
    }
  }, [devices])

  const fetchAllStatuses = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true)
    setError(null)
    try {
      await Promise.all(devices.map((_, index) => getOutletStatus(index)))
    } catch (err) {
      if (mountedRef.current) {
        setError('Failed to fetch statuses for all devices')
        console.error(err)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [devices, getOutletStatus])

  useEffect(() => {
    mountedRef.current = true;
    fetchAllStatuses();
    
    const intervalId = setInterval(() => {
      if (mountedRef.current) {
        fetchAllStatuses();
      }
    }, 30000);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    }
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Remote Device Control</h1>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map((device, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="bg-secondary">
              <CardTitle className="flex justify-between items-center">
                {device.name}
                <Badge variant={status[index] === 'on' ? 'default' : 'secondary'}>
                  {status[index] === 'unknown' ? 'Unknown' : status[index] === 'on' ? 'ON' : 'OFF'}
                </Badge>
              </CardTitle>
              <CardDescription>IP: {device.ip}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loading ? (
                <Skeleton className="h-8 w-full" />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Power</span>
                  <Switch
                    checked={status[index] === 'on'}
                    onCheckedChange={(checked) => handleControl(index, checked ? 'on' : 'off')}
                    disabled={refreshing.includes(index)}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between bg-secondary/50">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => getOutletStatus(index)}
                disabled={refreshing.includes(index)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing.includes(index) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant={status[index] === 'on' ? 'destructive' : 'default'}
                size="sm"
                onClick={() => handleControl(index, status[index] === 'on' ? 'off' : 'on')}
                disabled={refreshing.includes(index)}
              >
                <Power className="h-4 w-4 mr-2" />
                {status[index] === 'on' ? 'Turn Off' : 'Turn On'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="mt-6 text-center">
        <Button onClick={fetchAllStatuses} disabled={loading} size="lg">
          <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh All Statuses
        </Button>
      </div>
    </div>
  )
}