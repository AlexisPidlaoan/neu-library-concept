"use client"

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { School, Plus, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';

export default function CollegesManagementPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCollege, setNewCollege] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchColleges();
  }, []);

  async function fetchColleges() {
    try {
      const q = query(collection(db, 'colleges'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      setColleges(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching colleges:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollege.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'colleges'), { name: newCollege.trim() });
      setNewCollege('');
      fetchColleges();
      toast({ title: 'College Added', description: `${newCollege} has been added to the system.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add college.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this college?')) return;
    try {
      await deleteDoc(doc(db, 'colleges', id));
      fetchColleges();
      toast({ title: 'College Deleted' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete college.' });
    }
  };

  const startEditing = (college: any) => {
    setEditingId(college.id);
    setEditingValue(college.name);
  };

  const handleUpdate = async () => {
    if (!editingId || !editingValue.trim()) return;
    try {
      await updateDoc(doc(db, 'colleges', editingId), { name: editingValue.trim() });
      setEditingId(null);
      fetchColleges();
      toast({ title: 'College Updated' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update college.' });
    }
  };

  if (profile?.role !== 'admin') return <div className="p-8">Access Denied</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <School className="h-8 w-8" />
          College Management
        </h1>
        <p className="text-muted-foreground">Add, edit or remove colleges used in the check-in form.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 h-fit border-none shadow-lg">
          <form onSubmit={handleAddCollege}>
            <CardHeader>
              <CardTitle className="text-lg">Add New College</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="collegeName">Name</Label>
                <Input 
                  id="collegeName" 
                  placeholder="e.g., College of Arts" 
                  value={newCollege}
                  onChange={(e) => setNewCollege(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled={isSubmitting || !newCollege.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add College
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="md:col-span-2 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Existing Colleges</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 w-48 bg-slate-100 animate-pulse rounded"></div></TableCell>
                      <TableCell className="text-right"><div className="h-8 w-16 bg-slate-100 animate-pulse rounded ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : colleges.map((college) => (
                  <TableRow key={college.id}>
                    <TableCell>
                      {editingId === college.id ? (
                        <Input 
                          value={editingValue} 
                          onChange={(e) => setEditingValue(e.target.value)} 
                          className="h-8"
                        />
                      ) : (
                        college.name
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingId === college.id ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={handleUpdate} className="h-8 w-8 text-success">
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8">
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => startEditing(college)} className="h-8 w-8">
                              <Edit2 className="h-4 w-4 text-slate-400" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(college.id)} className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {colleges.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                      No colleges added yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}