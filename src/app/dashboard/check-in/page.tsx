
"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { suggestPurpose } from '@/ai/flows/smart-purpose-suggester';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2, Sparkles, BookOpen, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const { firestore: db } = initializeFirebase();

// Mapping of Programs to College Departments
const PROGRAMS_MAP: Record<string, string[]> = {
  "College of Arts and Sciences (CAS)": [
    "BA in Economics",
    "BA in Political Science",
    "BS in Biology",
    "BS in Psychology",
    "Bachelor of Public Administration"
  ],
  "College of Business Administration (CBA)": [
    "BS in Entrepreneurship",
    "BS in Real Estate Management",
    "BSBA Major in Financial Management",
    "BSBA Major in Human Resource Development Management",
    "BSBA Major in Legal Management",
    "BSBA Major in Marketing Management"
  ],
  "College of Communication (COC)": [
    "BA in Broadcasting",
    "BA in Communication",
    "BA in Journalism"
  ],
  "College of Education (CED)": [
    "Bachelor of Elementary Education (General, Preschool, or Special Education)",
    "Bachelor of Secondary Education (Majors: English, Filipino, Mathematics, Science, Social Studies, or TLE)"
  ],
  "College of Engineering and Architecture (CEA)": [
    "BS in Architecture",
    "BS in Astronomy",
    "BS in Civil Engineering",
    "BS in Electrical Engineering",
    "BS in Electronics Engineering",
    "BS in Industrial Engineering",
    "BS in Mechanical Engineering"
  ],
  "College of Informatics and Computing Studies (CICS)": [
    "Bachelor of Library and Information Science",
    "BS in Computer Science",
    "BS in Entertainment and Multimedia Computing (Digital Animation or Game Development)",
    "BS in Information System",
    "BS in Information Technology"
  ],
  "Medical & Health Sciences": [
    "BS in Medical Technology",
    "BS in Nursing",
    "BS in Physical Therapy",
    "BS in Respiratory Therapy",
    "Diploma in Midwifery"
  ],
  "Specialized Colleges": [
    "Bachelor of Music (Choral Conducting, Music Education, Piano, or Voice)",
    "BS in Agriculture",
    "BS in Criminology",
    "BA in Foreign Service (School of International Relations)"
  ]
};

const DEPARTMENTS = Object.keys(PROGRAMS_MAP);

export default function CheckInPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [purpose, setPurpose] = useState('');
  const [college, setCollege] = useState('');
  const [program, setProgram] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const availablePrograms = college ? PROGRAMS_MAP[college] || [] : [];

  useEffect(() => {
    // Reset program if college changes
    setProgram('');
  }, [college]);

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
    if (!user || !college || !purpose || (availablePrograms.length > 0 && !program)) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please complete all fields to log your visit.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'visits'), {
        userId: user.uid,
        userName: user.displayName || 'Visitor',
        userEmail: user.email,
        college,
        program,
        purpose,
        timestamp: serverTimestamp(),
      });
      
      setShowSuccess(true);
      setPurpose('');
      setCollege('');
      setProgram('');
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500 px-4">
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
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <Card className="border-none shadow-lg bg-primary text-white overflow-hidden">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-white/20">
            <AvatarImage src={user?.photoURL || ''} />
            <AvatarFallback className="text-2xl bg-white/10">{user?.displayName?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold mb-1">{user?.displayName || 'Institutional User'}</h2>
            <p className="text-white/80 text-lg mb-2">{user?.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-none px-3 py-1">
                <UserIcon className="h-3 w-3 mr-1" />
                Institutional User
              </Badge>
              {profile?.role === 'admin' && (
                <Badge variant="secondary" className="bg-accent text-white border-none px-3 py-1">
                  Administrator
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">Library Check-in</h1>
          <p className="text-muted-foreground">Please complete the details below to log your entry.</p>
        </div>

        <Card className="border-none shadow-xl">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Entry Information
              </CardTitle>
              <CardDescription>Select your college department and academic program.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="college">College Department</Label>
                <Select value={college} onValueChange={setCollege}>
                  <SelectTrigger id="college" className="h-12">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {availablePrograms.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="program">College Program</Label>
                  <Select value={program} onValueChange={setProgram}>
                    <SelectTrigger id="program" className="h-12">
                      <SelectValue placeholder="Select Academic Program" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrograms.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2 relative">
                <div className="flex justify-between items-center">
                  <Label htmlFor="purpose">Purpose of Visit</Label>
                  <div className="flex items-center gap-1 text-xs text-accent font-medium">
                    <Sparkles className="h-3 w-3" />
                    AI Suggestions Enabled
                  </div>
                </div>
                <Input
                  id="purpose"
                  placeholder="e.g., Thesis Research, Exam Review..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  autoComplete="off"
                  className="h-12"
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <ul className="py-1">
                      {suggestions.map((suggestion, index) => (
                        <li key={index}>
                          <button
                            type="button"
                            className="w-full text-left px-4 py-3 text-sm hover:bg-accent/10 transition-colors border-b last:border-0"
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
                className="w-full h-14 text-xl font-bold bg-primary hover:bg-primary/90 shadow-lg" 
                disabled={isSubmitting || !college || !purpose || (availablePrograms.length > 0 && !program)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Recording Visit...
                  </>
                ) : (
                  'TAP TO CONFIRM ENTRY'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          By tapping confirm, you agree to maintain silence and follow all library policies.
        </p>
      </div>
    </div>
  );
}
