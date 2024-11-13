'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarDays, TrendingUp, Users, Activity, Clock, GripVertical } from 'lucide-react'
import { OrderCompletionChart } from '@/components/dashboard/OrderCompletionChart'
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed'
import { Board } from '@/typings/types'
import { useRealmApp } from '@/hooks/useRealmApp'
import { toast } from 'sonner'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { AverageCompletionTimeChart } from '@/components/dashboard/AverageCompletionTime'
import { GluingActivityChart } from '@/components/dashboard/GluingActicityChart'
import { cn } from '@/utils/functions'
import TopPerformers from '@/components/dashboard/TopPerformers'

type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface DashboardCard {
  id: string
  title: string
  icon: React.ReactNode
  content: (board: Board, timeRange: TimeRange, selectedEmployee: string | null) => React.ReactNode
  visible: boolean
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>('daily')
  const [board, setBoard] = useState<Board | undefined>(undefined)
  const { boardCollection: collection, isLoading } = useRealmApp()
  const [cards, setCards] = useState<DashboardCard[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)

  const loadBoard = useCallback(async () => {
    if (!collection) return

    try {
      const loadedBoard = await collection.findOne({})
      if (loadedBoard) {
        setBoard(loadedBoard)
        console.log("Board loaded:", loadedBoard)
      } else {
        throw new Error("No board found")
      }
    } catch (err) {
      console.error("Failed to load board", err)
      toast.error("Failed to load board. Please refresh the page.", {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }, [collection])

  useEffect(() => {
    if (!isLoading && collection) {
      loadBoard()
    }
  }, [isLoading, collection, loadBoard])

  useEffect(() => {
    const defaultCards: DashboardCard[] = [
      {
        id: 'orderCompletions',
        title: 'Order Completions',
        icon: <CalendarDays className="h-4 w-4 text-muted-foreground dark:text-gray-400" />,
        content: (board, timeRange, selectedEmployee) => (
          <OrderCompletionChart board={board} timeRange={timeRange} selectedEmployee={selectedEmployee} />
        ),
        visible: true
      },
      {
        id: 'gluingActivity',
        title: 'Gluing Activity',
        icon: <TrendingUp className="h-4 w-4 text-muted-foreground dark:text-gray-400" />,
        content: (board, timeRange, selectedEmployee) => (
          <GluingActivityChart board={board} timeRange={timeRange} selectedEmployee={selectedEmployee} />
        ),
        visible: true
      },
      {
        id: 'topPerformers',
        title: 'Top Performers',
        icon: <Users className="h-4 w-4 text-muted-foreground dark:text-gray-400" />,
        content: (board, timeRange, selectedEmployee) => (
          <TopPerformers 
            board={board} 
            timeRange={timeRange} 
            selectedEmployee={selectedEmployee}
            onEmployeeClick={(employee: string) => { 
              setSelectedEmployee(selectedEmployee === employee ? null : employee)
            }}
          />
        ),
        visible: true
      },
      {
        id: 'recentActivity',
        title: 'Recent Activity',
        icon: <Activity className="h-4 w-4 text-muted-foreground dark:text-gray-400" />,
        content: (board, _, selectedEmployee) => (
          <RecentActivityFeed board={board} selectedEmployee={selectedEmployee} />
        ),
        visible: true
      },
      {
        id: 'averageCompletionTime',
        title: 'Average Completion Time',
        icon: <Clock className="h-4 w-4 text-muted-foreground dark:text-gray-400" />,
        content: (board, timeRange, selectedEmployee) => (
          <AverageCompletionTimeChart board={board} timeRange={timeRange} selectedEmployee={selectedEmployee} />
        ),
        visible: true
      }
    ]

    const savedCards = localStorage.getItem('dashboardCards')
    if (savedCards) {
      const parsedCards = JSON.parse(savedCards)
      setCards(defaultCards.map(card => ({
        ...card,
        visible: parsedCards.find((c: DashboardCard) => c.id === card.id)?.visible ?? card.visible
      })))
    } else {
      setCards(defaultCards)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('dashboardCards', JSON.stringify(cards))
  }, [cards])

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return
    }

    const items = Array.from(cards)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setCards(items)
  }

  const toggleCardVisibility = (id: string) => {
    setCards(cards.map(card => 
      card.id === id ? { ...card, visible: !card.visible } : card
    ))
  }

  if (isLoading || !board) {
    return (
      <div className="p-8 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-gray-100">Everwood Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="dark:bg-gray-800 h-[400px]">
              <CardHeader>
                <Skeleton className="h-4 w-[250px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[320px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors duration-200">
      <h1 className="text-4xl font-bold mb-8 text-gray-800 dark:text-gray-100">Everwood Overview</h1>
      
      <Tabs defaultValue="daily" onValueChange={(value) => setTimeRange(value as TimeRange)}>
        <TabsList className="grid w-full grid-cols-4 mb-8 dark:bg-gray-800">
          <TabsTrigger 
            value="daily"
            className={cn(
              "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700",
              "data-[state=active]:text-primary dark:data-[state=active]:text-white",
              "dark:text-gray-300"
            )}
          >
            Daily
          </TabsTrigger>
          <TabsTrigger 
            value="weekly"
            className={cn(
              "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700",
              "data-[state=active]:text-primary dark:data-[state=active]:text-white",
              "dark:text-gray-300"
            )}
          >
            Weekly
          </TabsTrigger>
          <TabsTrigger 
            value="monthly"
            className={cn(
              "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700",
              "data-[state=active]:text-primary dark:data-[state=active]:text-white",
              "dark:text-gray-300"
            )}
          >
            Monthly
          </TabsTrigger>
          <TabsTrigger 
            value="yearly"
            className={cn(
              "data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700",
              "data-[state=active]:text-primary dark:data-[state=active]:text-white",
              "dark:text-gray-300"
            )}
          >
            Yearly
          </TabsTrigger>
        </TabsList>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="dashboard">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {cards.map((card, index) => (
                  <Draggable key={card.id} draggableId={card.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`transition-all duration-300 ${card.visible ? 'opacity-100' : 'opacity-50'}`}
                      >
                        <Card className="dark:bg-gray-800 h-[400px] flex flex-col">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="flex items-center space-x-2">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground dark:text-gray-400 cursor-move" />
                              </div>
                              <CardTitle className="text-sm font-medium dark:text-gray-100">{card.title}</CardTitle>
                            </div>
                            <div className="flex items-center space-x-2">
                              {card.icon}
                              <Switch
                                checked={card.visible}
                                onCheckedChange={() => toggleCardVisibility(card.id)}
                              />
                            </div>
                          </CardHeader>
                          {card.visible && (
                            <CardContent className="flex-grow overflow-auto">
                              {card.content(board, timeRange, selectedEmployee)}
                            </CardContent>
                          )}
                        </Card>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </Tabs>
    </div>
  )
}