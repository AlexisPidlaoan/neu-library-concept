
"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { History, Search, BookOpen, Clock, School } from 'lucide-react';
import { Input } from '@/components/ui/input';

const { firestore: db } = initializeFirebase();

export default function HistoryPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'visits'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedVisits = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().timestamp?.toDate() || new Date(),
        }));
        setVisits(fetchedVisits);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [user]);

  const filteredVisits = visits.filter(visit => 
    visit.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
    visit.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (visit.program?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary mb-2 flex items-center gap-2">
            <History className="h-8 w-8" />
            My Visit History
          </h1>
          <p className="text-muted-foreground">Review all your previous entries to the library.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search my logs..." 
            className="pl-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[180px]">Date & Time</TableHead>
                  <TableHead>Department / Program</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 w-24 bg-slate-100 animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-4 w-48 bg-slate-100 animate-pulse rounded"></div></TableCell>
                      <TableCell><div className="h-4 w-32 bg-slate-100 animate-pulse rounded"></div></TableCell>
                      <TableCell className="text-right"><div className="h-4 w-16 bg-slate-100 animate-pulse rounded ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : filteredVisits.length > 0 ? (
                  filteredVisits.map((visit) => (
                    <TableRow key={visit.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{format(visit.date, 'MMM dd, yyyy')}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(visit.date, 'hh:mm a')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm">
                            <School className="h-3 w-3 text-primary" />
                            {visit.college}
                          </div>
                          <span className="text-xs text-muted-foreground italic pl-5">
                            {visit.program}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary/60" />
                          <span className="line-clamp-1">{visit.purpose}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/20 border-none">
                          Logged
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      No visits recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {!loading && visits.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground text-center">
          Showing {filteredVisits.length} of {visits.length} logs
        </p>
      )}
    </div>
  );
}
