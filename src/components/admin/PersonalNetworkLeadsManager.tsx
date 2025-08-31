import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Users, Building, User, Phone, Mail, ExternalLink, Edit, DollarSign, Award, Trash2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Data structures for personal network leads
interface PersonalNetworkLead {
  id?: string;
  // Personal info
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  location?: string;
  linkedin_url?: string;
  instagram_url?: string;
  facebook_url?: string;
  
  // Company info (if applicable)
  company?: {
    id?: string;
    name?: string;
    industry?: string;
    size?: string;
    location?: string;
    website?: string;
    linkedin_url?: string;
    instagram_url?: string;
    facebook_url?: string;
  };
  
  // Lead source info
  source_team_member: string; // Who brought this lead
  relationship_type: string; // How they know this person
  connection_strength: 'weak' | 'medium' | 'strong';
  notes?: string;
  lead_status: 'prospect' | 'contacted' | 'qualified' | 'meeting_scheduled' | 'proposal_sent' | 'closed_won' | 'closed_lost';
  
  // Financial fields
  financial_projection?: number; // in cents
  projection_justification?: string;
  deal_closed_at?: Date;
  deal_amount?: number; // in cents
  deal_status: 'prospect' | 'qualified' | 'negotiating' | 'closed_won' | 'closed_lost';
  
  // Metadata
  created_at?: Date;
  updated_at?: Date;
}

interface TeamMember {
  id: string;
  name: string;
}

// Form state type
interface LeadFormState {
  personal: {
    name: string;
    email: string;
    phone: string;
    position: string;
    location: string;
    linkedin_url: string;
    instagram_url: string;
    facebook_url: string;
    lead_status: PersonalNetworkLead['lead_status'];
    financial_projection: number;
    projection_justification: string;
    deal_status: PersonalNetworkLead['deal_status'];
  };
  company: {
    name: string;
    industry: string;
    size: string;
    location: string;
    website: string;
    linkedin_url: string;
    instagram_url: string;
    facebook_url: string;
  };
  source: {
    team_member: string;
    relationship_type: string;
    connection_strength: PersonalNetworkLead['connection_strength'];
    notes: string;
  };
}

