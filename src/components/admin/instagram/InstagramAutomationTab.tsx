import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import InstagramAccountConnector from './InstagramAccountConnector';

interface Post { id: string; title: string; platform: string; caption: string; created_at: string; }
interface Account { id: string; username: string | null; access_status: string | null; }
interface Scheduled { id: string; status: string; scheduled_for: string; social_media_post_id: string | null; }

export default function InstagramAutomationTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedPost, setSelectedPost] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [p, a, s] = await Promise.all([
      supabase.from('social_media_posts').select('id,title,platform,caption,created_at').eq('platform', 'instagram').order('created_at', { ascending: false }),
      // Note: instagram_accounts table doesn't exist yet, using placeholder
      Promise.resolve({ data: [], error: null }),
      supabase.from('scheduled_posts').select('id,status,scheduled_for,social_media_post_id').order('scheduled_for', { ascending: false }),
    ]);
    if (!p.error && p.data) setPosts(p.data as any);
    if (!a.error && a.data) setAccounts(a.data as any);
    if (!s.error && s.data) setScheduled(s.data as any);
  };

  useEffect(() => { load(); }, []);

  const schedule = async () => {
    if (!selectedAccount || !scheduleTime) {
      toast({ title: 'Please select account and time', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('phyllo-schedule-post', {
        body: {
          account_id: selectedAccount,
          social_media_post_id: selectedPost || null,
          scheduled_for: new Date(scheduleTime).toISOString(),
          payload: {},
        },
      });
      if (error) throw error;
      toast({ title: 'Post scheduled' });
      setSelectedPost('');
      setScheduleTime('');
      load();
    } catch (e: any) {
      toast({ title: 'Failed to schedule', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const publishNow = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('phyllo-publish-post', { body: { scheduled_post_id: id } });
      if (error) throw error;
      toast({ title: 'Publish triggered' });
      load();
    } catch (e: any) {
      toast({ title: 'Failed to publish', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="glass-card p-6">
        <h2 className="text-2xl font-bold gradient-text">Instagram Automation</h2>
        <p className="text-muted-foreground mt-1">Connect accounts and publish/schedule content. The carousel generation flow remains unchanged.</p>
      </header>

      <InstagramAccountConnector />

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Schedule a Post</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>@{a.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Existing Generated Post (optional)</Label>
              <Select value={selectedPost} onValueChange={setSelectedPost}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a generated post (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {posts.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule Time</Label>
              <Input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>
          </div>
          <Button onClick={schedule} disabled={loading || !selectedAccount || !scheduleTime}>Schedule</Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Scheduled Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Post Id</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduled.map(s => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.scheduled_for).toLocaleString()}</TableCell>
                  <TableCell>{s.status}</TableCell>
                  <TableCell className="font-mono text-xs">{s.social_media_post_id || '-'}</TableCell>
                  <TableCell className="text-right">
                    {s.status !== 'published' && (
                      <Button size="sm" onClick={() => publishNow(s.id)} disabled={loading}>Publish Now</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {scheduled.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No scheduled posts yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
