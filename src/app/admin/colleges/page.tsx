
"use client"

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/hooks/use-auth';
import { initializeFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { School, Plus, Trash2, Edit2, Loader2, Save, X, DatabaseBackup } from 'lucide-react';

const { firestore: db } = initializeFirebase();

const DEFAULT_DEPARTMENTS = [
  "College of Arts and Sciences (CAS)",
  "College of Business Administration (CBA)",
  "College of Communication (COC)",
  "College of Education (CED)",
  "College of Engineering and Architecture (CEA)",
  "College of Informatics and Computing Studies (CICS)",
  "Medical & Health Sciences",
  "Specialized Colleges"
];

export default function CollegesManagementPage() {
  const { profile } = useAuthContext();
  const { toast } = useToast();
  const [newCollege, setNewCollege] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const collegesQuery = useMemoFirebase(() => query(collection(db, 'colleges'), orderBy('name', 'asc')), []);
  const { data: colleges, isLoading: loading } = useCollection(collegesQuery);

  const handleAddCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollege.trim()) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'colleges'), { 
        name: newCollege.trim(), 
        createdAt: new Date().toISOString() 
      });
      setNewCollege('');
      toast({ title: 'Department Added', description: `${newCollege} has been added to the system.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add department.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      const existingNames = colleges?.map(c => c.name) || [];
      
      let addedCount = 0;
      DEFAULT_DEPARTMENTS.forEach(name => {
        if (!existingNames.includes(name)) {
          const newDocRef = doc(collection(db, 'colleges'));
          batch.set(newDocRef, {
            name,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      });

      if (addedCount > 0) {
        await batch.commit();
        toast({ title: 'System Seeded', description: `Added ${addedCount} default departments.` });
      } else {
        toast({ title: 'No Changes', description: 'All default departments already exist.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to seed departments.' });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await deleteDoc(doc(db, 'colleges', id));
      toast({ title: 'Department Deleted' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete department.' });
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
      toast({ title: 'Department Updated' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update department.' });
    }
  };

  if (profile?.role !== 'admin') return <div className="p-8">Access Denied</div>;

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
            <School className="h-8 w-8" />
            College Department Management
          </h1>
          <p className="text-muted-foreground">Manage departments used in the library check-in form.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSeedDefaults} 
          disabled={isSeeding}
          className="gap-2 border-primary/20 hover:bg-primary/5 text-primary bg-white"
        >
          {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
          Load NEU Defaults
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 h-fit border-none shadow-lg bg-white">
          <form onSubmit={handleAddCollege}>
            <CardHeader>
              <CardTitle className="text-lg">Add New Department</CardTitle>
              <CardDescription>Enter a custom department name.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="collegeName">Department Name</Label>
                <Input 
                  id="collegeName" 
                  placeholder="e.g., Graduate School" 
                  value={newCollege}
                  onChange={(e) => setNewCollege(e.target.value)}
                  className="bg-white"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled={isSubmitting || !newCollege.trim()}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Add Department
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="md:col-span-2 border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Existing Departments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department Name</TableHead>
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
                ) : colleges && colleges.map((college) => (
                  <TableRow key={college.id}>
                    <TableCell>
                      {editingId === college.id ? (
                        <Input 
                          value={editingValue} 
                          onChange={(e) => setEditingValue(e.target.value)} 
                          className="h-8 bg-white"
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
                {(!colleges || colleges.length === 0) && !loading && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                      No departments found. Use "Load NEU Defaults" to get started.
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
