"use client"

import { useState, useMemo } from 'react'
import { useAuthContext } from '@/hooks/use-auth'
import { initializeFirebase, useCollection, useMemoFirebase } from '@/firebase'
import { collection, query, orderBy } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { DateRange } from 'react-day-picker'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'
import { 
  Users, Calendar, Filter, Download, ArrowUpRight, 
  Clock, MapPin, Search, Loader2, BookOpen
} from 'lucide-react'
import { format, startOfDay, endOfDay, subDays, isWithinInterval, startOfToday, startOfYesterday, startOfWeek, startOfMonth } from 'date-fns'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const { firestore: db } = initializeFirebase()

const CHART_COLORS = ['#396EAD', '#8766DA', '#4CAF50', '#ED1C24', '#9EB2BF', '#FFD54F']

export default function AdminDashboard() {
  const { profile } = useAuthContext()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date()
  })
  const [quickFilter, setQuickFilter] = useState<string>('week')
  const [collegeFilter, setCollegeFilter] = useState<string>('all')
  const [userTypeFilter, setUserTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const visitsQuery = useMemoFirebase(() => query(
    collection(db, 'visits'),
    orderBy('timestamp', 'desc')
  ), [])

  const { data: visits, isLoading } = useCollection(visitsQuery)

  const filteredVisits = useMemo(() => {
    if (!visits) return []
    
    return visits.filter(v => {
      const visitDate = v.timestamp?.toDate?.()
      if (!visitDate) return false

      if (dateRange?.from && dateRange?.to) {
        if (!isWithinInterval(visitDate, { start: startOfDay(dateRange.from!), end: endOfDay(dateRange.to!) })) {
          return false
        }
      } else if (dateRange?.from) {
        if (visitDate < startOfDay(dateRange.from)) return false
      } else if (dateRange?.to) {
        if (visitDate > endOfDay(dateRange.to)) return false
      }

      if (collegeFilter !== 'all' && v.college !== collegeFilter) return false
      if (userTypeFilter !== 'all' && v.userType !== userTypeFilter) return false
      if (searchQuery) {
        const queryStr = searchQuery.toLowerCase()
        return (
          v.userName?.toLowerCase().includes(queryStr) ||
          v.userEmail?.toLowerCase().includes(queryStr) ||
          v.purpose?.toLowerCase().includes(queryStr)
        )
      }
      return true
    })
  }, [visits, dateRange, collegeFilter, userTypeFilter, searchQuery])

  const stats = useMemo(() => {
    const total = filteredVisits.length
    const students = filteredVisits.filter(v => v.userType === 'student').length
    const employees = total - students
    
    const collegeCount: Record<string, number> = {}
    filteredVisits.forEach(v => {
      if (v.college) collegeCount[v.college] = (collegeCount[v.college] || 0) + 1
    })
    const collegeData = Object.entries(collegeCount).map(([name, value]) => ({ name, value }))
    
    const purposeCount: Record<string, number> = {}
    filteredVisits.forEach(v => {
      if (v.purpose) purposeCount[v.purpose] = (purposeCount[v.purpose] || 0) + 1
    })
    const purposeData = Object.entries(purposeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    return { total, students, employees, collegeData, purposeData }
  }, [filteredVisits])

  const handleQuickFilter = (val: string) => {
    setQuickFilter(val)
    const now = new Date()
    switch (val) {
      case 'today':
        setDateRange({ from: startOfToday(), to: now })
        break
      case 'yesterday':
        setDateRange({ from: startOfYesterday(), to: startOfYesterday() })
        break
      case 'week':
        setDateRange({ from: startOfWeek(now), to: now })
        break
      case 'month':
        setDateRange({ from: startOfMonth(now), to: now })
        break
      default:
        break
    }
  }

  const uniqueColleges = useMemo(() => {
    if (!visits) return []
    const set = new Set(visits.map(v => v.college).filter(Boolean))
    return Array.from(set).sort()
  }, [visits])

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('NEU Library Visit Logs', 14, 20)
    doc.setFontSize(10)
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 28)
    
    const tableData = filteredVisits.map(v => [
      format(v.timestamp?.toDate?.() || new Date(), 'MM/dd/yyyy HH:mm'),
      v.userName || 'Anonymous',
      v.userType || 'N/A',
      v.college || 'N/A',
      v.purpose || 'N/A'
    ])

    ;(doc as any).autoTable({
      head: [['Timestamp', 'Name', 'Type', 'College', 'Purpose']],
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [0, 51, 153] }
    })

    doc.save(`NEU_Library_Logs_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <BarChart className="h-8 w-8" />
            Visitor Analytics
          </h1>
          <p className="text-muted-foreground">Real-time statistics and departmental usage tracking.</p>
        </div>
        <Button onClick={exportToPDF} className="bg-primary hover:bg-primary/90 shadow-md">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-6 space-y-6">
          {/* Row 1: Quick View and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick View</label>
              <Select value={quickFilter} onValueChange={handleQuickFilter}>
                <SelectTrigger className="bg-white border-slate-200 h-10">
                  <SelectValue placeholder="Quick Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">College</label>
              <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                <SelectTrigger className="bg-white border-slate-200 h-10">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="All Departments" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueColleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">User Type</label>
              <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                <SelectTrigger className="bg-white border-slate-200 h-10">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="All Roles" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Logs</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter name/purpose..." 
                  className="pl-10 bg-white border-slate-200 h-10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Row 2: Custom Date Range (Separate pickers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-50">
            <DatePicker 
              label="Starting Date" 
              date={dateRange?.from} 
              setDate={(d) => {
                setQuickFilter('custom');
                setDateRange(prev => ({ ...prev, from: d }));
              }} 
            />
            <DatePicker 
              label="Ending Date" 
              date={dateRange?.to} 
              setDate={(d) => {
                setQuickFilter('custom');
                setDateRange(prev => ({ ...prev, to: d }));
              }} 
            />
            <div className="hidden lg:block lg:col-span-2"></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-none shadow-md overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Visits</p>
                <h3 className="text-3xl font-bold text-primary">{stats.total}</h3>
              </div>
              <div className="p-3 bg-blue-50 text-primary rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-md overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Student Entries</p>
                <h3 className="text-3xl font-bold text-success">{stats.students}</h3>
              </div>
              <div className="p-3 bg-green-50 text-success rounded-xl group-hover:scale-110 transition-transform">
                <BookOpen className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white border-none shadow-md overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Employee Entries</p>
                <h3 className="text-3xl font-bold text-destructive">{stats.employees}</h3>
              </div>
              <div className="p-3 bg-red-50 text-destructive rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Departmental Breakdown</CardTitle>
            <CardDescription>Number of visits per college</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.collegeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Top Visit Purposes</CardTitle>
            <CardDescription>Primary reasons for library usage</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.purposeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.purposeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
