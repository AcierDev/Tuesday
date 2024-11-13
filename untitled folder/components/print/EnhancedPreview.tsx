import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Maximize2, Minimize2 } from 'lucide-react'

interface PreviewProps {
  src: string
  type: 'image' | 'pdf'
  name: string
}

export function EnhancedPreview({ src, type, name }: PreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => setIsExpanded(!isExpanded)

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'fixed inset-4 z-50' : 'w-full max-w-sm'}`}>
      <CardContent className="p-0">
        {type === 'pdf' ? (
          <embed
            src={src}
            type="application/pdf"
            width="100%"
            height={isExpanded ? "100%" : "300px"}
            className="rounded-lg"
          />
        ) : (
          <div className="relative w-full" style={{ paddingBottom: '75%' }}>
            <Image
              src={src}
              alt={name}
              fill
              className="object-contain rounded-lg"
            />
          </div>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white"
          onClick={toggleExpand}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
        <h3 className="text-white font-semibold truncate">{name}</h3>
      </div>
    </Card>
  )
}