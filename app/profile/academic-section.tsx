'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Info } from 'lucide-react';

const educationSystems = [
  { value: 'us', label: 'United States (GPA)', file: 'us-gpa' },
  { value: 'ib', label: 'International Baccalaureate (IB)', file: 'ib' },
  { value: 'igcse', label: 'Cambridge IGCSE/A-Levels', file: 'igcse' },
  { value: 'cn', label: 'China (Gaokao)', file: 'cn-gaokao' },
  { value: 'kr', label: 'South Korea (CSAT)', file: 'kr-csat' },
  { value: 'br', label: 'Brazil (ENEM)', file: 'br-enem' },
  { value: 'ru', label: 'Russia (EGE/ЕГЭ)', file: 'ru-ege' },
  { value: 'de', label: 'Germany (Abitur)', file: 'de-abitur' },
  { value: 'fr', label: 'France (Baccalauréat)', file: 'fr-bac' },
  { value: 'in', label: 'India (CBSE/ISC)', file: 'in-cbse' },
  { value: 'other', label: 'Other', file: null },
];

interface AcademicSectionProps {
  profileData: any;
  setProfileData: (data: any) => void;
}

export function AcademicSection({ profileData, setProfileData }: AcademicSectionProps) {
  const [systemData, setSystemData] = useState<any>(null);
  const [conversionData, setConversionData] = useState<any>(null);

  useEffect(() => {
    // Load conversion matrix
    fetch('/academics/conversions/universal-grade-matrix.json')
      .then(res => res.json())
      .then(data => setConversionData(data))
      .catch(err => console.error('Failed to load conversions:', err));
  }, []);

  useEffect(() => {
    // Load specific system data
    const system = educationSystems.find(s => s.value === profileData.educationSystem);
    if (system?.file) {
      fetch(`/academics/systems/${system.file}.json`)
        .then(res => res.json())
        .then(data => setSystemData(data))
        .catch(err => console.error('Failed to load system data:', err));
    }
  }, [profileData.educationSystem]);

  const getGradeInput = () => {
    switch (profileData.educationSystem) {
      case 'us':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              value={profileData.grading?.score || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                grading: { ...profileData.grading, score: e.target.value }
              })}
              placeholder="3.85"
              className="flex-1"
            />
            <Select
              value={profileData.grading?.scale || '4.0'}
              onValueChange={(value) => setProfileData({
                ...profileData,
                grading: { ...profileData.grading, scale: value }
              })}
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
        );
      
      case 'ib':
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="number"
                max="45"
                value={profileData.grading?.score || ''}
                onChange={(e) => setProfileData({
                  ...profileData,
                  grading: { ...profileData.grading, score: e.target.value }
                })}
                placeholder="38"
                className="flex-1"
              />
              <span className="px-3 py-2 text-muted-foreground">/ 45</span>
            </div>
            <Input
              type="number"
              max="45"
              value={profileData.grading?.predicted || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                grading: { ...profileData.grading, predicted: e.target.value }
              })}
              placeholder="Predicted score (if applicable)"
            />
          </div>
        );
      
      case 'igcse':
        return (
          <div className="space-y-2">
            <Input
              value={profileData.grading?.grades || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                grading: { ...profileData.grading, grades: e.target.value }
              })}
              placeholder="e.g., A*A*A or 999"
            />
            <p className="text-xs text-muted-foreground">
              Enter grades as letters (A*-G) or numbers (9-1)
            </p>
          </div>
        );
      
      case 'cn':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              max="750"
              value={profileData.grading?.score || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                grading: { ...profileData.grading, score: e.target.value }
              })}
              placeholder="650"
              className="flex-1"
            />
            <span className="px-3 py-2 text-muted-foreground">/ 750</span>
          </div>
        );
      
      case 'kr':
        return (
          <div className="space-y-2">
            <Input
              value={profileData.grading?.stanine || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                grading: { ...profileData.grading, stanine: e.target.value }
              })}
              placeholder="e.g., Grade 1 or Top 4%"
            />
            <p className="text-xs text-muted-foreground">
              Enter stanine grade (1-9) or percentile
            </p>
          </div>
        );
      
      case 'br':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              max="1000"
              value={profileData.grading?.score || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                grading: { ...profileData.grading, score: e.target.value }
              })}
              placeholder="850"
              className="flex-1"
            />
            <span className="px-3 py-2 text-muted-foreground">/ 1000</span>
          </div>
        );
      
      case 'ru':
        return (
          <div className="space-y-2">
            <Input
              value={profileData.grading?.ege_scores || ''}
              onChange={(e) => setProfileData({
                ...profileData,
                grading: { ...profileData.grading, ege_scores: e.target.value }
              })}
              placeholder="e.g., Russian: 95, Math: 88, Physics: 82"
            />
            <p className="text-xs text-muted-foreground">
              Enter your EGE scores (0-100 per subject). Gold Medal holders add note.
            </p>
          </div>
        );
      
      default:
        return (
          <Input
            value={profileData.grading?.score || ''}
            onChange={(e) => setProfileData({
              ...profileData,
              grading: { ...profileData.grading, score: e.target.value }
            })}
            placeholder="Enter your grade or score"
          />
        );
    }
  };

  const getEquivalentGrades = () => {
    if (!conversionData || !profileData.grading?.score) return null;

    // This would use the conversion matrix to show equivalents
    // Simplified for demonstration
    const score = profileData.grading.score;
    let band = 'good'; // Would calculate based on actual score

    const equivalents = conversionData.conversions?.percentage_bands?.[band]?.equivalents;
    if (!equivalents) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-medium">International Grade Equivalents</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {profileData.educationSystem !== 'us' && equivalents.us_gpa && (
            <div className="text-sm">
              <span className="text-muted-foreground">US GPA:</span>
              <span className="ml-1 font-medium">{equivalents.us_gpa}/4.0</span>
            </div>
          )}
          {profileData.educationSystem !== 'ib' && equivalents.ib && (
            <div className="text-sm">
              <span className="text-muted-foreground">IB:</span>
              <span className="ml-1 font-medium">{equivalents.ib}/7</span>
            </div>
          )}
          {profileData.educationSystem !== 'igcse' && equivalents.uk_alevel && (
            <div className="text-sm">
              <span className="text-muted-foreground">UK A-Level:</span>
              <span className="ml-1 font-medium">{equivalents.uk_alevel}</span>
            </div>
          )}
          {equivalents.percentile && (
            <div className="text-sm">
              <span className="text-muted-foreground">Percentile:</span>
              <span className="ml-1 font-medium">{equivalents.percentile}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="w-5 h-5" />
          Academic Information
        </CardTitle>
        <CardDescription>
          Your school and academic performance details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currentSchool">Current School</Label>
            <Input
              id="currentSchool"
              value={profileData.currentSchool || ''}
              onChange={(e) => setProfileData({...profileData, currentSchool: e.target.value})}
              placeholder="Enter your school name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="graduationYear">Graduation Year</Label>
            <Select
              value={profileData.graduationYear?.toString() || ''}
              onValueChange={(value) => setProfileData({...profileData, graduationYear: parseInt(value)})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="educationSystem">Education System</Label>
            <Select
              value={profileData.educationSystem || ''}
              onValueChange={(value) => setProfileData({
                ...profileData, 
                educationSystem: value,
                grading: { system: value }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your education system" />
              </SelectTrigger>
              <SelectContent>
                {educationSystems.map(system => (
                  <SelectItem key={system.value} value={system.value}>
                    {system.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>
              {profileData.educationSystem === 'us' && 'GPA'}
              {profileData.educationSystem === 'ib' && 'IB Score'}
              {profileData.educationSystem === 'igcse' && 'Grades'}
              {profileData.educationSystem === 'cn' && 'Gaokao Score'}
              {profileData.educationSystem === 'kr' && 'CSAT Grade'}
              {profileData.educationSystem === 'br' && 'ENEM Score'}
              {profileData.educationSystem === 'ru' && 'EGE Scores (ЕГЭ)'}
              {!profileData.educationSystem && 'Academic Score'}
            </Label>
            {getGradeInput()}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="classRank">Class Rank (Optional)</Label>
            <div className="flex gap-2">
              <Input
                id="classRank"
                type="number"
                value={profileData.classRank || ''}
                onChange={(e) => setProfileData({...profileData, classRank: e.target.value})}
                placeholder="5"
                className="w-24"
              />
              <span className="px-2 py-2 text-muted-foreground">/</span>
              <Input
                type="number"
                value={profileData.classSize || ''}
                onChange={(e) => setProfileData({...profileData, classSize: e.target.value})}
                placeholder="500"
                className="w-24"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="intendedMajor">Intended Major</Label>
            <Input
              id="intendedMajor"
              value={profileData.intendedMajor || ''}
              onChange={(e) => setProfileData({...profileData, intendedMajor: e.target.value})}
              placeholder="e.g., Computer Science"
            />
          </div>
        </div>
        
        {getEquivalentGrades()}
        
        {systemData && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>{systemData.name}:</strong> {systemData.overview?.description || systemData.description}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}