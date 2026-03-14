
"use client"

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay, eachDayOfInterval, isSameDay } from 'date-fns';
import { LayoutDashboard, Download, Search, Users, School, Loader2, TrendingUp, BookOpen, GraduationCap, PieChart as PieChartIcon, AlertCircle } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const { firestore: db } = initializeFirebase();

const CHART_COLORS = ['#003399', '#00A859', '#FFD54F', '#ED1C24', '#9EB2BF'];

const DEPT_ABBREVIATIONS: Record<string, string> = {
  "College of Arts and Sciences (CAS)": "CAS",
  "College of Business Administration (CBA)": "CBA",
  "College of Communication (COC)": "COC",
  "College of Education (CED)": "CED",
  "College of Engineering and Architecture (CEA)": "CEA",
  "College of Informatics and Computing Studies (CICS)": "CICS",
  "Medical & Health Sciences": "MHS",
  "Specialized Colleges": "SC"
};

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState('today');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!profile || profile.role !== 'admin') return;
      
      setLoading(true);
      setError(null);
      try {
        const collegeSnap = await getDocs(collection(db, 'colleges')).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'colleges',
            operation: 'list'
          }));
          throw err;
        });
        setColleges(collegeSnap.docs.map(doc => doc.data().name));

        let q = query(collection(db, 'visits'), orderBy('timestamp', 'desc'));
        
        const now = new Date();
        if (timeFilter === 'today') {
          q = query(q, where('timestamp', '>=', Timestamp.fromDate(startOfDay(now))), where('timestamp', '<=', Timestamp.fromDate(endOfDay(now))));
        } else if (timeFilter === 'week') {
          q = query(q, where('timestamp', '>=', Timestamp.fromDate(startOfWeek(now))));
        } else if (timeFilter === 'month') {
          q = query(q, where('timestamp', '>=', Timestamp.fromDate(startOfMonth(now))));
        }

        const querySnapshot = await getDocs(q).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'visits',
            operation: 'list'
          }));
          throw err;
        });

        const fetchedVisits = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().timestamp?.toDate() || new Date(),
        }));
        
        setVisits(fetchedVisits);
      } catch (err: any) {
        console.error("Dashboard Data Fetch Error:", err);
        setError("Failed to load dashboard data. Please ensure database indexes are ready.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeFilter, profile]);

  const filteredVisits = useMemo(() => {
    return visits.filter(visit => {
      const searchLow = searchTerm.toLowerCase();
      const matchesSearch = 
        (visit.userName?.toLowerCase() || "").includes(searchLow) ||
        (visit.userEmail?.toLowerCase() || "").includes(searchLow) ||
        (visit.program?.toLowerCase() || "").includes(searchLow) ||
        (visit.purpose?.toLowerCase() || "").includes(searchLow);
      const matchesCollege = collegeFilter === 'all' || visit.college === collegeFilter;
      return matchesSearch && matchesCollege;
    });
  }, [visits, searchTerm, collegeFilter]);

  const trendData = useMemo(() => {
    const now = new Date();
    let interval: { start: Date; end: Date };
    
    if (timeFilter === 'today') {
      interval = { start: startOfDay(now), end: endOfDay(now) };
    } else if (timeFilter === 'week') {
      interval = { start: startOfWeek(now), end: now };
    } else if (timeFilter === 'month') {
      interval = { start: startOfMonth(now), end: now };
    } else {
      interval = { start: startOfMonth(now), end: now };
    }

    const days = eachDayOfInterval(interval);
    return days.map(day => {
      const count = filteredVisits.filter(v => isSameDay(v.date, day)).length;
      return {
        date: format(day, 'MMM dd'),
        visitors: count
      };
    });
  }, [filteredVisits, timeFilter]);

  const collegeStats = useMemo(() => {
    const stats = filteredVisits.reduce((acc: any, visit) => {
      const name = DEPT_ABBREVIATIONS[visit.college] || visit.college;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  }, [filteredVisits]);

  const programStats = filteredVisits.reduce((acc: any, visit) => {
    acc[visit.program] = (acc[visit.program] || 0) + 1;
    return acc;
  }, {});

  const purposeStats = filteredVisits.reduce((acc: any, visit) => {
    acc[visit.purpose] = (acc[visit.purpose] || 0) + 1;
    return acc;
  }, {});

  const topPurpose = Object.keys(purposeStats).sort((a, b) => purposeStats[b] - purposeStats[a])[0] || 'N/A';
  const topCollege = filteredVisits.reduce((acc: any, visit) => {
    acc[visit.college] = (acc[visit.college] || 0) + 1;
    return acc;
  }, {});
  const topCollegeName = Object.keys(topCollege).sort((a, b) => topCollege[b] - topCollege[a])[0] || 'N/A';
  
  const topProgram = Object.keys(programStats).sort((a, b) => programStats[b] - programStats[a])[0] || 'N/A';

  const generatePDF = () => {
    setIsExporting(true);
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(0, 51, 153);
    doc.text("NEU Library Visitor Report", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 30);
    doc.text(`Timeframe: ${timeFilter.toUpperCase()}`, 14, 37);
    doc.text(`Total Visitors: ${filteredVisits.length}`, 14, 44);
    doc.text(`Top Department: ${topCollegeName}`, 14, 51);

    const tableData = filteredVisits.map(v => [
      v.userName,
      v.college,
      v.program || 'N/A',
      v.purpose,
      format(v.date, 'MMM dd, yyyy HH:mm')
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['Visitor Name', 'Department', 'Program', 'Purpose', 'Date & Time']],
      body: tableData,
      headStyles: { fillColor: [0, 51, 153] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`NEU_Library_Report_${timeFilter}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    setIsExporting(false);
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center p-8 border-none shadow-lg bg-white">
          <CardTitle className="text-destructive mb-2">Access Denied</CardTitle>
          <CardDescription>You do not have administrative privileges to view this page.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Visitor Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor and manage library visits across all departments.</p>
        </div>
        <Button 
          variant="default" 
          className="gap-2 shadow-lg bg-primary hover:bg-primary/90" 
          onClick={generatePDF} 
          disabled={isExporting || filteredVisits.length === 0}
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export PDF Report
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-white">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>System Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-primary text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-white/70 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Visitors
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{filteredVisits.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <School className="h-4 w-4 text-[#00A859]" />
              Top Department
            </CardDescription>
            <CardTitle className="text-lg font-bold truncate text-primary">
              {topCollegeName}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-[#FFD54F]" />
              Top Program
            </CardDescription>
            <CardTitle className="text-lg font-bold truncate text-primary">
              {topProgram}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#ED1C24]" />
              Daily Average
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-primary">
              {filteredVisits.length > 0 ? (filteredVisits.length / trendData.length).toFixed(1) : 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-8 border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Visitor Traffic Trend
            </CardTitle>
            <CardDescription>Visualizing entries over the selected timeframe.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}`} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-xl text-xs">
                          <p className="font-bold text-slate-900">{payload[0].payload.date}</p>
                          <p className="text-primary">{payload[0].value} Visitors</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="visitors" fill="#003399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-[#00A859]" />
              Department Distribution
            </CardTitle>
            <CardDescription>Breakdown by college (Abbreviated).</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={collegeStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {collegeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-2 border rounded-md shadow-lg text-[10px]">
                          <p className="font-bold">{payload[0].name}</p>
                          <p className="text-primary">{payload[0].value} visits</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-1 border-none shadow-lg bg-white h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Quick Filters</CardTitle>
            <CardDescription>Refine your statistics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Interval</label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-full bg-slate-50 border-primary/10">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Department Filter</label>
              <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                <SelectTrigger className="w-full bg-slate-50 border-primary/10">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {colleges.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Entries</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Name, program, or purpose" 
                  className="pl-10 bg-slate-50 border-primary/10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-lg bg-white overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50">
            <CardTitle className="text-lg">Detailed Entry Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Dept / Program</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Time Entry</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}><div className="h-12 w-full bg-slate-50 animate-pulse rounded"></div></TableCell>
                      </TableRow>
                    ))
                  ) : filteredVisits.length > 0 ? (
                    filteredVisits.map((visit) => (
                      <TableRow key={visit.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-semibold">{visit.userName}</span>
                            <span className="text-xs text-muted-foreground">{visit.userEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="font-normal w-fit text-[10px] border-primary text-primary">{visit.college}</Badge>
                            <span className="text-xs text-muted-foreground italic line-clamp-1">{visit.program}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium text-slate-700">{visit.purpose}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(visit.date, 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                        {error ? "Error loading data." : "No matching records found for this timeframe."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
