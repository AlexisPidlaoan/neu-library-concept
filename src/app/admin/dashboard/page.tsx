
"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import { LayoutDashboard, Download, Search, Users, School, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const { firestore: db } = initializeFirebase();

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [colleges, setColleges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('today');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const collegeSnap = await getDocs(collection(db, 'colleges'));
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

        const querySnapshot = await getDocs(q);
        const fetchedVisits = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().timestamp?.toDate() || new Date(),
        }));
        setVisits(fetchedVisits);
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeFilter]);

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = 
      (visit.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (visit.userEmail?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (visit.program?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (visit.purpose?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesCollege = collegeFilter === 'all' || visit.college === collegeFilter;
    return matchesSearch && matchesCollege;
  });

  const collegeStats = filteredVisits.reduce((acc: any, visit) => {
    acc[visit.college] = (acc[visit.college] || 0) + 1;
    return acc;
  }, {});

  const generatePDF = () => {
    setIsExporting(true);
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("NEU Library Visitor Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${format(new Date(), 'PPP p')}`, 14, 30);
    doc.text(`Timeframe: ${timeFilter.toUpperCase()}`, 14, 37);
    doc.text(`Total Visitors: ${filteredVisits.length}`, 14, 44);

    // Table
    const tableData = filteredVisits.map(v => [
      v.userName,
      v.college,
      v.program || 'N/A',
      v.purpose,
      format(v.date, 'MMM dd, yyyy HH:mm')
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Visitor Name', 'Department', 'Program', 'Purpose', 'Date & Time']],
      body: tableData,
    });

    doc.save(`NEU_Library_Report_${timeFilter}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    setIsExporting(false);
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center p-8 border-none shadow-lg">
          <CardTitle className="text-destructive mb-2">Access Denied</CardTitle>
          <CardDescription>You do not have administrative privileges to view this page.</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Visitor Dashboard
          </h1>
          <p className="text-muted-foreground">Monitor and manage library visits across all departments.</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2" 
          onClick={generatePDF} 
          disabled={isExporting || filteredVisits.length === 0}
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export PDF Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Visitors
            </CardDescription>
            <CardTitle className="text-4xl font-bold">{filteredVisits.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Based on filters</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <School className="h-4 w-4" />
              Top Department
            </CardDescription>
            <CardTitle className="text-2xl font-bold truncate">
              {Object.keys(collegeStats).sort((a, b) => collegeStats[b] - collegeStats[a])[0] || 'N/A'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Highest Traffic</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Timeframe
            </CardDescription>
            <CardTitle className="text-2xl font-bold capitalize">{timeFilter}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active View</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search visitors, programs or purpose..." 
                  className="pl-10 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[140px] bg-white">
                  <SelectValue placeholder="Timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
              <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                <SelectTrigger className="w-[180px] bg-white">
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Dept / Program</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Logged At</TableHead>
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
                          <Badge variant="outline" className="font-normal w-fit">{visit.college}</Badge>
                          <span className="text-xs text-muted-foreground italic">{visit.program}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{visit.purpose}</TableCell>
                      <TableCell className="text-sm">
                        {format(visit.date, 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      No records match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
