import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';

interface Blog {
  id: string;
  title: string;
}

interface BlogAssignmentSelectorProps {
  imageId: string;
  blogs: Blog[];
  onAssign: (imageId: string, blogId: string, position: string) => void;
}

const BlogAssignmentSelector = ({ imageId, blogs, onAssign }: BlogAssignmentSelectorProps) => {
  const [selectedBlogId, setSelectedBlogId] = useState<string>('');
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);

  const blogSections = [
    { value: 'hero', label: 'Hero Section' },
    { value: 'after_heading_1', label: 'After Heading 1' },
    { value: 'after_heading_2', label: 'After Heading 2' },
    { value: 'after_heading_3', label: 'After Heading 3' },
    { value: 'after_heading_4', label: 'After Heading 4' },
    { value: 'after_heading_5', label: 'After Heading 5' },
    { value: 'after_paragraph_1', label: 'After Paragraph 1' },
    { value: 'after_paragraph_2', label: 'After Paragraph 2' },
    { value: 'after_paragraph_3', label: 'After Paragraph 3' },
    { value: 'before_conclusion', label: 'Before Conclusion' },
    { value: 'conclusion', label: 'Conclusion' },
  ];

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
              <Select value={selectedBlogId} onValueChange={setSelectedBlogId}>
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
                  {blogSections.map((section) => (
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