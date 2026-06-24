import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { usePageTitle } from "@/context/page-context";
import { QuoteList } from "@/components/quotes/quote-list";
import { QuoteForm } from "@/components/quotes/quote-form";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Quote, QuoteWithCreator } from "@/shared/schema";

export default function AdminQuotes() {
  const { setPageInfo } = usePageTitle();
  const { toast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  useEffect(() => {
    setPageInfo("Quotes Management", "Manage inspirational quotes and content");
  }, [setPageInfo]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    filterQuotes();
  }, [quotes, searchTerm, categoryFilter, statusFilter]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin/quotes");
      console.log(response);
      setQuotes(response.data || response);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch quotes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = () => {
    if (!quotes) {
      setFilteredQuotes([]);
      return;
    }

    let filtered = quotes;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (quote) =>
          quote.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
          quote.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((quote) => quote.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        filtered = filtered.filter((quote) => quote.isActive);
      } else if (statusFilter === "inactive") {
        filtered = filtered.filter((quote) => !quote.isActive);
      } else if (statusFilter === "featured") {
        filtered = filtered.filter((quote) => quote.isFeatured);
      }
    }

    setFilteredQuotes(filtered);
  };

  const handleCreateQuote = async (quoteData: Partial<Quote>) => {
    try {
      await api.post("/api/admin/quotes", quoteData);
      toast({
        title: "Success",
        description: "Quote created successfully",
      });
      setIsFormOpen(false);
      fetchQuotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create quote",
        variant: "destructive",
      });
    }
  };

  const handleUpdateQuote = async (id: string, quoteData: Partial<Quote>) => {
    try {
      await api.put(`/api/admin/quotes/${id}`, quoteData);
      toast({
        title: "Success",
        description: "Quote updated successfully",
      });
      setIsFormOpen(false);
      setEditingQuote(null);
      fetchQuotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quote",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      await api.delete(`/api/admin/quotes/${id}`);
      toast({
        title: "Success",
        description: "Quote deleted successfully",
      });
      fetchQuotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete quote",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (id: string, isActive: boolean) => {
    try {
      await api.patch(`/api/admin/quotes/${id}`, { isActive });
      toast({
        title: "Success",
        description: `Quote ${isActive ? "activated" : "deactivated"} successfully`,
      });
      fetchQuotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      await api.patch(`/api/admin/quotes/${id}`, { isFeatured });
      toast({
        title: "Success",
        description: `Quote ${isFeatured ? "featured" : "unfeatured"} successfully`,
      });
      fetchQuotes();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quote featured status",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (quote: Quote) => {
    setEditingQuote(quote);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingQuote(null);
  };

  const categories = ["general", "health", "wellness", "motivation", "recovery"];
  const stats = {
    total: quotes?.length || 0,
    active: quotes?.filter((q) => q.isActive).length || 0,
    featured: quotes?.filter((q) => q.isFeatured).length || 0,
    categories: categories.length,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quotes Management</h1>
            <p className="text-muted-foreground">
              Manage inspirational quotes and motivational content
            </p>
          </div>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingQuote(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingQuote ? "Edit Quote" : "Add New Quote"}
                </DialogTitle>
              </DialogHeader>
              <QuoteForm
                quote={editingQuote}
                onSubmit={editingQuote ? handleUpdateQuote : handleCreateQuote}
                onCancel={closeForm}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Featured</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.featured}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.categories}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotes, authors, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      <Badge variant="secondary" className="capitalize">
                        {category}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quotes List */}
        <QuoteList
          quotes={filteredQuotes}
          loading={loading}
          onEdit={openEditForm}
          onDelete={handleDeleteQuote}
          onToggleStatus={handleToggleStatus}
          onToggleFeatured={handleToggleFeatured}
        />
      </div>
    </AdminLayout>
  );
}
