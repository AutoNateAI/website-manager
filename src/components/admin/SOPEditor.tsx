import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, FileText, Calendar, MessageSquare, Eye, Edit, Download, Upload } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SOPScreenshotManager } from "./SOPScreenshotManager";

interface SOPVersion {
  id: string;
  version_number: number;
  title: string;
  content: string;
  structured_data: any;
  change_description: string;
  created_by: string;
  created_at: string;
}

interface SOPEditorProps {
  sopId: string;
  onClose: () => void;
}

export const SOPEditor: React.FC<SOPEditorProps> = ({ sopId, onClose }) => {
  const [sop, setSop] = useState<any>(null);
  const [versions, setVersions] = useState<SOPVersion[]>([]);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [changeDescription, setChangeDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchSOPData();
  }, [sopId]);

  const fetchSOPData = async () => {
    try {
      // Fetch SOP document
      const { data: sopData, error: sopError } = await supabase
        .from('sop_documents')
        .select('*')
        .eq('id', sopId)
        .single();

      if (sopError) throw sopError;
      setSop(sopData);
      setEditedContent(sopData.content || '');
      setEditedTitle(sopData.title || '');

      // Fetch versions
      const { data: versionsData, error: versionsError } = await supabase
        .from('sop_versions')
        .select('*')
        .eq('sop_document_id', sopId)
        .order('version_number', { ascending: false });

      if (versionsError) throw versionsError;
      setVersions(versionsData || []);

      // Fetch screenshots
      const { data: screenshotsData, error: screenshotsError } = await supabase
        .from('sop_screenshots')
        .select('*')
        .eq('sop_document_id', sopId)
        .order('position_order');

      if (screenshotsError) throw screenshotsError;
      setScreenshots(screenshotsData || []);

    } catch (error) {
      console.error('Error fetching SOP data:', error);
      toast({
        title: "Error",
        description: "Failed to load SOP data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    if (!sop) return;

    setIsSaving(true);
    try {
      const newVersionNumber = Math.max(...versions.map(v => v.version_number), 0) + 1;

      // Create new version
      const { error: versionError } = await supabase
        .from('sop_versions')
        .insert({
          sop_document_id: sopId,
          version_number: newVersionNumber,
          title: editedTitle,
          content: editedContent,
          structured_data: sop.structured_data || {},
          change_description: changeDescription || 'Manual edit',
          created_by: 'user'
        });

      if (versionError) throw versionError;

      // Update main document
      const { error: updateError } = await supabase
        .from('sop_documents')
        .update({
          title: editedTitle,
          content: editedContent,
          current_version: newVersionNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', sopId);

      if (updateError) throw updateError;

      setSop({ ...sop, title: editedTitle, content: editedContent, current_version: newVersionNumber });
      setIsEditing(false);
      setChangeDescription('');
      fetchSOPData(); // Refresh to get new version

      toast({
        title: "Success",
        description: "SOP updated successfully",
      });
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const revertToVersion = async (version: SOPVersion) => {
    try {
      const newVersionNumber = Math.max(...versions.map(v => v.version_number), 0) + 1;

      // Create new version from old content
      const { error: versionError } = await supabase
        .from('sop_versions')
        .insert({
          sop_document_id: sopId,
          version_number: newVersionNumber,
          title: version.title,
          content: version.content,
          structured_data: version.structured_data || {},
          change_description: `Reverted to version ${version.version_number}`,
          created_by: 'user'
        });

      if (versionError) throw versionError;

      // Update main document
      const { error: updateError } = await supabase
        .from('sop_documents')
        .update({
          title: version.title,
          content: version.content,
          current_version: newVersionNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', sopId);

      if (updateError) throw updateError;

      fetchSOPData();

      toast({
        title: "Success",
        description: `Reverted to version ${version.version_number}`,
      });
    } catch (error) {
      console.error('Error reverting version:', error);
      toast({
        title: "Error",
        description: "Failed to revert to version",
        variant: "destructive",
      });
    }
  };

  const exportSOP = () => {
    if (!sop) return;

    const content = `# ${sop.title}\n\n${sop.content}\n\n---\nGenerated on: ${new Date().toLocaleDateString()}\nVersion: ${sop.current_version || 1}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sop.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="text-center py-8">
        <p>SOP not found</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    );
  }

  const placeholders = sop.generation_metadata?.screenshot_placeholders || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{sop.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">v{sop.current_version || 1}</Badge>
            <Badge variant={sop.status === 'generated' ? 'default' : 'secondary'}>
              {sop.status}
            </Badge>
            {sop.category && (
              <Badge variant="outline">{sop.category}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportSOP}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Document Content</CardTitle>
                <Button
                  variant={isEditing ? "secondary" : "outline"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {isEditing ? 'Cancel Edit' : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Title</label>
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Content</label>
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-96 font-mono"
                      placeholder="Write your SOP content in Markdown..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Change Description</label>
                    <Input
                      value={changeDescription}
                      onChange={(e) => setChangeDescription(e.target.value)}
                      placeholder="Describe what changed..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveChanges} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap">{sop.content}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screenshots">
          <SOPScreenshotManager
            sopDocumentId={sopId}
            screenshots={screenshots}
            onScreenshotsUpdate={setScreenshots}
            placeholders={placeholders}
          />
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                Track changes and revert to previous versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {versions.map((version) => (
                  <div key={version.id} className="flex items-center justify-between p-4 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={version.version_number === sop.current_version ? 'default' : 'outline'}>
                          v{version.version_number}
                        </Badge>
                        <span className="font-medium">{version.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {version.change_description} • by {version.created_by} • {new Date(version.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                      {version.version_number !== sop.current_version && (
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => revertToVersion(version)}
                        >
                          Revert
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SOP Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(sop.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(sop.updated_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Screenshots</label>
                  <p className="text-sm text-muted-foreground">
                    {screenshots.length} uploaded
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Template</label>
                  <p className="text-sm text-muted-foreground">
                    {sop.generation_metadata?.template_title || 'Manual'}
                  </p>
                </div>
              </div>
              
              {sop.structured_data && Object.keys(sop.structured_data).length > 0 && (
                <div className="mt-4">
                  <label className="text-sm font-medium">Structured Data</label>
                  <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto">
                    {JSON.stringify(sop.structured_data, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};