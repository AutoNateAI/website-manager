import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, PenTool, Megaphone, Eye } from 'lucide-react';
import BlogManager from '@/components/admin/BlogManager';
import AdManager from '@/components/admin/AdManager';
import PreviewManager from '@/components/admin/PreviewManager';

const Admin = () => {
  const { user, loading, signOut, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('blogs');

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

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Admin Portal</h1>
              <p className="text-muted-foreground mt-1">
                Manage your blog content and advertisements
              </p>
            </div>
            <Button 
              onClick={signOut}
              variant="outline"
              className="glass-button"
            >
              <LogOut size={18} className="mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-card p-1 grid w-full grid-cols-3">
            <TabsTrigger 
              value="blogs" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:glow-primary"
            >
              <PenTool size={18} className="mr-2" />
              Blog Management
            </TabsTrigger>
            <TabsTrigger 
              value="ads"
              className="data-[state=active]:bg-primary/20 data-[state=active]:glow-primary"
            >
              <Megaphone size={18} className="mr-2" />
              Ad Management
            </TabsTrigger>
            <TabsTrigger 
              value="preview"
              className="data-[state=active]:bg-primary/20 data-[state=active]:glow-primary"
            >
              <Eye size={18} className="mr-2" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blogs" className="space-y-6">
            <BlogManager />
          </TabsContent>

          <TabsContent value="ads" className="space-y-6">
            <AdManager />
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <PreviewManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;