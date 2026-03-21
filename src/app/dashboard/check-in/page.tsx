
"use client"

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/hooks/use-auth';
import { initializeFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Check, Loader2, BookOpen, User as UserIcon, Keyboard, School, X, Type, Briefcase, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { suggestPurpose } from '@/ai/flows/smart-purpose-suggester';

const { firestore: db } = initializeFirebase();

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
  const { profile, logout } = useAuthContext();
  const { toast } = useToast();
  const [guestName, setGuestName] = useState('');
  const [userType, setUserType] = useState<'student' | 'teacher' | 'staff'>('student');
  const [purposeSelection, setPurposeSelection] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [college, setCollege] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const collegesQuery = useMemoFirebase(() => query(collection(db, 'colleges'), orderBy('name', 'asc')), []);
  const { data: dbColleges } = useCollection(collegesQuery);

  const isCustomPurpose = purposeSelection === "Other / Custom Purpose...";
  const finalPurpose = isCustomPurpose ? customPurpose : purposeSelection;

  const isGuest = profile?.isGuest === true;
  const headerName = isGuest ? (guestName || 'Guest User') : (profile?.displayName || 'User');

  // Handle countdown and auto-logout
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccess && profile?.role !== 'admin') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showSuccess, profile?.role, logout]);

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
    
    if (!profile || !college || !finalPurpose || (isGuest && !guestName.trim())) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please complete all required fields.'
      });
      return;
    }

    setIsSubmitting(true);
    
    const visitData = {
      userId: profile.id,
      userName: headerName,
      userEmail: profile.email || 'guest@terminal',
      userType: userType,
      isEmployee: userType !== 'student',
      college,
      purpose: finalPurpose,
      timestamp: serverTimestamp(),
    };

    addDoc(collection(db, 'visits'), visitData)
      .then(() => {
        setShowSuccess(true);
        setCountdown(6);
        setPurposeSelection('');
        setCustomPurpose('');
        setCollege('');
        setGuestName('');
        setIsSubmitting(false);
        
        // Only auto-hide message if admin, otherwise countdown handles the transition via logout
        if (profile?.role === 'admin') {
          setTimeout(() => setShowSuccess(false), 5000);
        }
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
          <Card className="shadow-2xl border-slate-200 w-80 md:w-96 overflow-hidden bg-white border-l-4 border-[#00A859]">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-base leading-none">Welcome to NEU Library!</h4>
                  <div className="text-sm text-muted-foreground">
                    <p>Your visit has been recorded successfully.</p>
                    {profile?.role !== 'admin' && (
                      <p className="mt-2 font-semibold text-primary flex items-center gap-2">
                        <LogOut className="h-3 w-3" />
                        Redirecting to main screen in {countdown}s...
                      </p>
                    )}
                  </div>
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

      <Card className="border-none shadow-xl bg-[#003399] text-white overflow-hidden">
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
          <Avatar className="h-24 w-24 border-4 border-white/20 shadow-lg">
            <AvatarImage src={profile?.photoURL || ''} />
            <AvatarFallback className="text-2xl bg-white/10">
              {isGuest ? <UserIcon className="h-10 w-10" /> : (profile?.displayName?.charAt(0) || 'U')}
            </AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold mb-1">
              {headerName}
            </h2>
            <p className="text-white/80 text-lg mb-2">
              {profile?.studentId ? `ID: ${profile.studentId}` : (profile?.email || 'Guest Session')}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-none px-3 py-1 uppercase">
                {userType}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center text-slate-900">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Visitor Check-in</h1>
          <p className="text-slate-500 font-medium">Please provide your details below</p>
        </div>

        <Card className="border-none shadow-xl bg-white">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-[#003399]">
                <BookOpen className="h-5 w-5" />
                Record Entry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              
              <div className="space-y-3">
                <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">I am a:</Label>
                <RadioGroup 
                  defaultValue="student" 
                  className="flex gap-4" 
                  onValueChange={(v: any) => setUserType(v)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="student" id="student" />
                    <Label htmlFor="student" className="flex items-center gap-1 cursor-pointer">Student</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="teacher" id="teacher" />
                    <Label htmlFor="teacher" className="flex items-center gap-1 cursor-pointer">Teacher</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="staff" id="staff" />
                    <Label htmlFor="staff" className="flex items-center gap-1 cursor-pointer">Staff</Label>
                  </div>
                </RadioGroup>
              </div>

              {isGuest && (
                <div className="space-y-2">
                  <Label htmlFor="guestName" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</Label>
                  <Input 
                    id="guestName"
                    placeholder="Enter your name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="h-12 border-slate-100 bg-slate-50"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="college" className="text-xs font-bold text-slate-400 uppercase tracking-wider">College / Department</Label>
                <Select value={college} onValueChange={setCollege}>
                  <SelectTrigger id="college" className="h-12 border-slate-100 bg-slate-50">
                    <SelectValue placeholder="Select College" />
                  </SelectTrigger>
                  <SelectContent>
                    {dbColleges?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purpose of Visit</Label>
                  <Select value={purposeSelection} onValueChange={setPurposeSelection}>
                    <SelectTrigger id="purpose-select" className="h-12 border-slate-100 bg-slate-50">
                      <SelectValue placeholder="What brings you to the library?" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_PURPOSES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isCustomPurpose && (
                  <div className="space-y-3">
                    <Label htmlFor="custom-purpose" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Details</Label>
                    <div className="relative">
                      <Input
                        id="custom-purpose"
                        placeholder="Please specify..."
                        value={customPurpose}
                        onChange={(e) => setCustomPurpose(e.target.value)}
                        className="h-12 border-slate-100 bg-slate-50 pr-10"
                      />
                      {isAiLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                    </div>
                    
                    {aiSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestions.map((suggestion) => (
                          <Badge 
                            key={suggestion}
                            variant="secondary"
                            className="cursor-pointer hover:bg-slate-200 transition-colors"
                            onClick={() => setCustomPurpose(suggestion)}
                          >
                            {suggestion}
                          </Badge>
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
                className="w-full h-12 bg-[#003399] hover:bg-[#002a7a] text-white font-bold" 
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'SUBMIT CHECK-IN'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
