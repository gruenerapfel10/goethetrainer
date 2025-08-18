'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/firebase-auth-context';
import { profileService } from '@/lib/firebase/profile-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, X, Save, User, GraduationCap, Award, Target, Trophy, Medal } from 'lucide-react';

interface AcademicQualification {
  id: string;
  institution: string;
  qualification: string;
  grade: string;
  year: string;
  country: string;
}

interface TestScore {
  id: string;
  testType: string;
  score: string;
  date: string;
  details?: string;
}

interface Activity {
  id: string;
  name: string;
  type: string;
  role: string;
  duration: string;
  description: string;
}

interface Achievement {
  id: string;
  title: string;
  type: string;
  date: string;
  institution: string;
  description: string;
}

interface ProfileData {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    nationality: string;
    address: string;
  };
  academicQualifications: AcademicQualification[];
  testScores: TestScore[];
  activities: Activity[];
  achievements: Achievement[];
}

export default function ProfilePage() {
  const t = useTranslations();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [academicsData, setAcademicsData] = useState<any>(null);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phone: '',
      dateOfBirth: '',
      nationality: 'us',
      address: ''
    },
    academicQualifications: [],
    testScores: [],
    activities: [],
    achievements: []
  });

  // Load academics data
  useEffect(() => {
    fetch('/academics.json')
      .then(res => res.json())
      .then(data => setAcademicsData(data))
      .catch(err => console.error('Failed to load academics data:', err));
  }, []);

  // Load profile data
  useEffect(() => {
    if (user?.uid) {
      profileService.getProfile(user.uid)
        .then(profile => {
          if (profile) {
            setProfileData(prev => ({
              ...prev,
              personalInfo: {
                ...prev.personalInfo,
                ...profile.personalInfo
              },
              academicQualifications: profile.academicQualifications || [],
              testScores: profile.testScores || [],
              activities: profile.activities || [],
              achievements: profile.achievements || []
            }));
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load profile:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [user?.uid]);

  const saveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await profileService.updateProfile(user.uid, profileData);
      // Show success message
    } catch (error) {
      console.error('Failed to save profile:', error);
      // Show error message
    } finally {
      setSaving(false);
    }
  };

  const addAcademicQualification = () => {
    const newQualification: AcademicQualification = {
      id: Date.now().toString(),
      institution: '',
      qualification: '',
      grade: '',
      year: '',
      country: profileData.personalInfo.nationality
    };
    setProfileData(prev => ({
      ...prev,
      academicQualifications: [...prev.academicQualifications, newQualification]
    }));
  };

  const updateAcademicQualification = (id: string, field: keyof AcademicQualification, value: string) => {
    setProfileData(prev => ({
      ...prev,
      academicQualifications: prev.academicQualifications.map(qual =>
        qual.id === id ? { ...qual, [field]: value } : qual
      )
    }));
  };

  const removeAcademicQualification = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      academicQualifications: prev.academicQualifications.filter(qual => qual.id !== id)
    }));
  };

  const addTestScore = () => {
    const newTest: TestScore = {
      id: Date.now().toString(),
      testType: '',
      score: '',
      date: '',
      details: ''
    };
    setProfileData(prev => ({
      ...prev,
      testScores: [...prev.testScores, newTest]
    }));
  };

  const updateTestScore = (id: string, field: keyof TestScore, value: string) => {
    setProfileData(prev => ({
      ...prev,
      testScores: prev.testScores.map(test =>
        test.id === id ? { ...test, [field]: value } : test
      )
    }));
  };

  const removeTestScore = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      testScores: prev.testScores.filter(test => test.id !== id)
    }));
  };

  const addActivity = () => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      name: '',
      type: '',
      role: '',
      duration: '',
      description: ''
    };
    setProfileData(prev => ({
      ...prev,
      activities: [...prev.activities, newActivity]
    }));
  };

  const updateActivity = (id: string, field: keyof Activity, value: string) => {
    setProfileData(prev => ({
      ...prev,
      activities: prev.activities.map(activity =>
        activity.id === id ? { ...activity, [field]: value } : activity
      )
    }));
  };

  const removeActivity = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      activities: prev.activities.filter(activity => activity.id !== id)
    }));
  };

  const addAchievement = () => {
    const newAchievement: Achievement = {
      id: Date.now().toString(),
      title: '',
      type: '',
      date: '',
      institution: '',
      description: ''
    };
    setProfileData(prev => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement]
    }));
  };

  const updateAchievement = (id: string, field: keyof Achievement, value: string) => {
    setProfileData(prev => ({
      ...prev,
      achievements: prev.achievements.map(achievement =>
        achievement.id === id ? { ...achievement, [field]: value } : achievement
      )
    }));
  };

  const removeAchievement = (id: string) => {
    setProfileData(prev => ({
      ...prev,
      achievements: prev.achievements.filter(achievement => achievement.id !== id)
    }));
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Academic Profile</h1>
          <p className="text-muted-foreground">Manage your comprehensive academic information</p>
        </div>
        <Button onClick={saveProfile} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Basic personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profileData.personalInfo.firstName}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, firstName: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profileData.personalInfo.lastName}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, lastName: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.personalInfo.email}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, email: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profileData.personalInfo.phone}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, phone: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={profileData.personalInfo.dateOfBirth}
                  onChange={(e) => setProfileData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, dateOfBirth: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Select 
                  value={profileData.personalInfo.nationality}
                  onValueChange={(value) => setProfileData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, nationality: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="gb">United Kingdom</SelectItem>
                    <SelectItem value="ca">Canada</SelectItem>
                    <SelectItem value="au">Australia</SelectItem>
                    <SelectItem value="in">India</SelectItem>
                    <SelectItem value="de">Germany</SelectItem>
                    <SelectItem value="fr">France</SelectItem>
                    <SelectItem value="jp">Japan</SelectItem>
                    <SelectItem value="ru">Russia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={profileData.personalInfo.address}
                onChange={(e) => setProfileData(prev => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, address: e.target.value }
                }))}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Qualifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Qualifications
                </CardTitle>
                <CardDescription>
                  Educational background, degrees, and certifications
                </CardDescription>
              </div>
              <Button onClick={addAcademicQualification} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {profileData.academicQualifications.map((qualification, index) => (
                <Card key={qualification.id} className="border">
                  <CardContent className="pt-3">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-sm">Qualification {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAcademicQualification(qualification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Institution</Label>
                        <Input
                          className="h-8"
                          value={qualification.institution}
                          onChange={(e) => updateAcademicQualification(qualification.id, 'institution', e.target.value)}
                          placeholder="University name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Qualification</Label>
                        <Input
                          className="h-8"
                          value={qualification.qualification}
                          onChange={(e) => updateAcademicQualification(qualification.id, 'qualification', e.target.value)}
                          placeholder="Degree type"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Grade</Label>
                        <Input
                          className="h-8"
                          value={qualification.grade}
                          onChange={(e) => updateAcademicQualification(qualification.id, 'grade', e.target.value)}
                          placeholder="GPA/Grade"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Year</Label>
                        <Input
                          className="h-8"
                          value={qualification.year}
                          onChange={(e) => updateAcademicQualification(qualification.id, 'year', e.target.value)}
                          placeholder="Year"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {profileData.academicQualifications.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No qualifications added yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Test Scores */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Test Scores
                </CardTitle>
                <CardDescription>
                  Standardized test scores
                </CardDescription>
              </div>
              <Button onClick={addTestScore} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {profileData.testScores.map((test, index) => (
                <Card key={test.id} className="border">
                  <CardContent className="pt-3">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-sm">Test {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTestScore(test.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={test.testType}
                          onValueChange={(value) => updateTestScore(test.id, 'testType', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Test type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sat">SAT</SelectItem>
                            <SelectItem value="act">ACT</SelectItem>
                            <SelectItem value="gre">GRE</SelectItem>
                            <SelectItem value="gmat">GMAT</SelectItem>
                            <SelectItem value="ielts">IELTS</SelectItem>
                            <SelectItem value="toefl">TOEFL</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Score</Label>
                        <Input
                          className="h-8"
                          value={test.score}
                          onChange={(e) => updateTestScore(test.id, 'score', e.target.value)}
                          placeholder="Score"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          className="h-8"
                          type="date"
                          value={test.date}
                          onChange={(e) => updateTestScore(test.id, 'date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Details</Label>
                        <Input
                          className="h-8"
                          value={test.details || ''}
                          onChange={(e) => updateTestScore(test.id, 'details', e.target.value)}
                          placeholder="Additional info"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {profileData.testScores.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No test scores added yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activities & Experience */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Activities & Experience
                </CardTitle>
                <CardDescription>
                  Extracurriculars and work experience
                </CardDescription>
              </div>
              <Button onClick={addActivity} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {profileData.activities.map((activity, index) => (
                <Card key={activity.id} className="border">
                  <CardContent className="pt-3">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-sm">Activity {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActivity(activity.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          className="h-8"
                          value={activity.name}
                          onChange={(e) => updateActivity(activity.id, 'name', e.target.value)}
                          placeholder="Activity name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={activity.type}
                          onValueChange={(value) => updateActivity(activity.id, 'type', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="academic">Academic</SelectItem>
                            <SelectItem value="sports">Sports</SelectItem>
                            <SelectItem value="volunteer">Volunteer</SelectItem>
                            <SelectItem value="work">Work</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Role</Label>
                        <Input
                          className="h-8"
                          value={activity.role}
                          onChange={(e) => updateActivity(activity.id, 'role', e.target.value)}
                          placeholder="Role"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Duration</Label>
                        <Input
                          className="h-8"
                          value={activity.duration}
                          onChange={(e) => updateActivity(activity.id, 'duration', e.target.value)}
                          placeholder="Duration"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        className="min-h-16"
                        value={activity.description}
                        onChange={(e) => updateActivity(activity.id, 'description', e.target.value)}
                        placeholder="Brief description"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {profileData.activities.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No activities added yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Awards & Achievements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Awards & Achievements
                </CardTitle>
                <CardDescription>
                  Academic awards and recognitions
                </CardDescription>
              </div>
              <Button onClick={addAchievement} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {profileData.achievements.map((achievement, index) => (
                <Card key={achievement.id} className="border">
                  <CardContent className="pt-3">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-sm">Achievement {index + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAchievement(achievement.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <Label className="text-xs">Title</Label>
                        <Input
                          className="h-8"
                          value={achievement.title}
                          onChange={(e) => updateAchievement(achievement.id, 'title', e.target.value)}
                          placeholder="Award title"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={achievement.type}
                          onValueChange={(value) => updateAchievement(achievement.id, 'type', value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="academic">Academic</SelectItem>
                            <SelectItem value="scholarship">Scholarship</SelectItem>
                            <SelectItem value="competition">Competition</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Date</Label>
                        <Input
                          className="h-8"
                          type="date"
                          value={achievement.date}
                          onChange={(e) => updateAchievement(achievement.id, 'date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Institution</Label>
                        <Input
                          className="h-8"
                          value={achievement.institution}
                          onChange={(e) => updateAchievement(achievement.id, 'institution', e.target.value)}
                          placeholder="Institution"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Description</Label>
                      <Textarea
                        className="min-h-16"
                        value={achievement.description}
                        onChange={(e) => updateAchievement(achievement.id, 'description', e.target.value)}
                        placeholder="Brief description"
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {profileData.achievements.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No achievements added yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}