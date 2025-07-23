import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, PenTool, Megaphone, Eye, Image } from 'lucide-react';
import BlogManager from '@/components/admin/BlogManager';
import AdManager from '@/components/admin/AdManager';
import PreviewManager from '@/components/admin/PreviewManager';
import ImageManager from '@/components/admin/ImageManager';

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
    <div className="min-h-screen p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Admin Portal</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Manage your blog content and advertisements
              </p>
            </div>
            <Button 
              onClick={signOut}
              variant="outline"
              className="glass-button w-full sm:w-auto"
              size="sm"
            >
              <LogOut size={16} className="mr-2" />
              <span className="sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="glass-card p-1 grid w-full grid-cols-2 md:grid-cols-4 gap-1">
            <TabsTrigger 
              value="blogs" 
              className="data-[state=active]:bg-primary/20 data-[state=active]:glow-primary text-xs sm:text-sm"
            >
              <PenTool size={14} className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Blog Management</span>
              <span className="sm:hidden">Blogs</span>
            </TabsTrigger>
            <TabsTrigger 
              value="images"
              className="data-[state=active]:bg-primary/20 data-[state=active]:glow-primary text-xs sm:text-sm"
            >
              <Image size={14} className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Image Library</span>
              <span className="sm:hidden">Images</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ads"
              className="data-[state=active]:bg-primary/20 data-[state=active]:glow-primary text-xs sm:text-sm"
            >
              <Megaphone size={14} className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Ad Management</span>
              <span className="sm:hidden">Ads</span>
            </TabsTrigger>
            <TabsTrigger 
              value="preview"
              className="data-[state=active]:bg-primary/20 data-[state=active]:glow-primary text-xs sm:text-sm"
            >
              <Eye size={14} className="mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Preview</span>
              <span className="sm:hidden">Preview</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blogs" className="space-y-4 sm:space-y-6">
            <BlogManager />
          </TabsContent>

          <TabsContent value="images" className="space-y-4 sm:space-y-6">
            <ImageManager />
          </TabsContent>

          <TabsContent value="ads" className="space-y-4 sm:space-y-6">
            <AdManager />
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 sm:space-y-6">
            <PreviewManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;