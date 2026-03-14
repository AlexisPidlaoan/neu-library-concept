
"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeFirebase } from '@/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, ShieldAlert, ShieldCheck, Loader2, Edit3, Check, X } from 'lucide-react';

const { firestore: db } = initializeFirebase();

export default function UserManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleBlockStatus = async (user: any) => {
    setUpdatingId(user.id);
    try {
      const newStatus = !user.isBlocked;
      await updateDoc(doc(db, 'users', user.id), { isBlocked: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, isBlocked: newStatus } : u));
      toast({
        title: newStatus ? 'User Blocked' : 'User Unblocked',
        description: `${user.displayName} has been ${newStatus ? 'blocked' : 'unblocked'}.`
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update user status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateStudentId = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { studentId: editStudentId });
      setUsers(users.map(u => u.id === userId ? { ...u, studentId: editStudentId } : u));
      setEditingId(null);
      toast({ title: 'ID Updated' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update student ID.' });
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
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email or ID..." 
            className="pl-10 bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-none shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[80px]"></TableHead>
                <TableHead>User Details</TableHead>
                <TableHead>Student/Emp ID</TableHead>
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
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
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
                            onChange={(e) => setEditStudentId(e.target.value)}
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
      
      {!loading && (
        <p className="mt-4 text-sm text-muted-foreground text-center">
          Showing {filteredUsers.length} of {users.length} registered accounts
        </p>
      )}
    </div>
  );
}
