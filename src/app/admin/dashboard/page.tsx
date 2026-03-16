"use client"

import { useMemo, useState } from 'react'
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase'
import { collection, query, orderBy, where } from 'firebase/firestore'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { 
  Users, 
  Building2, 
  Target, 
  Calendar as CalendarIcon,
  Search,
  Users2,
  TrendingUp,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns'

const CHART_COLORS = ['#003399', '#00A859', '#FFD54F', '#ED1C24', '#9EB2BF', '#8b5cf6', '#ec4899']

export default function AdminDashboard() {
  const db = useFirestore()
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  })
  
  const [filters, setFilters] = useState({
    college: 'all',
    userType: 'all',
    purpose: 'all'
  })

  const visitsQuery = useMemoFirebase(() => {
    return query(collection(db, 'visits'), orderBy('timestamp', 'desc'))
  }, [db])

  const { data: visits = [], isLoading } = useCollection(visitsQuery)

  // Safe access to visits with null check
  const safeVisits = Array.isArray(visits) ? visits : []

  // Extract unique filter values
  const uniqueColleges = useMemo(() => {
    const set = new Set(safeVisits.map(v => v.college).filter(Boolean))
    return Array.from(set).sort()
  }, [safeVisits])

  const uniquePurposes = useMemo(() => {
    const set = new Set(safeVisits.map(v => v.purpose).filter(Boolean))
    return Array.from(set).sort()
  }, [safeVisits])

  // Filtered data for statistics
  const filteredVisits = useMemo(() => {
    return safeVisits.filter(visit => {
      const date = visit.timestamp?.toDate()
      if (!date) return false

      const inDateRange = !dateRange?.from || !dateRange?.to || 
        isWithinInterval(date, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(dateRange.to) 
        })

      const inCollege = filters.college === 'all' || visit.college === filters.college
      const inUserType = filters.userType === 'all' || visit.userType === filters.userType
      const inPurpose = filters.purpose === 'all' || visit.purpose === filters.purpose

      return inDateRange && inCollege && inUserType && inPurpose
    })
  }, [safeVisits, dateRange, filters])

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = filteredVisits.length
    const byCollege: Record<string, number> = {}
    const byPurpose: Record<string, number> = {}
    const byUserType: Record<string, number> = {}

    filteredVisits.forEach(v => {
      byCollege[v.college] = (byCollege[v.college] || 0) + 1
      byPurpose[v.purpose] = (byPurpose[v.purpose] || 0) + 1
      byUserType[v.userType || 'student'] = (byUserType[v.userType || 'student'] || 0) + 1
    })

    return {
      total,
      byCollege: Object.entries(byCollege).map(([name, value]) => ({ name, value })),
      byPurpose: Object.entries(byPurpose).map(([name, value]) => ({ name, value })),
      byUserType: Object.entries(byUserType).map(([name, value]) => ({ name, value }))
    }
  }, [filteredVisits])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Library Statistics</h1>
          <p className="text-muted-foreground">Monitor and analyze library usage patterns.</p>
        </div>
        <div className="flex gap-4">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Total Visitors
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        
        <Select value={filters.college} onValueChange={v => setFilters({...filters, college: v})}>
          <SelectTrigger className="bg-white h-full">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <SelectValue placeholder="All Colleges" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colleges</SelectItem>
            {uniqueColleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.userType} onValueChange={v => setFilters({...filters, userType: v})}>
          <SelectTrigger className="bg-white h-full">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              <SelectValue placeholder="All User Types" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All User Types</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="teacher">Teachers</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.purpose} onValueChange={v => setFilters({...filters, purpose: v})}>
          <SelectTrigger className="bg-white h-full">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <SelectValue placeholder="All Purposes" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Purposes</SelectItem>
            {uniquePurposes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Visits by College
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byCollege} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#003399" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Purpose Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.byPurpose}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.byPurpose.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
