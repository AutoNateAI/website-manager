import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter } from "lucide-react";
import { CompanyForm } from "./CompanyForm";
import { PersonForm } from "./PersonForm";
import { CompanyCard } from "./CompanyCard";
import { PersonCard } from "./PersonCard";
import { ContactDetailView } from "./ContactDetailView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Tables } from "@/integrations/supabase/types";

interface Company {
  id: string;
  name: string;
  website?: string;
  linkedin_url?: string;
  target_type?: string;
  location?: string;
  company_size?: string;
  targeting_notes?: string;
  chatgpt_links: string[];
  notebooklm_links: string[];
  tags: string[];
  propublic_link?: string;
  endowment_balance?: number;
  total_grants_paid?: number;
  program_expenses?: number;
  top_vendors?: string;
  leadership_compensation?: any[];
  form_990_years?: any[];
  created_at: string;
}

interface Person {
  id: string;
  name: string;
  email?: string;
  linkedin_url?: string;
  profile_image_url?: string;
  position?: string;
  company_id?: string;
  location?: string;
  targeting_notes?: string;
  chatgpt_links: string[];
  notebooklm_links: string[];
  tags: string[];
  lead_status: string;
  created_at: string;
  company?: Company;
}

export const LeadManager = () => {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCompanyFormOpen, setIsCompanyFormOpen] = useState(false);
  const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [selectedContact, setSelectedContact] = useState<Company | Person | null>(null);
  const [contactType, setContactType] = useState<'company' | 'person'>('company');
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  useEffect(() => {
    fetchCompanies();
    fetchPeople();
  }, []);

  const fetchCompanies = async () => {
    try {
      let query = supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,target_type.ilike.%${searchTerm}%`);
      }
      if (industryFilter && industryFilter !== 'all') {
        query = query.eq('target_type', industryFilter);
      }
      if (locationFilter && locationFilter !== 'all') {
        query = query.ilike('location', `%${locationFilter}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(company => ({
        ...company,
        chatgpt_links: Array.isArray(company.chatgpt_links) ? company.chatgpt_links.filter(link => typeof link === 'string') as string[] : [],
        notebooklm_links: Array.isArray(company.notebooklm_links) ? company.notebooklm_links.filter(link => typeof link === 'string') as string[] : [],
        tags: Array.isArray(company.tags) ? company.tags.filter(tag => typeof tag === 'string') as string[] : [],
        leadership_compensation: Array.isArray(company.leadership_compensation) ? company.leadership_compensation : [],
        form_990_years: Array.isArray(company.form_990_years) ? company.form_990_years : [],
      }));
      
      setCompanies(transformedData);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch companies",
        variant: "destructive",
      });
    }
  };

  const fetchPeople = async () => {
    try {
      let query = supabase
        .from('people')
        .select(`
          *,
          company:companies(*)
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('lead_status', statusFilter);
      }
      if (locationFilter && locationFilter !== 'all') {
        query = query.ilike('location', `%${locationFilter}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(person => ({
        ...person,
        chatgpt_links: Array.isArray(person.chatgpt_links) ? person.chatgpt_links.filter(link => typeof link === 'string') as string[] : [],
        notebooklm_links: Array.isArray(person.notebooklm_links) ? person.notebooklm_links.filter(link => typeof link === 'string') as string[] : [],
        tags: Array.isArray(person.tags) ? person.tags.filter(tag => typeof tag === 'string') as string[] : [],
        company: person.company ? {
          ...person.company,
          chatgpt_links: Array.isArray(person.company.chatgpt_links) ? person.company.chatgpt_links.filter(link => typeof link === 'string') as string[] : [],
          notebooklm_links: Array.isArray(person.company.notebooklm_links) ? person.company.notebooklm_links.filter(link => typeof link === 'string') as string[] : [],
          tags: Array.isArray(person.company.tags) ? person.company.tags.filter(tag => typeof tag === 'string') as string[] : [],
          leadership_compensation: Array.isArray(person.company.leadership_compensation) ? person.company.leadership_compensation : [],
          form_990_years: Array.isArray(person.company.form_990_years) ? person.company.form_990_years : [],
        } : undefined,
      }));
      
      setPeople(transformedData);
    } catch (error) {
      console.error('Error fetching people:', error);
      toast({
        title: "Error",
        description: "Failed to fetch people",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchPeople();
  }, [searchTerm, industryFilter, locationFilter, statusFilter]);

  const handleCompanySubmit = async (companyData: Partial<Company>) => {
    try {
      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(companyData as any)
          .eq('id', editingCompany.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Company updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('companies')
          .insert(companyData as any);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Company created successfully",
        });
      }

      setIsCompanyFormOpen(false);
      setEditingCompany(null);
      fetchCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      toast({
        title: "Error",
        description: "Failed to save company",
        variant: "destructive",
      });
    }
  };

  const handlePersonSubmit = async (personData: Partial<Person>) => {
    try {
      // Handle the "none" company selection
      const submissionData = {
        ...personData,
        company_id: personData.company_id === 'none' ? null : personData.company_id
      };

      if (editingPerson) {
        const { error } = await supabase
          .from('people')
          .update(submissionData as any)
          .eq('id', editingPerson.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Person updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('people')
          .insert(submissionData as any);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Person created successfully",
        });
      }

      setIsPersonFormOpen(false);
      setEditingPerson(null);
      fetchPeople();
    } catch (error) {
      console.error('Error saving person:', error);
      toast({
        title: "Error",
        description: "Failed to save person",
        variant: "destructive",
      });
    }
  };
  
  const handleCompanyDelete = async (companyId: string) => {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', companyId);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Company removed successfully.' });
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({ title: 'Error', description: 'Failed to delete company', variant: 'destructive' });
    }
  };

  const handlePersonDelete = async (personId: string) => {
    try {
      const { error } = await supabase.from('people').delete().eq('id', personId);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Person removed successfully.' });
      setPeople((prev) => prev.filter((p) => p.id !== personId));
    } catch (error) {
      console.error('Error deleting person:', error);
      toast({ title: 'Error', description: 'Failed to delete person', variant: 'destructive' });
    }
  };

  const getUniqueIndustries = () => {
    const industries = companies.map(c => c.target_type).filter(Boolean);
    return [...new Set(industries)] as string[];
  };

  const getUniqueStatuses = () => {
    const statuses = people.map(p => p.lead_status).filter(Boolean);
    return [...new Set(statuses)] as string[];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Lead Management</h2>
          <p className="text-muted-foreground">Manage your companies and people leads</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies and people..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {getUniqueIndustries().map((industry) => (
              <SelectItem key={industry} value={industry}>{industry}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="United States">United States</SelectItem>
            <SelectItem value="Canada">Canada</SelectItem>
            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
            <SelectItem value="Germany">Germany</SelectItem>
            <SelectItem value="France">France</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {getUniqueStatuses().map((status) => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="companies">Companies ({companies.length})</TabsTrigger>
          <TabsTrigger value="people">People ({people.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Companies</h3>
            <Dialog open={isCompanyFormOpen} onOpenChange={setIsCompanyFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingCompany(null);
                  setIsCompanyFormOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Company
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCompany ? 'Edit Company' : 'Add New Company'}
                  </DialogTitle>
                </DialogHeader>
                <CompanyForm
                  company={editingCompany}
                  onSubmit={handleCompanySubmit}
                  onCancel={() => {
                    setIsCompanyFormOpen(false);
                    setEditingCompany(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onEdit={() => {
                  setEditingCompany(company);
                  setIsCompanyFormOpen(true);
                }}
                onDelete={() => handleCompanyDelete(company.id)}
                onShowDetails={() => {
                  setSelectedContact(company);
                  setContactType('company');
                  setIsDetailViewOpen(true);
                }}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="people" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">People</h3>
            <Dialog open={isPersonFormOpen} onOpenChange={setIsPersonFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingPerson(null);
                  setIsPersonFormOpen(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Person
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPerson ? 'Edit Person' : 'Add New Person'}
                  </DialogTitle>
                </DialogHeader>
                <PersonForm
                  person={editingPerson}
                  companies={companies}
                  onSubmit={handlePersonSubmit}
                  onCancel={() => {
                    setIsPersonFormOpen(false);
                    setEditingPerson(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {people.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onEdit={() => {
                  setEditingPerson(person);
                  setIsPersonFormOpen(true);
                }}
                onDelete={() => handlePersonDelete(person.id)}
                onShowDetails={() => {
                  setSelectedContact(person);
                  setContactType('person');
                  setIsDetailViewOpen(true);
                }}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Detail View */}
      {selectedContact && (
        <ContactDetailView
          contact={selectedContact}
          type={contactType}
          open={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          onEdit={() => {
            if (contactType === 'company') {
              setEditingCompany(selectedContact as Company);
              setIsCompanyFormOpen(true);
            } else {
              setEditingPerson(selectedContact as Person);
              setIsPersonFormOpen(true);
            }
            setIsDetailViewOpen(false);
          }}
          onUpdate={() => {
            if (contactType === 'company') {
              fetchCompanies();
            } else {
              fetchPeople();
            }
          }}
        />
      )}
    </div>
  );
};