export const PersonalNetworkLeadsManager = () => {
  const [leads, setLeads] = useState<PersonalNetworkLead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<PersonalNetworkLead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Form state with proper typing
  const [leadForm, setLeadForm] = useState<LeadFormState>({
    personal: {
      name: '',
      email: '',
      phone: '',
      position: '',
      location: '',
      linkedin_url: '',
      instagram_url: '',
      facebook_url: '',
      lead_status: 'prospect',
      financial_projection: 0,
      projection_justification: '',
      deal_status: 'prospect'
    },
    company: {
      name: '',
      industry: '',
      size: '',
      location: '',
      website: '',
      linkedin_url: '',
      instagram_url: '',
      facebook_url: ''
    },
    source: {
      team_member: '',
      relationship_type: '',
      connection_strength: 'medium',
      notes: ''
    }
  });

  useEffect(() => {
    fetchLeads();
    fetchTeamMembers();
  }, []);

  // Fetch leads and team members
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('people')
        .select(`
          *,
          company:companies(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedLeads = data?.map(person => ({
        id: person.id,
        name: person.name || '',
        email: person.email || undefined,
        position: person.position || undefined,
        location: person.location || undefined,
        linkedin_url: person.linkedin_url || undefined,
        company: person.company ? {
          id: person.company.id,
          name: person.company.name || '',
          industry: person.company.industry || undefined,
          size: person.company.company_size || undefined,
          location: person.company.location || undefined,
          website: person.company.website || undefined,
          linkedin_url: person.company.linkedin_url || undefined,
        } : undefined,
        source_team_member: '',
        relationship_type: '',
        connection_strength: 'medium' as const,
        lead_status: (person.lead_status as PersonalNetworkLead['lead_status']) || 'prospect',
        notes: person.targeting_notes || undefined,
        financial_projection: person.financial_projection || undefined,
        projection_justification: person.projection_justification || undefined,
        deal_closed_at: person.deal_closed_at ? new Date(person.deal_closed_at) : undefined,
        deal_amount: person.deal_amount || undefined,
        deal_status: (person.deal_status as PersonalNetworkLead['deal_status']) || 'prospect',
        created_at: new Date(person.created_at),
        updated_at: new Date(person.updated_at),
      })) || [];
      
      setLeads(formattedLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
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
    try {
      let companyId = null;
      if (leadForm.company.name.trim()) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: leadForm.company.name,
            industry: leadForm.company.industry || null,
            company_size: leadForm.company.size || null,
            location: leadForm.company.location || null,
            website: leadForm.company.website || null,
            linkedin_url: leadForm.company.linkedin_url || null,
          })
          .select()
          .single();

        if (companyError) throw companyError;
        companyId = companyData.id;
      }

      const { data, error } = await supabase
        .from('people')
        .insert({
          name: leadForm.personal.name,
          email: leadForm.personal.email || null,
          position: leadForm.personal.position || null,
          location: leadForm.personal.location || null,
          linkedin_url: leadForm.personal.linkedin_url || null,
          company_id: companyId,
          lead_status: leadForm.personal.lead_status,
          targeting_notes: leadForm.source.notes || null,
          financial_projection: leadForm.personal.financial_projection ? leadForm.personal.financial_projection * 100 : null,
          projection_justification: leadForm.personal.projection_justification || null,
          deal_status: leadForm.personal.deal_status,
        })
        .select();

      if (error) throw error;

      toast.success('Lead saved successfully');
      setDialogOpen(false);
      resetForm();
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save lead');
    }
  };

  const resetForm = () => {
    setLeadForm({
      personal: {
        name: '',
        email: '',
        phone: '',
        position: '',
        location: '',
        linkedin_url: '',
        instagram_url: '',
        facebook_url: '',
        lead_status: 'prospect',
        financial_projection: 0,
        projection_justification: '',
        deal_status: 'prospect'
      },
      company: {
        name: '',
        industry: '',
        size: '',
        location: '',
        website: '',
        linkedin_url: '',
        instagram_url: '',
        facebook_url: ''
      },
      source: {
        team_member: '',
        relationship_type: '',
        connection_strength: 'medium',
        notes: ''
      }
    });
    setEditingLead(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'prospect': return 'secondary';
      case 'contacted': return 'default';
      case 'qualified': return 'default';
      case 'meeting_scheduled': return 'default';
      case 'proposal_sent': return 'default';
      case 'closed_won': return 'default';
      case 'closed_lost': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleEdit = (lead: PersonalNetworkLead) => {
    setEditingLead(lead);
    setLeadForm({
      personal: {
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        position: lead.position || '',
        location: lead.location || '',
        linkedin_url: lead.linkedin_url || '',
        instagram_url: lead.instagram_url || '',
        facebook_url: lead.facebook_url || '',
        lead_status: lead.lead_status,
        financial_projection: lead.financial_projection ? lead.financial_projection / 100 : 0,
        projection_justification: lead.projection_justification || '',
        deal_status: lead.deal_status
      },
      company: {
        name: lead.company?.name || '',
        industry: lead.company?.industry || '',
        size: lead.company?.size || '',
        location: lead.company?.location || '',
        website: lead.company?.website || '',
        linkedin_url: lead.company?.linkedin_url || '',
        instagram_url: lead.company?.instagram_url || '',
        facebook_url: lead.company?.facebook_url || ''
      },
      source: {
        team_member: lead.source_team_member,
        relationship_type: lead.relationship_type,
        connection_strength: lead.connection_strength,
        notes: lead.notes || ''
      }
    });
    setDialogOpen(true);
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      const { error } = await supabase.from('people').delete().eq('id', leadId);
      if (error) throw error;
      toast.success('Lead deleted successfully');
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'all' || lead.source_team_member === sourceFilter;
    const matchesStatus = statusFilter === 'all' || lead.lead_status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Personal Network Leads</h2>
          <p className="text-muted-foreground">Manage leads from your team's personal networks</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Network Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Edit' : 'Add'} Personal Network Lead</DialogTitle>
              <DialogDescription>
                Add a lead from someone's personal network. Include both personal and company information.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="company">Company Info</TabsTrigger>
                  <TabsTrigger value="financial">Financial</TabsTrigger>
                  <TabsTrigger value="source">Lead Source</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={leadForm.personal.name}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, name: e.target.value}
                        })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={leadForm.personal.email}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, email: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={leadForm.personal.phone}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, phone: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={leadForm.personal.position}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, position: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={leadForm.personal.location}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, location: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lead_status">Lead Status</Label>
                      <Select 
                        value={leadForm.personal.lead_status} 
                        onValueChange={(value: PersonalNetworkLead['lead_status']) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, lead_status: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                          <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                          <SelectItem value="closed_won">Closed Won</SelectItem>
                          <SelectItem value="closed_lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      value={leadForm.personal.linkedin_url}
                      onChange={(e) => setLeadForm({
                        ...leadForm,
                        personal: {...leadForm.personal, linkedin_url: e.target.value}
                      })}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="company" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input
                        id="company_name"
                        value={leadForm.company.name}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          company: {...leadForm.company, name: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_website">Company Website</Label>
                      <Input
                        id="company_website"
                        value={leadForm.company.website}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          company: {...leadForm.company, website: e.target.value}
                        })}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_industry">Industry</Label>
                      <Input
                        id="company_industry"
                        value={leadForm.company.industry}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          company: {...leadForm.company, industry: e.target.value}
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="company_size">Company Size</Label>
                      <Select 
                        value={leadForm.company.size} 
                        onValueChange={(value) => setLeadForm({
                          ...leadForm,
                          company: {...leadForm.company, size: value}
                        })}
                      >
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
                </TabsContent>

                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="financial_projection">Financial Projection ($)</Label>
                      <Input
                        id="financial_projection"
                        type="number"
                        value={leadForm.personal.financial_projection}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, financial_projection: parseFloat(e.target.value) || 0}
                        })}
                        min="0"
                        step="100"
                        placeholder="Expected deal value..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="projection_justification">Projection Justification</Label>
                      <Textarea
                        id="projection_justification"
                        value={leadForm.personal.projection_justification}
                        onChange={(e) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, projection_justification: e.target.value}
                        })}
                        rows={3}
                        placeholder="Why do you think this deal is worth this amount?..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="deal_status">Deal Status</Label>
                      <Select 
                        value={leadForm.personal.deal_status} 
                        onValueChange={(value: PersonalNetworkLead['deal_status']) => setLeadForm({
                          ...leadForm,
                          personal: {...leadForm.personal, deal_status: value}
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospect">Prospect</SelectItem>
                          <SelectItem value="qualified">Qualified</SelectItem>
                          <SelectItem value="negotiating">Negotiating</SelectItem>
                          <SelectItem value="closed_won">Closed Won</SelectItem>
                          <SelectItem value="closed_lost">Closed Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="source" className="space-y-4">
                  <div>
                    <Label htmlFor="team_member">Who contributed this lead? *</Label>
                    <Select 
                      value={leadForm.source.team_member} 
                      onValueChange={(value) => setLeadForm({
                        ...leadForm,
                        source: {...leadForm.source, team_member: value}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="relationship_type">Relationship Type</Label>
                    <Input
                      id="relationship_type"
                      value={leadForm.source.relationship_type}
                      onChange={(e) => setLeadForm({
                        ...leadForm,
                        source: {...leadForm.source, relationship_type: e.target.value}
                      })}
                      placeholder="e.g., Former colleague, Friend, Family..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="connection_strength">Connection Strength</Label>
                    <Select 
                      value={leadForm.source.connection_strength} 
                      onValueChange={(value: PersonalNetworkLead['connection_strength']) => setLeadForm({
                        ...leadForm,
                        source: {...leadForm.source, connection_strength: value}
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weak">Weak</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="strong">Strong</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={leadForm.source.notes}
                      onChange={(e) => setLeadForm({
                        ...leadForm,
                        source: {...leadForm.source, notes: e.target.value}
                      })}
                      rows={4}
                      placeholder="Additional notes about this lead and the relationship..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingLead ? 'Update' : 'Add'} Lead</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {teamMembers.map((member) => (
              <SelectItem key={member.id} value={member.name}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
            <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
            <SelectItem value="closed_won">Closed Won</SelectItem>
            <SelectItem value="closed_lost">Closed Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads List */}
      {loading ? (
        <div className="text-center py-8">
          <p>Loading leads...</p>
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || sourceFilter !== 'all' || statusFilter !== 'all' 
                  ? "Try adjusting your search or filters"
                  : "Add your first personal network lead to get started"}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{lead.name}</CardTitle>
                    <CardDescription>
                      {lead.position && lead.company?.name 
                        ? `${lead.position} at ${lead.company.name}`
                        : lead.position || lead.company?.name || 'No company info'
                      }
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getStatusColor(lead.lead_status)}>{lead.lead_status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lead.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.financial_projection && (
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{formatCurrency(lead.financial_projection)} projected</span>
                    </div>
                  )}
                  {lead.deal_amount && (
                    <div className="flex items-center text-sm">
                      <Award className="h-4 w-4 mr-2 text-green-500" />
                      <span className="text-green-600">{formatCurrency(lead.deal_amount)} closed</span>
                    </div>
                  )}
                </div>
                
                <Separator className="my-3" />
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {lead.linkedin_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {lead.company?.website && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={lead.company.website} target="_blank" rel="noopener noreferrer">
                          <Building className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(lead)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setLeadToDelete(lead.id!);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>

    <ConfirmDialog
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      title="Delete Lead"
      description="Are you sure you want to delete this lead? This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={() => {
        if (leadToDelete) {
          handleDeleteLead(leadToDelete);
          setLeadToDelete(null);
        }
      }}
      variant="destructive"
    />
  </>
);
};