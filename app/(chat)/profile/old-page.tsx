'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { 
  User, 
  GraduationCap, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail,
  Save,
  Plus,
  Trash2,
  Award,
  Activity,
  Users,
  FileText,
  ChevronRight
} from 'lucide-react';

interface UserProfile {
  firstName: string;
  lastName: string;
  middleName: string;
  preferredName: string;
  dateOfBirth: string;
  phone: string;
  citizenship: string;
  ethnicity: string[];
  gender: string;
  firstGenStudent: boolean;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  currentSchool: string;
  graduationYear: number;
  gpa: number;
  gpaScale: number;
  classRank: number;
  classSize: number;
}

interface TestScore {
  id: string;
  testType: string;
  testDate: string;
  satTotal?: number;
  satMath?: number;
  satReading?: number;
  actComposite?: number;
  toeflTotal?: number;
  ieltsOverall?: number;
}

interface Activity {
  id: string;
  activityName: string;
  category: string;
  position: string;
  organization: string;
  description: string;
  hoursPerWeek: number;
  weeksPerYear: number;
  grades: number[];
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [activeTab, setActiveTab] = useState('personal');
  
  // Form states
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    middleName: '',
    preferredName: '',
    dateOfBirth: '',
    phone: '',
    citizenship: '',
    ethnicity: [],
    gender: '',
    firstGenStudent: false,
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    currentSchool: '',
    graduationYear: 2025,
    gpa: 0,
    gpaScale: 4.0,
    classRank: 0,
    classSize: 0,
  });

  const [testScores, setTestScores] = useState<TestScore[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    calculateCompletion();
  }, [profile, testScores, activities]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
        if (data.testScores) {
          setTestScores(data.testScores);
        }
        if (data.activities) {
          setActivities(data.activities);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const calculateCompletion = () => {
    let completed = 0;
    let total = 0;

    // Personal info fields
    const personalFields = ['firstName', 'lastName', 'dateOfBirth', 'phone', 'citizenship', 'gender'];
    personalFields.forEach(field => {
      total++;
      if (profile[field as keyof UserProfile]) completed++;
    });

    // Address fields
    const addressFields = ['streetAddress', 'city', 'state', 'zipCode', 'country'];
    addressFields.forEach(field => {
      total++;
      if (profile[field as keyof UserProfile]) completed++;
    });

    // Academic fields
    const academicFields = ['currentSchool', 'graduationYear', 'gpa'];
    academicFields.forEach(field => {
      total++;
      if (profile[field as keyof UserProfile]) completed++;
    });

    // Test scores (at least one)
    total++;
    if (testScores.length > 0) completed++;

    // Activities (at least one)
    total++;
    if (activities.length > 0) completed++;

    setProfileCompletion(Math.round((completed / total) * 100));
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, testScores, activities })
      });

      if (response.ok) {
        toast.success('Profile saved successfully!');
      } else {
        toast.error('Failed to save profile');
      }
    } catch (error) {
      toast.error('An error occurred while saving');
    } finally {
      setLoading(false);
    }
  };

  const addTestScore = () => {
    const newScore: TestScore = {
      id: Date.now().toString(),
      testType: 'SAT',
      testDate: '',
    };
    setTestScores([...testScores, newScore]);
  };

  const removeTestScore = (id: string) => {
    setTestScores(testScores.filter(score => score.id !== id));
  };

  const addActivity = () => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      activityName: '',
      category: '',
      position: '',
      organization: '',
      description: '',
      hoursPerWeek: 0,
      weeksPerYear: 0,
      grades: []
    };
    setActivities([...activities, newActivity]);
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter(activity => activity.id !== id));
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Student Profile</h2>
          <p className="text-muted-foreground">
            Complete your profile to improve application matching
          </p>
        </div>
        <Button onClick={saveProfile} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          Save Profile
        </Button>
      </div>

      {/* Profile Completion Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Completion</CardTitle>
          <CardDescription>
            A complete profile helps us match you with the right universities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{profileCompletion}% Complete</span>
              <Badge variant={profileCompletion === 100 ? "default" : "secondary"}>
                {profileCompletion === 100 ? "Complete" : "In Progress"}
              </Badge>
            </div>
            <Progress value={profileCompletion} className="h-2" />
            {profileCompletion < 100 && (
              <p className="text-xs text-muted-foreground">
                Complete all sections to unlock AI-powered application assistance
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal" className="flex items-center gap-1">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="test-scores" className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            Test Scores
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="family" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Family
          </TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({...profile, firstName: e.target.value})}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={profile.middleName}
                    onChange={(e) => setProfile({...profile, middleName: e.target.value})}
                    placeholder="Michael"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={profile.lastName}
                    onChange={(e) => setProfile({...profile, lastName: e.target.value})}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferredName">Preferred Name</Label>
                  <Input
                    id="preferredName"
                    value={profile.preferredName}
                    onChange={(e) => setProfile({...profile, preferredName: e.target.value})}
                    placeholder="Johnny"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={profile.dateOfBirth}
                    onChange={(e) => setProfile({...profile, dateOfBirth: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="citizenship">Citizenship *</Label>
                  <Input
                    id="citizenship"
                    value={profile.citizenship}
                    onChange={(e) => setProfile({...profile, citizenship: e.target.value})}
                    placeholder="United States"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select 
                    value={profile.gender}
                    onValueChange={(value) => setProfile({...profile, gender: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>First Generation Student?</Label>
                  <Select
                    value={profile.firstGenStudent ? 'yes' : 'no'}
                    onValueChange={(value) => setProfile({...profile, firstGenStudent: value === 'yes'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  value={profile.streetAddress}
                  onChange={(e) => setProfile({...profile, streetAddress: e.target.value})}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={profile.city}
                    onChange={(e) => setProfile({...profile, city: e.target.value})}
                    placeholder="San Francisco"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    value={profile.state}
                    onChange={(e) => setProfile({...profile, state: e.target.value})}
                    placeholder="CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                  <Input
                    id="zipCode"
                    value={profile.zipCode}
                    onChange={(e) => setProfile({...profile, zipCode: e.target.value})}
                    placeholder="94102"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={profile.country}
                  onChange={(e) => setProfile({...profile, country: e.target.value})}
                  placeholder="United States"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Information Tab */}
        <TabsContent value="academic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentSchool">Current School *</Label>
                <Input
                  id="currentSchool"
                  value={profile.currentSchool}
                  onChange={(e) => setProfile({...profile, currentSchool: e.target.value})}
                  placeholder="Lincoln High School"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="graduationYear">Graduation Year *</Label>
                  <Select
                    value={profile.graduationYear.toString()}
                    onValueChange={(value) => setProfile({...profile, graduationYear: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gpa"
                      type="number"
                      step="0.01"
                      value={profile.gpa}
                      onChange={(e) => setProfile({...profile, gpa: parseFloat(e.target.value)})}
                      placeholder="3.85"
                      className="flex-1"
                    />
                    <Select
                      value={profile.gpaScale.toString()}
                      onValueChange={(value) => setProfile({...profile, gpaScale: parseFloat(value)})}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4.0">/ 4.0</SelectItem>
                        <SelectItem value="5.0">/ 5.0</SelectItem>
                        <SelectItem value="100">/ 100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classRank">Class Rank (Optional)</Label>
                  <Input
                    id="classRank"
                    type="number"
                    value={profile.classRank}
                    onChange={(e) => setProfile({...profile, classRank: parseInt(e.target.value)})}
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classSize">Class Size (Optional)</Label>
                  <Input
                    id="classSize"
                    type="number"
                    value={profile.classSize}
                    onChange={(e) => setProfile({...profile, classSize: parseInt(e.target.value)})}
                    placeholder="450"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Scores Tab */}
        <TabsContent value="test-scores" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Test Scores</CardTitle>
                <Button onClick={addTestScore} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Test Score
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {testScores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No test scores added yet</p>
                  <p className="text-sm mt-2">Add your SAT, ACT, TOEFL, or other test scores</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testScores.map((score, index) => (
                    <Card key={score.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <Select
                            value={score.testType}
                            onValueChange={(value) => {
                              const updated = [...testScores];
                              updated[index].testType = value;
                              setTestScores(updated);
                            }}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select test type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SAT">SAT</SelectItem>
                              <SelectItem value="ACT">ACT</SelectItem>
                              <SelectItem value="TOEFL">TOEFL</SelectItem>
                              <SelectItem value="IELTS">IELTS</SelectItem>
                              <SelectItem value="AP">AP Exam</SelectItem>
                              <SelectItem value="IB">IB Exam</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTestScore(score.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Test Date</Label>
                            <Input
                              type="date"
                              value={score.testDate}
                              onChange={(e) => {
                                const updated = [...testScores];
                                updated[index].testDate = e.target.value;
                                setTestScores(updated);
                              }}
                            />
                          </div>

                          {score.testType === 'SAT' && (
                            <>
                              <div className="space-y-2">
                                <Label>Total Score</Label>
                                <Input
                                  type="number"
                                  placeholder="1600"
                                  value={score.satTotal}
                                  onChange={(e) => {
                                    const updated = [...testScores];
                                    updated[index].satTotal = parseInt(e.target.value);
                                    setTestScores(updated);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Math</Label>
                                <Input
                                  type="number"
                                  placeholder="800"
                                  value={score.satMath}
                                  onChange={(e) => {
                                    const updated = [...testScores];
                                    updated[index].satMath = parseInt(e.target.value);
                                    setTestScores(updated);
                                  }}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Reading & Writing</Label>
                                <Input
                                  type="number"
                                  placeholder="800"
                                  value={score.satReading}
                                  onChange={(e) => {
                                    const updated = [...testScores];
                                    updated[index].satReading = parseInt(e.target.value);
                                    setTestScores(updated);
                                  }}
                                />
                              </div>
                            </>
                          )}

                          {score.testType === 'ACT' && (
                            <div className="space-y-2">
                              <Label>Composite Score</Label>
                              <Input
                                type="number"
                                placeholder="36"
                                max="36"
                                value={score.actComposite}
                                onChange={(e) => {
                                  const updated = [...testScores];
                                  updated[index].actComposite = parseInt(e.target.value);
                                  setTestScores(updated);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Extracurricular Activities</CardTitle>
                <Button onClick={addActivity} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Activity
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No activities added yet</p>
                  <p className="text-sm mt-2">Add your clubs, sports, volunteer work, and other activities</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <Card key={activity.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <Input
                            placeholder="Activity Name"
                            value={activity.activityName}
                            onChange={(e) => {
                              const updated = [...activities];
                              updated[index].activityName = e.target.value;
                              setActivities(updated);
                            }}
                            className="font-medium"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeActivity(activity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                              value={activity.category}
                              onValueChange={(value) => {
                                const updated = [...activities];
                                updated[index].category = value;
                                setActivities(updated);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sports">Sports</SelectItem>
                                <SelectItem value="music">Music</SelectItem>
                                <SelectItem value="volunteer">Volunteer</SelectItem>
                                <SelectItem value="academic">Academic</SelectItem>
                                <SelectItem value="work">Work</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Position/Role</Label>
                            <Input
                              placeholder="President, Member, etc."
                              value={activity.position}
                              onChange={(e) => {
                                const updated = [...activities];
                                updated[index].position = e.target.value;
                                setActivities(updated);
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <Label>Description</Label>
                          <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Describe your role and achievements..."
                            value={activity.description}
                            onChange={(e) => {
                              const updated = [...activities];
                              updated[index].description = e.target.value;
                              setActivities(updated);
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Hours per Week</Label>
                            <Input
                              type="number"
                              placeholder="10"
                              value={activity.hoursPerWeek}
                              onChange={(e) => {
                                const updated = [...activities];
                                updated[index].hoursPerWeek = parseInt(e.target.value);
                                setActivities(updated);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Weeks per Year</Label>
                            <Input
                              type="number"
                              placeholder="40"
                              value={activity.weeksPerYear}
                              onChange={(e) => {
                                const updated = [...activities];
                                updated[index].weeksPerYear = parseInt(e.target.value);
                                setActivities(updated);
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="family" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Family & Access</CardTitle>
              <CardDescription>
                Invite parents and counselors to help with your applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Parent/Guardian Access</p>
                      <p className="text-sm text-muted-foreground">
                        Allow parents to view your applications and documents
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">
                    Invite Parent
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Counselor Access</p>
                      <p className="text-sm text-muted-foreground">
                        Allow counselors to submit recommendations and transcripts
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">
                    Invite Counselor
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}