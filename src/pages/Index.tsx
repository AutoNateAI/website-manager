import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { PenTool, Megaphone, Eye, LogIn, LogOut, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-8">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  // If user is logged in, show dashboard
  if (user && isAdmin) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold gradient-text">Blog Forge & Ads</h1>
                <p className="text-muted-foreground mt-1">
                  Welcome back! Manage your content and advertisements.
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

          {/* Dashboard Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card 
              className="glass-card cursor-pointer hover:glow-primary transition-all"
              onClick={() => navigate('/admin')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="w-6 h-6 text-primary" />
                  Blog Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Create, edit, and manage your blog posts with AI assistance. 
                  Generate content and optimize for engagement.
                </CardDescription>
                <Button className="mt-4 w-full glass-button">
                  Manage Blogs
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="glass-card cursor-pointer hover:glow-primary transition-all"
              onClick={() => navigate('/admin')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-accent" />
                  Advertisement Hub
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Create and manage advertisements. Set up automatic placement 
                  and track performance across your content.
                </CardDescription>
                <Button className="mt-4 w-full glass-button">
                  Manage Ads
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="glass-card cursor-pointer hover:glow-primary transition-all"
              onClick={() => navigate('/admin')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-6 h-6 text-secondary" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  Preview your blogs with ads exactly as readers will see them. 
                  Test layouts and optimize the user experience.
                </CardDescription>
                <Button className="mt-4 w-full glass-button">
                  Preview Content
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => navigate('/admin')}
                className="glass-button glow-primary"
              >
                <Settings size={18} className="mr-2" />
                Admin Portal
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default landing page for non-authenticated users
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold gradient-text">Blog Forge & Ads</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered blog creation and advertisement management platform. 
            Create stunning content and manage monetization effortlessly.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="w-5 h-5 text-primary" />
                AI Blog Creation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Generate high-quality blog content with AI assistance. Create engaging posts 
                with intelligent image placement and SEO optimization.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-accent" />
                Smart Ad Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create and manage advertisements with automatic placement every 2 headings. 
                Maximize revenue with intelligent ad positioning.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-secondary" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Preview exactly how your blogs will look with ads before publishing. 
                See the complete reader experience in real-time.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Admin Access */}
        <div className="text-center">
          <Card className="glass-card inline-block">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Admin Access</h3>
              <p className="text-muted-foreground mb-4">
                Access the admin portal to manage your blogs and advertisements
              </p>
              <Button 
                onClick={() => navigate('/login')}
                className="glass-button glow-primary"
              >
                <LogIn size={18} className="mr-2" />
                Access Admin Portal
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
