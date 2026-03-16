
"use client"

import { useState, useMemo } from 'react'
import { useCollection, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import { useFirestore } from '@/firebase'
import { format, isWithinInterval, startOfToday, startOfWeek, subDays, startOfMonth } from 'date-fns'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts'
import { 
  Users, 
  Calendar as CalendarIcon, 
  Briefcase, 
  GraduationCap,
  Activity,
  FilterX
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'

const CHART_COLORS = ['#003399', '#00A859', '#FFD54F', '#ED1C24', '#9EB2BF', '#8b5cf6', '#ec4899']

export default function AdminDashboard() {
  const db = useFirestore()
  
  const [timePreset, setTimePreset] = useState<'today' | 'week' | 'month' | 'custom'>('week')
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })
  const [collegeFilter, setCollegeFilter] = useState<string>('all')
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'student' | 'teacher' | 'staff'>('all')
  const [purposeFilter, setPurposeFilter] = useState<string>('all')

  // Fetch all visits
  const visitsQuery = useMemoFirebase(() => {
    return query(collection(db, 'visits'), orderBy('timestamp', 'desc'))
  }, [db])
  
  const { data: visits = [], isLoading } = useCollection(visitsQuery)

  // Fetch unique colleges from visits or a predefined list
  const uniqueColleges = useMemo(() => {
    const set = new Set(visits.map(v => v.college).filter(Boolean))
    return Array.from(set).sort()
  }, [visits])

  // Fetch unique purposes
  const uniquePurposes = useMemo(() => {
    const set = new Set(visits.map(v => v.purpose).filter(Boolean))
    return Array.from(set).sort()
  }, [visits])

  // Filter logic
  const filteredData = useMemo(() => {
    if (!visits) return []
    
    return visits.filter(visit => {
      const visitDate = visit.timestamp?.toDate() || new Date()
      
      // Date Filter
      let inDateRange = true
      if (timePreset === 'today') {
        inDateRange = isWithinInterval(visitDate, { start: startOfToday(), end: new Date() })
      } else if (timePreset === 'week') {
        inDateRange = isWithinInterval(visitDate, { start: startOfWeek(new Date()), end: new Date() })
      } else if (timePreset === 'month') {
        inDateRange = isWithinInterval(visitDate, { start: startOfMonth(new Date()), end: new Date() })
      } else if (timePreset === 'custom' && dateRange?.from && dateRange?.to) {
        inDateRange = isWithinInterval(visitDate, { start: dateRange.from, end: dateRange.to })
      }

      // College Filter
      const inCollege = collegeFilter === 'all' || visit.college === collegeFilter

      // User Type Filter
      const inUserType = userTypeFilter === 'all' || visit.userType === userTypeFilter

      // Purpose Filter
      const inPurpose = purposeFilter === 'all' || visit.purpose === purposeFilter

      return inDateRange && inCollege && inUserType && inPurpose
    })
  }, [visits, timePreset, dateRange, collegeFilter, userTypeFilter, purposeFilter])

  // Stats
  const stats = useMemo(() => {
    const total = filteredData.length
    const students = filteredData.filter(v => v.userType === 'student').length
    const teachers = filteredData.filter(v => v.userType === 'teacher').length
    const staff = filteredData.filter(v => v.userType === 'staff').length
    const employees = teachers + staff
    
    return { total, students, teachers, staff, employees }
  }, [filteredData])

  // Chart Data: Visits by College
  const collegeChartData = useMemo(() => {
    const data: Record<string, number> = {}
    filteredData.forEach(v => {
      const label = v.college || 'Unspecified'
      data[label] = (data[label] || 0) + 1
    })
    return Object.entries(data).map(([name, value]) => ({ name, value }))
  }, [filteredData])

  // Chart Data: Visits by Purpose
  const purposeChartData = useMemo(() => {
    const data: Record<string, number> = {}
    filteredData.forEach(v => {
      const label = v.purpose || 'Unspecified'
      data[label] = (data[label] || 0) + 1
    })
    return Object.entries(data).map(([name, value]) => ({ name, value }))
  }, [filteredData])

  const resetFilters = () => {
    setTimePreset('week')
    setCollegeFilter('all')
    setUserTypeFilter('all')
    setPurposeFilter('all')
    setDateRange({ from: subDays(new Date(), 7), to: new Date() })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading analytics data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Library Insights</h1>
          <p className="text-muted-foreground font-medium">Real-time visitor analytics and trends</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
          <FilterX className="h-4 w-4" /> Reset Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-5 rounded-xl shadow-sm border">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
            <CalendarIcon className="h-3 w-3" /> Timeframe
          </label>
          <Select value={timePreset} onValueChange={(v: any) => setTimePreset(v)}>
            <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {timePreset === 'custom' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
              Select Range
            </label>
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
            <School className="h-3 w-3" /> College
          </label>
          <Select value={collegeFilter} onValueChange={setCollegeFilter}>
            <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colleges</SelectItem>
              {uniqueColleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
            <Users className="h-3 w-3" /> User Type
          </label>
          <Select value={userTypeFilter} onValueChange={(v: any) => setUserTypeFilter(v)}>
            <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="teacher">Teachers</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase">
            <Activity className="h-3 w-3" /> Purpose
          </label>
          <Select value={purposeFilter} onValueChange={setPurposeFilter}>
            <SelectTrigger className="border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Purposes</SelectItem>
              {uniquePurposes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-[#003399] to-[#002a7a] text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70">Total Visitors</CardDescription>
            <CardTitle className="text-4xl font-bold">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-white/60">Across selected filters</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500">Total Students</CardDescription>
            <CardTitle className="text-4xl font-bold text-[#003399]">{stats.students}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[#003399]" />
              <div className="text-xs font-medium text-slate-400">Enrolled Students</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500">Total Employees</CardDescription>
            <CardTitle className="text-4xl font-bold text-[#00A859]">{stats.employees}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#00A859]" />
              <div className="text-xs font-medium text-slate-400">Teachers & Staff</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-500">Average Daily</CardDescription>
            <CardTitle className="text-4xl font-bold text-[#FFD54F]">
              {Math.round(stats.total / (timePreset === 'week' ? 7 : timePreset === 'month' ? 30 : 1))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#FFD54F]" />
              <div className="text-xs font-medium text-slate-400">Visits per day</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Engagement by College</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeChartData} layout="vertical" margin={{ left: 30, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={150} 
                  fontSize={10} 
                  tick={{ fill: '#64748b' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#003399" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Purpose Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={purposeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {purposeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
