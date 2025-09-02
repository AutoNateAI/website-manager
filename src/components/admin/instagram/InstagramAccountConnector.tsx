import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Declare PhylloConnect for TypeScript
declare global {
  interface Window {
    PhylloConnect: {
      initialize: (config: any) => any;
    };
  }
}

interface InstagramAccount {
  id: string;
  username: string | null;
  access_status: string | null;
  phyllo_profile_id: string | null;
  phyllo_account_id: string | null;
  connected_at: string | null;
}

export default function InstagramAccountConnector() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState({ username: '', phyllo_profile_id: '', phyllo_account_id: '' });
  const { toast } = useToast();

  const fetchAccounts = async () => {
    const { data, error } = await supabase.from('instagram_accounts').select('*').order('connected_at', { ascending: false });
    if (!error && data) setAccounts(data as any);
  };

  useEffect(() => { fetchAccounts(); }, []);

  const startConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('phyllo-instagram-auth', {
        body: { action: 'create_connect_token' },
      });
      if (error) throw error;
      
      const { token, phyllo_user_id } = data;
      if (!token || !phyllo_user_id) {
        throw new Error('Missing token or user ID from server');
      }

      // Initialize Phyllo Connect SDK
      const config = {
        clientDisplayName: 'AutoNate AI',
        environment: 'sandbox', // matches our PHYLLO_ENVIRONMENT
        userId: phyllo_user_id,
        token: token,
        redirect: false // Use popup flow - let users choose platform
      };

      const phylloConnect = window.PhylloConnect.initialize(config);

      // Set up event listeners
      phylloConnect.on('accountConnected', async (accountId: string, workplatformId: string, userId: string) => {
        console.log('Account connected:', { accountId, workplatformId, userId });
        toast({ title: 'Instagram account connected successfully!' });
        fetchAccounts(); // Refresh the accounts list
      });

      phylloConnect.on('accountDisconnected', (accountId: string, workplatformId: string, userId: string) => {
        console.log('Account disconnected:', { accountId, workplatformId, userId });
        toast({ title: 'Instagram account disconnected' });
        fetchAccounts(); // Refresh the accounts list
      });

      phylloConnect.on('exit', (reason: string, userId: string) => {
        console.log('Phyllo Connect exited:', { reason, userId });
        setLoading(false);
      });

      phylloConnect.on('tokenExpired', (userId: string) => {
        console.log('Token expired for user:', userId);
        toast({ title: 'Session expired, please try again', variant: 'destructive' });
        setLoading(false);
      });

      phylloConnect.on('connectionFailure', (reason: string, workplatformId: string, userId: string) => {
        console.log('Connection failed:', { reason, workplatformId, userId });
        toast({ title: 'Connection failed', description: reason, variant: 'destructive' });
        setLoading(false);
      });

      // Open the connection flow
      phylloConnect.open();
      
    } catch (e: any) {
      console.error('Failed to start Phyllo Connect:', e);
      toast({ title: 'Failed to start connect', description: e.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const linkManually = async () => {
    if (!manual.username || !manual.phyllo_profile_id || !manual.phyllo_account_id) {
      toast({ title: 'Fill all manual fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('phyllo-instagram-auth', {
        body: { action: 'link_account', ...manual },
      });
      if (error) throw error;
      toast({ title: `Linked @${data?.account?.username}` });
      setManual({ username: '', phyllo_profile_id: '', phyllo_account_id: '' });
      fetchAccounts();
    } catch (e: any) {
      toast({ title: 'Failed to link', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async (account_id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('phyllo-instagram-auth', {
        body: { action: 'disconnect', account_id },
      });
      if (error) throw error;
      toast({ title: 'Account disconnected' });
      fetchAccounts();
    } catch (e: any) {
      toast({ title: 'Failed to disconnect', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Connect Instagram Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={startConnect} disabled={loading} className="w-full sm:w-auto">Start Phyllo Connect</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Username</Label>
              <Input value={manual.username} onChange={(e) => setManual({ ...manual, username: e.target.value })} placeholder="your_ig_handle" />
            </div>
            <div>
              <Label>Phyllo Profile ID</Label>
              <Input value={manual.phyllo_profile_id} onChange={(e) => setManual({ ...manual, phyllo_profile_id: e.target.value })} />
            </div>
            <div>
              <Label>Phyllo Account ID</Label>
              <Input value={manual.phyllo_account_id} onChange={(e) => setManual({ ...manual, phyllo_account_id: e.target.value })} />
            </div>
          </div>
          <Button variant="secondary" onClick={linkManually} disabled={loading}>Link Manually</Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>@{a.username}</TableCell>
                  <TableCell>{a.access_status || 'unknown'}</TableCell>
                  <TableCell>{a.connected_at ? new Date(a.connected_at).toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => disconnect(a.id)} disabled={loading}>Disconnect</Button>
                  </TableCell>
                </TableRow>
              ))}
              {accounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No accounts connected yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
