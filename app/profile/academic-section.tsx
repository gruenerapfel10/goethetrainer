'use client';

import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { GraduationCap, Info, Plus, X } from 'lucide-react';

const educationSystems = [
  { value: 'us-gpa', label: 'United States - GPA', file: 'us-gpa' },
  { value: 'ib', label: 'International Baccalaureate (IB)', file: 'ib' },
  { value: 'gb-gcse', label: 'UK - GCSE (ages 14-16)', file: 'gb-gcse' },
  { value: 'gb-alevel', label: 'UK - A-Levels (ages 16-18)', file: 'gb-alevel' },
  { value: 'igcse', label: 'Cambridge IGCSE (International)', file: 'igcse' },
  { value: 'cn-gaokao', label: 'China - Gaokao (高考)', file: 'cn-gaokao' },
  { value: 'kr-csat', label: 'South Korea - CSAT (수능)', file: 'kr-csat' },
  { value: 'br-enem', label: 'Brazil - ENEM', file: 'br-enem' },
  { value: 'ru-ege', label: 'Russia - EGE (ЕГЭ)', file: 'ru-ege' },
  { value: 'ru-oge', label: 'Russia - OGE (ОГЭ)', file: 'ru-oge' },
  { value: 'de-abitur', label: 'Germany - Abitur', file: 'de-abitur' },
  { value: 'fr-bac', label: 'France - Baccalauréat', file: 'fr-bac' },
  { value: 'in-cbse', label: 'India - CBSE', file: 'in-cbse' },
  { value: 'in-isc', label: 'India - ISC', file: 'in-isc' },
  { value: 'other', label: 'Other', file: null },
];

interface Qualification {
  id: string;
  system: string;
  year: string;
  score: string;
  additionalInfo?: string;
}

interface AcademicSectionProps {
  profileData: any;
  setProfileData: (data: any) => void;
}

export function AcademicSection({ profileData, setProfileData }: AcademicSectionProps) {
  const [qualifications, setQualifications] = useState<Qualification[]>(
    profileData.qualifications || []
  );
  const [conversionData, setConversionData] = useState<any>(null);

  useEffect(() => {
    // Load conversion matrix
    fetch('/academics/conversions/universal-grade-matrix.json')
      .then(res => res.json())
      .then(data => setConversionData(data))
      .catch(err => console.error('Failed to load conversions:', err));
  }, []);

  useEffect(() => {
    // Update parent data when qualifications change
    setProfileData({
      ...profileData,
      qualifications: qualifications
    });
  }, [qualifications]);

  const addQualification = () => {
    const newQualification: Qualification = {
      id: Date.now().toString(),
      system: '',
      year: new Date().getFullYear().toString(),
      score: '',
      additionalInfo: ''
    };
    setQualifications([...qualifications, newQualification]);
  };

  const updateQualification = (id: string, field: keyof Qualification, value: string) => {
    setQualifications(qualifications.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const removeQualification = (id: string) => {
    setQualifications(qualifications.filter(q => q.id !== id));
  };

  const getScoreInput = (qualification: Qualification) => {
    switch (qualification.system) {
      case 'us-gpa':
        return (
          <div className="flex gap-2">
            <Input
              placeholder="3.85"
              value={qualification.score}
              onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
              className="flex-1"
            />
            <Select
              value={qualification.additionalInfo || '4.0'}
              onValueChange={(value) => updateQualification(qualification.id, 'additionalInfo', value)}
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
          <Input
            type="number"
            max="45"
            placeholder="38/45"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      case 'gb-alevel':
        return (
          <Input
            placeholder="A*AA or AAB"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      case 'gb-gcse':
        return (
          <Input
            placeholder="999888776 or 10 9s, 5 8s"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      case 'igcse':
        return (
          <Input
            placeholder="A*A*AAA or 99988"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      case 'cn-gaokao':
        return (
          <Input
            type="number"
            max="750"
            placeholder="650/750"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      case 'kr-csat':
        return (
          <Input
            placeholder="Top 4% or Grade 1"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      case 'br-enem':
        return (
          <Input
            type="number"
            max="1000"
            placeholder="850/1000"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      case 'ru-ege':
        return (
          <Input
            placeholder="Russian: 95, Math: 88, Physics: 82"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      case 'ru-oge':
        return (
          <Input
            placeholder="Russian: 5, Math: 5, Physics: 4"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );

      default:
        return (
          <Input
            placeholder="Enter your score/grades"
            value={qualification.score}
            onChange={(e) => updateQualification(qualification.id, 'score', e.target.value)}
          />
        );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Academic Qualifications
          </h2>
          <p className="text-muted-foreground mt-1">
            Your academic results and qualifications
          </p>
        </div>
        <Button 
          onClick={addQualification}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Qualification
        </Button>
      </div>
      <div className="space-y-4">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
          <div className="space-y-2">
            <Label htmlFor="currentSchool">Current/Most Recent School</Label>
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
                {[2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Qualifications List */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Academic Results</h3>
          
          {qualifications.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No qualifications added yet</p>
              <Button onClick={addQualification} variant="outline">
                Add Your First Qualification
              </Button>
            </div>
          ) : (
            qualifications.map((qualification) => (
              <div key={qualification.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Education System */}
                    <div className="space-y-2">
                      <Label className="text-xs">Qualification Type</Label>
                      <Select
                        value={qualification.system}
                        onValueChange={(value) => updateQualification(qualification.id, 'system', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select system" />
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
                    
                    {/* Year */}
                    <div className="space-y-2">
                      <Label className="text-xs">Year Completed</Label>
                      <Input
                        type="number"
                        placeholder="2024"
                        value={qualification.year}
                        onChange={(e) => updateQualification(qualification.id, 'year', e.target.value)}
                      />
                    </div>
                    
                    {/* Score */}
                    <div className="space-y-2">
                      <Label className="text-xs">Score/Grades</Label>
                      {getScoreInput(qualification)}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => removeQualification(qualification.id)}
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Helper text for selected system */}
                {qualification.system && (
                  <p className="text-xs text-muted-foreground">
                    {qualification.system === 'us-gpa' && 'Enter GPA on selected scale'}
                    {qualification.system === 'ib' && 'Enter total IB score out of 45'}
                    {qualification.system === 'gb-alevel' && 'Enter A-Level grades (e.g., A*AA)'}
                    {qualification.system === 'gb-gcse' && 'Enter GCSE grades on 9-1 scale'}
                    {qualification.system === 'igcse' && 'Enter IGCSE grades (letters or numbers)'}
                    {qualification.system === 'cn-gaokao' && 'Enter Gaokao score out of 750'}
                    {qualification.system === 'kr-csat' && 'Enter CSAT stanine or percentile'}
                    {qualification.system === 'br-enem' && 'Enter ENEM score out of 1000'}
                    {qualification.system === 'ru-ege' && 'Enter EGE scores per subject (0-100)'}
                    {qualification.system === 'ru-oge' && 'Enter OGE grades per subject (2-5)'}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Grade Equivalency (if qualifications exist) */}
        {qualifications.length > 0 && conversionData && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-medium">International Equivalents</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on your qualifications, universities will evaluate your academic performance according to their local standards.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}