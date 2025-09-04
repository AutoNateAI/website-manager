import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  Users, 
  BarChart3,
  Zap,
  Globe
} from 'lucide-react';

// Import the new tab components (we'll create these)
import { TimePlannerTab } from './blitz/TimePlannerTab';
import { TargetsTab } from './blitz/TargetsTab';
import { CampaignsTab } from './blitz/CampaignsTab';
import { AnalyticsTab } from './blitz/AnalyticsTab';
import { InstagramPlannerTab } from './instagram/InstagramPlannerTab'; // Keep existing day view

export function BlitzCampaignManager() {
  const [activeTab, setActiveTab] = useState('time-planner');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Blitz Campaign Manager</h1>
                <p className="text-muted-foreground">
                  Manage multi-wave Instagram campaigns with time zone intelligence
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <Globe className="h-4 w-4 text-green-600" />
              <span className="font-medium">4 Time Zones</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-medium">16 Targets/Day</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Target className="h-4 w-4 text-purple-600" />
              <span className="font-medium">3 Waves Max</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="time-planner" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Planner
          </TabsTrigger>
          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Targets
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="day-view" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Day View
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="time-planner" className="mt-6">
          <TimePlannerTab />
        </TabsContent>

        <TabsContent value="targets" className="mt-6">
          <TargetsTab />
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignsTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="day-view" className="mt-6">
          <InstagramPlannerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}