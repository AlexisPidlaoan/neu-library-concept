"use client"

import { useMemo, useState } from 'react'
import { useAuthContext } from '@/hooks/use-auth'
import { useCollection, useMemoFirebase, useFirestore } from '@/firebase'
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore'
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
  TrendingUp,
  Loader2,
  Filter,
  Users2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { startOfDay, endOfDay, isWithinInterval, subDays, startOfWeek, endOfWeek } from 'date-fns'

const CHART_COLORS = ['#003399', '#00A859', '#FFD54F', '#ED1C24', '#9EB2BF', '#8b5cf6', '#ec4899']

export default function AdminDashboard() {
  const { profile } = useAuthContext()
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

  const { data: rawVisits, isLoading } = useCollection(visitsQuery)
  const visits = useMemo(() => rawVisits || [], [rawVisits])

  // Fetch unique colleges
  const uniqueColleges = useMemo(() => {
    const set = new Set(visits.map(v => v.college).filter(Boolean))
    return Array.from(set).sort()
  }, [visits])

  // Fetch unique purposes
  const uniquePurposes = useMemo(() => {
    const set = new Set(visits.map(v => v.purpose).filter(Boolean))
    return Array.from(set).sort()
  }, [visits])

  // Filtered data for statistics
  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const date = (visit.timestamp as any)?.toDate()
      if (!date) return false

      const inDateRange = !dateRange?.from || !dateRange?.to || 
        isWithinInterval(date, { 
          start: startOfDay(dateRange.from), 
          end: endOfDay(dateRange.to) 
        })

      const inCollege = filters.college === 'all' || visit.college === filters.college
      const inUserType = filters.userType === 'all' || (filters.userType === 'employee' ? (visit.userType === 'teacher' || visit.userType === 'staff') : visit.userType === filters.userType)
      const inPurpose = filters.purpose === 'all' || visit.purpose === filters.purpose

      return inDateRange && inCollege && inUserType && inPurpose
    })
  }, [visits, dateRange, filters])

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = filteredVisits.length
    const byCollege: Record<string, number> = {}
    const byPurpose: Record<string, number> = {}
    const byUserType: Record<string, number> = {
      'student': 0,
      'teacher': 0,
      'staff': 0
    }

    filteredVisits.forEach(v => {
      if (v.college) byCollege[v.college] = (byCollege[v.college] || 0) + 1
      if (v.purpose) byPurpose[v.purpose] = (byPurpose[v.purpose] || 0) + 1
      if (v.userType) byUserType[v.userType] = (byUserType[v.userType] || 0) + 1
    })

    return {
      total,
      byCollege: Object.entries(byCollege).map(([name, value]) => ({ name, value })),
      byPurpose: Object.entries(byPurpose).map(([name, value]) => ({ name, value })),
      byUserType: Object.entries(byUserType).map(([name, value]) => ({ name, value }))
    }
  }, [filteredVisits])

  const setPreset = (type: 'day' | 'week' | 'month') => {
    const now = new Date()
    if (type === 'day') {
      setDateRange({ from: startOfDay(now), to: endOfDay(now) })
    } else if (type === 'week') {
      setDateRange({ from: startOfWeek(now), to: endOfWeek(now) })
    } else {
      setDateRange({ from: subDays(now, 30), to: now })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (profile?.role !== 'admin') return <div className="p-8">Access Denied</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Visitor Statistics</h1>
          <p className="text-muted-foreground">Comprehensive insights into library attendance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreset('day')}>Today</Button>
          <Button variant="outline" size="sm" onClick={() => setPreset('week')}>This Week</Button>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2 space-y-0">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Total Entries
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
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="student">Students</SelectItem>
            <SelectItem value="employee">Employees (Teacher/Staff)</SelectItem>
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
        <Card className="bg-white shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Visits by College
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byCollege} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={150} fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#003399" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm border-none">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Purpose of Visit
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.byPurpose}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.byPurpose.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
