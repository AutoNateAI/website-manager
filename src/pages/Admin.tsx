import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LeadManager } from '@/components/admin/LeadManager';
import { MapViews } from '@/components/admin/MapViews';
import { EventManager } from '@/components/admin/EventManager';
import { ProductServiceManager } from '@/components/admin/ProductServiceManager';
import BlogManager from '@/components/admin/BlogManager';
import AdManager from '@/components/admin/AdManager';
import ImageManager from '@/components/admin/ImageManager';
import LiveBuildsManager from '@/components/admin/LiveBuildsManager';
import SocialMediaManager from '@/components/admin/SocialMediaManager';
import InPersonNetworkingManager from '@/components/admin/InPersonNetworkingManager';
import VirtualNetworkingManager from '@/components/admin/VirtualNetworkingManager';
import { PersonalNetworkLeadsManager } from '@/components/admin/PersonalNetworkLeadsManager';
import { CampaignManager } from '@/components/admin/CampaignManager';
import { SlideManager } from '@/components/admin/SlideManager';
import PersonNotesManager from '@/components/admin/PersonNotesManager';
import PromptTemplateManager from '@/components/admin/PromptTemplateManager';
import { SOPManager } from '@/components/admin/SOPManager';

const Admin = () => {
  const { user, loading, signOut, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('leads');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'leads':
        return <LeadManager />;
      case 'personal-network-leads':
        return <PersonalNetworkLeadsManager />;
      case 'in-person-networking':
        return <InPersonNetworkingManager />;
      case 'virtual-networking':
        return <VirtualNetworkingManager />;
      case 'person-notes':
        return <PersonNotesManager />;
      case 'maps':
        return <MapViews />;
      case 'events':
        return <EventManager />;
      case 'products':
        return <ProductServiceManager />;
      case 'blogs':
        return <BlogManager />;
      case 'images':
        return <ImageManager />;
      case 'ads':
        return <AdManager />;
      case 'live-builds':
        return <LiveBuildsManager />;
      case 'social-media':
        return <SocialMediaManager />;
      case 'slides':
        return <SlideManager />;
      case 'campaigns':
        return <CampaignManager />;
      case 'prompt-templates':
        return <PromptTemplateManager />;
      case 'sops':
        return <SOPManager />;
      default:
        return <LeadManager />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex overflow-hidden">
        <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card">
            <div className="flex items-center gap-4 min-w-0">
              <SidebarTrigger className="text-foreground hover:bg-accent flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold gradient-text truncate">Admin Portal</h1>
                <p className="text-xs text-muted-foreground truncate">
                  Manage your leads, content, and marketing campaigns
                </p>
              </div>
            </div>
            <Button 
              onClick={signOut}
              variant="outline"
              className="glass-button flex-shrink-0"
              size="sm"
            >
              <LogOut size={16} className="mr-2" />
              Sign Out
            </Button>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <div className="max-w-7xl mx-auto">
                {renderTabContent()}
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;