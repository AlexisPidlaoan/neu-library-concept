
"use client"

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { initializeFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, BookOpen, User as UserIcon, Keyboard, School, X, Type, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { suggestPurpose } from '@/ai/flows/smart-purpose-suggester';

const { firestore: db } = initializeFirebase();

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
    "Bachelor of Elementary Education",
    "Bachelor of Secondary Education"
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
    "BS in Entertainment and Multimedia Computing",
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
    "Bachelor of Music",
    "BS in Agriculture",
    "BS in Criminology",
    "BA in Foreign Service"
  ]
};

const COMMON_PURPOSES = [
  "Reading Books",
  "Thesis / Research",
  "Use of Computer",
  "Doing Assignments",
  "General Visit / Viewing",
  "Borrowing / Returning Books",
  "Group Study",
  "Other / Custom Purpose..."
];

export default function CheckInPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [guestName, setGuestName] = useState('');
  const [purposeSelection, setPurposeSelection] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [college, setCollege] = useState('');
  const [program, setProgram] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const collegesQuery = useMemoFirebase(() => query(collection(db, 'colleges'), orderBy('name', 'asc')), []);
  const { data: dbColleges, isLoading: loadingColleges } = useCollection(collegesQuery);

  const availablePrograms = college ? PROGRAMS_MAP[college] || [] : [];
  const isCustomPurpose = purposeSelection === "Other / Custom Purpose...";
  const finalPurpose = isCustomPurpose ? customPurpose : purposeSelection;

  const isGuest = profile?.isGuest;
  const displayName = isGuest ? (guestName || profile?.displayName || 'Guest Student') : (profile?.displayName || 'Student');

  useEffect(() => {
    setProgram('');
  }, [college]);

  useEffect(() => {
    if (isCustomPurpose && customPurpose.length > 2) {
      const timer = setTimeout(async () => {
        setIsAiLoading(true);
        try {
          const result = await suggestPurpose({ partialPurpose: customPurpose });
          setAiSuggestions(result.suggestions);
        } catch (e) {
          console.error("AI Suggester Error:", e);
        } finally {
          setIsAiLoading(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAiSuggestions([]);
    }
  }, [customPurpose, isCustomPurpose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile || !college || !finalPurpose || (availablePrograms.length > 0 && !program) || (isGuest && !guestName.trim())) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please complete all fields to log your visit.'
      });
      return;
    }

    setIsSubmitting(true);
    
    const visitData = {
      userId: profile.id,
      userName: displayName,
      userEmail: profile.email || 'guest@terminal',
      college,
      program,
      purpose: finalPurpose,
      timestamp: serverTimestamp(),
    };

    addDoc(collection(db, 'visits'), visitData)
      .then(() => {
        setShowSuccess(true);
        setPurposeSelection('');
        setCustomPurpose('');
        setCollege('');
        setProgram('');
        setGuestName('');
        setIsSubmitting(false);
        setTimeout(() => setShowSuccess(false), 5000);
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'visits',
          operation: 'create',
          requestResourceData: visitData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsSubmitting(false);
      });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 relative">
      {showSuccess && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in fade-in slide-in-from-right-10 duration-500">
          <Card className="shadow-2xl border-slate-200 w-80 md:w-96 overflow-hidden bg-white">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-base leading-none">Welcome to NEU Library!</h4>
                  <p className="text-sm text-muted-foreground">Your visit has been recorded successfully.</p>
                </div>
                <Check className="h-6 w-6 text-[#00A859] stroke-[3px] shrink-0" />
              </div>
              <button 
                onClick={() => setShowSuccess(false)}
                className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-none shadow-xl bg-primary text-white overflow-hidden">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-white/20 shadow-lg">
            <AvatarImage src={profile?.photoURL || ''} />
            <AvatarFallback className="text-2xl bg-white/10">
              {isGuest ? <UserIcon className="h-10 w-10" /> : (profile?.displayName?.charAt(0) || 'S')}
            </AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold mb-1">
              {isGuest ? 'Guest Student' : (profile?.displayName || 'Student')}
            </h2>
            <p className="text-white/80 text-lg mb-2">
              ID: <span className="font-mono font-bold">{profile?.studentId || 'No ID'}</span>
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <Badge variant="secondary" className={`${isGuest ? 'bg-[#FFD54F] text-primary' : 'bg-[#00A859] text-white'} border-none px-3 py-1`}>
                <UserIcon className="h-3 w-3 mr-1" />
                {isGuest ? 'Guest Visitor' : 'Student'}
              </Badge>
              {profile?.role === 'admin' && (
                <Badge variant="secondary" className="bg-[#ED1C24] text-white border-none px-3 py-1">
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
          <p className="text-muted-foreground font-medium">Complete the details to log your entry.</p>
        </div>

        <Card className="border-none shadow-xl bg-white">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-primary/5">
              <CardTitle className="flex items-center gap-2 text-primary">
                <BookOpen className="h-5 w-5 text-[#00A859]" />
                Entry Information
              </CardTitle>
              <CardDescription>Select your department and academic program.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {isGuest && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="guestName" className="flex items-center gap-2 text-primary/80">
                    <Type className="h-4 w-4 text-[#ED1C24]" />
                    Full Name
                  </Label>
                  <Input 
                    id="guestName"
                    placeholder="Enter your full name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="h-12 border-primary/10 bg-white"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="college" className="flex items-center gap-2 text-primary/80">
                  <School className="h-4 w-4 text-[#FFD54F]" />
                  College Department
                </Label>
                <Select value={college} onValueChange={setCollege} disabled={loadingColleges}>
                  <SelectTrigger id="college" className="h-12 border-primary/10 bg-white">
                    <SelectValue placeholder={loadingColleges ? "Loading Departments..." : "Select Department"} />
                  </SelectTrigger>
                  <SelectContent>
                    {dbColleges && dbColleges.length > 0 ? (
                      dbColleges.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No departments configured</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {availablePrograms.length > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="program" className="text-primary/80">Academic Program</Label>
                  <Select value={program} onValueChange={setProgram}>
                    <SelectTrigger id="program" className="h-12 border-primary/10 bg-white">
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

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose-select" className="text-primary/80">Purpose of Visit</Label>
                  <Select value={purposeSelection} onValueChange={setPurposeSelection}>
                    <SelectTrigger id="purpose-select" className="h-12 border-primary/10 bg-white">
                      <SelectValue placeholder="Select Reason for Visit" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_PURPOSES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isCustomPurpose && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="custom-purpose" className="text-xs font-semibold text-primary flex items-center gap-1">
                      <Keyboard className="h-3 w-3 text-[#ED1C24]" />
                      Custom Purpose
                    </Label>
                    <div className="relative">
                      <Input
                        id="custom-purpose"
                        placeholder="Start typing your reason..."
                        value={customPurpose}
                        onChange={(e) => setCustomPurpose(e.target.value)}
                        autoComplete="off"
                        className="h-12 border-2 border-primary/10 focus:border-primary bg-white pr-10"
                      />
                      {isAiLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary/40" />
                        </div>
                      )}
                    </div>
                    
                    {aiSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50 rounded-lg border border-dashed border-primary/20">
                        <div className="w-full text-[10px] font-bold text-primary flex items-center gap-1 mb-1">
                          <Sparkles className="h-3 w-3 text-accent" />
                          AI SUGGESTIONS
                        </div>
                        {aiSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setCustomPurpose(suggestion)}
                            className="text-[11px] bg-white hover:bg-primary hover:text-white border border-primary/10 px-2 py-1 rounded transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-14 text-xl font-bold bg-primary hover:bg-primary/90 shadow-lg" 
                disabled={isSubmitting || !college || !finalPurpose || (availablePrograms.length > 0 && !program) || (isGuest && !guestName.trim())}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    Logging...
                  </>
                ) : (
                  'CONFIRM ENTRY'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="mt-8 text-center text-sm text-primary/60 font-medium">
          By confirming, you agree to follow the NEU Library silent policy.
        </p>
      </div>
    </div>
  );
}
