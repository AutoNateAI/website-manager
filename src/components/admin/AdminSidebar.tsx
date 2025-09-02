import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Users, Map, PenTool, Image, Megaphone, Video, Share2, 
  Calendar, Package, ChevronDown, ChevronRight, Building,
  Users2, MessageSquare, StickyNote, Target, Presentation, Settings, FileText, Home
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuItem {
  title: string;
  value: string;
  icon: any;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: "Dashboard",
    value: "dashboard",
    icon: Home,
  },
  {
    title: "Lead Management",
    value: "leads",
    icon: Users,
    children: [
      { title: "Companies & People", value: "leads", icon: Users },
      { title: "Personal Network Leads", value: "personal-network-leads", icon: Users2 },
      { title: "In-Person Networking", value: "in-person-networking", icon: Calendar },
      { title: "Virtual Networking", value: "virtual-networking", icon: MessageSquare },
      { title: "Person Notes", value: "person-notes", icon: StickyNote },
      { title: "Events", value: "events", icon: Calendar },
      { title: "Products & Services", value: "products", icon: Package },
    ]
  },
  {
    title: "Goals & Campaigns",
    value: "campaigns",
    icon: Target,
  },
  {
    title: "Slide Presentations",
    value: "slides",
    icon: Presentation,
  },
  {
    title: "Map Views",
    value: "maps",
    icon: Map,
  },
  {
    title: "Blog Management",
    value: "blogs",
    icon: PenTool,
  },
  {
    title: "Image Library",
    value: "images",
    icon: Image,
  },
  {
    title: "Ad Management",
    value: "ads",
    icon: Megaphone,
  },
  {
    title: "Live Builds",
    value: "live-builds",
    icon: Video,
  },
  {
    title: "Social Media",
    value: "social-media",
    icon: Share2,
  },
  {
    title: "Prompt Templates",
    value: "prompt-templates",
    icon: Settings,
  },
  {
    title: "SOPs & Documentation", 
    value: "sops",
    icon: FileText,
  },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const AdminSidebar = ({ activeTab, onTabChange }: AdminSidebarProps) => {
  const { state } = useSidebar();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['leads']));

  const toggleGroup = (groupValue: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupValue)) {
      newExpanded.delete(groupValue);
    } else {
      newExpanded.add(groupValue);
    }
    setExpandedGroups(newExpanded);
  };

  const isActive = (value: string) => activeTab === value;
  const isGroupActive = (item: MenuItem) => {
    if (item.children) {
      return item.children.some(child => isActive(child.value));
    }
    return isActive(item.value);
  };

  const getNavClasses = (active: boolean) => {
    return active 
      ? "bg-primary/20 text-primary font-medium border-primary/30" 
      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  };

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground font-semibold px-4 py-2">
            {!isCollapsed && "Admin Portal"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isExpanded = expandedGroups.has(item.value);
                const groupActive = isGroupActive(item);

                if (hasChildren) {
                  return (
                    <SidebarMenuItem key={item.value}>
                      <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(item.value)}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton 
                            className={`w-full justify-between rounded-md px-3 py-2 transition-colors ${getNavClasses(groupActive)}`}
                          >
                            <div className="flex items-center">
                              <item.icon className="h-4 w-4 mr-3" />
                              {!isCollapsed && <span className="text-sm">{item.title}</span>}
                            </div>
                            {!isCollapsed && (
                              isExpanded ? 
                                <ChevronDown className="h-4 w-4" /> : 
                                <ChevronRight className="h-4 w-4" />
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent className={isCollapsed ? "hidden" : ""}>
                          <div className="ml-7 mt-1 space-y-1">
                            {item.children.map((child) => (
                              <SidebarMenuButton
                                key={child.value}
                                onClick={() => onTabChange(child.value)}
                                className={`w-full justify-start text-sm rounded-md px-3 py-2 transition-colors ${getNavClasses(isActive(child.value))}`}
                              >
                                <child.icon className="h-3 w-3 mr-3" />
                                <span>{child.title}</span>
                              </SidebarMenuButton>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.value)}
                      className={`w-full rounded-md px-3 py-2 transition-colors ${getNavClasses(isActive(item.value))}`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {!isCollapsed && <span className="text-sm">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};