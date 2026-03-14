"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeFirebase } from '@/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy, writeBatch, setDoc } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, ShieldAlert, ShieldCheck, Loader2, Edit3, Check, X, DatabaseBackup } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const { firestore: db } = initializeFirebase();

const SAMPLE_STUDENTS = [
  { id: 'sample-s1', displayName: 'Juan Dela Cruz', email: 'juan.delacruz@neu.edu.ph', studentId: '21-12345-678', role: 'student' },
  { id: 'sample-s2', displayName: 'Maria Clara', email: 'maria.clara@neu.edu.ph', studentId: '22-54321-098', role: 'student' },
  { id: 'sample-s3', displayName: 'Jose Rizal', email: 'jose.rizal@neu.edu.ph', studentId: '19-11111-222', role: 'student' }
];

const SAMPLE_ADMINS = [
  { id: 'sample-a1', displayName: 'Alexis Pidlaoan', email: 'alexis.pidlaoan@neu.edu.ph', role: 'admin' },
  { id: 'sample-a2', displayName: 'Library Supervisor', email: 'admin.library@neu.edu.ph', role: 'admin' },
  { id: 'sample-a3', displayName: 'Library Assistant', email: 'staff.library@neu.edu.ph', role: 'admin' }
];

export default function UserManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStudentId, setEditStudentId] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
      const querySnapshot = await getDocs(q);
      setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'users',
        operation: 'list'
      }));
    } finally {
      setLoading(false);
    }
  }

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      [...SAMPLE_STUDENTS, ...SAMPLE_ADMINS].forEach(u => {
        const userRef = doc(db, 'users', u.id);
        batch.set(userRef, {
          ...u,
          isBlocked: false,
          createdAt: now,
          updatedAt: now
        }, { merge: true });

        // If admin, also seed the admins collection for security rules
        if (u.role === 'admin') {
          const adminRef = doc(db, 'admins', u.id);
          batch.set(adminRef, { active: true }, { merge: true });
        }
      });

      await batch.commit();
      toast({ title: 'Database Populated', description: 'Sample students and admins have been added.' });
      fetchUsers();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Seed Failed' });
    } finally {
      setIsSeeding(false);
    }
  };

  const formatStudentId = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const truncated = digits.slice(0, 10);
    let formatted = truncated;
    if (truncated.length > 2) formatted = `${truncated.slice(0, 2)}-${truncated.slice(2)}`;
    if (truncated.length > 7) formatted = `${truncated.slice(0, 2)}-${truncated.slice(2, 7)}-${truncated.slice(7)}`;
    return formatted;
  };

  const handleEditIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditStudentId(formatStudentId(e.target.value));
  };

  const toggleBlockStatus = async (user: any) => {
    setUpdatingId(user.id);
    try {
      const newStatus = !user.isBlocked;
      await updateDoc(doc(db, 'users', user.id), { isBlocked: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, isBlocked: newStatus } : u));
      toast({ title: newStatus ? 'User Blocked' : 'User Unblocked' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStudentId = async (userId: string) => {
    const idPattern = /^\d{2}-\d{5}-\d{3}$/;
    if (editStudentId && !idPattern.test(editStudentId)) {
      toast({ variant: 'destructive', title: 'Invalid Format' });
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), { studentId: editStudentId });
      setUsers(users.map(u => u.id === userId ? { ...u, studentId: editStudentId } : u));
      setEditingId(null);
      toast({ title: 'ID Updated' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error' });
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'admin') return <div className="p-8">Access Denied</div>;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Users className="h-8 w-8" />
            User Management
          </h1>
          <p className="text-muted-foreground">Search and manage all registered user accounts.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={handleSeedData} 
            disabled={isSeeding}
            className="gap-2 border-primary/20 hover:bg-primary/5 text-primary"
          >
            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
            Seed Sample Data
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px]"></TableHead>
                <TableHead>User Details</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Access Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="h-16 animate-pulse bg-slate-50/50"></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={user.photoURL} />
                        <AvatarFallback className="bg-primary/5 text-primary uppercase">
                          {user.displayName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user.displayName}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <div className="flex items-center gap-1">
                          <Input 
                            className="h-8 w-32 text-xs" 
                            value={editStudentId} 
                            onChange={handleEditIdChange}
                            maxLength={12}
                            placeholder="12-34567-890"
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => handleUpdateStudentId(user.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="font-mono text-sm">{user.studentId || 'Not set'}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setEditingId(user.id);
                              setEditStudentId(user.studentId || '');
                            }}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize font-normal">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isBlocked ? (
                        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-none">
                          Blocked
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-success/10 text-success border-none">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant={user.isBlocked ? "outline" : "destructive"}
                        className="w-32"
                        onClick={() => toggleBlockStatus(user)}
                        disabled={updatingId === user.id}
                      >
                        {updatingId === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.isBlocked ? (
                          <>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Unblock
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            Block User
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}