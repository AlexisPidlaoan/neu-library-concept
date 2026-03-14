"use client"

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { History, Search, BookOpen, Clock, School, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';

const { firestore: db } = initializeFirebase();

export default function HistoryPage() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const visitsQuery = useMemoFirebase(() => {
    // We query by profile.id (which is the persistent Google UID)
    if (!profile?.id) return null;
    return query(
      collection(db, 'visits'),
      where('userId', '==', profile.id),
      orderBy('timestamp', 'desc')
    );
  }, [profile?.id]);

  const { data: visits, isLoading: loading } = useCollection(visitsQuery);

  const filteredVisits = (visits || []).filter(visit => 
    visit.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (visit.program?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <History className="h-10 w-10" />
            My Visit History
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">Review and track your previous library entries.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by purpose or program..." 
            className="pl-11 h-12 bg-white shadow-sm border-2 focus:border-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden rounded-2xl">
        <CardHeader className="bg-slate-50/80 border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Entry Log Book</CardTitle>
              <CardDescription>Total Records: {visits?.length || 0}</CardDescription>
            </div>
            <Badge variant="secondary" className="px-4 py-1 text-primary bg-primary/10 border-none font-bold">
              Student Account
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[200px] font-bold text-slate-700">Date & Time</TableHead>
                  <TableHead className="font-bold text-slate-700">Academic Background</TableHead>
                  <TableHead className="font-bold text-slate-700">Purpose of Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={3} className="p-8">
                        <div className="space-y-3">
                          <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded"></div>
                          <div className="h-3 w-1/2 bg-slate-50 animate-pulse rounded"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredVisits.length > 0 ? (
                  filteredVisits.map((visit) => {
                    const visitDate = visit.timestamp?.toDate() || new Date();
                    return (
                      <TableRow key={visit.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-0 group">
                        <TableCell className="font-medium p-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-900 font-bold">{format(visitDate, 'MMMM dd, yyyy')}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                              <Clock className="h-3 w-3 text-primary" />
                              {format(visitDate, 'hh:mm:ss a')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-6">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                              <School className="h-4 w-4 text-primary/70" />
                              {visit.college}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground italic pl-6">
                              <MapPin className="h-3 w-3" />
                              {visit.program}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="p-6">
                          <div className="flex items-start gap-3">
                            <div className="mt-1 h-2 w-2 rounded-full bg-accent animate-pulse" />
                            <span className="text-slate-800 font-medium leading-relaxed">{visit.purpose}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                        <div className="p-6 bg-slate-50 rounded-full">
                          <BookOpen className="h-12 w-12 opacity-20" />
                        </div>
                        <p className="text-lg font-medium">No visits recorded in your history yet.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {!loading && filteredVisits.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium bg-slate-50 py-3 rounded-full border border-dashed">
          <BookOpen className="h-4 w-4" />
          Displaying {filteredVisits.length} recorded entries
        </div>
      )}
    </div>
  );
}
