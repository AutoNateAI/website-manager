import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { PenTool, Megaphone, Eye, LogIn } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

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
