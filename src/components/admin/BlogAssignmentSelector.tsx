import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';

interface Blog {
  id: string;
  title: string;
  content: string;
}

interface BlogAssignmentSelectorProps {
  imageId: string;
  blogs: Blog[];
  onAssign: (imageId: string, blogId: string, position: string) => void;
}

interface BlogSection {
  value: string;
  label: string;
}

const BlogAssignmentSelector = ({ imageId, blogs, onAssign }: BlogAssignmentSelectorProps) => {
  const [selectedBlogId, setSelectedBlogId] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);
  const [availableSections, setAvailableSections] = useState<BlogSection[]>([]);

  const extractSectionsFromContent = (content: string): BlogSection[] => {
    const sections: BlogSection[] = [
      { value: 'hero', label: 'Hero Section' }
    ];
    
    // Extract headings from markdown content
    const headingMatches = content.match(/^#{1,6}\s+(.+)$/gm);
    
    if (headingMatches) {
      headingMatches.forEach((match, index) => {
        const headingText = match.replace(/^#{1,6}\s+/, '').trim();
        const headingNumber = index + 1;
        sections.push({
          value: `after_heading_${headingNumber}`,
          label: `After "${headingText}"`
        });
      });
    }
    
    // Extract paragraphs
    const paragraphMatches = content.split('\n\n').filter(p => 
      p.trim() && !p.match(/^#{1,6}\s/) && p.length > 50
    );
    
    paragraphMatches.slice(0, 3).forEach((_, index) => {
      const paragraphNumber = index + 1;
      sections.push({
        value: `after_paragraph_${paragraphNumber}`,
        label: `After Paragraph ${paragraphNumber}`
      });
    });
    
    sections.push(
      { value: 'before_conclusion', label: 'Before Conclusion' },
      { value: 'conclusion', label: 'Conclusion' }
    );
    
    return sections;
  };

  const handleBlogSelect = (blogId: string) => {
    setSelectedBlogId(blogId);
    const selectedBlog = blogs.find(blog => blog.id === blogId);
    if (selectedBlog) {
      const sections = extractSectionsFromContent(selectedBlog.content);
      setAvailableSections(sections);
    }
    setSelectedPosition(''); // Reset position when blog changes
  };

  const handleAssign = () => {
    if (selectedBlogId && selectedPosition) {
      onAssign(imageId, selectedBlogId, selectedPosition);
      setSelectedBlogId('');
      setSelectedPosition('');
      setShowDialog(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">Assign to Blog:</label>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between glass bg-transparent text-xs"
          >
            Select blog & section
            <ChevronRight className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass-card max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Image to Blog</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Blog</label>
              <Select value={selectedBlogId} onValueChange={handleBlogSelect}>
                <SelectTrigger className="glass bg-transparent">
                  <SelectValue placeholder="Choose a blog" />
                </SelectTrigger>
                <SelectContent>
                  {blogs.map((blog) => (
                    <SelectItem key={blog.id} value={blog.id}>
                      {blog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Select Section</label>
              <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                <SelectTrigger className="glass bg-transparent">
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((section) => (
                    <SelectItem key={section.value} value={section.value}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleAssign}
                disabled={!selectedBlogId || !selectedPosition}
                className="flex-1"
              >
                Assign Image
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogAssignmentSelector;