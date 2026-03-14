"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { suggestPurpose } from '@/ai/flows/smart-purpose-suggester';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, Sparkles, BookOpen } from 'lucide-react';

export default function CheckInPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [purpose, setPurpose] = useState('');
  const [college, setCollege] = useState('');
  const [colleges, setColleges] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingColleges, setIsLoadingColleges] = useState(true);

  useEffect(() => {
    async function fetchColleges() {
      try {
        const q = query(collection(db, 'colleges'), orderBy('name', 'asc'));
        const querySnapshot = await getDocs(q);
        const fetchedColleges = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setColleges(fetchedColleges);
      } catch (error) {
        console.error('Error fetching colleges:', error);
      } finally {
        setIsLoadingColleges(false);
      }
    }
    fetchColleges();
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (purpose.length >= 2) {
        const result = await suggestPurpose({ partialPurpose: purpose });
        setSuggestions(result.suggestions);
      } else if (purpose.length === 0) {
        const result = await suggestPurpose({ partialPurpose: '' });
        setSuggestions(result.suggestions);
      } else {
        setSuggestions([]);
      }
    };
    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [purpose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !college || !purpose) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please select a college and specify your purpose of visit.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'visits'), {
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email,
        college,
        purpose,
        timestamp: serverTimestamp(),
      });
      
      setShowSuccess(true);
      setPurpose('');
      setCollege('');
      toast({
        title: 'Success!',
        description: 'Visit recorded successfully. Welcome to NEU Library!',
      });
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      console.error('Check-in failed:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to record visit. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
        <Card className="w-full max-w-md border-none shadow-2xl bg-success text-white">
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Welcome to NEU Library!</h2>
            <p className="text-white/80 text-lg mb-8">Your visit has been successfully logged.</p>
            <Button 
              variant="outline" 
              className="bg-white text-success border-none hover:bg-white/90"
              onClick={() => setShowSuccess(false)}
            >
              Log another visit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Library Check-in</h1>
        <p className="text-muted-foreground">Please fill out the form below to record your library visit.</p>
      </div>

      <Card className="border-none shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Visit Details
            </CardTitle>
            <CardDescription>All fields are required for accurate logging.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Select value={college} onValueChange={setCollege} disabled={isLoadingColleges}>
                <SelectTrigger id="college">
                  <SelectValue placeholder={isLoadingColleges ? "Loading colleges..." : "Select your college"} />
                </SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                  {colleges.length === 0 && !isLoadingColleges && (
                    <SelectItem value="Other" disabled>No colleges found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 relative">
              <div className="flex justify-between items-center">
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <div className="flex items-center gap-1 text-xs text-accent font-medium">
                  <Sparkles className="h-3 w-3" />
                  AI Suggested
                </div>
              </div>
              <Input
                id="purpose"
                placeholder="Why are you visiting today? (e.g., studying, research)"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <ul className="py-1">
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-2 text-sm hover:bg-accent/10 transition-colors"
                          onClick={() => {
                            setPurpose(suggestion);
                            setSuggestions([]);
                          }}
                        >
                          {suggestion}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Recording Visit...
                </>
              ) : (
                'Confirm Entry'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/10">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>Note:</strong> Your entry will be recorded with your institutional account information ({user?.email}). Please ensure you follow library guidelines and maintain silence for other students.
        </p>
      </div>
    </div>
  );
}