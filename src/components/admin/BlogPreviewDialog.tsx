import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

interface BlogPreviewDialogProps {
  blog: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentImages?: any[];
  ads?: any[];
}

const BlogPreviewDialog = ({ blog, open, onOpenChange, contentImages = [], ads = [] }: BlogPreviewDialogProps) => {
  const renderContentWithInserts = (content: string, contentImages: any[], ads: any[]): (string | JSX.Element)[] => {
    if (!content) return [];

    const lines = content.split('\n');
    const result: (string | JSX.Element)[] = [];
    let headingCount = 0;
    let insertKey = 0;

    for (const line of lines) {
      result.push(line);
      
      // Check if line is a heading (# or ##)
      if (line.match(/^#{1,2}\s+/)) {
        headingCount++;
        
        // Insert images based on position
        const imagesForThisPosition = contentImages.filter(
          img => img.position === `after_heading_${headingCount}`
        );
        
        imagesForThisPosition.forEach(image => {
          result.push('');
          result.push(
            <div key={`image-${insertKey++}`} className="content-image my-6">
              <img src={image.url} alt={image.alt || ''} className="w-full rounded-lg" />
              {image.caption && (
                <p className="text-sm text-muted-foreground mt-2 text-center italic">{image.caption}</p>
              )}
            </div>
          );
          result.push('');
        });
        
        // Insert ad after every 2 headings (but not if we just inserted an image)
        if (headingCount % 2 === 0 && ads.length > 0 && imagesForThisPosition.length === 0) {
          const randomAd = ads[Math.floor(Math.random() * ads.length)];
          result.push('');
          result.push(
            <div key={`ad-${insertKey++}`} className="ad-container my-6 p-4 border border-primary/20 rounded-lg bg-primary/5">
              <div className="text-xs text-muted-foreground mb-2">Advertisement</div>
              {randomAd.image_url && (
                <img src={randomAd.image_url} alt={randomAd.alt_text || randomAd.title} className="w-full max-w-sm mx-auto rounded" />
              )}
              <div className="text-center mt-2">
                <h4 className="font-semibold">{randomAd.title}</h4>
              </div>
            </div>
          );
          result.push('');
        }
      }
    }

    return result;
  };

  if (!blog) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold gradient-text">{blog.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {blog.hero_image && (
            <div className="w-full aspect-video rounded-lg overflow-hidden">
              <img 
                src={blog.hero_image} 
                alt={blog.hero_image_alt || blog.title}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">By {blog.author}</Badge>
            <Badge variant="outline">{blog.category}</Badge>
            <Badge variant="outline">{blog.read_time}</Badge>
            {blog.published && <Badge className="bg-green-500/20 text-green-400">Published</Badge>}
            {blog.featured && <Badge className="bg-yellow-500/20 text-yellow-400">Featured</Badge>}
          </div>

          {blog.excerpt && (
            <p className="text-muted-foreground text-lg leading-relaxed">
              {blog.excerpt}
            </p>
          )}

          <article className="prose prose-invert max-w-none prose-sm">
            <div>
              {renderContentWithInserts(blog.content, blog.content_images || [], ads).map((element, index) => {
                if (typeof element === 'string') {
                  return (
                    <ReactMarkdown 
                      key={index}
                      components={{
                        h1: ({ children }) => <h1 className="text-xl font-bold mt-6 mb-3 gradient-text">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-lg font-semibold mt-5 mb-2 text-primary">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-base font-medium mt-4 mb-2">{children}</h3>,
                        p: ({ children }) => <p className="mb-3 leading-relaxed text-sm">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 text-sm">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-sm">{children}</ol>,
                      }}
                    >
                      {element}
                    </ReactMarkdown>
                  );
                }
                return element;
              })}
            </div>
          </article>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlogPreviewDialog;