import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, X, Download, Eye } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Screenshot {
  id: string;
  image_url: string;
  alt_text: string;
  caption: string;
  position_section: string;
  position_order: number;
  placeholder_id?: string;
}

interface SOPScreenshotManagerProps {
  sopDocumentId: string;
  screenshots: Screenshot[];
  onScreenshotsUpdate: (screenshots: Screenshot[]) => void;
  placeholders?: any[];
}

export const SOPScreenshotManager: React.FC<SOPScreenshotManagerProps> = ({
  sopDocumentId,
  screenshots,
  onScreenshotsUpdate,
  placeholders = []
}) => {
  const [uploading, setUploading] = useState(false);
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (files: FileList, section: string, placeholderId?: string) => {
    if (!files.length) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${sopDocumentId}/${section}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('generated-images')
          .getPublicUrl(fileName);

        // Save screenshot record
        const { data: screenshot, error: dbError } = await supabase
          .from('sop_screenshots')
          .insert({
            sop_document_id: sopDocumentId,
            image_url: publicUrl,
            alt_text: file.name,
            caption: '',
            position_section: section,
            position_order: screenshots.filter(s => s.position_section === section).length,
            placeholder_id: placeholderId
          })
          .select()
          .single();

        if (dbError) throw dbError;

        return screenshot;
      });

      const newScreenshots = await Promise.all(uploadPromises);
      onScreenshotsUpdate([...screenshots, ...newScreenshots]);

      toast({
        title: "Success",
        description: `Uploaded ${newScreenshots.length} screenshot(s)`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload screenshots",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [sopDocumentId, screenshots, onScreenshotsUpdate, toast]);

  const handleDrop = useCallback((e: React.DragEvent, section: string, placeholderId?: string) => {
    e.preventDefault();
    setDraggedOver(null);
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files, section, placeholderId);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, section: string) => {
    e.preventDefault();
    setDraggedOver(section);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDraggedOver(null);
    }
  }, []);

  const removeScreenshot = async (screenshot: Screenshot) => {
    try {
      // Delete from storage
      const fileName = screenshot.image_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('generated-images')
          .remove([fileName]);
      }

      // Delete from database
      const { error } = await supabase
        .from('sop_screenshots')
        .delete()
        .eq('id', screenshot.id);

      if (error) throw error;

      onScreenshotsUpdate(screenshots.filter(s => s.id !== screenshot.id));

      toast({
        title: "Success",
        description: "Screenshot removed",
      });
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        title: "Error",
        description: "Failed to remove screenshot",
        variant: "destructive",
      });
    }
  };

  const updateScreenshotCaption = async (screenshot: Screenshot, caption: string) => {
    try {
      const { error } = await supabase
        .from('sop_screenshots')
        .update({ caption })
        .eq('id', screenshot.id);

      if (error) throw error;

      onScreenshotsUpdate(screenshots.map(s => 
        s.id === screenshot.id ? { ...s, caption } : s
      ));
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to update caption",
        variant: "destructive",
      });
    }
  };

  const groupedScreenshots = screenshots.reduce((acc, screenshot) => {
    if (!acc[screenshot.position_section]) {
      acc[screenshot.position_section] = [];
    }
    acc[screenshot.position_section].push(screenshot);
    return acc;
  }, {} as Record<string, Screenshot[]>);

  const sections = [...new Set([
    ...placeholders.map(p => p.section),
    ...screenshots.map(s => s.position_section)
  ])];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Screenshot Management</h3>
          <p className="text-sm text-muted-foreground">
            Upload and organize screenshots for your SOP
          </p>
        </div>
        <Badge variant="outline">
          {screenshots.length} screenshot{screenshots.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {sections.map(section => {
        const sectionScreenshots = groupedScreenshots[section] || [];
        const sectionPlaceholders = placeholders.filter(p => p.section === section);
        const isDraggedOver = draggedOver === section;

        return (
          <Card key={section} className={`transition-colors ${isDraggedOver ? 'border-primary bg-primary/5' : ''}`}>
            <CardHeader>
              <CardTitle className="capitalize">{section}</CardTitle>
              {sectionPlaceholders.length > 0 && (
                <CardDescription>
                  Suggested: {sectionPlaceholders.map(p => p.description).join(', ')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                  isDraggedOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                }`}
                onDrop={(e) => handleDrop(e, section)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, section)}
                onDragLeave={handleDragLeave}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop images here, or click to select
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files, section)}
                    className="hidden"
                    id={`upload-${section}`}
                  />
                  <Button variant="outline" size="sm" asChild>
                    <label htmlFor={`upload-${section}`} className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Files
                    </label>
                  </Button>
                </div>
              </div>

              {sectionScreenshots.length > 0 && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectionScreenshots.map((screenshot) => (
                    <Card key={screenshot.id} className="overflow-hidden">
                      <div className="relative">
                        <img
                          src={screenshot.image_url}
                          alt={screenshot.alt_text}
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => window.open(screenshot.image_url, '_blank')}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeScreenshot(screenshot)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <Label className="text-xs">Caption</Label>
                          <Input
                            value={screenshot.caption}
                            onChange={(e) => updateScreenshotCaption(screenshot, e.target.value)}
                            placeholder="Add a caption..."
                            className="text-sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {uploading && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">Uploading screenshots...</p>
        </div>
      )}
    </div>
  );
};