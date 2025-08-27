import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Edit2, Search, Phone, Mail, Linkedin, Instagram, Facebook, Globe, Building2, User, Users } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PersonalNetworkLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  location?: string;
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  notes?: string;
  lead_source: string; // Who in the team contributed this lead
  company_id?: string;
  company_name?: string;
  company_website?: string;
  company_linkedin?: string;
  company_instagram?: string;
  company_facebook?: string;
  company_industry?: string;
  company_size?: string;
  lead_status: 'prospect' | 'contacted' | 'qualified' | 'opportunity' | 'closed';
  created_at: string;
  updated_at: string;
}

interface TeamMember {
  id: string;
  name: string;
}

export const PersonalNetworkLeadsManager = () => {
  const [leads, setLeads] = useState<PersonalNetworkLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<PersonalNetworkLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    location: '',
    linkedin_url: '',
    instagram_url: '',
    facebook_url: '',
    notes: '',
    lead_source: '',
    new_source_name: '',
    company_name: '',
    company_website: '',
    company_linkedin: '',
    company_instagram: '',
    company_facebook: '',
    company_industry: '',
    company_size: '',
    lead_status: 'prospect' as 'prospect' | 'contacted' | 'qualified' | 'opportunity' | 'closed',
  });

  useEffect(() => {
    fetchLeads();
    fetchTeamMembers();
  }, []);

  const fetchLeads = async () => {
    try {
      // For now, we'll simulate data since we need to create the table structure
      setLeads([]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      // Simulate team members - in real implementation, fetch from people table
      setTeamMembers([
        { id: '1', name: 'John Smith' },
        { id: '2', name: 'Sarah Johnson' },
        { id: '3', name: 'Mike Davis' }
      ]);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For now, simulate the save since we need to create the database structure
    toast.success('Personal network lead would be saved (database structure needed)');
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      position: '',
      location: '',
      linkedin_url: '',
      instagram_url: '',
      facebook_url: '',
      notes: '',
      lead_source: '',
      new_source_name: '',
      company_name: '',
      company_website: '',
      company_linkedin: '',
      company_instagram: '',
      company_facebook: '',
      company_industry: '',
      company_size: '',
      lead_status: 'prospect' as 'prospect' | 'contacted' | 'qualified' | 'opportunity' | 'closed',
    });
    setEditingLead(null);
  };

  const handleEdit = (lead: PersonalNetworkLead) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone || '',
      position: lead.position || '',
      location: lead.location || '',
      linkedin_url: lead.linkedin_url || '',
      instagram_url: lead.instagram_url || '',
      facebook_url: lead.facebook_url || '',
      notes: lead.notes || '',
      lead_source: lead.lead_source,
      new_source_name: '',
      company_name: lead.company_name || '',
      company_website: lead.company_website || '',
      company_linkedin: lead.company_linkedin || '',
      company_instagram: lead.company_instagram || '',
      company_facebook: lead.company_facebook || '',
      company_industry: lead.company_industry || '',
      company_size: lead.company_size || '',
      lead_status: lead.lead_status,
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prospect': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'contacted': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'qualified': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'opportunity': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = selectedSource === 'all' || lead.lead_source === selectedSource;
    const matchesStatus = selectedStatus === 'all' || lead.lead_status === selectedStatus;
    return matchesSearch && matchesSource && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Personal Network Leads</h2>
          <p className="text-muted-foreground">Manage leads from your team's personal networks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glass-button" onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Network Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Edit' : 'Add'} Personal Network Lead</DialogTitle>
              <DialogDescription>
                Add a lead from someone's personal network. Include both personal and company information.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="company">Company Info</TabsTrigger>
                  <TabsTrigger value="source">Lead Source</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lead_status">Lead Status</Label>
                      <Select value={formData.lead_status} onValueChange={(value) => setFormData({...formData, lead_status: value as any})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="opportunity">Opportunity</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Personal Social Media</Label>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                        <Input
                          id="linkedin_url"
                          value={formData.linkedin_url}
                          onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                          placeholder="https://linkedin.com/in/..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="instagram_url">Instagram URL</Label>
                        <Input
                          id="instagram_url"
                          value={formData.instagram_url}
                          onChange={(e) => setFormData({...formData, instagram_url: e.target.value})}
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="facebook_url">Facebook URL</Label>
                        <Input
                          id="facebook_url"
                          value={formData.facebook_url}
                          onChange={(e) => setFormData({...formData, facebook_url: e.target.value})}
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={3}
                      placeholder="Additional notes about this lead..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="company" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input
                        id="company_name"
                        value={formData.company_name}
                        onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_website">Company Website</Label>
                      <Input
                        id="company_website"
                        value={formData.company_website}
                        onChange={(e) => setFormData({...formData, company_website: e.target.value})}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_industry">Industry</Label>
                      <Input
                        id="company_industry"
                        value={formData.company_industry}
                        onChange={(e) => setFormData({...formData, company_industry: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_size">Company Size</Label>
                      <Select value={formData.company_size} onValueChange={(value) => setFormData({...formData, company_size: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10 employees</SelectItem>
                          <SelectItem value="11-50">11-50 employees</SelectItem>
                          <SelectItem value="51-200">51-200 employees</SelectItem>
                          <SelectItem value="201-500">201-500 employees</SelectItem>
                          <SelectItem value="501-1000">501-1000 employees</SelectItem>
                          <SelectItem value="1000+">1000+ employees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Company Social Media</Label>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="company_linkedin">Company LinkedIn</Label>
                        <Input
                          id="company_linkedin"
                          value={formData.company_linkedin}
                          onChange={(e) => setFormData({...formData, company_linkedin: e.target.value})}
                          placeholder="https://linkedin.com/company/..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="company_instagram">Company Instagram</Label>
                        <Input
                          id="company_instagram"
                          value={formData.company_instagram}
                          onChange={(e) => setFormData({...formData, company_instagram: e.target.value})}
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="company_facebook">Company Facebook</Label>
                        <Input
                          id="company_facebook"
                          value={formData.company_facebook}
                          onChange={(e) => setFormData({...formData, company_facebook: e.target.value})}
                          placeholder="https://facebook.com/..."
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="source" className="space-y-4">
                  <div>
                    <Label htmlFor="lead_source">Who contributed this lead? *</Label>
                    <Select value={formData.lead_source} onValueChange={(value) => setFormData({...formData, lead_source: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="new">Add New Person</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.lead_source === 'new' && (
                    <div>
                      <Label htmlFor="new_source_name">New Team Member Name</Label>
                      <Input
                        id="new_source_name"
                        value={formData.new_source_name}
                        onChange={(e) => setFormData({...formData, new_source_name: e.target.value})}
                        placeholder="Enter name of the person who contributed this lead"
                        required
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="glass-button">
                  {editingLead ? 'Update' : 'Save'} Lead
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="opportunity">Opportunity</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8">Loading leads...</div>
      ) : filteredLeads.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No personal network leads yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding leads from your team's personal networks
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="glass-button">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {lead.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-lg">{lead.name}</h3>
                      {lead.position && (
                        <p className="text-sm text-muted-foreground">{lead.position}</p>
                      )}
                      {lead.company_name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.company_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        Contributed by: {lead.lead_source}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(lead.lead_status)}>
                      {lead.lead_status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(lead)}
                      className="glass-button"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {lead.email && (
                    <div className="flex items-center gap-1 text-xs bg-muted/20 px-2 py-1 rounded">
                      <Mail className="h-3 w-3" />
                      {lead.email}
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1 text-xs bg-muted/20 px-2 py-1 rounded">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </div>
                  )}
                  {lead.linkedin_url && (
                    <div className="flex items-center gap-1 text-xs bg-blue-500/20 px-2 py-1 rounded">
                      <Linkedin className="h-3 w-3" />
                      LinkedIn
                    </div>
                  )}
                  {lead.instagram_url && (
                    <div className="flex items-center gap-1 text-xs bg-pink-500/20 px-2 py-1 rounded">
                      <Instagram className="h-3 w-3" />
                      Instagram
                    </div>
                  )}
                  {lead.facebook_url && (
                    <div className="flex items-center gap-1 text-xs bg-blue-600/20 px-2 py-1 rounded">
                      <Facebook className="h-3 w-3" />
                      Facebook
                    </div>
                  )}
                </div>

                {lead.notes && (
                  <div className="mt-3 p-3 bg-muted/10 rounded-md">
                    <p className="text-sm">{lead.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};